export const PRINTER_STORAGE_KEY = 'thermalPrinter'
export const LABEL_PRINTER_STORAGE_KEY = 'labelPrinter'
export const LABEL_OFFSET_STORAGE_KEY = 'labelOffset'
export const LABEL_TEXT_SIZE_STORAGE_KEY = 'labelTextSize'
/** Pairings and label layout that must survive logout (localStorage.clear). */
export const PRINTER_STORAGE_KEYS = [
  PRINTER_STORAGE_KEY,
  LABEL_PRINTER_STORAGE_KEY,
  LABEL_OFFSET_STORAGE_KEY,
  LABEL_TEXT_SIZE_STORAGE_KEY
]

const USB_PRINTER_CLASS = 7
const USB_CHUNK_BYTES = 16384
/** A printer paused on a paper/gap/cover error stops reading USB data; without a limit the job hangs forever. */
const USB_WRITE_TIMEOUT_MS = 20000

export const PRINTER_NOT_CONNECTED = 'PRINTER_NOT_CONNECTED'
export const PRINTER_TIMEOUT = 'PRINTER_TIMEOUT'
export const PRINTER_IN_USE = 'PRINTER_IN_USE'

export class PrinterError extends Error {
  constructor(code, message) {
    super(message || code)
    this.code = code
  }
}

/**
 * Translation key for a failed print.
 * @param {unknown} error
 * @param {'receipt' | 'label'} kind
 */
export function printerErrorKey(error, kind = 'receipt') {
  if (error?.code === PRINTER_TIMEOUT) return 'printerNotResponding'
  if (error?.code === PRINTER_NOT_CONNECTED) return kind === 'label' ? 'labelPrinterNotConnected' : 'printerNotConnected'
  return kind === 'label' ? 'labelPrintFailed' : 'receiptPrintFailed'
}

/**
 * Translation key for a failed pairing.
 * @param {unknown} error
 * @param {'receipt' | 'label'} kind
 */
export function printerConnectErrorKey(error, kind = 'receipt') {
  if (error?.code === PRINTER_IN_USE) return kind === 'label' ? 'printerUsedAsReceipt' : 'printerUsedAsLabel'
  return 'printerConnectFailed'
}

function withTimeout(promise, ms) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new PrinterError(PRINTER_TIMEOUT, 'Printer did not accept data in time')), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

/** Abort a stuck transfer so the device can be used (or re-paired) again. */
async function releaseStuckDevice(device) {
  try {
    await device.reset()
  } catch (e) {
    console.warn('Printer reset failed, closing instead:', e)
    await device.close().catch(() => {})
  }
}

export const isUsbSupported = () => typeof navigator !== 'undefined' && !!navigator.usb

function readPref(storageKey) {
  try {
    const pref = JSON.parse(localStorage.getItem(storageKey))
    return pref?.kind === 'usb' ? pref : null
  } catch {
    return null
  }
}

/**
 * Identical printer models share vendor and product ids (e.g. two Xprinter "Printer-80"), so the serial
 * number is what tells them apart. Prefs saved before serials were stored match any device of the model.
 */
const sameDevice = (pref, device) =>
  !!pref &&
  pref.vendorId === device.vendorId &&
  pref.productId === device.productId &&
  (!pref.serialNumber || pref.serialNumber === device.serialNumber)

const sameModel = (a, b) => a.vendorId === b.vendorId && a.productId === b.productId

function deviceLabel(device) {
  const name = device.productName || 'USB printer'
  return device.serialNumber ? `${name} · ${device.serialNumber.slice(-4)}` : name
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
    label: deviceLabel(device),
    device,
    async write(bytes) {
      for (let offset = 0; offset < bytes.length; offset += USB_CHUNK_BYTES) {
        await withTimeout(
          device.transferOut(endpoint.endpointNumber, bytes.subarray(offset, offset + USB_CHUNK_BYTES)),
          USB_WRITE_TIMEOUT_MS
        )
      }
    }
  }
}

const channels = []

/**
 * One paired USB printer with its own saved pref and serialized job queue.
 * @param {{ storageKey: string, adoptGrantedDevices: boolean }} options
 *   adoptGrantedDevices: when nothing is paired, reconnect may adopt any USB device the site was granted
 *   (skipping devices paired to another channel).
 */
function createPrinterChannel({ storageKey, adoptGrantedDevices }) {
  /** @type {{ label: string, device: USBDevice, write: (bytes: Uint8Array) => Promise<void> } | null} */
  let active = null
  let queue = Promise.resolve()

  const channel = {
    storageKey,
    get active() {
      return active
    },
    detach(device) {
      if (active?.device === device) active = null
    }
  }

  function writePref(connection) {
    const { device } = connection
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        kind: 'usb',
        label: connection.label,
        vendorId: device.vendorId,
        productId: device.productId,
        serialNumber: device.serialNumber || ''
      })
    )
  }

  function getPaired() {
    const pref = readPref(storageKey)
    return pref ? { label: pref.label } : null
  }

  const otherChannels = () => channels.filter((c) => c !== channel)

  /** Paired to another channel by serial number, or currently open there. */
  const usedElsewhere = (device) =>
    otherChannels().some((c) => {
      if (c.active?.device === device) return true
      const pref = readPref(c.storageKey)
      return !!pref?.serialNumber && sameDevice(pref, device)
    })

  async function reopenPaired() {
    const pref = readPref(storageKey)
    if (pref && isUsbSupported()) {
      const devices = (await navigator.usb.getDevices()).filter((d) => sameDevice(pref, d))
      const candidates = pref.serialNumber ? devices : devices.filter((d) => !usedElsewhere(d))
      if (candidates.length === 1) {
        const connection = await openUsb(candidates[0])
        if (!pref.serialNumber) writePref(connection)
        return connection
      }
      if (candidates.length > 1) {
        // An old pairing without a serial cannot tell identical printers apart; pair again.
        localStorage.removeItem(storageKey)
      }
    }
    throw new PrinterError(PRINTER_NOT_CONNECTED, 'No paired printer is available')
  }

  /** Ask the user to pick the USB printer (must run inside a click handler), open it and remember it. */
  async function connect() {
    if (!isUsbSupported()) throw new PrinterError('UNSUPPORTED', 'WebUSB is not supported in this browser')
    // No filter: some Xprinter models report a vendor-specific class instead of the printer class.
    const device = await navigator.usb.requestDevice({ filters: [] })
    if (usedElsewhere(device)) throw new PrinterError(PRINTER_IN_USE, 'This printer is paired to another role')
    const connection = await openUsb(device)
    writePref(connection)
    active = connection
    return getPaired()
  }

  /** Connect without the device picker. Returns the printer label, or null when none could be opened. */
  async function reconnect() {
    if (!isUsbSupported()) return null
    if (active?.device.opened) return active.label
    try {
      active = await reopenPaired()
      return active.label
    } catch (e) {
      if (readPref(storageKey)) console.warn('Paired printer is not reachable:', e)
    }
    if (!adoptGrantedDevices || readPref(storageKey)) return null
    const others = otherChannels().map((c) => readPref(c.storageKey))
    const devices = (await navigator.usb.getDevices().catch(() => [])).filter(
      (d) => !usedElsewhere(d) && !others.some((pref) => sameDevice(pref, d))
    )
    for (const device of devices) {
      // Two printers of the same model could be either role; let the user pick one explicitly.
      if (devices.some((d) => d !== device && sameModel(d, device))) continue
      try {
        const connection = await openUsb(device)
        writePref(connection)
        active = connection
        return connection.label
      } catch (e) {
        console.warn('Granted USB device is not a usable printer:', e)
      }
    }
    return null
  }

  async function forget() {
    const current = active
    active = null
    localStorage.removeItem(storageKey)
    if (!current) return
    const sharedDevice = channels.some((c) => c !== channel && c.active?.device === current.device)
    if (sharedDevice) return
    try {
      if (current.device.opened) await current.device.close()
      await current.device.forget?.()
    } catch (e) {
      console.warn('Failed to release printer:', e)
    }
  }

  async function writeNow(bytes) {
    if (!active) active = await reopenPaired()
    try {
      await active.write(bytes)
    } catch (e) {
      if (e?.code === PRINTER_TIMEOUT) {
        const stuck = active.device
        channels.forEach((c) => c.detach(stuck))
        await releaseStuckDevice(stuck)
        throw e
      }
      // The device may have been unplugged or reset; reopen once before giving up.
      console.warn('Printer write failed, reopening:', e)
      active = await reopenPaired()
      await active.write(bytes)
    }
  }

  /** Send raw bytes to the paired printer; jobs are serialized. */
  function printBytes(bytes) {
    const job = queue.then(() => writeNow(bytes))
    queue = job.catch(() => {})
    return job
  }

  channels.push(channel)
  return { getPaired, connect, reconnect, forget, printBytes, isActive: () => !!active }
}

const receiptChannel = createPrinterChannel({ storageKey: PRINTER_STORAGE_KEY, adoptGrantedDevices: true })
const labelChannel = createPrinterChannel({ storageKey: LABEL_PRINTER_STORAGE_KEY, adoptGrantedDevices: false })

/** Saved receipt printer label, or null when none was paired in this browser. */
export const getPairedPrinter = receiptChannel.getPaired
export const connectPrinter = receiptChannel.connect
/** Paired receipt printer first, otherwise any granted USB device not used as the label printer. */
export const reconnectPrinter = receiptChannel.reconnect
export const forgetPrinter = receiptChannel.forget
/** Send raw ESC/POS bytes to the receipt printer. */
export const printBytes = receiptChannel.printBytes

export const getPairedLabelPrinter = labelChannel.getPaired
export const connectLabelPrinter = labelChannel.connect
export const reconnectLabelPrinter = labelChannel.reconnect
export const forgetLabelPrinter = labelChannel.forget
/** Send raw TSPL bytes to the label printer. */
export const printLabelBytes = labelChannel.printBytes

if (isUsbSupported()) {
  navigator.usb.addEventListener('disconnect', (e) => {
    channels.forEach((c) => c.detach(e.device))
  })
  navigator.usb.addEventListener('connect', () => {
    if (!receiptChannel.isActive()) void receiptChannel.reconnect()
    if (!labelChannel.isActive()) void labelChannel.reconnect()
  })
}
