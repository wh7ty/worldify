import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Bug, Calendar, Languages, MapPin, Package, Search, Shield, Sparkles, StickyNote, Users, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { entityTypeMeta, type EntityType } from '../../data/mockWorld'
import { useWorldStore } from '../../store/useWorldStore'

const TYPE_ICON: Record<EntityType, React.ElementType> = {
  character: Users, location: MapPin, faction: Shield, magic_system: Sparkles,
  creature: Bug, language: Languages, item: Package, story: BookOpen,
  event: Calendar, note: StickyNote,
}

export default function SearchPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const [activeTypeFilter, setActiveTypeFilter] = useState<EntityType | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const navigate = useNavigate()
  const entities = useWorldStore((state) => state.entities)
  const universes = useWorldStore((state) => state.universes)
  const activeUniverseId = useWorldStore((state) => state.activeUniverseId)
  const multiUniverse = universes.length > 1

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(-1)
      setActiveTypeFilter(null)
      const t = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [open])

  // Reset active index when query or type filter changes
  useEffect(() => { setActiveIndex(-1) }, [query, activeTypeFilter])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => {
          const next = Math.min(i + 1, results.length - 1)
          itemRefs.current[next]?.scrollIntoView({ block: 'nearest' })
          return next
        })
        return
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => {
          const next = Math.max(i - 1, -1)
          if (next === -1) inputRef.current?.focus()
          else itemRefs.current[next]?.scrollIntoView({ block: 'nearest' })
          return next
        })
        return
      }

      if (e.key === 'Enter' && activeIndex >= 0 && results[activeIndex]) {
        e.preventDefault()
        navigate(`/entities/${results[activeIndex].id}`)
        onClose()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose, activeIndex, navigate])

  const baseResults = query.trim()
    ? entities
        .filter((e) => {
          const h = `${e.name} ${e.shortDescription} ${e.tags.join(' ')}`.toLowerCase()
          return h.includes(query.trim().toLowerCase())
        })
        .sort((a, b) => {
          if (a.universeId === activeUniverseId && b.universeId !== activeUniverseId) return -1
          if (b.universeId === activeUniverseId && a.universeId !== activeUniverseId) return 1
          return 0
        })
    : []

  // Inline autocomplete suggestion — name must start with query
  const suggestion = useMemo(() => {
    if (!query.trim()) return ''
    const q = query.toLowerCase()
    const nameMatch = baseResults.filter((e) => e.name.toLowerCase().startsWith(q))
    if (nameMatch.length === 0) return ''
    return (nameMatch.find((e) => e.universeId === activeUniverseId) ?? nameMatch[0]).name
  }, [query, baseResults, activeUniverseId])

  const ghostText = suggestion ? suggestion.slice(query.length) : ''

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!ghostText) return
    if (e.key === 'Tab') {
      e.preventDefault()
      setQuery(suggestion)
      return
    }
    if (e.key === 'ArrowRight') {
      const el = inputRef.current
      if (el && el.selectionStart === el.value.length) {
        e.preventDefault()
        setQuery(suggestion)
      }
    }
  }

  const availableTypes = Array.from(new Set(baseResults.map((e) => e.type))) as EntityType[]

  const results = (activeTypeFilter
    ? baseResults.filter((e) => e.type === activeTypeFilter)
    : baseResults
  ).slice(0, 14)

  if (!open) return null

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          backgroundColor: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(2px)',
          animation: 'fadeIn 120ms ease',
        }}
      />
      <div
        style={{
          position: 'fixed', top: 72, left: '50%', transform: 'translateX(-50%)',
          zIndex: 201, width: 'min(560px, calc(100vw - 32px))',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
          animation: 'modalIn 150ms ease-out',
        }}
      >
        {/* Search input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '0 16px',
          borderBottom: '1px solid var(--color-border)',
          height: 52,
        }}>
          <Search size={16} strokeWidth={1.5} color="var(--color-text-secondary)" style={{ flexShrink: 0 }} />
          {/* Input + ghost text overlay */}
          <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
            {ghostText ? (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
                  display: 'flex', alignItems: 'center',
                  fontSize: 15, fontFamily: 'var(--font-ui)',
                  pointerEvents: 'none', whiteSpace: 'pre', overflow: 'hidden',
                }}
              >
                <span style={{ color: 'transparent' }}>{query}</span>
                <span style={{ color: 'var(--color-text-placeholder)' }}>{ghostText}</span>
              </div>
            ) : null}
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={ghostText ? '' : (multiUniverse ? 'Alle Universen durchsuchen…' : 'Entitäten suchen…')}
              style={{
                width: '100%', border: 'none', outline: 'none',
                fontSize: 15, fontFamily: 'var(--font-ui)',
                backgroundColor: 'transparent',
                color: 'var(--color-text)',
                position: 'relative',
              }}
            />
          </div>
          <button
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28,
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              background: 'none', cursor: 'pointer',
              color: 'var(--color-text-secondary)', flexShrink: 0,
            }}
          >
            <X size={13} strokeWidth={1.5} />
          </button>
        </div>

        {/* Type filter pills */}
        {availableTypes.length > 1 ? (
          <div style={{
            display: 'flex', gap: 6, padding: '8px 16px', flexWrap: 'wrap',
            borderBottom: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg)',
          }}>
            <button
              onClick={() => setActiveTypeFilter(null)}
              style={{
                padding: '3px 10px', borderRadius: 'var(--radius-full)',
                border: '1px solid var(--color-border)',
                backgroundColor: activeTypeFilter === null ? 'var(--color-text)' : 'transparent',
                color: activeTypeFilter === null ? 'var(--color-bg)' : 'var(--color-text-secondary)',
                fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-ui)', cursor: 'pointer',
                transition: 'all 80ms ease',
              }}
            >
              Alle
            </button>
            {availableTypes.map((type) => {
              const meta = entityTypeMeta[type]
              const Icon = TYPE_ICON[type]
              const isActive = activeTypeFilter === type
              return (
                <button
                  key={type}
                  onClick={() => setActiveTypeFilter(isActive ? null : type)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '3px 10px', borderRadius: 'var(--radius-full)',
                    border: `1px solid ${isActive ? meta.color : 'var(--color-border)'}`,
                    backgroundColor: isActive ? meta.lightColor : 'transparent',
                    color: isActive ? meta.color : 'var(--color-text-secondary)',
                    fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-ui)', cursor: 'pointer',
                    transition: 'all 80ms ease',
                  }}
                >
                  <Icon size={11} strokeWidth={1.5} />
                  {meta.label}
                </button>
              )
            })}
          </div>
        ) : null}

        {/* Results */}
        {results.length > 0 ? (
          <div ref={listRef} style={{ maxHeight: 400, overflowY: 'auto' }}>
            {results.map((entity, i) => {
              const meta = entityTypeMeta[entity.type]
              const Icon = TYPE_ICON[entity.type]
              const isActive = i === activeIndex
              const universeName = multiUniverse ? universes.find((u) => u.id === entity.universeId)?.name : null
              const isOtherUniverse = entity.universeId !== activeUniverseId
              return (
                <a
                  key={entity.id}
                  ref={(el) => { itemRefs.current[i] = el }}
                  href={`/entities/${entity.id}`}
                  onClick={(e) => { e.preventDefault(); navigate(`/entities/${entity.id}`); onClose() }}
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseLeave={() => setActiveIndex(-1)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 16px', textDecoration: 'none',
                    borderBottom: i < results.length - 1 ? '1px solid var(--color-border)' : 'none',
                    backgroundColor: isActive ? 'var(--color-bg)' : 'transparent',
                    borderLeft: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                    transition: 'background 80ms ease',
                    opacity: isOtherUniverse ? 0.75 : 1,
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 'var(--radius-md)',
                    backgroundColor: meta.lightColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon size={15} strokeWidth={1.5} color={meta.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {entity.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {entity.shortDescription ? (
                        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {entity.shortDescription}
                        </span>
                      ) : null}
                      {universeName ? (
                        <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', flexShrink: 0 }}>
                          {universeName}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, padding: '2px 7px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: meta.lightColor, color: meta.color,
                    fontWeight: 500, fontFamily: 'var(--font-ui)', flexShrink: 0,
                  }}>
                    {meta.label}
                  </span>
                </a>
              )
            })}
          </div>
        ) : query.trim() ? (
          <div style={{ padding: '28px 16px', textAlign: 'center', fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)' }}>
            Keine Ergebnisse für „{query}"
          </div>
        ) : (
          <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)' }}>
            {multiUniverse ? 'Durchsucht alle Universen…' : 'Beginne zu tippen, um Entitäten zu finden…'}
          </div>
        )}

        {/* Keyboard hints */}
        <div style={{
          display: 'flex', gap: 16, padding: '10px 16px',
          borderTop: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg)',
        }}>
          {[
            { key: '↑↓', label: 'Navigieren' },
            { key: '↵', label: 'Öffnen' },
            { key: 'Tab', label: 'Autocomplete' },
            { key: 'Esc', label: 'Schließen' },
          ].map(({ key, label }) => (
            <span key={key} style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <kbd style={{ padding: '1px 5px', borderRadius: 4, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', fontSize: 10, fontFamily: 'var(--font-ui)' }}>
                {key}
              </kbd>
              {label}
            </span>
          ))}
        </div>
      </div>
    </>
  )
}
