import { CurrencyEnum } from './enums'

export function isDollarCurrency(c) {
  return Number(c) === CurrencyEnum.DOLLAR
}

export function scaleForCurrency(c) {
  return isDollarCurrency(c) ? 2 : 0
}

/** Half-up style rounding to currency scale (USD 2dp, LBP integer). */
export function roundForCurrency(val, c) {
  const n = Number(val)
  if (!Number.isFinite(n)) return 0
  if (isDollarCurrency(c)) {
    return Math.round(n * 100) / 100
  }
  return Math.round(n)
}

/** Map UI 'USD'/'LBP' or enum 0/1 to CurrencyEnum code. */
export function uiCurrencyToEnum(ui) {
  if (ui === 'LBP' || Number(ui) === CurrencyEnum.LBP) return CurrencyEnum.LBP
  return CurrencyEnum.DOLLAR
}

/** Map enum (or legacy bool-ish) to UI currency string. */
export function enumToUiCurrency(c) {
  if (c === 'LBP' || c === 'USD') return c
  return isDollarCurrency(c) ? 'USD' : 'LBP'
}

/** True when receipt amounts are in USD (supports legacy isReceiptDollar). */
export function isDollarReceipt(receipt) {
  if (receipt == null) return true
  if (receipt.currency != null) return isDollarCurrency(receipt.currency)
  if (receipt.isReceiptDollar != null) return receipt.isReceiptDollar !== false
  return true
}

/** Frozen FX on a receipt (supports legacy dollarRate). */
export function receiptCurrencyRate(receipt, fallback = 1) {
  if (receipt == null) return fallback
  if (receipt.currencyRate != null && receipt.currencyRate !== '') {
    const n = Number(receipt.currencyRate)
    return Number.isFinite(n) && n > 0 ? n : fallback
  }
  if (receipt.dollarRate != null && receipt.dollarRate !== '') {
    const n = Number(receipt.dollarRate)
    return Number.isFinite(n) && n > 0 ? n : fallback
  }
  return fallback
}

/**
 * Convert a catalog unit price from its selling currency into the receipt currency.
 * Same currency: no conversion. USD→LBP: × rate. LBP→USD: ÷ rate.
 */
export function unitPriceInReceiptCurrency(price, itemCurrency, receiptCurrency, rate) {
  const amount = Number(price) || 0
  const from = itemCurrency != null ? Number(itemCurrency) : CurrencyEnum.DOLLAR
  const to = receiptCurrency != null ? Number(receiptCurrency) : CurrencyEnum.DOLLAR
  if (from === to) return roundForCurrency(amount, to)
  const r = Number(rate) > 0 ? Number(rate) : 1
  if (from === CurrencyEnum.DOLLAR && to === CurrencyEnum.LBP) {
    return roundForCurrency(amount * r, CurrencyEnum.LBP)
  }
  if (from === CurrencyEnum.LBP && to === CurrencyEnum.DOLLAR) {
    return roundForCurrency(amount / r, CurrencyEnum.DOLLAR)
  }
  return roundForCurrency(amount, to)
}

/** Display a catalog price in the UI currency toggle. */
export function displayCatalogPrice(price, itemCurrency, uiCurrency, rate) {
  return unitPriceInReceiptCurrency(
    price,
    itemCurrency,
    uiCurrencyToEnum(uiCurrency),
    rate
  )
}
