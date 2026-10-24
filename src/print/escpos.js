const ESC = 0x1b
const GS = 0x1d

/** Printable width of an 80mm head at 203 dpi (XP-Q807K and most 80mm ESC/POS printers). */
export const PRINTER_DOTS = 576

/** Rows per GS v 0 command; small bands keep the printer's input buffer from overflowing. */
const RASTER_BAND_ROWS = 128

/**
 * Scale a canvas to the printer width and convert it to a 1-bit raster (1 = black dot).
 * @param {HTMLCanvasElement} source
 * @param {{ width?: number, threshold?: number }} [options]
 */
export function canvasToRaster(source, { width = PRINTER_DOTS, threshold = 170 } = {}) {
  const height = Math.max(1, Math.round(source.height * (width / source.width)))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(source, 0, 0, width, height)

  const { data } = ctx.getImageData(0, 0, width, height)
  const widthBytes = Math.ceil(width / 8)
  const bits = new Uint8Array(widthBytes * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      if (data[i + 3] < 128) continue
      const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      if (luminance < threshold) bits[y * widthBytes + (x >> 3)] |= 0x80 >> (x & 7)
    }
  }
  return { widthBytes, height, bits }
}

function concat(parts) {
  const total = parts.reduce((sum, p) => sum + p.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const p of parts) {
    out.set(p, offset)
    offset += p.length
  }
  return out
}

/**
 * ESC/POS job: initialize, print the raster, feed and cut.
 * @param {{ widthBytes: number, height: number, bits: Uint8Array }} raster
 * @param {{ feedLines?: number, cut?: boolean }} [options]
 */
export function buildRasterJob(raster, { feedLines = 4, cut = true } = {}) {
  const { widthBytes, height, bits } = raster
  const parts = [Uint8Array.of(ESC, 0x40)]
  for (let y = 0; y < height; y += RASTER_BAND_ROWS) {
    const rows = Math.min(RASTER_BAND_ROWS, height - y)
    parts.push(
      Uint8Array.of(GS, 0x76, 0x30, 0, widthBytes & 0xff, widthBytes >> 8, rows & 0xff, rows >> 8),
      bits.subarray(y * widthBytes, (y + rows) * widthBytes)
    )
  }
  parts.push(Uint8Array.of(ESC, 0x64, feedLines))
  if (cut) parts.push(Uint8Array.of(GS, 0x56, 66, 0))
  return concat(parts)
}
