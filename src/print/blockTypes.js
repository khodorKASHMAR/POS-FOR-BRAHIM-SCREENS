/**
 * Catalog of print template block types and their editable fields.
 * BARCODE is reserved for ITEM_LABEL templates (future).
 */
export const BLOCK_TYPES = {
  HEADER: {
    type: 'HEADER',
    labelKey: 'printBlockHeader',
    icon: 'mdi-storefront-outline',
    fields: [
      { key: 'shopName', labelKey: 'shopName', input: 'text' },
      { key: 'shopNameAr', labelKey: 'shopNameAr', input: 'text' },
      { key: 'address', labelKey: 'shopAddress', input: 'text' },
      { key: 'addressAr', labelKey: 'shopAddressAr', input: 'text' },
      { key: 'phone', labelKey: 'shopPhone', input: 'text' }
    ]
  },
  META: {
    type: 'META',
    labelKey: 'printBlockMeta',
    icon: 'mdi-information-outline',
    fields: []
  },
  ITEMS: {
    type: 'ITEMS',
    labelKey: 'printBlockItems',
    icon: 'mdi-cart-outline',
    fields: [
      { key: 'showDiscount', labelKey: 'showItemDiscount', input: 'boolean' }
    ]
  },
  TOTALS: {
    type: 'TOTALS',
    labelKey: 'printBlockTotals',
    icon: 'mdi-cash',
    fields: []
  },
  PAYMENT: {
    type: 'PAYMENT',
    labelKey: 'printBlockPayment',
    icon: 'mdi-credit-card-outline',
    fields: []
  },
  CUSTOM_TEXT: {
    type: 'CUSTOM_TEXT',
    labelKey: 'printBlockCustomText',
    icon: 'mdi-text',
    fields: [
      { key: 'textEn', labelKey: 'customTextEn', input: 'textarea' },
      { key: 'textAr', labelKey: 'customTextAr', input: 'textarea' }
    ]
  },
  FOOTER: {
    type: 'FOOTER',
    labelKey: 'printBlockFooter',
    icon: 'mdi-page-layout-footer',
    fields: [
      { key: 'footerEn', labelKey: 'footerTextEn', input: 'text' },
      { key: 'footerAr', labelKey: 'footerTextAr', input: 'text' }
    ]
  },
  BARCODE: {
    type: 'BARCODE',
    labelKey: 'printBlockBarcode',
    icon: 'mdi-barcode',
    fields: [
      { key: 'valueField', labelKey: 'barcodeValueField', input: 'text' },
      { key: 'showName', labelKey: 'showItemName', input: 'boolean' },
      { key: 'showPrice', labelKey: 'showItemPrice', input: 'boolean' }
    ]
  }
}

export const RECEIPT_BLOCK_ORDER = [
  'HEADER',
  'META',
  'ITEMS',
  'TOTALS',
  'PAYMENT',
  'CUSTOM_TEXT',
  'FOOTER'
]

export function blockMeta(type) {
  return BLOCK_TYPES[type] || { type, labelKey: type, icon: 'mdi-puzzle-outline', fields: [] }
}
