import { useEffect, useState } from 'react'
import { Globe, Lock, BookOpen, PenLine } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { useWorldStore } from '../store/useWorldStore'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === 'undefined' ? 1280 : window.innerWidth,
  )
  const authReady = useWorldStore((state) => state.authReady)
  const isAuthenticated = useWorldStore((state) => state.isAuthenticated)
  const authError = useWorldStore((state) => state.authError)
  const authMessage = useWorldStore((state) => state.authMessage)
  const isAuthSubmitting = useWorldStore((state) => state.isAuthSubmitting)
  const clearAuthFeedback = useWorldStore((state) => state.clearAuthFeedback)
  const login = useWorldStore((state) => state.login)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isTablet = viewportWidth <= 980
  const isMobile = viewportWidth <= 720

  if (!authReady) {
    return null
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    clearAuthFeedback()
    await login(email, password)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? 'var(--space-4)' : 'var(--space-8)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 960,
          display: 'grid',
          gridTemplateColumns: isTablet ? '1fr' : '1.1fr 0.9fr',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          backgroundColor: 'var(--color-surface)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <section
          style={{
            padding: isMobile ? 'var(--space-6)' : 'var(--space-12)',
            backgroundColor: 'var(--color-sidebar)',
            borderRight: isTablet ? 'none' : '1px solid var(--color-border)',
            borderBottom: isTablet ? '1px solid var(--color-border)' : 'none',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 'var(--space-6)',
            }}
          >
            <Globe size={20} strokeWidth={1.5} color="var(--color-primary-text)" />
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: isMobile ? 24 : 32,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--color-text)',
              marginBottom: 'var(--space-4)',
            }}
          >
            Worldify
          </h1>

          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 'var(--space-3)' : 'var(--space-4)' }}>
            <Feature icon={BookOpen} title="Alles an einem Ort" text="Charaktere, Orte, Fraktionen, Magie — strukturiert, verknüpft, immer greifbar." />
            <Feature icon={PenLine} title="Lore schreiben" text="Notizen, Geschichten und Ideen direkt im Kontext jedes Elements festhalten." />
            <Feature icon={Lock} title="Nur für dich" text="Deine Welten sind privat. Kein Feed, kein Publikum — nur du und deine Welt." />
          </div>
        </section>

        <section style={{ padding: isMobile ? 'var(--space-6)' : 'var(--space-12)', display: 'flex', alignItems: 'center' }}>
          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <div style={{ marginBottom: isMobile ? 'var(--space-6)' : 'var(--space-8)' }}>
              <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-3)', lineHeight: 1.2 }}>
                Willkommen zurück
              </h2>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                Melde dich an und mach weiter, wo du aufgehört hast.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginBottom: isMobile ? 'var(--space-5)' : 'var(--space-6)' }}>
              <InputField
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="Deine E-Mail-Adresse"
              />
              <InputField
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="Passwort"
              />
            </div>

            {authError ? (
              <div
                style={{
                  marginBottom: 'var(--space-4)',
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-error-light)',
                  color: 'var(--color-error)',
                  fontSize: 13,
                }}
              >
                {authError}
              </div>
            ) : null}

            {authMessage ? (
              <div
                style={{
                  marginBottom: 'var(--space-4)',
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-success-light)',
                  color: 'var(--color-success)',
                  fontSize: 13,
                }}
              >
                {authMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isAuthSubmitting}
              style={{
                width: '100%',
                height: 44,
                border: 'none',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-primary-text)',
                fontSize: 15,
                fontWeight: 500,
                fontFamily: 'var(--font-ui)',
                cursor: 'pointer',
                opacity: isAuthSubmitting ? 0.7 : 1,
              }}
            >
              {isAuthSubmitting ? 'Please wait...' : 'Einloggen'}
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}

function Feature({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ElementType
  title: string
  text: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 'var(--space-4)',
        alignItems: 'flex-start',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--color-primary-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={16} strokeWidth={1.5} color="var(--color-primary)" />
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
          {text}
        </div>
      </div>
    </div>
  )
}

function InputField({
  label,
  type,
  value,
  onChange,
  placeholder,
}: {
  label: string
  type: string
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <span
        style={{
          fontSize: 11,
          color: 'var(--color-text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={{
          height: 44,
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--color-bg)',
          padding: '0 var(--space-4)',
          fontSize: 15,
          color: 'var(--color-text)',
          outline: 'none',
        }}
      />
    </label>
  )
}
