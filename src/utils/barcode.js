export function normalizeBarcode(value) {
  return String(value || '').trim()
}

export function barcodesMatch(a, b) {
  const left = normalizeBarcode(a)
  const right = normalizeBarcode(b)
  if (!left || !right) return false
  if (left === right) return true
  const strippedLeft = left.replace(/^0+/, '')
  const strippedRight = right.replace(/^0+/, '')
  return Boolean(strippedLeft) && strippedLeft === strippedRight
}

export function findItemByBarcode(items, code) {
  const needle = normalizeBarcode(code)
  if (!needle) return null
  const list = Array.isArray(items) ? items : []
  return list.find((item) => barcodesMatch(item?.barcode, needle)) || null
}

const DETECTOR_FORMATS = [
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
  'code_39',
  'itf',
  'codabar',
  'qr_code',
  'data_matrix'
]

async function decodeWithNativeDetector(source) {
  if (typeof window.BarcodeDetector !== 'function') return null
  try {
    let formats = DETECTOR_FORMATS
    if (typeof window.BarcodeDetector.getSupportedFormats === 'function') {
      const supported = await window.BarcodeDetector.getSupportedFormats()
      formats = DETECTOR_FORMATS.filter((format) => supported.includes(format))
      if (!formats.length) return null
    }
    const detector = new window.BarcodeDetector({ formats })
    const codes = await detector.detect(source)
    return normalizeBarcode(codes?.[0]?.rawValue)
  } catch {
    return null
  }
}

export async function decodeBarcodeFromFile(file) {
  if (!file) return null

  try {
    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(file)
      try {
        const native = await decodeWithNativeDetector(bitmap)
        if (native) return native
      } finally {
        bitmap.close?.()
      }
    }
  } catch {
    /* fall through to ZXing */
  }

  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const native = await decodeWithNativeDetector(img)
    if (native) return native

    const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
      import('@zxing/browser'),
      import('@zxing/library')
    ])
    const hints = new Map()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.ITF,
      BarcodeFormat.CODABAR,
      BarcodeFormat.QR_CODE,
      BarcodeFormat.DATA_MATRIX
    ])
    hints.set(DecodeHintType.TRY_HARDER, true)
    const reader = new BrowserMultiFormatReader(hints)
    const result = await reader.scanOneResult(img, false, true, true)
    return normalizeBarcode(result?.getText())
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

