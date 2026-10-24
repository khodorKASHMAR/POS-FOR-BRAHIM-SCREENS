import { inject } from 'vue'
import ItemService from '../services/ItemService'
import { normalizeBarcode } from '../utils/barcode'

async function findItemByBarcode(code) {
  try {
    const response = await ItemService.getItemByBarcode(code)
    return response?.data?.data
  } catch {
    return null
  }
}

/**
 * @param {{
 *   addItem: (item: any) => void,
 *   getItemName: (item: any) => string,
 *   $t: (key: string) => string
 * }} options
 */
export function useBarcodeCart({ addItem, getItemName, $t }) {
  const $notification = inject('$notification')
  let lastCode = ''
  let lastAt = 0
  let inflight = false

  async function ingestBarcode(rawCode, { silent } = {}) {
    const code = normalizeBarcode(rawCode)
    if (!code || inflight) return null

    const now = Date.now()
    if (code === lastCode && now - lastAt < 900) return null
    lastCode = code
    lastAt = now

    inflight = true
    let item
    try {
      item = await findItemByBarcode(code)
    } finally {
      inflight = false
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
