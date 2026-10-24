export const PRINTER_STORAGE_KEY = 'thermalPrinter'
const USB_PRINTER_CLASS = 7
const USB_CHUNK_BYTES = 16384

export const PRINTER_NOT_CONNECTED = 'PRINTER_NOT_CONNECTED'

export class PrinterError extends Error {
  constructor(code, message) {
    super(message || code)
    this.code = code
  }
}

export const isUsbSupported = () => typeof navigator !== 'undefined' && !!navigator.usb

/** @type {{ label: string, device: USBDevice, write: (bytes: Uint8Array) => Promise<void> } | null} */
let active = null
let queue = Promise.resolve()

function readPref() {
  try {
    const pref = JSON.parse(localStorage.getItem(PRINTER_STORAGE_KEY))
    return pref?.kind === 'usb' ? pref : null
  } catch {
    return null
  }
}

function writePref(pref) {
  localStorage.setItem(PRINTER_STORAGE_KEY, JSON.stringify(pref))
}

/** Saved printer label, or null when none was paired in this browser. */
export function getPairedPrinter() {
  const pref = readPref()
  return pref ? { label: pref.label } : null
}

async function openUsb(device) {
  if (!device.opened) await device.open()
  if (device.configuration === null) await device.selectConfiguration(1)
  const interfaces = device.configuration.interfaces
  const iface = interfaces.find((i) => i.alternates.some((a) => a.interfaceClass === USB_PRINTER_CLASS)) || interfaces[0]
  const alt = iface.alternates.find((a) => a.interfaceClass === USB_PRINTER_CLASS) || iface.alternates[0]
  if (!iface.claimed) await device.claimInterface(iface.interfaceNumber)
  if (alt.alternateSetting !== 0) {
    await device.selectAlternateInterface(iface.interfaceNumber, alt.alternateSetting)
  }
  const endpoint = alt.endpoints.find((e) => e.direction === 'out' && e.type === 'bulk')
  if (!endpoint) throw new PrinterError('NO_OUT_ENDPOINT', 'USB printer has no bulk OUT endpoint')
  return {
    label: device.productName || 'USB printer',
    device,
    async write(bytes) {
      for (let offset = 0; offset < bytes.length; offset += USB_CHUNK_BYTES) {
        await device.transferOut(endpoint.endpointNumber, bytes.subarray(offset, offset + USB_CHUNK_BYTES))
      }
    }
  }
}

async function reopenPaired() {
  const pref = readPref()
  if (pref && isUsbSupported()) {
    const devices = await navigator.usb.getDevices()
    const device = devices.find((d) => d.vendorId === pref.vendorId && d.productId === pref.productId)
    if (device) return openUsb(device)
  }
  throw new PrinterError(PRINTER_NOT_CONNECTED, 'No paired thermal printer is available')
}

/** Ask the user to pick the USB printer (must run inside a click handler), open it and remember it. */
export async function connectPrinter() {
  if (!isUsbSupported()) throw new PrinterError('UNSUPPORTED', 'WebUSB is not supported in this browser')
  // No filter: some Xprinter models report a vendor-specific class instead of the printer class.
  const device = await navigator.usb.requestDevice({ filters: [] })
  const connection = await openUsb(device)
  writePref({ kind: 'usb', label: connection.label, vendorId: device.vendorId, productId: device.productId })
  active = connection
  return getPairedPrinter()
}

/**
 * Connect without the device picker: the paired printer first, otherwise any USB device this site
 * was already granted. Returns the printer label, or null when none could be opened.
 */
export async function reconnectPrinter() {
  if (!isUsbSupported()) return null
  if (active?.device.opened) return active.label
  try {
    active = await reopenPaired()
    return active.label
  } catch (e) {
    if (readPref()) console.warn('Paired printer is not reachable:', e)
  }
  const devices = await navigator.usb.getDevices().catch(() => [])
  for (const device of devices) {
    try {
      const connection = await openUsb(device)
      writePref({ kind: 'usb', label: connection.label, vendorId: device.vendorId, productId: device.productId })
      active = connection
      return connection.label
    } catch (e) {
      console.warn('Granted USB device is not a usable printer:', e)
    }
  }
  return null
}

export async function forgetPrinter() {
  const current = active
  active = null
  localStorage.removeItem(PRINTER_STORAGE_KEY)
  try {
    if (current?.device.opened) await current.device.close()
    await current?.device.forget?.()
  } catch (e) {
    console.warn('Failed to release printer:', e)
  }
}

async function writeNow(bytes) {
  if (!active) active = await reopenPaired()
  try {
    await active.write(bytes)
  } catch (e) {
    // The device may have been unplugged or reset; reopen once before giving up.
    console.warn('Printer write failed, reopening:', e)
    active = await reopenPaired()
    await active.write(bytes)
  }
}

/** Send raw ESC/POS bytes to the paired printer; jobs are serialized. */
export function printBytes(bytes) {
  const job = queue.then(() => writeNow(bytes))
  queue = job.catch(() => {})
  return job
}

if (isUsbSupported()) {
  navigator.usb.addEventListener('disconnect', (e) => {
    if (active?.device === e.device) active = null
  })
  navigator.usb.addEventListener('connect', () => {
    if (!active) void reconnectPrinter()
  })
}
