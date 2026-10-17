import { onBeforeUnmount, watch } from 'vue'

/** Closest ancestor that actually scrolls, so margins apply inside panels like Add Items. */
export function nearestScrollParent(el) {
  let node = el?.parentElement || null
  while (node && node !== document.documentElement) {
    const overflowY = window.getComputedStyle(node).overflowY
    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') return node
    node = node.parentElement
  }
  return null
}

/**
 * Observe a sentinel element; call loadMore when it nears the scroll container.
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
      { root: nearestScrollParent(el), rootMargin: '400px 0px', threshold: 0 }
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
