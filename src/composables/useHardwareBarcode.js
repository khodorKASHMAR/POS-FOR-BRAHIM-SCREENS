import { onMounted, onUnmounted, unref } from 'vue'

/**
 * USB / Bluetooth barcode readers act as a keyboard: they dump characters
 * in a burst and finish with Enter. Human typing is much slower, so we
 * only treat a burst + Enter as a scan.
 */
export function useHardwareBarcode(onScan, options = {}) {
  const interKeyMs = options.interKeyMs ?? 55
  const minLength = options.minLength ?? 4
  const maxLength = options.maxLength ?? 64
  const idleResetMs = options.idleResetMs ?? 90

  let buffer = ''
  let lastTs = 0

  function isEnabled() {
    const value = options.enabled
    if (value == null) return true
    if (typeof value === 'function') return Boolean(value())
    return Boolean(unref(value))
  }

  function handler(event) {
    if (!isEnabled()) {
      buffer = ''
      return
    }

    const now = Date.now()
    if (now - lastTs > idleResetMs) buffer = ''

    if (event.key === 'Enter' || event.key === 'Tab') {
      const code = buffer
      const isBurst = code.length >= minLength && now - lastTs <= idleResetMs
      buffer = ''
      lastTs = now
      if (!isBurst) return
      event.preventDefault()
      event.stopPropagation()
      onScan(code)
      return
    }

    if (event.key.length !== 1 || event.ctrlKey || event.altKey || event.metaKey) {
      lastTs = now
      return
    }

    const isBurst = buffer.length >= 1 && now - lastTs <= interKeyMs
    if (isBurst) {
      event.preventDefault()
      event.stopPropagation()
    }

    buffer += event.key
    lastTs = now
    if (buffer.length > maxLength) buffer = ''
  }

  onMounted(() => {
    window.addEventListener('keydown', handler, true)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handler, true)
  })
}
