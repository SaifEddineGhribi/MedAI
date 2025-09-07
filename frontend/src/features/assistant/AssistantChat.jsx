import React, { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { sendChat } from '../../api'

export default function AssistantChat() {
  // Patient context (persisted locally; injected into LLM context invisibly)
  const [patient, setPatient] = useState(() => {
    try {
      const raw = localStorage.getItem('medai.patient.v1')
      if (raw) return JSON.parse(raw)
    } catch {}
    return { age: '', sex: '', weight: '', conditions: '', medications: '', allergies: '' }
  })
  const [showPatient, setShowPatient] = useState(false)

  const [messages, setMessages] = useState(() => {
    try {
      const raw = localStorage.getItem('medai.chat.v1')
      if (raw) return JSON.parse(raw)
    } catch {}
    return [
      { role: 'assistant', content: 'Bonjour Docteur Saif, comment puis-je vous aider ?' },
    ]
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [started, setStarted] = useState(() => {
    return false
  })
  const chatInputRef = useRef(null)

  // Persist messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('medai.chat.v1', JSON.stringify(messages))
    } catch {}
  }, [messages])

  // Persist patient context
  useEffect(() => {
    try { localStorage.setItem('medai.patient.v1', JSON.stringify(patient)) } catch {}
  }, [patient])

  // If we have more than the greeting, consider chat started
  useEffect(() => {
    if (messages.length > 1 && !started) setStarted(true)
  }, [messages, started])

  const exportMarkdown = () => {
    const lines = []
    lines.push(`# MedAI Chat Transcript`)
    lines.push(`_Exported: ${new Date().toISOString()}_`)
    lines.push('')
    messages.forEach((m) => {
      lines.push(m.role === 'user' ? '## You' : '## Assistant')
      lines.push('')
      lines.push(m.content || '')
      lines.push('')
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `medai-chat-${Date.now()}.md`
    document.body.appendChild(a)
    a.click()
    URL.revokeObjectURL(url)
    a.remove()
  }

  const clearChat = () => {
    const greeting = { role: 'assistant', content: 'Bonjour Docteur Saif, comment puis-je vous aider ?' }
    setMessages([greeting])
    setStarted(false)
    setInput('')
    try { localStorage.removeItem('medai.chat.v1') } catch {}
    setTimeout(() => chatInputRef.current?.focus(), 0)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    if (!started) setStarted(true)

    const userMsg = { role: 'user', content: input.trim() }
    // Prepare history to send (include the new user message)
    // If patient context exists, prepend a hidden context message.
    const hasPatient = Object.values(patient || {}).some((v) => (v || '').trim().length > 0)
    const patientMsg = hasPatient ? { role: 'user', content: formatPatientForContext(patient) } : null
    const history = patientMsg ? [patientMsg, ...messages, userMsg] : [...messages, userMsg]
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)
    // keep focus on the chat input when sending
    chatInputRef.current?.focus()
    try {
      const reply = await sendChat(history)
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      console.error(err)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Désolé, une erreur est survenue.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  // Focus chat input after transitioning from landing to chat
  useEffect(() => {
    if (started) {
      chatInputRef.current?.focus()
    }
  }, [started])

  // Refocus after response completes
  useEffect(() => {
    if (!loading && started) {
      chatInputRef.current?.focus()
    }
  }, [loading, started])

  if (!started) {
    return (
      <div className="landing">
        <div className="landing-content fade-in">
          <h1 className="landing-title">Bonjour Docteur Saif, comment puis-je vous aider ?</h1>
          <form className="landing-composer" onSubmit={onSubmit}>
            <input
              autoFocus
              type="text"
              placeholder="Posez votre question médicale…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" disabled={loading || !input.trim()}>
              {loading ? 'Envoi…' : 'Envoyer'}
            </button>
          </form>
          <div style={{ marginTop: 8 }}>
            {!showPatient ? (
              <button
                type="button"
                className="toolbar-btn"
                onClick={() => setShowPatient(true)}
                title="Ajouter un contexte patient"
              >
                Ajouter un contexte patient
              </button>
            ) : (
              <PatientPanel patient={patient} setPatient={setPatient} compact />
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="chat fade-in">
      <div className="chat-toolbar">
        <button className="toolbar-btn" type="button" onClick={() => setShowPatient((s) => !s)} title="Contexte patient">
          {showPatient ? 'Masquer patient' : 'Contexte patient'}
        </button>
        <button className="toolbar-btn" type="button" onClick={exportMarkdown} title="Exporter en Markdown">
          Exporter
        </button>
        <button className="toolbar-btn danger" type="button" onClick={clearChat} title="Effacer la conversation">
          Nouveau chat
        </button>
      </div>
      {showPatient && (
        <PatientPanel patient={patient} setPatient={setPatient} />
      )}
      <div className="messages">
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.role}`}>
            <div className="bubble bubble-appear">
              {m.role === 'assistant' ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ node, ...props }) => (
                      <a target="_blank" rel="noopener noreferrer" {...props} />
                    ),
                  }}
                >
                  {m.content}
                </ReactMarkdown>
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="message assistant">
            <div className="bubble bubble-appear">
              <span className="typing" aria-label="Assistant is typing">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </span>
            </div>
          </div>
        )}
      </div>
      <form className="composer" onSubmit={onSubmit}>
        <input
          type="text"
          placeholder="Posez votre question médicale…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          ref={chatInputRef}
          autoFocus
        />
        <button type="submit" disabled={loading || !input.trim()}>
          {loading ? 'Envoi…' : 'Envoyer'}
        </button>
      </form>
    </div>
  )
}

function formatPatientForContext(p) {
  const lines = ['Patient context:',
    p.age ? `- Age: ${p.age}` : '',
    p.sex ? `- Sex: ${p.sex}` : '',
    p.weight ? `- Weight: ${p.weight}` : '',
    p.conditions ? `- Conditions: ${p.conditions}` : '',
    p.medications ? `- Medications: ${p.medications}` : '',
    p.allergies ? `- Allergies: ${p.allergies}` : '',
  ].filter(Boolean)
  return lines.join('\n')
}

function PatientPanel({ patient, setPatient, compact = false }) {
  const onChange = (k) => (e) => setPatient({ ...patient, [k]: e.target.value })
  const clear = () => setPatient({ age: '', sex: '', weight: '', conditions: '', medications: '', allergies: '' })
  return (
    <div className={`patient-panel ${compact ? 'compact' : ''}`}>
      <div className="patient-header">
        <div className="patient-title">Contexte patient</div>
        {!compact && (
          <button className="toolbar-btn" type="button" onClick={clear} title="Effacer le contexte patient">Effacer</button>
        )}
      </div>
      <div className="patient-grid">
        <label>
          <span>Âge</span>
          <input type="text" value={patient.age} onChange={onChange('age')} placeholder="ex: 54" />
        </label>
        <label>
          <span>Sexe</span>
          <input type="text" value={patient.sex} onChange={onChange('sex')} placeholder="H/F" />
        </label>
        <label>
          <span>Poids</span>
          <input type="text" value={patient.weight} onChange={onChange('weight')} placeholder="kg" />
        </label>
        <label className="wide">
          <span>Antécédents</span>
          <input type="text" value={patient.conditions} onChange={onChange('conditions')} placeholder="HTA, diabète…" />
        </label>
        <label className="wide">
          <span>Médications</span>
          <input type="text" value={patient.medications} onChange={onChange('medications')} placeholder="Liste des médicaments" />
        </label>
        <label className="wide">
          <span>Allergies</span>
          <input type="text" value={patient.allergies} onChange={onChange('allergies')} placeholder="Ex: pénicilline" />
        </label>
      </div>
      {compact && (
        <div className="patient-hint">Le contexte patient sera inclus dans l'analyse de l'IA.</div>
      )}
    </div>
  )
}
