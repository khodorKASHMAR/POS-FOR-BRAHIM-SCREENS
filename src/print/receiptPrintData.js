import PrintTemplateService from '../services/PrintTemplateService'
import ReceiptService from '../services/ReceiptService'
import { createDefaultReceiptTemplate } from './defaultReceiptTemplate'

export const RECEIPT_TEMPLATE_CODE = 'RECEIPT_80'

function normalizeItemRow(raw) {
  const nested = raw?.item || {}
  return {
    itemId: nested.id ?? raw.itemId,
    itemNameAr: nested.nameAr ?? raw.itemNameAr,
    itemNameEn: nested.nameEn ?? raw.itemNameEn,
    sellingPrice: nested.sellingPrice ?? nested.sellingPriceDollar ?? raw.sellingPrice ?? raw.sellingPriceDollar,
    sellingCurrency: nested.sellingCurrency ?? raw.sellingCurrency ?? 0,
    quantity: raw.quantity,
    itemDiscount: raw.itemDiscount,
    isDiscountPercent: raw.isDiscountPercent,
    subTotal: raw.subTotal
  }
}

/**
 * Everything ReceiptTemplateRenderer needs for one receipt. Falls back to the default template
 * when none is saved; throws when the receipt itself cannot be loaded.
 */
export async function loadReceiptPrintData(receiptId) {
  const [tplRes, detailsRes, itemsRes] = await Promise.all([
    PrintTemplateService.getPrintTemplate(RECEIPT_TEMPLATE_CODE).catch(() => null),
    ReceiptService.getReceiptDetails(receiptId),
    ReceiptService.getReceiptItems(receiptId)
  ])

  const tpl = tplRes?.data?.data
  const template = tpl
    ? { code: tpl.code, paperWidthMm: tpl.paperWidthMm || 80, blocks: tpl.blocks || [] }
    : createDefaultReceiptTemplate()

  const itemsData = itemsRes?.data?.data || {}
  const items = (itemsData.items || []).map(normalizeItemRow)
  const subtotalFromApi = Number(itemsData.itemsSubtotal)
  const itemsSubtotal = Number.isFinite(subtotalFromApi) && subtotalFromApi > 0
    ? subtotalFromApi
    : items.reduce((sum, row) => sum + (Number(row.subTotal) || 0), 0)

  return {
    template,
    details: detailsRes?.data?.data || null,
    items,
    itemsSubtotal
  }
}
