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
  const messagesEndRef = useRef(null)

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

  // Smooth scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

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
                <AssistantMessage content={m.content} />
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
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

function AssistantMessage({ content }) {
  const normalized = normalizeMarkdown(content)
  const sections = parseSections(normalized)
  // Default expanded sections
  const defaults = sections.map((s) => {
    const t = s.title.toLowerCase()
    if (t.includes('triage') || t.includes('résumé')) return true
    return false
  })
  const [open, setOpen] = React.useState(defaults)

  return (
    <div className="assistant-message">
      {sections.length === 0 ? (
        <Markdown content={normalized} />
      ) : (
        sections.map((s, i) => (
          <div key={i} className="section">
            <div className="section-header" onClick={() => setOpen((prev) => prev.map((v, idx) => (idx === i ? !v : v)))}>
              <span className="section-title">{s.title}</span>
              <span className="section-toggle">{open[i] ? '▾' : '▸'}</span>
            </div>
            {open[i] && (
              <div className="section-body">
                {s.title.toLowerCase().includes('triage') ? (
                  <TriageBlock body={s.body} />
                ) : (
                  <Markdown content={s.body} />
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}

function TriageBlock({ body }) {
  // Take the first non-empty line to derive badge
  const firstLine = (body || '').split(/\r?\n/).find((l) => l.trim().length > 0) || ''
  const level = inferUrgency(firstLine)
  return (
    <div>
      {level && <span className={`badge ${level}`}>{badgeLabel(level)}</span>}
      <Markdown content={body} />
    </div>
  )
}

function inferUrgency(line) {
  const l = line.toLowerCase()
  if (l.includes('urgence vitale')) return 'emergent'
  if (l.includes('urgent')) return 'urgent'
  if (l.includes('routine')) return 'routine'
  return ''
}

function badgeLabel(level) {
  if (level === 'emergent') return 'Urgence vitale'
  if (level === 'urgent') return 'Urgent (<48 h)'
  if (level === 'routine') return 'Routine'
  return ''
}

function Markdown({ content }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ node, ...props }) => (
          <a target="_blank" rel="noopener noreferrer" {...props} />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

function parseSections(text) {
  const lines = (text || '').split(/\r?\n/)
  const out = []
  let current = null
  for (const line of lines) {
    // Primary: Markdown heading ###
    let m = line.match(/^###\s+(.+)$/)
    if (m) {
      if (current) out.push(current)
      const title = sanitizeTitle(m[1])
      current = { title, body: '' }
      continue
    }
    // Fallback: bold-only line as section title
    m = line.match(/^\s*(?:\*\*|__)(.+?)(?:\*\*|__)\s*$/)
    if (m) {
      if (current) out.push(current)
      const title = m[1].replace(/\s*[:：]\s*$/, '').trim()
      current = { title, body: '' }
      continue
    }
    // Fallback: plain line ending with colon
    m = line.match(/^\s*([^#>\-*`].*?)\s*[:：]\s*$/)
    if (m) {
      if (current) out.push(current)
      current = { title: m[1].trim(), body: '' }
      continue
    }
    if (current) {
      current.body += (current.body ? '\n' : '') + line
    }
  }
  if (current) out.push(current)
  return out
}

function sanitizeTitle(raw) {
  let t = (raw || '').trim()
  // Strip wrapping bold markers and trailing colon or arrows
  t = t.replace(/^\s*(?:\*\*|__)?\s*(.*?)\s*(?:\*\*|__)?\s*$/s, '$1')
  t = t.replace(/\s*[:：]+\s*$/u, '')
  t = t.replace(/[▾▸›»]+\s*$/u, '')
  return t.trim()
}

function normalizeMarkdown(text) {
  if (!text) return ''
  let t = text
  // 1) Convert bold-only headings like **Titre:** to ### Titre
  t = t.replace(/^\s*\*\*(.+?)\*\*\s*(?:[:：]?\s*(?:[▾▸›»]+)?)?\s*$/gm, (m, p1) => `### ${p1.trim()}`)
  // Also handle __Titre__
  t = t.replace(/^\s*__(.+?)__\s*(?:[:：]?\s*(?:[▾▸›»]+)?)?\s*$/gm, (m, p1) => `### ${p1.trim()}`)
  // 1b) Convert plain title lines ending with a colon into headings
  t = t.replace(/^(?!\s*(?:#|>|-|\*|```|\d+\.|\|))\s*(.+?)\s*[:：]\s*$/gm, (m, p1) => `### ${p1.trim()}`)
  // 1c) Ensure Sources/References have their own heading
  t = t.replace(/^\s*(sources?|références?)\s*[:：]?\s*$/gim, '### Sources')
  // 2) Replace leading bullets using • or ◦ with proper markdown '- '
  t = t.replace(/^\s*[•◦]\s+/gm, '- ')
  // 3) Split inline bullets: " • item1 • item2" -> new lines with '- '
  t = t.replace(/\s+[•◦]\s+/g, '\n- ')
  // 3b) Drop standalone dropdown arrows lines
  t = t.replace(/^\s*[▾▸›»]+\s*$/gm, '')
  // 4) Ensure blank line after headings
  t = t.replace(/^(###\s+.+)(?!\n\n)/gm, '$1\n')
  // 5) Linkify domains (www.* and bare domains) by adding https://
  t = t.replace(/(?<![\w/:])(www\.[^\s)]+)\/??/g, (m, host) => `https://${host}`)
  t = t.replace(/(?<![\w/:])((?:[a-z0-9-]+\.)+(?:org|com|fr|net|gov|edu|int|info|io|ai)(?:\/[\w\-./#?=&%+]*)?)/gi, (m, url) => {
    if (/^https?:\/\//i.test(url)) return url
    // Avoid converting markdown links and tables
    if (url.includes('|')) return url
    return `https://${url}`
  })
  // 6) Basic pipe-table helper: if multiple consecutive lines contain '|', insert separator after first
  t = addTableSeparators(t)
  // 6b) Bulletize plain lines under headings: turn consecutive non-empty, non-list lines into '- ' items
  t = bulletizePlainBlocks(t)
  // 7) Trim excessive blank lines
  t = t.replace(/\n{3,}/g, '\n\n')
  return t
}

function addTableSeparators(text) {
  const lines = text.split(/\r?\n/)
  const out = []
  let i = 0
  while (i < lines.length) {
    out.push(lines[i])
    if (lines[i].includes('|')) {
      // Look ahead for a block of '|' lines
      const start = i
      let j = i + 1
      while (j < lines.length && lines[j].includes('|') && !/^\s*[-:|\s]+$/.test(lines[j])) j++
      const count = j - start
      if (count >= 2) {
        // Insert separator after header (start line) if next line is not already separator
        const cols = lines[start].split('|').length - 1
        const sep = Array.from({ length: cols }, () => '---').join(' | ')
        // Only insert if next line not a separator row
        if (!/^\s*[-:|\s]+$/.test(lines[start + 1])) {
          out.push(sep)
        }
      }
      // Push the rest of the block
      for (let k = i + 1; k < j; k++) out.push(lines[k])
      i = j
      continue
    }
    i++
  }
  return out.join('\n')
}

function bulletizePlainBlocks(text) {
  const lines = text.split(/\r?\n/)
  const out = []
  let inBlock = false
  let blockStart = -1
  const isListLike = (s) => /^(\s*(-|\*|\+|\d+\.|>\s|\|)|\s*```)/.test(s) || s.trim() === '' || /^###\s+/.test(s)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const listy = isListLike(line)
    if (!listy && !inBlock) {
      inBlock = true
      blockStart = out.length
      out.push(line)
    } else if (!listy && inBlock) {
      out.push(line)
    } else {
      // We hit a boundary; flush previous block
      if (inBlock) {
        const blockLen = out.length - blockStart
        if (blockLen >= 2) {
          for (let k = blockStart; k < out.length; k++) {
            if (out[k].trim().length) out[k] = `- ${out[k].trim()}`
          }
        }
        inBlock = false
        blockStart = -1
      }
      out.push(line)
    }
  }
  // Flush at end
  if (inBlock) {
    const blockLen = out.length - blockStart
    if (blockLen >= 2) {
      for (let k = blockStart; k < out.length; k++) {
        if (out[k].trim().length) out[k] = `- ${out[k].trim()}`
      }
    }
  }
  return out.join('\n')
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
