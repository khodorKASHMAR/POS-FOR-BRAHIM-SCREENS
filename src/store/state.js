import { defineStore } from 'pinia'
import ItemService from '../services/ItemService'
import CategoryService from '../services/CategoryService'
import CurrencyRateService from '../services/CurrencyRateService'
import ItemSyncService from '../services/ItemSyncService'
import { CurrencyEnum } from '../constants/enums'
import {
  getCachedItem,
  setCachedItem,
  removeCachedItem,
  getCachedItemImage,
  hasCachedItemImage,
  setCachedItemImage,
  setCachedItemImages,
  invalidateCachedItemImage,
  getInflightImage,
  setInflightImage,
  findCachedItemByBarcode,
  listCachedItems,
  clearItemCache,
  updateCachedItemImageTime
} from '../utils/itemCache'
import {
  loadCategoriesFromDb,
  loadItemRecordsPage,
  updateItemsCacheMeta,
  queuePersistItem,
  persistItemsBulk,
  queuePersistCategory,
  persistCategoriesBulk,
  queuePersistImage,
  persistCategoryItemsPageState,
  removeItemFromDb,
  removeCategoryFromDb,
  removeImageFromDb,
  readPersistedImages,
  updateImageCachedAtTime as updateDiskImageCachedAtTime
} from '../utils/itemsCacheDb'
import {
  connectItemChangesWebSocket,
  disconnectItemChangesWebSocket
} from '../composables/useItemChangesWebSocket'

const PAGE_SIZE = 50


function categoryItemsPageKey(categoryId) {
  if (categoryId == null || categoryId === '' || categoryId === 'all') return 'all'
  return String(categoryId)
}

function toLeanItem(dto) {
  if (!dto?.id) return null
  return {
    id: dto.id,
    nameAr: dto.nameAr || '',
    nameEn: dto.nameEn || '',
    sellingPrice: dto.sellingPrice ?? dto.sellingPriceDollar ?? 0,
    sellingCurrency:
      dto.sellingCurrency != null ? Number(dto.sellingCurrency) : CurrencyEnum.DOLLAR,
    barcode: dto.barcode || '',
    categoryId: dto.categoryId ?? null,
    hasImage: dto.hasImage != null ? !!dto.hasImage : !!dto.image
  }
}

function emptyCategoryItemsPage() {
  return { ids: [], page: -1, totalPages: 1, totalItems: 0, loading: false }
}

let itemsCacheBootstrapPromise = null
let dollarRateRequest = null

/** Ids waiting to be resolved on the next frame, so viewport cards share one IndexedDB read. */
const queuedImageIds = new Set()
const imageEnsureResolvers = []
let imageEnsureFrame = 0

export const useState = defineStore('ui', {
  state: () => {
    const savedLang = localStorage.getItem('lang')
    const savedCurrency = localStorage.getItem('currency')
    localStorage.removeItem('items')
    return {
      lang: savedLang || 'en',
      currency: savedCurrency || 'USD',
      sidebar: false,
      exchangeRate: Number(localStorage.getItem('exchangeRate')) || 15000,
      itemCacheVersion: 0,
      categories: [],
      categoriesLoaded: false,
      categoriesLoading: false,
      /**
       * Pagination cursor per category (or 'all').
       * Only tracks which page numbers we've already loaded — not a second item store.
       * Shape: { ids, page, totalPages, totalItems, loading }
       */
      categoryItemsPages: {},
      searchResults: [],
      searchLoading: false,
      itemsCacheBootstrapped: false
    }
  },
  getters: {
    dir: (s) => (s.lang === 'ar' ? 'rtl' : 'ltr'),
    items(s) {
      void s.itemCacheVersion
      return listCachedItems()
    },
    totalItemCount(s) {
      return (s.categories || []).reduce((sum, c) => sum + (Number(c.itemCount) || 0), 0)
    }
  },
  actions: {
    toggleLang() {
      this.lang = this.lang === 'en' ? 'ar' : 'en'
      localStorage.setItem('lang', this.lang)
      document.documentElement.setAttribute('dir', this.dir)
    },
    toggleCurrency() {
      this.currency = this.currency === 'USD' ? 'LBP' : 'USD'
      localStorage.setItem('currency', this.currency)
    },
    async fetchDollarRate() {
      if (!dollarRateRequest) {
        dollarRateRequest = (async () => {
          try {
            const response = await CurrencyRateService.getRate(CurrencyEnum.LBP)
            const rate = Number(response?.data?.data?.rate) || 15000
            this.exchangeRate = rate
            localStorage.setItem('exchangeRate', rate.toString())
          } catch (error) {
            console.error('Error loading currency rate:', error)
          } finally {
            dollarRateRequest = null
          }
        })()
      }
      return dollarRateRequest
    },

    async bootstrapItemsCache() {
      if (this.itemsCacheBootstrapped) return
      if (itemsCacheBootstrapPromise) return itemsCacheBootstrapPromise

      itemsCacheBootstrapPromise = this.runItemsCacheBootstrap()
      try {
        await itemsCacheBootstrapPromise
      } finally {
        itemsCacheBootstrapPromise = null
      }
    },
    async runItemsCacheBootstrap() {
      const categories = await loadCategoriesFromDb()
      if (categories.length) {
        this.categories = categories.map((c) => ({
          id: c.id,
          nameAr: c.nameAr || '',
          nameEn: c.nameEn || '',
          itemCount: Number(c.itemCount) || 0
        }))
        this.categoriesLoaded = true
        this.itemCacheVersion += 1
      }

      this.itemsCacheBootstrapped = true
      connectItemChangesWebSocket((event) => this.applyItemChangeEvent(event))
    },

    getItem(itemId) {
      void this.itemCacheVersion
      return getCachedItem(itemId) || null
    },

    /** Items currently shown for a category (or 'all'), in load order. */
    getCategoryItemsPageItems(categoryId) {
      void this.itemCacheVersion
      const page = this.categoryItemsPages[categoryItemsPageKey(categoryId)]
      if (!page?.ids?.length) return []
      return page.ids.map((id) => getCachedItem(id)).filter(Boolean)
    },

    getCategoryItemsPageState(categoryId) {
      return this.categoryItemsPages[categoryItemsPageKey(categoryId)] || null
    },

    clearItemsCacheMemory() {
      disconnectItemChangesWebSocket()
      clearItemCache()
      this.categories = []
      this.categoriesLoaded = false
      this.categoriesLoading = false
      this.categoryItemsPages = {}
      this.searchResults = []
      this.searchLoading = false
      this.itemsCacheBootstrapped = false
      itemsCacheBootstrapPromise = null
      this.itemCacheVersion += 1
    },


    applyItemChanges(data) {
      if (!data) return

      for (const category of data.categoriesCreated || []) {
        this.addCategoryCache(category)
        queuePersistCategory(category)
      }
      for (const category of data.categoriesUpdated || []) {
        this.addCategoryCache(category)
        queuePersistCategory(category)
      }
      for (const categoryId of data.categoriesDeleted || []) {
        this.removeCategoryCache(categoryId)
        removeCategoryFromDb(categoryId)
      }

      const createdIds = new Set(
        (data.itemsCreated || []).map((row) => String(row?.id)).filter(Boolean)
      )
      const upsertRows = [...(data.itemsCreated || []), ...(data.itemsUpdated || [])]
      for (const row of upsertRows) {
        const lean = toLeanItem(row)
        if (!lean) continue
        setCachedItem(lean.id, lean)
        queuePersistItem(lean)
        if (createdIds.has(String(lean.id))) {
          const idStr = String(lean.id)
          const allPage = this.categoryItemsPages.all
          const catPage = this.categoryItemsPages[categoryItemsPageKey(lean.categoryId)]
          if (allPage && !allPage.ids.includes(idStr)) allPage.ids.unshift(idStr)
          if (catPage && categoryItemsPageKey(lean.categoryId) !== 'all' && !catPage.ids.includes(idStr)) {
            catPage.ids.unshift(idStr)
          }
        }
      }

      for (const itemId of data.itemsDeleted || []) {
        this.removeItemFromCache(itemId)
        removeItemFromDb(itemId)
      }

      this.itemCacheVersion += 1
    },

    async syncItemChangesSince(since) {
      if (!since) return
      try {
        const response = await ItemSyncService.getChangesSince(since)
        const data = response?.data?.data
        if (!data) return
        this.applyItemChanges(data)
        if (data.serverTime) {
          await updateItemsCacheMeta({ lastSyncAt: data.serverTime, cacheReady: true })
        }
      } catch (error) {
        console.error('Error syncing item changes:', error)
      }
    },

    applyItemChangeEvent(event) {
      if (!event?.type) return

      const payload = event.payload
      switch (event.type) {
        case 'ITEM_CREATED':
        case 'ITEM_UPDATED':
          if (payload) {
            this.addItemCache(payload)
            const lean = toLeanItem(payload)
            if (lean) queuePersistItem(lean)
            if (event.previousItemId) {
              this.removeItemFromCache(event.previousItemId)
              removeItemFromDb(event.previousItemId)
            }
            if (payload.hasImage) {
              this.invalidateItemImageCache(payload.id)
              removeImageFromDb(payload.id)
              this.ensureItemImages([payload.id])
            }
          }
          break
        case 'ITEM_DELETED':
          if (payload?.id) {
            this.removeItemFromCache(payload.id)
            removeItemFromDb(payload.id)
          }
          break
        case 'CATEGORY_CREATED':
        case 'CATEGORY_UPDATED':
          if (payload) {
            this.addCategoryCache(payload)
            queuePersistCategory(payload)
          }
          break
        case 'CATEGORY_DELETED':
          if (payload?.id) {
            this.removeCategoryCache(payload.id)
            removeCategoryFromDb(payload.id)
          }
          break
        default:
          break
      }

      updateItemsCacheMeta({ lastSyncAt: new Date().toISOString(), cacheReady: true })
    },

    async loadCategories({ force = false } = {}) {
      if (this.categoriesLoaded && !force) return
      if (this.categoriesLoading) return
      this.categoriesLoading = true
      try {
        const response = await CategoryService.getUserCategories()
        this.categories = (response?.data?.data || []).map((c) => ({
          id: c.id,
          nameAr: c.nameAr || '',
          nameEn: c.nameEn || '',
          itemCount: Number(c.itemCount) || 0
        }))
        this.categoriesLoaded = true
        persistCategoriesBulk(this.categories)
        updateItemsCacheMeta({ lastSyncAt: new Date().toISOString(), cacheReady: true })
      } catch (error) {
        console.error('Error loading categories:', error)
      } finally {
        this.categoriesLoading = false
      }
    },

    adjustCategoryCount(categoryId, delta) {
      if (categoryId == null) return
      const cat = this.categories.find((c) => String(c.id) === String(categoryId))
      if (!cat) return
      cat.itemCount = Math.max(0, (Number(cat.itemCount) || 0) + delta)
    },

    addCategoryCache(category) {
      if (!category?.id) return
      const lean = {
        id: category.id,
        nameAr: category.nameAr || '',
        nameEn: category.nameEn || '',
        itemCount: Number(category.itemCount) || 0
      }
      const idx = this.categories.findIndex((c) => String(c.id) === String(lean.id))
      if (idx >= 0) this.categories.splice(idx, 1, { ...this.categories[idx], ...lean })
      else this.categories.push(lean)
      this.categoriesLoaded = true
      queuePersistCategory(lean)
    },

    removeCategoryCache(categoryId) {
      if (categoryId == null) return
      this.categories = this.categories.filter((c) => String(c.id) !== String(categoryId))
      removeCategoryFromDb(categoryId)
    },

    /**
     * Read the next 50 saved items from IndexedDB.
     * Mount uses reset so the screen starts at the first page. Load more appends the next page.
     */
    async loadItemsPageFromDb({ categoryId = 'all', reset = false } = {}) {
      const key = categoryItemsPageKey(categoryId)
      let page = this.categoryItemsPages[key]
      if (!page) {
        page = emptyCategoryItemsPage()
        this.categoryItemsPages[key] = page
      }
      if (page.loading) return
      if (reset) {
        page.ids = []
        page.page = -1
        page.totalPages = 1
        page.totalItems = 0
      }
      if (!reset && page.page >= 0 && page.page + 1 >= page.totalPages) return

      const nextPage = page.page + 1
      page.loading = true
      try {
        const rows = await loadItemRecordsPage({
          offset: nextPage * PAGE_SIZE,
          limit: PAGE_SIZE,
          categoryId: key === 'all' ? null : key
        })
        const seen = new Set(page.ids.map(String))
        for (const row of rows) {
          if (row?.id == null) continue
          setCachedItem(row.id, row)
          const id = String(row.id)
          if (seen.has(id)) continue
          page.ids.push(id)
          seen.add(id)
        }
        page.page = nextPage
        page.totalItems = page.ids.length
        page.totalPages = rows.length < PAGE_SIZE ? nextPage + 1 : nextPage + 2
        this.itemCacheVersion += 1
      } catch (error) {
        console.error('Error loading items page from IndexedDB:', error)
      } finally {
        page.loading = false
      }
    },

    /** Always hits the backend. */
    async searchItems({ query = '', categoryId = 'all' } = {}) {
      const q = (query || '').trim()
      if (!q) {
        this.searchResults = []
        return []
      }
      this.searchLoading = true
      try {
        const response = await ItemService.getUserItems({
          categoryId: categoryId === 'all' ? null : categoryId,
          query: q,
          page: 0,
          size: PAGE_SIZE
        })
        const results = []
        for (const row of response?.data?.data || []) {
          const lean = toLeanItem(row)
          if (!lean) continue
          setCachedItem(lean.id, lean)
          results.push(lean)
        }
        this.searchResults = results
        this.itemCacheVersion += 1
        persistItemsBulk(results)
        await this.ensureItemImages(results.map((r) => r.id))
        return results
      } catch (error) {
        console.error('Error searching items:', error)
        this.searchResults = []
        return []
      } finally {
        this.searchLoading = false
      }
    },

    async findItemByBarcodeRemote(barcode) {
      const local = findCachedItemByBarcode(barcode)
      if (local) return local
      try {
        const response = await ItemService.getItemByBarcode(barcode)
        const data = response?.data?.data
        const lean = toLeanItem(data)
        if (!lean) return null
        setCachedItem(lean.id, lean)
        queuePersistItem(lean)
        if (lean.hasImage) await this.ensureItemImages([lean.id])
        this.itemCacheVersion += 1
        return lean
      } catch {
        return null
      }
    },

    addItemCache(item) {
      const lean = toLeanItem(item)
      if (!lean) return
      setCachedItem(lean.id, lean)
      queuePersistItem(lean)
      if (item.image) {
        setCachedItemImage(lean.id, item.image)
        queuePersistImage(lean.id, item.image)
      }
      this.itemCacheVersion += 1

      const idStr = String(lean.id)
      const allPage = this.categoryItemsPages.all
      const catPage = this.categoryItemsPages[categoryItemsPageKey(lean.categoryId)]
      if (allPage && !allPage.ids.includes(idStr)) allPage.ids.unshift(idStr)
      if (catPage && categoryItemsPageKey(lean.categoryId) !== 'all' && !catPage.ids.includes(idStr)) {
        catPage.ids.unshift(idStr)
      }
    },

    removeItemFromCache(itemId) {
      if (itemId == null) return
      const idStr = String(itemId)
      removeCachedItem(itemId)
      for (const page of Object.values(this.categoryItemsPages)) {
        if (page?.ids) page.ids = page.ids.filter((id) => String(id) !== idStr)
      }
      this.searchResults = this.searchResults.filter((i) => String(i.id) !== idStr)
      removeItemFromDb(itemId)
      this.itemCacheVersion += 1
    },

    getItemImage(itemId) {
      void this.itemCacheVersion
      return getCachedItemImage(itemId)
    },

    addItemImageCache(itemId, imageBase64) {
      setCachedItemImage(itemId, imageBase64)
      queuePersistImage(itemId, imageBase64)
      this.itemCacheVersion += 1
    },

    invalidateItemImageCache(itemId) {
      invalidateCachedItemImage(itemId)
      removeImageFromDb(itemId)
      this.itemCacheVersion += 1
    },

    /**
     * Mark receipt/draft item images as recently used (RAM LRU + disk cachedAt).
     */
    async updateImageCachedAtTime(itemIds = []) {
      for (const raw of itemIds) {
        if (raw == null) continue
        updateCachedItemImageTime(raw)
      }
      await updateDiskImageCachedAtTime(itemIds)
    },

    /**
     * Fill RAM for ids that are not cached yet.
     * Calls in the same frame share one IndexedDB read. The network is used only for ids missing on disk.
     */
    async ensureItemImages(ids = []) {
      const unique = []
      const seen = new Set()
      for (const raw of ids) {
        const id = raw && typeof raw === 'object' ? raw.id : raw
        if (id == null) continue
        const key = String(id)
        if (seen.has(key)) continue
        seen.add(key)
        unique.push(key)
      }

      const missing = unique.filter((id) => {
        if (hasCachedItemImage(id)) return false
        const item = getCachedItem(id)
        if (item && item.hasImage === false) return false
        return true
      })
      if (!missing.length) return

      const waiters = []
      let queued = false
      for (const id of missing) {
        const pending = getInflightImage(id)
        if (pending) {
          waiters.push(pending)
          continue
        }
        if (!queuedImageIds.has(id)) queuedImageIds.add(id)
        queued = true
      }
      if (queued) {
        waiters.push(new Promise((resolve) => imageEnsureResolvers.push(resolve)))
        this.scheduleImageEnsureFlush()
      }

      await Promise.all(waiters)
    },

    scheduleImageEnsureFlush() {
      if (imageEnsureFrame) return
      const run = () => {
        imageEnsureFrame = 0
        const ids = [...queuedImageIds]
        queuedImageIds.clear()
        const resolvers = imageEnsureResolvers.splice(0)
        if (!ids.length) {
          resolvers.forEach((resolve) => resolve())
          return
        }
        const batchPromise = this.loadMissingItemImages(ids)
        for (const id of ids) setInflightImage(id, batchPromise)
        batchPromise.finally(() => resolvers.forEach((resolve) => resolve()))
      }
      if (typeof requestAnimationFrame === 'function') {
        imageEnsureFrame = requestAnimationFrame(run)
      } else {
        imageEnsureFrame = setTimeout(run, 16)
      }
    },

    async loadMissingItemImages(ids) {
      let changed = false
      let disk = new Map()
      try {
        disk = await readPersistedImages(ids)
      } catch (error) {
        console.error('Error reading cached item images:', error)
      }

      const toFetch = []
      const fromDisk = []
      for (const id of ids) {
        if (!disk.has(id)) {
          toFetch.push(id)
          continue
        }
        fromDisk.push({ id, image: disk.get(id).image || null })
      }
      if (fromDisk.length) {
        setCachedItemImages(fromDisk)
        changed = true
      }

      if (toFetch.length) {
        try {
          const response = await ItemService.getItemImages(toFetch)
          const rows = response?.data?.data || []
          const found = new Set()
          const fetched = []
          for (const row of rows) {
            if (row?.id == null) continue
            const id = String(row.id)
            found.add(id)
            fetched.push({ id, image: row.image || null })
            queuePersistImage(id, row.image || null)
          }
          for (const id of toFetch) {
            if (found.has(id)) continue
            fetched.push({ id, image: null })
            queuePersistImage(id, null)
          }
          if (fetched.length) setCachedItemImages(fetched)
          changed = true
        } catch (error) {
          console.error('Error loading item images:', error)
        }
      }

      if (changed) this.itemCacheVersion += 1
    }
  }
})
