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
  invalidateCachedItemImage,
  getInflightImage,
  setInflightImage,
  findCachedItemByBarcode,
  listCachedItems,
  hydrateFromRecords,
  clearItemCache
} from '../utils/itemCache'
import {
  loadItemsCacheFromDb,
  isItemsCacheEmpty,
  updateItemsCacheMeta,
  queuePersistItem,
  persistItemsBulk,
  queuePersistCategory,
  persistCategoriesBulk,
  queuePersistImage,
  persistCategoryItemsPageState,
  removeItemFromDb,
  removeCategoryFromDb,
  removeImageFromDb
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
      try {
        const response = await CurrencyRateService.getRate(CurrencyEnum.LBP)
        const rate = Number(response?.data?.data?.rate) || 15000
        this.exchangeRate = rate
        localStorage.setItem('exchangeRate', rate.toString())
      } catch (error) {
        console.error('Error loading currency rate:', error)
      }
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
      if (this.itemsCacheBootstrapped) return

      const disk = await loadItemsCacheFromDb()
      if (disk?.items?.length) {
        hydrateFromRecords(
          disk.items,
          (disk.images || []).map((row) => ({ id: row.id, image: row.image }))
        )
      }
      if (disk?.categories?.length) {
        this.categories = disk.categories.map((c) => ({
          id: c.id,
          nameAr: c.nameAr || '',
          nameEn: c.nameEn || '',
          itemCount: Number(c.itemCount) || 0
        }))
        this.categoriesLoaded = true
      }
      if (disk?.categoryItemsPages) {
        for (const [key, page] of Object.entries(disk.categoryItemsPages)) {
          this.categoryItemsPages[key] = {
            ids: [...(page.ids || [])],
            page: page.page ?? -1,
            totalPages: page.totalPages ?? 1,
            totalItems: page.totalItems ?? 0,
            loading: false
          }
        }
      }
      this.itemCacheVersion += 1

      const empty = await isItemsCacheEmpty()
      if (empty) {
        await this.loadCategories()
        await this.loadItemsPage({ categoryId: 'all', reset: true })
        await updateItemsCacheMeta({
          cacheReady: true,
          lastSyncAt: new Date().toISOString()
        })
      } else if (disk?.meta?.lastSyncAt) {
        await this.syncItemChangesSince(disk.meta.lastSyncAt)
      }

      this.itemsCacheBootstrapped = true
      connectItemChangesWebSocket((event) => this.applyItemChangeEvent(event))
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

    /** Category change / scroll: load next 50 lean items, then fetch their images. */
    async loadItemsPage({ categoryId = 'all', reset = false } = {}) {
      const key = categoryItemsPageKey(categoryId)
      let page = this.categoryItemsPages[key]
      if (!page) {
        page = emptyCategoryItemsPage()
        this.categoryItemsPages[key] = page
      }
      if (page.loading) return
      if (!reset && page.page + 1 >= page.totalPages && page.page >= 0) return

      if (reset) Object.assign(page, emptyCategoryItemsPage())

      const nextPage = page.page + 1
      page.loading = true
      try {
        const response = await ItemService.getUserItems({
          categoryId: key === 'all' ? null : key,
          page: nextPage,
          size: PAGE_SIZE
        })
        const rows = response?.data?.data || []
        const pagination = response?.data?.pagination || {}
        const newIds = []
        const leanBatch = []
        for (const row of rows) {
          const lean = toLeanItem(row)
          if (!lean) continue
          setCachedItem(lean.id, lean)
          leanBatch.push(lean)
          newIds.push(String(lean.id))
        }
        const seen = new Set(page.ids.map(String))
        for (const id of newIds) {
          if (!seen.has(id)) {
            page.ids.push(id)
            seen.add(id)
          }
        }
        page.page = pagination.currentPage != null ? pagination.currentPage : nextPage
        page.totalPages = pagination.totalPages != null ? pagination.totalPages : nextPage + 1
        page.totalItems = pagination.totalItems != null ? pagination.totalItems : page.ids.length
        this.itemCacheVersion += 1
        persistItemsBulk(leanBatch)
        persistCategoryItemsPageState(key, {
          ids: page.ids,
          page: page.page,
          totalPages: page.totalPages,
          totalItems: page.totalItems
        })
        updateItemsCacheMeta({ lastSyncAt: new Date().toISOString(), cacheReady: true })
        await this.ensureItemImages(newIds)
      } catch (error) {
        console.error('Error loading items page:', error)
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
     * Load missing images via POST /item/images ({ id, image } only).
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

      const toFetch = []
      const waiters = []
      for (const id of missing) {
        const pending = getInflightImage(id)
        if (pending) waiters.push(pending)
        else toFetch.push(id)
      }

      if (toFetch.length) {
        const batchPromise = ItemService.getItemImages(toFetch)
          .then((response) => {
            const rows = response?.data?.data || []
            const found = new Set()
            for (const row of rows) {
              if (row?.id == null) continue
              found.add(String(row.id))
              setCachedItemImage(row.id, row.image || null)
              queuePersistImage(row.id, row.image || null)
            }
            for (const id of toFetch) {
              if (!found.has(String(id))) {
                setCachedItemImage(id, null)
                queuePersistImage(id, null)
              }
            }
            this.itemCacheVersion += 1
          })
          .catch((error) => {
            console.error('Error loading item images:', error)
          })

        for (const id of toFetch) setInflightImage(id, batchPromise)
        waiters.push(batchPromise)
      }

      await Promise.all(waiters)
    }
  }
})
