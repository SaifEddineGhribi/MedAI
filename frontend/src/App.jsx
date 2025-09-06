import React, { useState } from 'react'
import Sidebar from './components/Sidebar'
import AssistantChat from './features/assistant/AssistantChat'

export default function App() {
  const [active, setActive] = useState('assistant')
  const features = [
    { key: 'assistant', label: 'Assistant médical IA', enabled: true },
    { key: 'records', label: 'Dossiers patients', enabled: false },
    { key: 'imaging', label: "Analyse d'imagerie", enabled: false },
  ]
  const profile = {
    name: 'Dr. X',
    specialty: 'Cardiologue',
    facility: 'Clinique Générale',
    email: 'dr.x@example.com',
    initials: 'DX',
  }

  return (
    <div className="app">
      <Sidebar features={features} active={active} onSelect={setActive} profile={profile} />
      <main className="content">
        {active === 'assistant' ? <AssistantChat /> : <DisabledFeature />}
      </main>
    </div>
  )
}

function DisabledFeature() {
  return (
    <div className="disabled">
      This feature is not enabled yet.
    </div>
  )
}
