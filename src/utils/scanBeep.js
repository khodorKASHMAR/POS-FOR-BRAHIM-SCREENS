let audioCtx = null

export function unlockScanBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioCtx()
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume()
    }
  } catch {
    /* ignore */
  }
}

export function playScanBeep() {
  try {
    unlockScanBeep()
    if (!audioCtx) return

    const ctx = audioCtx
    const now = ctx.currentTime
    const duration = 0.34

    const master = ctx.createGain()
    master.gain.setValueAtTime(0.0001, now)
    master.gain.exponentialRampToValueAtTime(0.72, now + 0.01)
    master.gain.setValueAtTime(0.72, now + 0.24)
    master.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    master.connect(ctx.destination)

    const square = ctx.createOscillator()
    square.type = 'square'
    square.frequency.setValueAtTime(2730, now)

    const sine = ctx.createOscillator()
    sine.type = 'sine'
    sine.frequency.setValueAtTime(2730, now)

    const squareGain = ctx.createGain()
    squareGain.gain.value = 0.85
    const sineGain = ctx.createGain()
    sineGain.gain.value = 0.55

    square.connect(squareGain)
    sine.connect(sineGain)
    squareGain.connect(master)
    sineGain.connect(master)

    square.start(now)
    sine.start(now)
    square.stop(now + duration)
    sine.stop(now + duration)
  } catch {
    /* ignore */
  }
}
