/**
 * Catalog of print template block types and their editable fields.
 * `toggleable` blocks can be switched off; the rest are always printed.
 * BARCODE is reserved for ITEM_LABEL templates (future).
 */
export const BLOCK_TYPES = {
  HEADER: {
    type: 'HEADER',
    labelKey: 'printBlockHeader',
    icon: 'mdi-storefront-outline',
    toggleable: true,
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
    toggleable: true,
    fields: []
  },
  ITEMS: {
    type: 'ITEMS',
    labelKey: 'printBlockItems',
    icon: 'mdi-cart-outline',
    toggleable: false,
    fields: [
      { key: 'showBasePrice', labelKey: 'showBasePrice', input: 'boolean' },
      { key: 'showDiscount', labelKey: 'showItemDiscount', input: 'boolean' },
      { key: 'showPriceAfterDiscount', labelKey: 'showPriceAfterDiscount', input: 'boolean' }
    ]
  },
  TOTALS: {
    type: 'TOTALS',
    labelKey: 'printBlockTotals',
    icon: 'mdi-cash',
    toggleable: false,
    fields: []
  },
  PAYMENT: {
    type: 'PAYMENT',
    labelKey: 'printBlockPayment',
    icon: 'mdi-credit-card-outline',
    toggleable: false,
    fields: []
  },
  CUSTOM_TEXT: {
    type: 'CUSTOM_TEXT',
    labelKey: 'printBlockCustomText',
    icon: 'mdi-text',
    toggleable: true,
    fields: [
      { key: 'textEn', labelKey: 'customTextEn', input: 'textarea' },
      { key: 'textAr', labelKey: 'customTextAr', input: 'textarea' }
    ]
  },
  FOOTER: {
    type: 'FOOTER',
    labelKey: 'printBlockFooter',
    icon: 'mdi-page-layout-footer',
    toggleable: true,
    fields: [
      { key: 'footerEn', labelKey: 'footerTextEn', input: 'text' },
      { key: 'footerAr', labelKey: 'footerTextAr', input: 'text' }
    ]
  },
  BARCODE: {
    type: 'BARCODE',
    labelKey: 'printBlockBarcode',
    icon: 'mdi-barcode',
    toggleable: true,
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

export const RECEIPT_CURRENCY_OPTIONS = ['USD', 'LBP', 'SYSTEM']
export const RECEIPT_LANGUAGE_OPTIONS = ['AR', 'EN', 'SYSTEM']

export function blockMeta(type) {
  return BLOCK_TYPES[type] || { type, labelKey: type, icon: 'mdi-puzzle-outline', toggleable: true, fields: [] }
}

/**
 * Receipt blocks in the fixed print order: one per type, missing ones taken from `defaults`,
 * and non-toggleable blocks forced on.
 */
export function normalizeReceiptBlocks(blocks, defaults) {
  const byType = new Map()
  for (const b of blocks || []) {
    if (b?.type && !byType.has(b.type)) byType.set(b.type, b)
  }
  return RECEIPT_BLOCK_ORDER.map((type) => {
    const source = byType.get(type) || defaults.find((d) => d.type === type)
    const fallbackProps = defaults.find((d) => d.type === type)?.props || {}
    return {
      id: source.id,
      type,
      enabled: blockMeta(type).toggleable ? source.enabled !== false : true,
      props: { ...fallbackProps, ...(source.props || {}) }
    }
  })
}
