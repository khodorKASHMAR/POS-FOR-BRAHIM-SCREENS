export const ITEMS_PAGE_SIZE = 25

/** When false, every fetched page stays in memory (no page eviction). */
export const ITEMS_WINDOW_ENABLED = import.meta.env.VITE_ITEMS_WINDOW_ENABLED !== 'false'

/** Pages kept in memory when windowing is on; at least 3 so the visible page is never evicted. */
export const ITEMS_MAX_PAGES = Math.max(3, Number(import.meta.env.VITE_ITEMS_MAX_PAGES) || 5)
