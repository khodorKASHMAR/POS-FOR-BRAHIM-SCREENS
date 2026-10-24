import { nextTick, onBeforeUnmount, watch } from 'vue'

/** Closest ancestor that actually scrolls, so margins apply inside panels like Add Items. */
function nearestScrollParent(el) {
  let node = el?.parentElement || null
  while (node && node !== document.documentElement) {
    const overflowY = window.getComputedStyle(node).overflowY
    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') return node
    node = node.parentElement
  }
  return null
}

/**
 * Apply a synchronous list change while keeping the first visible child of `container` at the same
 * screen position, so rows added or evicted above the viewport do not make the grid jump.
 * The scroll parent needs `overflow-anchor: none` so the browser does not adjust a second time.
 * @param {Element|null} container
 * @param {() => void} mutate
 */
export async function keepScrollAnchor(container, mutate) {
  if (!container) {
    mutate()
    return
  }
  const scroller = nearestScrollParent(container)
  const viewTop = scroller ? scroller.getBoundingClientRect().top : 0
  const anchor = Array.from(container.children).find((el) => el.getBoundingClientRect().bottom > viewTop)
  const before = anchor?.getBoundingClientRect().top
  mutate()
  await nextTick()
  if (!anchor?.isConnected) return
  const delta = anchor.getBoundingClientRect().top - before
  if (!delta) return
  if (scroller) scroller.scrollTop += delta
  else window.scrollBy(0, delta)
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

  // The observer only fires when the sentinel crosses the root margin. A hit ignored while a page
  // was loading never fires again if the sentinel stays in range, so re-observe once loading is
  // allowed again; a fresh observer always reports the current intersection.
  watch(enabled, (on) => {
    if (on) setup()
  }, { flush: 'post' })

  onBeforeUnmount(() => {
    if (observer) {
      observer.disconnect()
      observer = null
    }
  })

  return { refresh: setup }
}
