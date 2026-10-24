/**
 * Catalog of print template block types and their editable fields.
 * `toggleable` blocks can be switched off; the rest are always printed.
 * Boolean fields are shown in chip rows by `group`; missing values fall back to `default` (true when unset).
 * Within a group, at least one `requireOne` field must stay on. `dependsOn` disables a chip while that field is off.
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
      { key: 'showBasePrice', labelKey: 'showBasePrice', input: 'boolean', group: 'itemLineDetails' },
      { key: 'showDiscount', labelKey: 'showItemDiscount', input: 'boolean', group: 'itemLineDetails' },
      { key: 'showPriceAfterDiscount', labelKey: 'showPriceAfterDiscount', input: 'boolean', group: 'itemLineDetails' },
      {
        key: 'boldBasePrice',
        labelKey: 'showBasePrice',
        input: 'boolean',
        group: 'boldItemDetails',
        default: false,
        dependsOn: 'showBasePrice'
      },
      {
        key: 'boldDiscount',
        labelKey: 'showItemDiscount',
        input: 'boolean',
        group: 'boldItemDetails',
        default: false,
        dependsOn: 'showDiscount'
      },
      {
        key: 'boldPriceAfterDiscount',
        labelKey: 'showPriceAfterDiscount',
        input: 'boolean',
        group: 'boldItemDetails',
        default: false,
        dependsOn: 'showPriceAfterDiscount'
      }
    ]
  },
  TOTALS: {
    type: 'TOTALS',
    labelKey: 'printBlockTotals',
    icon: 'mdi-cash',
    toggleable: false,
    fields: [
      { key: 'showTotalLbp', labelKey: 'totalInLbp', input: 'boolean', group: 'totalCurrencies', requireOne: true },
      { key: 'showTotalUsd', labelKey: 'totalInUsd', input: 'boolean', group: 'totalCurrencies', requireOne: true },
      { key: 'showCurrencyRate', labelKey: 'dollarRate', input: 'boolean', group: 'totalsExtraDetails' }
    ]
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

/** Base receipt font size in px; keep in sync with PrintTemplateServiceImpl. */
export const RECEIPT_FONT_SIZE = { min: 10, max: 18, default: 12 }

export function normalizeFontSize(value) {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return RECEIPT_FONT_SIZE.default
  return Math.min(RECEIPT_FONT_SIZE.max, Math.max(RECEIPT_FONT_SIZE.min, n))
}

export function blockMeta(type) {
  return BLOCK_TYPES[type] || { type, labelKey: type, icon: 'mdi-puzzle-outline', toggleable: true, fields: [] }
}

export function isFieldOn(props, field) {
  const value = props?.[field.key]
  return value == null ? field.default !== false : value !== false
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
