import { inject } from 'vue'
import { findItemByBarcode, normalizeBarcode } from '../utils/barcode'

/**
 * @param {{
 *   getItems: () => any[],
 *   addItem: (item: any) => void,
 *   getItemName: (item: any) => string,
 *   $t: (key: string) => string,
 *   findRemote?: (barcode: string) => Promise<any|null>
 * }} options
 */
export function useBarcodeCart({ getItems, addItem, getItemName, $t, findRemote }) {
  const $notification = inject('$notification')
  let lastCode = ''
  let lastAt = 0
  let inflight = false

  async function ingestBarcode(rawCode, { silent } = {}) {
    const code = normalizeBarcode(rawCode)
    if (!code) return null

    const now = Date.now()
    if (code === lastCode && now - lastAt < 900) return null
    lastCode = code
    lastAt = now

    let item = findItemByBarcode(getItems(), code)
    if (!item && typeof findRemote === 'function' && !inflight) {
      inflight = true
      try {
        item = await findRemote(code)
      } finally {
        inflight = false
      }
    }

    if (!item) {
      if (typeof $notification === 'function') {
        $notification($t('barcodeNotFound'), 'error', 2800)
      }
      return null
    }

    addItem(item)
    if (!silent && typeof $notification === 'function') {
      const name = getItemName(item)
      $notification(name ? `${$t('itemScanned')}: ${name}` : $t('itemScanned'), 'success', 1600)
    }
    return item
  }

  return { ingestBarcode }
}
