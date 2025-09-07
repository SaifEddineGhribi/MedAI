import React, { useEffect, useRef, useState } from 'react'

// Front-end only Dictaphone using the Web Speech API (if available)
// Supports English and French recognition (en-US, fr-FR)
export default function Dictaphone() {
  const [supported, setSupported] = useState(false)
  const [language, setLanguage] = useState('fr-FR')
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState('')
  const recognitionRef = useRef(null)
  const [mode, setMode] = useState('browser') // 'browser' | 'cloud'
  const wsRef = useRef(null)
  const audioCtxRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const processorRef = useRef(null)

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    setSupported(!!SR)
    if (!SR) return
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = language

    rec.onresult = (event) => {
      let interimText = ''
      let finalText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i]
        if (res.isFinal) {
          finalText += res[0].transcript
        } else {
          interimText += res[0].transcript
        }
      }
      if (finalText) {
        setTranscript((prev) => (prev ? prev + ' ' : '') + finalText.trim())
      }
      setInterim(interimText)
    }

    rec.onerror = (e) => {
      // Capture recognizable errors (no-speech, audio-capture, not-allowed)
      setError(e?.error || 'speech-error')
    }

    rec.onend = () => {
      setListening(false)
    }

    recognitionRef.current = rec
    return () => {
      try { rec.stop() } catch {}
      recognitionRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try { if (recognitionRef.current) recognitionRef.current.stop() } catch {}
      try { if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) wsRef.current.send('END') } catch {}
      try { if (wsRef.current) wsRef.current.close() } catch {}
      try { if (processorRef.current) processorRef.current.disconnect() } catch {}
      try { if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach((t) => t.stop()) } catch {}
    }
  }, [])

  // Update recognition language when selector changes
  useEffect(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.lang = language } catch {}
    }
  }, [language])

  const startListening = async () => {
    setError('')
    setInterim('')
    if (mode === 'browser') {
      if (!supported || !recognitionRef.current || listening) return
      try {
        recognitionRef.current.lang = language
        recognitionRef.current.start()
        setListening(true)
      } catch (e) {
        setError('start-failed')
      }
      return
    }
    // Cloud mode via backend WebSocket + PCM 16kHz streaming
    if (listening) return
    try {
      await startCloudStream()
      setListening(true)
    } catch (e) {
      console.error(e)
      setError('cloud-start-failed')
      await stopCloudStream()
    }
  }

  const stopListening = async () => {
    if (mode === 'browser') {
      if (!recognitionRef.current) return setListening(false)
      try { recognitionRef.current.stop() } catch {}
      setListening(false)
      return
    }
    await stopCloudStream()
    setListening(false)
  }

  const clearAll = () => {
    setTranscript('')
    setInterim('')
    setError('')
  }

  // ---------- Cloud streaming helpers (component-scoped) ----------
  const startCloudStream = async () => {
    const ctx = await ensureAudioContext()
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
    const source = ctx.createMediaStreamSource(stream)
    const processor = ctx.createScriptProcessor(4096, 1, 1)
    source.connect(processor)
    processor.connect(ctx.destination)

    const wsUrl = (API_BASE.replace(/^http/, 'ws')) + `/ws/transcribe?lang=${encodeURIComponent(language)}&sample_rate=16000&encoding=pcm`
    const ws = new WebSocket(wsUrl)
    ws.binaryType = 'arraybuffer'

    ws.onopen = () => {
      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0)
        const down = downsampleBuffer(input, ctx.sampleRate, 16000)
        const pcm16 = floatTo16BitPCM(down)
        if (ws.readyState === WebSocket.OPEN) ws.send(pcm16)
      }
    }
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data)
        if (data.type === 'partial') {
          setInterim(data.text || '')
        } else if (data.type === 'final') {
          setTranscript((prev) => (prev ? prev + ' ' : '') + (data.text || '').trim())
          setInterim('')
        } else if (data.type === 'error') {
          setError(String(data.message || 'transcribe-error'))
        }
      } catch {}
    }
    ws.onerror = () => setError('ws-error')
    ws.onclose = () => {
      try { processor.disconnect() } catch {}
      try { source.disconnect() } catch {}
    }

    wsRef.current = ws
    audioCtxRef.current = ctx
    mediaStreamRef.current = stream
    processorRef.current = processor
  }

  const stopCloudStream = async () => {
    const ws = wsRef.current
    const processor = processorRef.current
    const stream = mediaStreamRef.current
    try { if (ws && ws.readyState === WebSocket.OPEN) ws.send('END') } catch {}
    try { if (ws) ws.close() } catch {}
    try { if (processor) processor.disconnect() } catch {}
    try { if (stream) stream.getTracks().forEach((t) => t.stop()) } catch {}
    wsRef.current = null
    processorRef.current = null
    mediaStreamRef.current = null
  }

  return (
    <div className="dictaphone fade-in">
      <div className="chat-toolbar">
        <div className="dicta-controls">
          <label className="dicta-label">
            Mode
            <select value={mode} onChange={(e) => setMode(e.target.value)} className="dicta-select">
              <option value="browser">Navigateur (local)</option>
              <option value="cloud">AWS (cloud)</option>
            </select>
          </label>
          <label className="dicta-label">
            Langue
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="dicta-select">
              <option value="fr-FR">Français (FR)</option>
              <option value="en-US">English (US)</option>
            </select>
          </label>
          <button
            type="button"
            className={`toolbar-btn ${listening ? 'danger' : ''}`}
            onClick={listening ? stopListening : startListening}
            disabled={mode === 'browser' && !supported}
            title={mode === 'browser' ? (supported ? (listening ? 'Arrêter' : 'Démarrer') : 'Reconnaissance vocale non supportée') : (listening ? 'Arrêter' : 'Démarrer')}
          >
            {listening ? 'Arrêter' : 'Démarrer'}
          </button>
          <button type="button" className="toolbar-btn" onClick={clearAll} title="Effacer">
            Effacer
          </button>
        </div>
        {mode === 'browser' && !supported && (
          <div className="dicta-hint">La reconnaissance vocale du navigateur n’est pas disponible. Essayez Chrome/Edge.</div>
        )}
        {!!error && (
          <div className="dicta-error">Erreur: {error}</div>
        )}
      </div>

      <div className="dicta-body">
        <div className="dicta-transcript">
          <textarea
            value={formatText(transcript, interim)}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder={supported ? 'Votre transcription apparaîtra ici…' : 'Votre navigateur ne supporte pas la reconnaissance vocale.'}
          />
        </div>

        <div className="dicta-mic">
          <button
            type="button"
            className={`mic-button ${listening ? 'listening' : ''}`}
            onClick={listening ? stopListening : startListening}
            disabled={mode === 'browser' && !supported}
            aria-pressed={listening}
            aria-label={listening ? 'Arrêter la dictée' : 'Commencer la dictée'}
            title={mode === 'browser' ? (supported ? (listening ? 'Arrêter la dictée' : 'Commencer la dictée') : 'Non supporté') : (listening ? 'Arrêter la dictée' : 'Commencer la dictée')}
          >
            <MicIcon />
          </button>
          <div className="dicta-status">
            {supported ? (listening ? 'Écoute en cours…' : 'Prêt') : 'Non supporté'}
          </div>
        </div>
      </div>
    </div>
  )
}

function formatText(finalText, interim) {
  const base = (finalText || '').trim()
  if (interim) return (base ? base + ' ' : '') + interim
  return base
}

function MicIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z" fill="currentColor"/>
      <path d="M5 11a1 1 0 1 0-2 0 9 9 0 0 0 8 8v3h2v-3a9 9 0 0 0 8-8 1 1 0 1 0-2 0 7 7 0 0 1-14 0Z" fill="currentColor"/>
    </svg>
  )
}

// ---------- Cloud streaming helpers ----------
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

async function ensureAudioContext() {
  let ctx = window._medaiAudioCtx
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    ctx = new AudioCtx({ sampleRate: 48000 })
    window._medaiAudioCtx = ctx
  }
  if (ctx.state === 'suspended') {
    await ctx.resume()
  }
  return ctx
}

function downsampleBuffer(buffer, sampleRate, outSampleRate) {
  if (outSampleRate === sampleRate) return buffer
  const ratio = sampleRate / outSampleRate
  const newLen = Math.round(buffer.length / ratio)
  const result = new Float32Array(newLen)
  let offsetResult = 0
  let offsetBuffer = 0
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio)
    // average to avoid aliasing
    let accum = 0, count = 0
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i]
      count++
    }
    result[offsetResult] = accum / (count || 1)
    offsetResult++
    offsetBuffer = nextOffsetBuffer
  }
  return result
}

function floatTo16BitPCM(float32) {
  const out = new DataView(new ArrayBuffer(float32.length * 2))
  let offset = 0
  for (let i = 0; i < float32.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, float32[i]))
    s = s < 0 ? s * 0x8000 : s * 0x7FFF
    out.setInt16(offset, s, true) // little endian
  }
  return out.buffer
}

async function startCloudStream() {
  const ctx = await ensureAudioContext()
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
  const source = ctx.createMediaStreamSource(stream)
  const processor = ctx.createScriptProcessor(4096, 1, 1)
  source.connect(processor)
  processor.connect(ctx.destination)

  const wsUrl = (API_BASE.replace(/^http/, 'ws')) + `/ws/transcribe?lang=${encodeURIComponent(getLang())}&sample_rate=16000&encoding=pcm`
  const ws = new WebSocket(wsUrl)
  ws.binaryType = 'arraybuffer'

  ws.onopen = () => {
    // Start pumping audio frames
    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0)
      const down = downsampleBuffer(input, ctx.sampleRate, 16000)
      const pcm16 = floatTo16BitPCM(down)
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(pcm16)
      }
    }
  }
  ws.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data)
      if (data.type === 'partial') {
        setInterim(data.text || '')
      } else if (data.type === 'final') {
        setTranscript((prev) => (prev ? prev + ' ' : '') + (data.text || '').trim())
        setInterim('')
      } else if (data.type === 'error') {
        setError(String(data.message || 'transcribe-error'))
      }
    } catch {
      // Ignore non-JSON
    }
  }
  ws.onerror = () => setError('ws-error')
  ws.onclose = () => {
    // Clean up audio graph
    try { processor.disconnect() } catch {}
    try { source.disconnect() } catch {}
  }

  // keep references for stop
  wsRef.current = ws
  audioCtxRef.current = ctx
  mediaStreamRef.current = stream
  processorRef.current = processor
}

async function stopCloudStream() {
  const ws = wsRef.current
  const processor = processorRef.current
  const stream = mediaStreamRef.current
  try { if (ws && ws.readyState === WebSocket.OPEN) ws.send('END') } catch {}
  try { if (ws) ws.close() } catch {}
  try { if (processor) processor.disconnect() } catch {}
  try { if (stream) stream.getTracks().forEach((t) => t.stop()) } catch {}
  wsRef.current = null
  processorRef.current = null
  mediaStreamRef.current = null
}

function getLang() {
  // Access current language from closure state
  // This function will be replaced by the component-level one during bundling
  return 'fr-FR'
}
