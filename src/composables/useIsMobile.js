import { ref } from 'vue'

/**
 * Detect phone/tablet from the browser User-Agent (same signal backends see).
 * Not based on window width — resizing a desktop browser will NOT switch UI.
 */
const MOBILE_UA_RE =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i

export function detectMobileFromUserAgent(ua = '') {
  const agent = String(ua || '')
  if (!agent) return false

  // Prefer Client Hints when available (Chromium)
  try {
    const ch = typeof navigator !== 'undefined' ? navigator.userAgentData : null
    if (ch && typeof ch.mobile === 'boolean') {
      return ch.mobile === true || /Android|iPad|Tablet/i.test(agent)
    }
  } catch {
    /* ignore */
  }

  return MOBILE_UA_RE.test(agent)
}

function readIsMobile() {
  if (typeof navigator === 'undefined') return false
  return detectMobileFromUserAgent(navigator.userAgent)
}

/** Singleton — UA does not change during a session. */
let shared = null

export function useIsMobile() {
  if (!shared) {
    shared = ref(readIsMobile())
  }
  return shared
}

export function isMobileDevice() {
  return readIsMobile()
}
