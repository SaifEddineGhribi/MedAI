const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

export async function sendMessage(message) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  })
  if (!res.ok) throw new Error('Network error')
  const data = await res.json()
  return data.reply
}

