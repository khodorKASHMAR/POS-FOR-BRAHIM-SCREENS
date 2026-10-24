import { computed, ref, shallowRef } from 'vue'
import ItemService from '../services/ItemService'
import { ITEMS_MAX_PAGES, ITEMS_PAGE_SIZE, ITEMS_WINDOW_ENABLED } from '../constants/itemsPaging'

export { ITEMS_PAGE_SIZE }

/**
 * Backend-paged item list for catalog grids. Every page comes from the server.
 * With windowing on, at most `maxPages` consecutive pages stay in memory: scrolling down evicts the
 * top page, and loadPrevious refetches evicted pages when scrolling back up (evicting the bottom one).
 * @param {object} [options]
 * @param {boolean} [options.windowEnabled]
 * @param {number} [options.maxPages]
 * @param {(mutate: () => void) => void|Promise<void>} [options.applyChange] wraps window changes so the
 *   caller can keep the scroll position stable while rows are added or evicted above the viewport.
 */
export function useItemsPager({
  windowEnabled = ITEMS_WINDOW_ENABLED,
  maxPages = ITEMS_MAX_PAGES,
  applyChange = (mutate) => mutate()
} = {}) {
  const windowPages = shallowRef([])
  const firstPage = ref(0)
  const totalPages = ref(1)
  const loading = ref(false)
  const previousBlocked = ref(false)
  let filters = { categoryId: null, query: '' }
  let requestSeq = 0

  const lastPage = () => firstPage.value + windowPages.value.length - 1

  const items = computed(() => {
    const seen = new Set()
    const out = []
    for (const rows of windowPages.value) {
      for (const row of rows) {
        const id = String(row.id)
        if (seen.has(id)) continue
        seen.add(id)
        out.push(row)
      }
    }
    return out
  })

  const hasMore = computed(() => firstPage.value + windowPages.value.length < totalPages.value)
  const hasPrevious = computed(() => firstPage.value > 0 && !previousBlocked.value)

  async function fetchPage(pageIndex, seq) {
    loading.value = true
    try {
      const response = await ItemService.getUserItems({
        ...filters,
        page: pageIndex,
        size: ITEMS_PAGE_SIZE
      })
      if (seq !== requestSeq) return null
      const rows = response?.data?.data || []
      const serverTotalPages = response?.data?.pagination?.totalPages
      if (Number.isFinite(serverTotalPages)) {
        totalPages.value = serverTotalPages
      } else if (pageIndex > lastPage()) {
        totalPages.value = rows.length < ITEMS_PAGE_SIZE ? pageIndex + 1 : pageIndex + 2
      }
      return rows
    } catch (error) {
      if (seq !== requestSeq) return null
      console.error('Error loading items:', error)
      throw error
    } finally {
      if (seq === requestSeq) loading.value = false
    }
  }

  /** Start over from the first page with new filters. */
  async function reload({ categoryId = null, query = '' } = {}) {
    filters = {
      categoryId: categoryId === 'all' ? null : categoryId,
      query: (query || '').trim()
    }
    requestSeq += 1
    const seq = requestSeq
    windowPages.value = []
    firstPage.value = 0
    totalPages.value = 1
    previousBlocked.value = false
    try {
      const rows = await fetchPage(0, seq)
      if (rows) await applyChange(() => { windowPages.value = [rows] })
    } catch {
      totalPages.value = 0
    }
  }

  async function loadMore() {
    if (loading.value || !hasMore.value) return
    const seq = requestSeq
    try {
      const rows = await fetchPage(lastPage() + 1, seq)
      if (!rows) return
      await applyChange(() => {
        const next = [...windowPages.value, rows]
        if (windowEnabled && next.length > maxPages) {
          next.shift()
          firstPage.value += 1
        }
        windowPages.value = next
      })
    } catch {
      // Stop infinite scroll from retrying a failing page in a loop.
      totalPages.value = lastPage() + 1
    }
  }

  async function loadPrevious() {
    if (loading.value || !hasPrevious.value) return
    const seq = requestSeq
    const pageIndex = firstPage.value - 1
    try {
      const rows = await fetchPage(pageIndex, seq)
      if (!rows) return
      await applyChange(() => {
        const next = [rows, ...windowPages.value]
        if (windowEnabled && next.length > maxPages) next.pop()
        firstPage.value = pageIndex
        windowPages.value = next
      })
    } catch {
      previousBlocked.value = true
    }
  }

  function upsertItem(item, previousId = null) {
    if (!item?.id) return
    const matchIds = new Set([String(item.id)])
    if (previousId != null) matchIds.add(String(previousId))
    let replaced = false
    const next = windowPages.value.map((rows) => {
      if (replaced) return rows
      const idx = rows.findIndex((r) => matchIds.has(String(r.id)))
      if (idx < 0) return rows
      replaced = true
      const copy = rows.slice()
      copy.splice(idx, 1, item)
      return copy
    })
    if (!replaced) {
      // New items go to the top of the list; if page 0 is evicted they show up once it is refetched.
      if (firstPage.value !== 0) return
      if (next.length) next[0] = [item, ...next[0]]
      else next.push([item])
    }
    windowPages.value = next
  }

  function removeItem(itemId) {
    const id = String(itemId)
    windowPages.value = windowPages.value.map((rows) => rows.filter((r) => String(r.id) !== id))
  }

  return {
    items,
    loading,
    hasMore,
    hasPrevious,
    reload,
    loadMore,
    loadPrevious,
    upsertItem,
    removeItem
  }
}
