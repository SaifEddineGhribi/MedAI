import React from 'react'
import logoUrl from '../assets/logo.svg'

export default function Sidebar({ features, active, onSelect, profile }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-row">
          <img src={logoUrl} alt="MedAI logo" className="brand-logo" />
          <span>MedAI</span>
        </div>
        <div className="brand-subtitle">Founded by <br></br>Saif Eddine GHRIBI & Med Amine BENSALEM</div>
      </div>
      <nav>
        {features.map((f) => (
          <button
            key={f.key}
            className={`nav-item ${active === f.key ? 'active' : ''}`}
            onClick={() => f.enabled && onSelect(f.key)}
            disabled={!f.enabled}
          >
            {f.label}
            {!f.enabled ? ' (bientôt)' : ''}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="profile-header">Mon profil</div>
        <div className="profile-card">
          <div className="avatar" aria-hidden>{profile?.initials ?? 'DR'}</div>
          <div className="profile-info">
            <div className="name">{profile?.name ?? 'Docteur'}</div>
            <div className="meta">{profile?.specialty ?? 'Spécialité'}</div>
            <div className="meta muted">{profile?.facility ?? 'Établissement'}</div>
          </div>
        </div>
        <div className="profile-actions">
          <button className="profile-btn" disabled>Gérer le profil (bientôt)</button>
        </div>
      </div>
    </aside>
  )
}
