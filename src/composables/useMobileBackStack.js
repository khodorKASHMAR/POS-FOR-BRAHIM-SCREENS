import { computed, inject, onUnmounted, toValue, watch } from 'vue'
import { useState } from '../store/state'

export const MOBILE_BACK_KEY = Symbol('mobileBackStack')

/**
 * History stack so Android/iOS hardware back closes overlays instead of leaving the page.
 * Opening an overlay pushes a same-URL history entry; back pops it and runs `close`.
 */
export function createMobileBackStack() {
  const stack = []
  let skipPops = 0
  const idleWaiters = []

  function notifyIdle() {
    if (skipPops > 0) return
    while (idleWaiters.length) idleWaiters.shift()?.()
  }

  function onPopState() {
    if (skipPops > 0) {
      skipPops -= 1
      notifyIdle()
      return
    }
    const layer = stack.pop()
    if (!layer) return
    layer.fromPop = true
    try {
      layer.close()
    } finally {
      layer.fromPop = false
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('popstate', onPopState)
  }

  function consumeDummy() {
    skipPops += 1
    const wait = new Promise((resolve) => idleWaiters.push(resolve))
    history.back()
    notifyIdle()
    return wait
  }

  return {
    register(close) {
      const layer = { close, fromPop: false }
      stack.push(layer)
      history.pushState(
        {
          ...(history.state && typeof history.state === 'object' ? history.state : {}),
          mobileOverlay: Date.now()
        },
        ''
      )
      return () => {
        const idx = stack.lastIndexOf(layer)
        if (idx === -1) return Promise.resolve()
        stack.splice(idx, 1)
        if (layer.fromPop) return Promise.resolve()
        return consumeDummy()
      }
    },
    waitForPendingBack() {
      if (skipPops <= 0) return Promise.resolve()
      return new Promise((resolve) => idleWaiters.push(resolve))
    },
    dispose() {
      if (typeof window === 'undefined') return
      window.removeEventListener('popstate', onPopState)
    }
  }
}

/**
 * Bind an overlay's open state to the hardware back stack.
 * No-op on desktop (inject missing).
 */
export function useMobileOverlayBack(open, close) {
  const stack = inject(MOBILE_BACK_KEY, null)
  let unregister = null

  watch(
    () => toValue(open),
    (isOpen) => {
      if (!stack) return
      if (isOpen) {
        if (!unregister) unregister = stack.register(close)
        return
      }
      if (unregister) {
        unregister()
        unregister = null
      }
    },
    { immediate: true }
  )

  onUnmounted(() => {
    if (unregister) {
      unregister()
      unregister = null
    }
  })
}

export function useNavArrowIcon() {
  const state = useState()
  return computed(() => (state.dir === 'rtl' ? 'mdi-chevron-right' : 'mdi-chevron-left'))
}
