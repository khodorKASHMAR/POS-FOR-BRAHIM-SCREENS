import { onBeforeUnmount, watch } from 'vue'

/**
 * Observe a sentinel element; call loadMore when it intersects the viewport.
 * @param {import('vue').Ref<Element|null>} sentinelRef
 * @param {() => void|Promise<void>} loadMore
 * @param {import('vue').Ref<boolean>|(() => boolean)} [canLoadMore]
 */
export function useInfiniteScroll(sentinelRef, loadMore, canLoadMore = () => true) {
  let observer = null

  const enabled = () => {
    if (typeof canLoadMore === 'function') return !!canLoadMore()
    return !!canLoadMore?.value
  }

  const setup = () => {
    if (typeof IntersectionObserver === 'undefined') return
    if (observer) {
      observer.disconnect()
      observer = null
    }
    const el = sentinelRef?.value
    if (!el) return
    observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting)
        if (hit && enabled()) {
          Promise.resolve(loadMore()).catch(() => {})
        }
      },
      { root: null, rootMargin: '200px', threshold: 0 }
    )
    observer.observe(el)
  }

  watch(
    () => sentinelRef?.value,
    () => setup(),
    { immediate: true, flush: 'post' }
  )

  onBeforeUnmount(() => {
    if (observer) {
      observer.disconnect()
      observer = null
    }
  })

  return { refresh: setup }
}
