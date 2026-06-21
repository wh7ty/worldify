import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, User, Globe, Palette, Database, Info, Check } from 'lucide-react'
import { ACCENT_PRESETS, applyAccentPreset, getStoredAccentId } from '../../lib/accentColor'
import { chooseAutoBackupDirectory, clearAutoBackupDirectory, getAutoBackupDirectory, loadAutoBackupSettings, runAutoBackupForUniverse, saveAutoBackupSettings, supportsAutoBackupDirectory, type AutoBackupSettings } from '../../lib/backupAutomation'
import { useWorldStore } from '../../store/useWorldStore'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'universe', label: 'Universe', icon: Globe },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'data', label: 'Data', icon: Database },
  { id: 'about', label: 'About', icon: Info },
]

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState('profile')
  const navigate = useNavigate()
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(28,25,23,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        animation: 'fadeIn 150ms ease',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)',
          width: 680,
          maxWidth: 'calc(100vw - 48px)',
          maxHeight: 'calc(100vh - 80px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          height: 480,
          animation: 'modalIn 200ms ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px 16px',
            borderBottom: '1px solid var(--color-border)',
            flexShrink: 0,
          }}
        >
          <h2
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--color-text)',
              fontFamily: 'var(--font-ui)',
            }}
          >
            Settings
          </h2>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
              border: '1px solid transparent',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              transition: 'background 100ms ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-bg)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <X size={15} strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Sidebar Tabs */}
          <div
            style={{
              width: 160,
              backgroundColor: 'var(--color-bg)',
              borderRight: '1px solid var(--color-border)',
              padding: '12px 8px',
              flexShrink: 0,
            }}
          >
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: isActive ? 500 : 400,
                    fontFamily: 'var(--font-ui)',
                    color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    backgroundColor: isActive ? 'var(--color-primary-light)' : 'transparent',
                    textAlign: 'left',
                    transition: 'background 100ms ease, color 100ms ease',
                    marginBottom: 1,
                  }}
                >
                  <Icon size={14} strokeWidth={1.5} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            {activeTab === 'profile' && <ProfileTab />}
            {activeTab === 'universe' && <UniverseTab />}
            {activeTab === 'appearance' && <AppearanceTab onOpenDesignSystem={() => { onClose(); navigate('/design-system') }} />}
            {activeTab === 'data' && <DataTab />}
            {activeTab === 'about' && <AboutTab />}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.97) } to { opacity: 1; transform: scale(1) } }
      `}</style>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--color-text)',
      marginBottom: 16,
      fontFamily: 'var(--font-ui)',
    }}>
      {children}
    </h3>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      display: 'block',
      fontSize: 12,
      fontWeight: 500,
      color: 'var(--color-text-secondary)',
      marginBottom: 6,
      fontFamily: 'var(--font-ui)',
    }}>
      {children}
    </label>
  )
}

function Input({ placeholder, defaultValue }: { placeholder?: string; defaultValue?: string }) {
  return (
    <input
      placeholder={placeholder}
      defaultValue={defaultValue}
      style={{
        width: '100%',
        height: 36,
        padding: '0 12px',
        backgroundColor: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        fontSize: 13,
        fontFamily: 'var(--font-ui)',
        color: 'var(--color-text)',
        outline: 'none',
      }}
    />
  )
}

function Divider() {
  return <div style={{ height: 1, backgroundColor: 'var(--color-border)', margin: '20px 0' }} />
}

function ProfileTab() {
  return (
    <div>
      <SectionTitle>Profile</SectionTitle>

      {/* Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <div style={{
          width: 52,
          height: 52,
          borderRadius: '9999px',
          backgroundColor: 'var(--color-primary-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          fontWeight: 600,
          color: 'var(--color-primary)',
        }}>
          B
        </div>
        <button style={{
          fontSize: 13,
          color: 'var(--color-primary)',
          fontFamily: 'var(--font-ui)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontWeight: 500,
        }}>
          Change avatar
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <FieldLabel>Display name</FieldLabel>
          <Input placeholder="Your name" defaultValue="Brendel" />
        </div>
        <div>
          <FieldLabel>Email</FieldLabel>
          <Input placeholder="you@example.com" />
        </div>
      </div>

      <Divider />

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <SaveButton />
      </div>
    </div>
  )
}

function UniverseTab() {
  return (
    <div>
      <SectionTitle>Universe Settings</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <FieldLabel>Universe name</FieldLabel>
          <Input placeholder="My Universe" defaultValue="My Universe" />
        </div>
        <div>
          <FieldLabel>Description</FieldLabel>
          <textarea
            placeholder="Describe your universe…"
            rows={3}
            style={{
              width: '100%',
              padding: '8px 12px',
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
              fontFamily: 'var(--font-ui)',
              color: 'var(--color-text)',
              outline: 'none',
              resize: 'vertical',
            }}
          />
        </div>
      </div>
      <Divider />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <SaveButton />
      </div>
    </div>
  )
}

function AppearanceTab({ onOpenDesignSystem }: { onOpenDesignSystem: () => void }) {
  const [activeTheme, setActiveTheme] = useState<'Light' | 'Dark'>(() =>
    document.documentElement.dataset.theme === 'dark' ? 'Dark' : 'Light'
  )
  const [activeAccent, setActiveAccent] = useState(() => getStoredAccentId())

  const handleTheme = (t: 'Light' | 'Dark') => {
    setActiveTheme(t)
    if (t === 'Dark') {
      document.documentElement.dataset.theme = 'dark'
      localStorage.setItem('worldify_theme', 'dark')
    } else {
      delete document.documentElement.dataset.theme
      localStorage.setItem('worldify_theme', 'light')
    }
    // Re-apply accent so dark/light variants stay correct
    applyAccentPreset(activeAccent)
  }

  const handleAccent = (id: string) => {
    setActiveAccent(id)
    applyAccentPreset(id)
  }

  return (
    <div>
      <SectionTitle>Appearance</SectionTitle>

      <FieldLabel>Theme</FieldLabel>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['Light', 'Dark'] as const).map((t) => {
          const isActive = activeTheme === t
          return (
            <button
              key={t}
              onClick={() => handleTheme(t)}
              style={{
                flex: 1,
                padding: '8px 0',
                borderRadius: 'var(--radius-md)',
                border: isActive ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                backgroundColor: isActive ? 'var(--color-primary-light)' : 'transparent',
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                fontFamily: 'var(--font-ui)',
                cursor: 'pointer',
                transition: 'all 120ms ease',
              }}
            >
              {t === 'Light' ? '☀️ Hell' : '🌙 Dunkel'}
            </button>
          )
        })}
      </div>

      <FieldLabel>Akzentfarbe</FieldLabel>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
        {ACCENT_PRESETS.map((preset) => {
          const isActive = activeAccent === preset.id
          const color = preset.light.primary
          return (
            <button
              key={preset.id}
              onClick={() => handleAccent(preset.id)}
              title={preset.label}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: color,
                border: isActive ? `3px solid var(--color-text)` : '3px solid transparent',
                outline: isActive ? `2px solid ${color}` : 'none',
                outlineOffset: 2,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 120ms ease, outline 120ms ease',
                transform: isActive ? 'scale(1.1)' : 'scale(1)',
                flexShrink: 0,
              }}
            >
              {isActive && <Check size={13} strokeWidth={2.5} color="#fff" />}
            </button>
          )
        })}
      </div>

      <div style={{
        padding: '10px 12px',
        backgroundColor: 'var(--color-primary-light)',
        border: '1px solid var(--color-primary)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <div style={{ width: 20, height: 20, borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-primary)', flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: 'var(--color-primary)', fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
          {ACCENT_PRESETS.find((p) => p.id === activeAccent)?.label ?? 'Orange'} — Aktive Farbe
        </span>
      </div>

      <Divider />

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px',
        backgroundColor: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
      }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)', fontFamily: 'var(--font-ui)', marginBottom: 2 }}>Design System</p>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)' }}>Colors, typography, tokens, components</p>
        </div>
        <button
          onClick={onOpenDesignSystem}
          style={{
            height: 32, padding: '0 14px',
            backgroundColor: 'var(--color-primary)',
            color: '#fff', border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: 12, fontWeight: 500,
            fontFamily: 'var(--font-ui)', cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          View →
        </button>
      </div>
    </div>
  )
}

function DataTab() {
  const universes = useWorldStore((state) => state.universes)
  const activeUniverseId = useWorldStore((state) => state.activeUniverseId)
  const entities = useWorldStore((state) => state.entities)
  const libraryItems = useWorldStore((state) => state.libraryItems)
  const lastBackupAt = useWorldStore((state) => state.lastBackupAt)
  const showToast = useWorldStore((state) => state.showToast)
  const [settings, setSettings] = useState(() => loadAutoBackupSettings())
  const [directoryReady, setDirectoryReady] = useState<boolean | null>(null)
  const [isDirectoryBusy, setIsDirectoryBusy] = useState(false)
  const [isBackupRunning, setIsBackupRunning] = useState(false)

  useEffect(() => {
    let cancelled = false
    void getAutoBackupDirectory().then((handle) => {
      if (!cancelled) setDirectoryReady(Boolean(handle))
    })
    return () => {
      cancelled = true
    }
  }, [])

  const autoBackupSupported = supportsAutoBackupDirectory()
  const autoBackupEnabled = settings.enabled && directoryReady

  const handleUpdateSettings = (next: AutoBackupSettings) => {
    setSettings(next)
    saveAutoBackupSettings(next)
  }

  const handleChooseDirectory = async () => {
    setIsDirectoryBusy(true)
    try {
      await chooseAutoBackupDirectory()
      setDirectoryReady(true)
      showToast('Backup-Ordner verbunden')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Backup-Ordner konnte nicht gesetzt werden')
    } finally {
      setIsDirectoryBusy(false)
    }
  }

  const handleClearDirectory = async () => {
    setIsDirectoryBusy(true)
    try {
      await clearAutoBackupDirectory()
      setDirectoryReady(false)
      const next = { ...settings, enabled: false }
      handleUpdateSettings(next)
      showToast('Backup-Ordner entfernt')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Backup-Ordner konnte nicht entfernt werden')
    } finally {
      setIsDirectoryBusy(false)
    }
  }

  const handleToggleAutoBackup = () => {
    if (!directoryReady) {
      showToast('Bitte zuerst einen Backup-Ordner wählen')
      return
    }
    const next = { ...settings, enabled: !settings.enabled }
    handleUpdateSettings(next)
  }

  const handleIntervalChange = (intervalHours: AutoBackupSettings['intervalHours']) => {
    handleUpdateSettings({ ...settings, intervalHours })
  }

  const handleRunTestBackup = async () => {
    if (!activeUniverseId) {
      showToast('Kein aktives Universum gefunden')
      return
    }
    const activeUniverse = universes.find((universe) => universe.id === activeUniverseId)
    if (!activeUniverse) {
      showToast('Aktives Universum konnte nicht geladen werden')
      return
    }

    setIsBackupRunning(true)
    try {
      const result = await runAutoBackupForUniverse({
        entities: entities.filter((entity) => entity.universeId === activeUniverseId),
        libraryItems,
        universeName: activeUniverse.name,
        universeId: activeUniverseId,
        force: true,
      })

      if (result.saved) {
        showToast(result.filename ? `Auto-Backup gespeichert: ${result.filename}` : 'Auto-Backup gespeichert')
        setSettings(loadAutoBackupSettings())
        return
      }

      if (result.reason === 'no-directory') {
        showToast('Bitte zuerst einen Backup-Ordner wählen')
        return
      }

      showToast('Auto-Backup konnte nicht erstellt werden')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Auto-Backup konnte nicht erstellt werden')
    } finally {
      setIsBackupRunning(false)
    }
  }

  return (
    <div>
      <SectionTitle>Data</SectionTitle>
      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', marginBottom: 20, lineHeight: 1.6 }}>
        Deine Daten liegen in Supabase und lokalen Browser-Caches. Hier richtest du manuelle und automatische Backups ein.
      </p>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: '12px 16px',
        backgroundColor: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)', fontFamily: 'var(--font-ui)', marginBottom: 2 }}>
              Auto-Backup-Ordner
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', lineHeight: 1.5 }}>
              {autoBackupSupported
                ? directoryReady
                  ? 'Ordner verbunden. Es werden maximal 4 rotierende ZIP-Backups gehalten.'
                  : 'Einmal Ordner wählen, danach werden Auto-Backups dort rotierend überschrieben.'
                : 'Dieser Browser unterstützt keinen festen Ordnerzugriff. Nutze hier manuelle Backups.'}
            </div>
          </div>
          {autoBackupSupported ? (
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button
                onClick={() => void handleChooseDirectory()}
                disabled={isDirectoryBusy}
                style={{
                  height: 32, padding: '0 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-ui)',
                  cursor: 'pointer',
                  opacity: isDirectoryBusy ? 0.6 : 1,
                }}
              >
                {directoryReady ? 'Ordner ändern' : 'Ordner wählen'}
              </button>
              {directoryReady ? (
                <button
                  onClick={() => void handleClearDirectory()}
                  disabled={isDirectoryBusy}
                  style={{
                    height: 32, padding: '0 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'transparent',
                    color: 'var(--color-text-secondary)',
                    fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-ui)',
                    cursor: 'pointer',
                    opacity: isDirectoryBusy ? 0.6 : 1,
                  }}
                >
                  Trennen
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)', fontFamily: 'var(--font-ui)', marginBottom: 2 }}>
              Automatische Backups
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)' }}>
              4 Slots · alle {settings.intervalHours} Stunden · überschreibt rotierend statt Spam
            </div>
          </div>
          <button
            onClick={handleToggleAutoBackup}
            disabled={!autoBackupSupported}
            style={{
              height: 32,
              padding: '0 14px',
              borderRadius: 'var(--radius-md)',
              border: autoBackupEnabled ? 'none' : '1px solid var(--color-border)',
              backgroundColor: autoBackupEnabled ? 'var(--color-primary)' : 'var(--color-surface)',
              color: autoBackupEnabled ? 'var(--color-primary-text)' : 'var(--color-text)',
              fontSize: 12,
              fontWeight: 500,
              fontFamily: 'var(--font-ui)',
              cursor: autoBackupSupported ? 'pointer' : 'not-allowed',
              opacity: autoBackupSupported ? 1 : 0.5,
            }}
          >
            {autoBackupEnabled ? 'Aktiv' : 'Inaktiv'}
          </button>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)', fontFamily: 'var(--font-ui)', marginBottom: 2 }}>
              Intervall
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', lineHeight: 1.5 }}>
              Tablet- und Mobile-freundlich, mit festen Stufen für planbare Rotationen.
            </div>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}>
            {[6, 12, 24].map((interval) => {
              const isActive = settings.intervalHours === interval
              return (
                <button
                  key={interval}
                  onClick={() => handleIntervalChange(interval as AutoBackupSettings['intervalHours'])}
                  style={{
                    height: 32,
                    minWidth: 48,
                    padding: '0 12px',
                    borderRadius: 'var(--radius-full)',
                    border: isActive ? 'none' : '1px solid var(--color-border)',
                    backgroundColor: isActive ? 'var(--color-primary-light)' : 'var(--color-surface)',
                    color: isActive ? 'var(--color-primary)' : 'var(--color-text)',
                    fontSize: 12,
                    fontWeight: 500,
                    fontFamily: 'var(--font-ui)',
                    cursor: 'pointer',
                  }}
                >
                  {interval}h
                </button>
              )
            })}
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)', fontFamily: 'var(--font-ui)', marginBottom: 2 }}>
              Auto-Backup testen
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', lineHeight: 1.5 }}>
              Erstellt sofort ein rotierendes ZIP im gewählten Ordner, ohne auf das nächste Intervall zu warten.
            </div>
          </div>
          <button
            onClick={() => void handleRunTestBackup()}
            disabled={!autoBackupSupported || !directoryReady || isBackupRunning}
            style={{
              height: 32,
              padding: '0 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text)',
              fontSize: 12,
              fontWeight: 500,
              fontFamily: 'var(--font-ui)',
              cursor: !autoBackupSupported || !directoryReady || isBackupRunning ? 'not-allowed' : 'pointer',
              opacity: !autoBackupSupported || !directoryReady || isBackupRunning ? 0.5 : 1,
            }}
          >
            {isBackupRunning ? 'Speichert…' : 'Jetzt testen'}
          </button>
        </div>

        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)' }}>
          Letztes Backup: {lastBackupAt ? new Date(lastBackupAt).toLocaleString('de-DE') : 'noch keins'}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <ActionRow
          label="Export data"
          description="Download all your entities as JSON"
          buttonLabel="Export"
          variant="secondary"
        />
        <ActionRow
          label="Import data"
          description="Restore from a previous export"
          buttonLabel="Import"
          variant="secondary"
        />
        <Divider />
        <ActionRow
          label="Clear all data"
          description="Permanently delete everything. This cannot be undone."
          buttonLabel="Clear"
          variant="danger"
        />
      </div>
    </div>
  )
}

function AboutTab() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{
          width: 40,
          height: 40,
          backgroundColor: 'var(--color-primary)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
        }}>
          🌍
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-ui)' }}>Worldify</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)' }}>Version 0.1.0</div>
        </div>
      </div>
      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', lineHeight: 1.6 }}>
        A private worldbuilding tool for writers and storytellers. Keep your universes, characters, and lore organized in one place.
      </p>
    </div>
  )
}

function ActionRow({ label, description, buttonLabel, variant }: {
  label: string
  description: string
  buttonLabel: string
  variant: 'secondary' | 'danger'
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 14px',
      backgroundColor: 'var(--color-bg)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      gap: 16,
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: variant === 'danger' ? 'var(--color-error)' : 'var(--color-text)', fontFamily: 'var(--font-ui)', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)' }}>{description}</div>
      </div>
      <button style={{
        flexShrink: 0,
        height: 32,
        padding: '0 14px',
        borderRadius: 'var(--radius-md)',
        border: `1px solid ${variant === 'danger' ? 'var(--color-error)' : 'var(--color-border)'}`,
        backgroundColor: 'transparent',
        color: variant === 'danger' ? 'var(--color-error)' : 'var(--color-text)',
        fontSize: 12,
        fontWeight: 500,
        fontFamily: 'var(--font-ui)',
        cursor: 'pointer',
      }}>
        {buttonLabel}
      </button>
    </div>
  )
}

function SaveButton() {
  return (
    <button style={{
      height: 34,
      padding: '0 16px',
      backgroundColor: 'var(--color-primary)',
      color: '#fff',
      border: 'none',
      borderRadius: 'var(--radius-md)',
      fontSize: 13,
      fontWeight: 500,
      fontFamily: 'var(--font-ui)',
      cursor: 'pointer',
    }}>
      Save changes
    </button>
  )
}
