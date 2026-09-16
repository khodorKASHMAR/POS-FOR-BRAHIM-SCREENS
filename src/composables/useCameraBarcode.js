import { onUnmounted, ref } from 'vue'

export const BARCODE_DETECTOR_FORMATS = [
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

export function getCameraErrorKey(err) {
  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    return 'cameraNeedsHttps'
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return 'cameraNeedsHttps'
  }
  const name = err?.name || err?.code
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'cameraPermissionDenied'
  }
  return 'cameraUnavailable'
}

export function requestCameraStream() {
  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    const err = new Error('insecure')
    err.name = 'SecurityError'
    return Promise.reject(err)
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    const err = new Error('unavailable')
    err.name = 'NotSupportedError'
    return Promise.reject(err)
  }

  return navigator.mediaDevices
    .getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' } } })
    .catch(() => navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'environment' } }))
    .catch(() => navigator.mediaDevices.getUserMedia({ audio: false, video: true }))
}

export function useCameraBarcode(onDecoded) {
  const videoRef = ref(null)
  const starting = ref(false)
  const errorKey = ref('')
  const torchAvailable = ref(false)
  const torchOn = ref(false)

  let generation = 0
  let mediaStream = null
  let scannerControls = null
  let detectTimer = null

  function emitDecoded(text) {
    const value = String(text || '').trim()
    if (!value) return
    onDecoded(value)
  }

  function readTorchSupport(stream) {
    const track = stream?.getVideoTracks?.()[0]
    if (!track?.getCapabilities) return false
    try {
      return Boolean(track.getCapabilities().torch)
    } catch {
      return false
    }
  }

  async function setTorch(on) {
    const track = mediaStream?.getVideoTracks?.()[0]
    if (!track) return
    try {
      await track.applyConstraints({ advanced: [{ torch: on }] })
      torchOn.value = on
    } catch {
      torchOn.value = false
    }
  }

  async function toggleTorch() {
    if (!torchAvailable.value) return
    await setTorch(!torchOn.value)
  }

  function waitForVideo(gen) {
    return new Promise((resolve, reject) => {
      const started = Date.now()
      const tick = () => {
        if (gen !== generation) {
          reject(new Error('cancelled'))
          return
        }
        if (videoRef.value) {
          resolve(videoRef.value)
          return
        }
        if (Date.now() - started > 2500) {
          reject(new Error('unavailable'))
          return
        }
        requestAnimationFrame(tick)
      }
      tick()
    })
  }

  async function startNativeDetector(video, gen) {
    if (typeof window.BarcodeDetector !== 'function') return false
    let formats = BARCODE_DETECTOR_FORMATS
    try {
      if (typeof window.BarcodeDetector.getSupportedFormats === 'function') {
        const supported = await window.BarcodeDetector.getSupportedFormats()
        formats = BARCODE_DETECTOR_FORMATS.filter((format) => supported.includes(format))
        if (!formats.length) return false
      }
    } catch {
      return false
    }

    let detector
    try {
      detector = new window.BarcodeDetector({ formats })
    } catch {
      return false
    }

    const tick = async () => {
      if (gen !== generation) return
      try {
        if (video.readyState >= 2) {
          const codes = await detector.detect(video)
          if (gen === generation && codes?.[0]?.rawValue) {
            emitDecoded(codes[0].rawValue)
          }
        }
      } catch {
        /* keep scanning */
      }
      if (gen === generation) {
        detectTimer = window.setTimeout(tick, 140)
      }
    }
    detectTimer = window.setTimeout(tick, 180)
    return true
  }

  async function startZxing(video, stream, gen) {
    const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
      import('@zxing/browser'),
      import('@zxing/library')
    ])
    if (gen !== generation) return

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

    const reader = new BrowserMultiFormatReader(hints, {
      delayBetweenScanAttempts: 140,
      delayBetweenScanSuccess: 800
    })
    scannerControls = await reader.decodeFromStream(stream, video, (result) => {
      if (gen !== generation) return
      if (result) emitDecoded(result.getText())
    })
  }

  async function startCamera(streamPromise) {
    const gen = ++generation
    starting.value = true
    errorKey.value = ''
    torchOn.value = false
    torchAvailable.value = false

    try {
      const stream = await (streamPromise || requestCameraStream())
      if (gen !== generation) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      mediaStream = stream
      torchAvailable.value = readTorchSupport(stream)

      const video = await waitForVideo(gen)
      video.setAttribute('playsinline', 'true')
      video.setAttribute('webkit-playsinline', 'true')
      video.playsInline = true
      video.muted = true
      video.srcObject = stream
      try {
        await video.play()
      } catch {
        /* autoplay can fail after srcObject; muted + playsinline usually recovers */
      }

      const nativeOk = await startNativeDetector(video, gen)
      if (!nativeOk && gen === generation) {
        try {
          await startZxing(video, stream, gen)
        } catch (decodeErr) {
          console.warn('Barcode decoder failed, camera preview still active', decodeErr)
        }
      }
    } catch (err) {
      if (gen !== generation) return
      console.warn('Camera start failed', err)
      errorKey.value = getCameraErrorKey(err)
      await stopCamera(false)
    } finally {
      if (gen === generation) starting.value = false
    }
  }

  async function stopCamera(resetGeneration = true) {
    if (resetGeneration) generation += 1
    if (detectTimer) {
      clearTimeout(detectTimer)
      detectTimer = null
    }
    try {
      scannerControls?.stop?.()
    } catch {
      /* ignore */
    }
    scannerControls = null
    if (torchOn.value) {
      try { await setTorch(false) } catch { /* ignore */ }
    }
    torchOn.value = false
    torchAvailable.value = false
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop())
      mediaStream = null
    }
    if (videoRef.value) videoRef.value.srcObject = null
  }

  onUnmounted(() => {
    stopCamera()
  })

  return {
    videoRef,
    starting,
    errorKey,
    torchAvailable,
    torchOn,
    startCamera,
    stopCamera,
    toggleTorch
  }
}
