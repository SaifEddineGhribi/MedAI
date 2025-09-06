import React, { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { sendMessage } from '../../api'

export default function AssistantChat() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Bonjour Docteur X, comment puis-je vous aider ?' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [started, setStarted] = useState(false)
  const chatInputRef = useRef(null)

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    if (!started) setStarted(true)

    const userMsg = { role: 'user', content: input.trim() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)
    // keep focus on the chat input when sending
    chatInputRef.current?.focus()
    try {
      const reply = await sendMessage(userMsg.content)
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
