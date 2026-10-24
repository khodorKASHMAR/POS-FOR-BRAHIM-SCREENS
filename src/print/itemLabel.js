import JsBarcode from 'jsbarcode'
import { canvasToRaster } from './escpos'
import { LABEL_OFFSET_STORAGE_KEY, LABEL_TEXT_SIZE_STORAGE_KEY, printLabelBytes } from './thermalPrinter'
import { isDollarCurrency } from '../constants/currency'

const DOTS_PER_MM = 8
export const LABEL_WIDTH_MM = 58
export const LABEL_HEIGHT_MM = 40
const LABEL_GAP_MM = 2
const LABEL_WIDTH = LABEL_WIDTH_MM * DOTS_PER_MM
const LABEL_HEIGHT = LABEL_HEIGHT_MM * DOTS_PER_MM
export const MAX_LABEL_COPIES = 100

/** The design is centered on the label with equal margins, then moved by the user's offset. */
const MARGIN_X = 54
const MARGIN_Y = 32
const CONTENT_LEFT = MARGIN_X
const CONTENT_RIGHT = LABEL_WIDTH - MARGIN_X
const CONTENT_TOP = MARGIN_Y
const CONTENT_BOTTOM = LABEL_HEIGHT - MARGIN_Y

/**
 * Where the XP-365B actually places the image on the sticker differs from the label origin, so the
 * printed bitmap is shifted by this many dots (8 dots = 1 mm; negative X = left, positive Y = down)
 * to land centered. Keep |offset| within the margins above or the shifted content gets clipped
 * (the printer ignores the TSPL SHIFT command, so the bitmap is the only way to move it).
 */
const PRINTER_OFFSET_X = -18
const PRINTER_OFFSET_Y = 2
const PRINT_THRESHOLD = 160

/** The user's offset moves the whole design in whole mm (positive X = right, positive Y = down). */
export const LABEL_OFFSET_STEP_MM = 1
const BARCODE_QUIET_ZONE = 16
const BARCODE_BAR_HEIGHT = 72
const FONT_FAMILY = '"Segoe UI", Tahoma, Arial, sans-serif'
const NAME_MAX_SIZE = 34
const BILINGUAL_MAX_SIZE = 28
const NAME_MIN_SIZE = 12
const NAME_LINE_HEIGHT = 1.15
const NAME_BLOCK_GAP = 4
const NAME_FOOTER_GAP = 10
const PRICE_SIZE = 30
const PRICE_BARCODE_GAP = 6

/** Text size as a percentage of the default name and price sizes. */
export const LABEL_TEXT_SIZE_DEFAULT = 100
export const LABEL_TEXT_SIZE_MIN = 60
export const LABEL_TEXT_SIZE_MAX = 150
export const LABEL_TEXT_SIZE_STEP = 10

const clampTextSize = (value) =>
  Math.min(LABEL_TEXT_SIZE_MAX, Math.max(LABEL_TEXT_SIZE_MIN, Math.round(Number(value)) || LABEL_TEXT_SIZE_DEFAULT))

export function getLabelTextSize() {
  return clampTextSize(localStorage.getItem(LABEL_TEXT_SIZE_STORAGE_KEY) ?? LABEL_TEXT_SIZE_DEFAULT)
}

export function saveLabelTextSize(value) {
  const size = clampTextSize(value)
  if (size === LABEL_TEXT_SIZE_DEFAULT) localStorage.removeItem(LABEL_TEXT_SIZE_STORAGE_KEY)
  else localStorage.setItem(LABEL_TEXT_SIZE_STORAGE_KEY, String(size))
}

export function formatLabelPrice(price, currency, rtl) {
  const num = Number(price)
  if (!Number.isFinite(num)) return ''
  const dollar = isDollarCurrency(currency)
  const formatted = dollar ? num.toFixed(2) : Math.round(num).toLocaleString('en-US')
  if (rtl) return `${dollar ? 'دولار' : 'ل.ل.'}\u200E ${formatted}`
  return `${formatted} ${dollar ? 'USD' : 'LBP'}`
}

/** A single word wider than the label is split by characters so nothing is ever cut off. */
function splitLongWord(ctx, word, maxWidth) {
  const parts = []
  let part = ''
  for (const char of word) {
    if (part && ctx.measureText(part + char).width > maxWidth) {
      parts.push(part)
      part = char
    } else {
      part += char
    }
  }
  if (part) parts.push(part)
  return parts
}

function wrapLines(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate
      continue
    }
    if (line) lines.push(line)
    if (ctx.measureText(word).width <= maxWidth) {
      line = word
    } else {
      const parts = splitLongWord(ctx, word, maxWidth)
      line = parts.pop()
      lines.push(...parts)
    }
  }
  if (line) lines.push(line)
  return lines
}

/**
 * Largest common font size at which every name, wrapped to as many lines as needed, fits the box.
 * Names are never truncated; below the minimum size the text may overflow instead.
 */
function fitNames(ctx, names, maxWidth, maxHeight, maxSize) {
  let blocks = []
  for (let size = maxSize; size >= NAME_MIN_SIZE; size--) {
    ctx.font = `bold ${size}px ${FONT_FAMILY}`
    const lineHeight = Math.round(size * NAME_LINE_HEIGHT)
    blocks = names.map(({ text, rtl }) => {
      ctx.direction = rtl ? 'rtl' : 'ltr'
      return { rtl, size, lineHeight, lines: wrapLines(ctx, text, maxWidth) }
    })
    const height =
      blocks.reduce((sum, b) => sum + b.lineHeight * b.lines.length, 0) + NAME_BLOCK_GAP * (blocks.length - 1)
    if (height <= maxHeight) break
  }
  return blocks
}

/** Widest whole-dot module that fits, so every bar is an exact number of print dots. */
function renderBarcode(value) {
  const maxWidth = CONTENT_RIGHT - CONTENT_LEFT - BARCODE_QUIET_ZONE * 2
  let canvas = null
  for (const moduleWidth of [3, 2, 1]) {
    canvas = document.createElement('canvas')
    JsBarcode(canvas, value, {
      format: 'CODE128',
      width: moduleWidth,
      height: BARCODE_BAR_HEIGHT,
      displayValue: true,
      font: 'Arial',
      fontOptions: 'bold',
      fontSize: 24,
      textMargin: 2,
      margin: 0,
      background: '#ffffff',
      lineColor: '#000000'
    })
    if (canvas.width <= maxWidth) break
  }
  return canvas
}

/** Largest size up to `maxSize` at which the single-line text fits the width. */
function fitLine(ctx, text, maxWidth, maxSize) {
  let size = maxSize
  for (; size > NAME_MIN_SIZE; size--) {
    ctx.font = `bold ${size}px ${FONT_FAMILY}`
    if (ctx.measureText(text).width <= maxWidth) break
  }
  ctx.font = `bold ${size}px ${FONT_FAMILY}`
  return size
}

/**
 * Draw the label at printer resolution (1 canvas px = 1 dot at 203 dpi). Names, price and barcode
 * form one block centered on the label; names wrap and shrink together until the block fits.
 * @param {{ names: { text: string, rtl: boolean }[], barcode: string, price?: string, textSize?: number }} content
 *   `textSize` is a percentage of the default text size.
 * @returns {{ canvas: HTMLCanvasElement, namesShrunk: boolean }} `namesShrunk` when the names had
 *   to go below the requested size, so a larger text size would not change them.
 */
function renderItemLabel({ names, barcode, price, textSize = getLabelTextSize() }) {
  const canvas = document.createElement('canvas')
  canvas.width = LABEL_WIDTH
  canvas.height = LABEL_HEIGHT
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, LABEL_WIDTH, LABEL_HEIGHT)
  ctx.fillStyle = '#000000'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const centerX = (CONTENT_LEFT + CONTENT_RIGHT) / 2
  const contentWidth = CONTENT_RIGHT - CONTENT_LEFT
  const scale = clampTextSize(textSize) / 100

  const barcodeCanvas = renderBarcode(barcode)
  ctx.direction = 'ltr'
  const priceSize = price ? fitLine(ctx, price, contentWidth, Math.round(PRICE_SIZE * scale)) : 0
  const footerHeight = barcodeCanvas.height + (price ? priceSize + PRICE_BARCODE_GAP : 0)

  const visibleNames = names.map((n) => ({ ...n, text: n.text.trim() })).filter((n) => n.text)
  const nameMaxSize = Math.round((visibleNames.length > 1 ? BILINGUAL_MAX_SIZE : NAME_MAX_SIZE) * scale)
  const blocks = fitNames(
    ctx,
    visibleNames,
    contentWidth,
    CONTENT_BOTTOM - CONTENT_TOP - footerHeight - NAME_FOOTER_GAP,
    nameMaxSize
  )
  const namesHeight = blocks.length
    ? blocks.reduce((sum, b) => sum + b.lineHeight * b.lines.length, 0) +
      NAME_BLOCK_GAP * (blocks.length - 1) +
      NAME_FOOTER_GAP
    : 0

  let y = CONTENT_TOP + Math.max(0, (CONTENT_BOTTOM - CONTENT_TOP - namesHeight - footerHeight) / 2)
  for (const block of blocks) {
    ctx.direction = block.rtl ? 'rtl' : 'ltr'
    ctx.font = `bold ${block.size}px ${FONT_FAMILY}`
    for (const line of block.lines) {
      ctx.fillText(line, centerX, y + block.lineHeight / 2)
      y += block.lineHeight
    }
    y += NAME_BLOCK_GAP
  }
  if (blocks.length) y += NAME_FOOTER_GAP - NAME_BLOCK_GAP

  if (price) {
    ctx.direction = 'ltr'
    ctx.font = `bold ${priceSize}px ${FONT_FAMILY}`
    ctx.fillText(price, centerX, y + priceSize / 2)
    y += priceSize + PRICE_BARCODE_GAP
  }
  ctx.drawImage(barcodeCanvas, Math.floor(centerX - barcodeCanvas.width / 2), Math.round(y))

  return { canvas, namesShrunk: blocks.some((b) => b.size < nameMaxSize) }
}

export function getLabelOffset() {
  try {
    const saved = JSON.parse(localStorage.getItem(LABEL_OFFSET_STORAGE_KEY))
    return { x: Math.round(Number(saved?.x) || 0), y: Math.round(Number(saved?.y) || 0) }
  } catch {
    return { x: 0, y: 0 }
  }
}

export function saveLabelOffset(offset) {
  if (!offset.x && !offset.y) localStorage.removeItem(LABEL_OFFSET_STORAGE_KEY)
  else localStorage.setItem(LABEL_OFFSET_STORAGE_KEY, JSON.stringify({ x: offset.x, y: offset.y }))
}

function inkBounds(canvas) {
  const { width, height } = canvas
  const { data } = canvas.getContext('2d').getImageData(0, 0, width, height)
  let left = width
  let right = -1
  let top = height
  let bottom = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4] >= PRINT_THRESHOLD) continue
      if (x < left) left = x
      if (x > right) right = x
      if (y < top) top = y
      bottom = y
    }
  }
  return right < 0 ? null : { left, right, top, bottom }
}

/**
 * Offsets (whole mm) the design can move by while every dark dot stays on the label and inside
 * the printed bitmap once the printer offset is applied, so nothing is ever clipped.
 */
function offsetRange(canvas) {
  const ink = inkBounds(canvas)
  if (!ink) return { minX: 0, maxX: 0, minY: 0, maxY: 0 }
  const lowX = Math.max(0, -PRINTER_OFFSET_X)
  const highX = Math.min(LABEL_WIDTH, LABEL_WIDTH - PRINTER_OFFSET_X) - 1
  const lowY = Math.max(0, -PRINTER_OFFSET_Y)
  const highY = Math.min(LABEL_HEIGHT, LABEL_HEIGHT - PRINTER_OFFSET_Y) - 1
  return {
    minX: Math.min(0, Math.ceil((lowX - ink.left) / DOTS_PER_MM)),
    maxX: Math.max(0, Math.floor((highX - ink.right) / DOTS_PER_MM)),
    minY: Math.min(0, Math.ceil((lowY - ink.top) / DOTS_PER_MM)),
    maxY: Math.max(0, Math.floor((highY - ink.bottom) / DOTS_PER_MM))
  }
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

function shiftCanvas(source, dx, dy) {
  if (!dx && !dy) return source
  const canvas = document.createElement('canvas')
  canvas.width = LABEL_WIDTH
  canvas.height = LABEL_HEIGHT
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, LABEL_WIDTH, LABEL_HEIGHT)
  ctx.drawImage(source, dx, dy)
  return canvas
}

/**
 * The label as it lands on the sticker after the user's nudge. The requested offset is clamped to
 * what this content allows; `offset` is the one actually applied and `range` its limits.
 */
export function layoutItemLabel(content, requested = getLabelOffset()) {
  const { canvas: base, namesShrunk } = renderItemLabel(content)
  const range = offsetRange(base)
  const offset = {
    x: clamp(Math.round(requested.x) || 0, range.minX, range.maxX),
    y: clamp(Math.round(requested.y) || 0, range.minY, range.maxY)
  }
  return { canvas: shiftCanvas(base, offset.x * DOTS_PER_MM, offset.y * DOTS_PER_MM), offset, range, namesShrunk }
}

const ascii = (text) => new TextEncoder().encode(text)

/** TSPL job for a gap-sensed label roll; TSPL bitmaps use 0 for a printed (black) dot. */
export function buildLabelJob(canvas, copies = 1) {
  const { widthBytes, height, bits } = canvasToRaster(shiftCanvas(canvas, PRINTER_OFFSET_X, PRINTER_OFFSET_Y), {
    width: LABEL_WIDTH,
    threshold: PRINT_THRESHOLD
  })
  const inverted = bits.map((b) => ~b & 0xff)
  const header = ascii(
    [
      // Ends any partial command left in the parser (e.g. receipt bytes sent while in label mode).
      '',
      `SIZE ${LABEL_WIDTH_MM} mm,${LABEL_HEIGHT_MM} mm`,
      `GAP ${LABEL_GAP_MM} mm,0 mm`,
      'DIRECTION 1,0',
      'REFERENCE 0,0',
      'CLS',
      `BITMAP 0,0,${widthBytes},${height},0,`
    ].join('\r\n')
  )
  const footer = ascii(`\r\nPRINT ${Math.max(1, Math.min(MAX_LABEL_COPIES, Math.floor(copies)))},1\r\n`)
  const job = new Uint8Array(header.length + inverted.length + footer.length)
  job.set(header, 0)
  job.set(inverted, header.length)
  job.set(footer, header.length + inverted.length)
  return job
}

export function printItemLabel(content, copies, offset = getLabelOffset()) {
  return printLabelBytes(buildLabelJob(layoutItemLabel(content, offset).canvas, copies))
}

/** Feeds a few labels so the printer measures the label length and gap of the loaded roll. */
export function calibrateLabelPrinter() {
  return printLabelBytes(
    ascii(['', `SIZE ${LABEL_WIDTH_MM} mm,${LABEL_HEIGHT_MM} mm`, `GAP ${LABEL_GAP_MM} mm,0 mm`, 'GAPDETECT', ''].join('\r\n'))
  )
}
