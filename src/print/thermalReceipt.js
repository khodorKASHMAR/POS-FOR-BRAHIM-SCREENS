import { toCanvas } from 'html-to-image'
import { buildRasterJob, canvasToRaster, PRINTER_DOTS } from './escpos'
import { printBytes } from './thermalPrinter'

/**
 * Rasterize a rendered `.thermal-receipt` element and send it to the paired thermal printer.
 * The browser lays out the text, so Arabic shaping and the template layout match the preview.
 * @param {HTMLElement} node
 */
export async function printReceiptElement(node) {
  if (!node) throw new Error('Nothing to print')
  const width = node.offsetWidth || PRINTER_DOTS
  const canvas = await toCanvas(node, {
    backgroundColor: '#ffffff',
    pixelRatio: PRINTER_DOTS / width,
    skipFonts: true,
    style: { border: 'none', margin: '0' }
  })
  await printBytes(buildRasterJob(canvasToRaster(canvas)))
}
