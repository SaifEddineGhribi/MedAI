import React, { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { sendChat } from '../../api'

export default function AssistantChat() {
  const [messages, setMessages] = useState(() => {
    try {
      const raw = localStorage.getItem('medai.chat.v1')
      if (raw) return JSON.parse(raw)
    } catch {}
    return [
      { role: 'assistant', content: 'Bonjour Docteur X, comment puis-je vous aider ?' },
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
    const greeting = { role: 'assistant', content: 'Bonjour Docteur X, comment puis-je vous aider ?' }
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
    const history = [...messages, userMsg]
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
          <h1 className="landing-title">Bonjour Docteur X, comment puis-je vous aider ?</h1>
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
        </div>
      </div>
    )
  }

  return (
    <div className="chat fade-in">
      <div className="chat-toolbar">
        <button className="toolbar-btn" type="button" onClick={exportMarkdown} title="Exporter en Markdown">
          Exporter
        </button>
        <button className="toolbar-btn danger" type="button" onClick={clearChat} title="Effacer la conversation">
          Nouveau chat
        </button>
      </div>
      <div className="messages">
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.role}`}>
            <div className="bubble bubble-appear">
              {m.role === 'assistant' ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
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
