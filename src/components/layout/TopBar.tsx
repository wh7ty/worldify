import { useEffect, useRef, useState } from 'react'
import {
  Search, Plus, LogOut, Menu, Moon, Settings, Sun, User, ArrowLeft, ChevronDown,
  Users, MapPin, Shield, Sparkles, Bug, Languages, Package, BookOpen, Calendar, StickyNote,
} from 'lucide-react'
import { getCategoryIcon } from '../../lib/categoryIcons'
import { entityTypeMeta, type EntityType } from '../../data/mockWorld'
import { useWorldStore } from '../../store/useWorldStore'
import { exportWorldData } from '../../lib/exportWorldData'

const typeIcon: Record<EntityType, React.ElementType> = {
  character: Users, location: MapPin, faction: Shield, magic_system: Sparkles,
  creature: Bug, language: Languages, item: Package, story: BookOpen,
  event: Calendar, note: StickyNote,
}

export default function TopBar({
  onOpenCreate,
  onOpenSettings,
  isMobile = false,
  onOpenSidebar,
  showBack = false,
  onBack,
}: {
  onOpenCreate: (type?: EntityType, categorySlug?: string) => void
  onOpenSettings?: () => void
  isMobile?: boolean
  onOpenSidebar?: () => void
  showBack?: boolean
  onBack?: () => void
}) {
  const searchQuery = useWorldStore((state) => state.searchQuery)
  const setSearchQuery = useWorldStore((state) => state.setSearchQuery)
  const logout = useWorldStore((state) => state.logout)
  const user = useWorldStore((state) => state.user)
  const libraryItems = useWorldStore((state) => state.libraryItems)
  const entities = useWorldStore((state) => state.entities)
  const activeUniverseId = useWorldStore((state) => state.activeUniverseId)
  const universes = useWorldStore((state) => state.universes)
  const lastBackupAt = useWorldStore((state) => state.lastBackupAt)
  const showToast = useWorldStore((state) => state.showToast)

  const handleLogout = async () => {
    const activeUniverse = universes.find((u) => u.id === activeUniverseId)
    const exportEntities = entities.filter((e) => e.universeId === activeUniverseId)
    if (activeUniverse && exportEntities.length > 0) {
      try {
        await exportWorldData(exportEntities, libraryItems, activeUniverse.name, activeUniverseId)
      } catch (error) {
        console.error('Auto-backup failed:', error)
        showToast('Auto-Backup vor Logout fehlgeschlagen')
      }
    }
    void logout()
  }
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const [createMenuOpen, setCreateMenuOpen] = useState(false)
  const [isDark, setIsDark] = useState(() => localStorage.getItem('worldify_theme') === 'dark')

  const toggleDark = () => {
    const next = !isDark
    setIsDark(next)
    if (next) {
      document.documentElement.dataset.theme = 'dark'
      localStorage.setItem('worldify_theme', 'dark')
    } else {
      delete document.documentElement.dataset.theme
      localStorage.setItem('worldify_theme', 'light')
    }
  }
  const avatarRef = useRef<HTMLDivElement>(null)
  const createRef = useRef<HTMLDivElement>(null)

  const initial = (user?.email?.[0] ?? 'U').toUpperCase()
  // Categories that map to an entity type (für Create-Dropdown)
  const createOptions = libraryItems
    .filter((item) => item.kind === 'category')
    .map((item) => ({
      label: item.label,
      slug: item.kind === 'category' ? item.slug : '',
      type: item.kind === 'category' ? item.entityType : undefined,
      icon: item.kind === 'category' ? item.icon : undefined,
    }))

  // Close dropdowns on outside click
  useEffect(() => {
    if (!avatarMenuOpen && !createMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarMenuOpen(false)
      }
      if (createRef.current && !createRef.current.contains(e.target as Node)) {
        setCreateMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [avatarMenuOpen, createMenuOpen])

  return (
    <header
      style={{
        height: 56,
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        display: 'flex',
        alignItems: 'center',
        padding: isMobile ? '0 16px' : '0 24px',
        gap: 8,
        flexShrink: 0,
      }}
    >
      {/* Hamburger — mobile only */}
      {isMobile ? (
        <button onClick={onOpenSidebar} style={iconButtonStyle}>
          <Menu size={16} strokeWidth={1.5} color="var(--color-text-secondary)" />
        </button>
      ) : null}

      {/* Back button — entity pages only */}
      {showBack ? (
        <button
          onClick={onBack}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            height: 36, padding: '0 12px',
            backgroundColor: 'transparent',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer', fontSize: 13, fontWeight: 500,
            fontFamily: 'var(--font-ui)',
            color: 'var(--color-text-secondary)',
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          {!isMobile ? 'Zurück' : null}
        </button>
      ) : null}

      {/* Search — hidden on mobile */}
      {!isMobile ? (
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <Search
            size={15}
            strokeWidth={1.5}
            color="var(--color-text-placeholder)"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            data-worldify-search
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Filtern…"
            style={{
              width: '100%',
              height: 36,
              paddingLeft: 36,
              paddingRight: 12,
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
              fontFamily: 'var(--font-ui)',
              color: 'var(--color-text)',
              outline: 'none',
            }}
          />
        </div>
      ) : null}

      <div style={{ flex: 1 }} />

      {/* Last backup timestamp */}
      {lastBackupAt && !isMobile ? (
        <div style={{
          fontSize: 11,
          color: 'var(--color-text-placeholder)',
          fontFamily: 'var(--font-ui)',
          whiteSpace: 'nowrap',
        }}>
          Backup {formatBackupTime(lastBackupAt)}
        </div>
      ) : null}

      {/* + New Entity Dropdown */}
      <div ref={createRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setCreateMenuOpen((o) => !o)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            height: 36,
            padding: isMobile ? '0 12px' : '0 14px',
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-primary-text)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            fontWeight: 500,
            fontFamily: 'var(--font-ui)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <Plus size={15} strokeWidth={1.5} />
          {isMobile ? null : 'New Entity'}
          {!isMobile ? <ChevronDown size={14} strokeWidth={1.5} style={{ marginLeft: 2 }} /> : null}
        </button>

        {createMenuOpen ? (
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            minWidth: 220, zIndex: 60, overflow: 'hidden',
            padding: 4, animation: 'modalIn 150ms ease-out',
          }}>
            <div style={{
              padding: '8px 12px 6px', fontSize: 11, fontWeight: 500,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)',
            }}>
              Eintrag erstellen
            </div>
            {createOptions.length > 0 ? (
              createOptions.map((opt) => {
                const Icon = opt.type ? typeIcon[opt.type] : getCategoryIcon(opt.icon)
                const meta = opt.type
                  ? entityTypeMeta[opt.type]
                  : {
                      color: 'var(--color-primary)',
                      lightColor: 'var(--color-primary-light)',
                    }
                return (
                  <button
                    key={`${opt.slug}-${opt.type ?? 'custom'}-${opt.label}`}
                    onClick={() => {
                      setCreateMenuOpen(false)
                      onOpenCreate(opt.type, opt.slug)
                    }}
                    style={createItemStyle}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <span style={{
                      width: 26, height: 26, borderRadius: 'var(--radius-md)',
                      backgroundColor: meta.lightColor, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Icon size={14} strokeWidth={1.5} color={meta.color} />
                    </span>
                    {opt.label}
                  </button>
                )
              })
            ) : (
              <button
                onClick={() => { setCreateMenuOpen(false); onOpenCreate() }}
                style={createItemStyle}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span style={{
                  width: 26, height: 26, borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-primary-light)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Plus size={14} strokeWidth={1.5} color="var(--color-primary)" />
                </span>
                Neuer Eintrag
              </button>
            )}
          </div>
        ) : null}
      </div>

{/* Avatar with dropdown */}
      <div ref={avatarRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setAvatarMenuOpen((o) => !o)}
          aria-label="Benutzermenü öffnen"
          aria-haspopup="menu"
          aria-expanded={avatarMenuOpen}
          style={{
            width: 32,
            height: 32,
            backgroundColor: 'var(--color-primary-light)',
            borderRadius: 'var(--radius-full)',
            border: avatarMenuOpen ? '2px solid var(--color-primary)' : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--color-primary)',
            cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
            transition: 'border-color 100ms ease',
          }}
        >
          {initial}
        </button>

        {avatarMenuOpen ? (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              minWidth: 200,
              zIndex: 60,
              overflow: 'hidden',
              padding: 4,
              animation: 'modalIn 150ms ease-out',
            }}
          >
            {/* User info */}
            <div
              style={{
                padding: '10px 12px 8px',
                borderBottom: '1px solid var(--color-border)',
                marginBottom: 4,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)', fontFamily: 'var(--font-ui)', marginBottom: 2 }}>
                {initial}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email ?? '—'}
              </div>
            </div>

            <DropdownItem
              icon={User}
              label="Profil"
              onClick={() => setAvatarMenuOpen(false)}
            />
            <DropdownItem
              icon={Settings}
              label="Settings"
              onClick={() => {
                setAvatarMenuOpen(false)
                onOpenSettings?.()
              }}
            />
            <DropdownItem
              icon={isDark ? Sun : Moon}
              label={isDark ? 'Light Mode' : 'Dark Mode'}
              onClick={() => { setAvatarMenuOpen(false); toggleDark() }}
            />

            <div style={{ height: 1, backgroundColor: 'var(--color-border)', margin: '4px 0' }} />

            <DropdownItem
              icon={LogOut}
              label="Ausloggen"
              danger
              onClick={() => {
                setAvatarMenuOpen(false)
                void handleLogout()
              }}
            />
          </div>
        ) : null}
      </div>
    </header>
  )
}

function DropdownItem({
  icon: Icon,
  label,
  danger = false,
  onClick,
}: {
  icon: React.ElementType
  label: string
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 12px',
        background: 'none',
        border: 'none',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        fontSize: 13,
        fontFamily: 'var(--font-ui)',
        color: danger ? 'var(--color-error)' : 'var(--color-text)',
        textAlign: 'left',
        transition: 'background 100ms ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg)')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      <Icon size={14} strokeWidth={1.5} />
      {label}
    </button>
  )
}

function formatBackupTime(iso: string): string {
  const d = new Date(iso)
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  return `${day}.${month}. ${hours}:${minutes}`
}

const iconButtonStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'transparent',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  flexShrink: 0,
}

const createItemStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '7px 10px',
  background: 'transparent',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
  fontFamily: 'var(--font-ui)',
  color: 'var(--color-text)',
  textAlign: 'left',
  transition: 'background 100ms ease',
}
