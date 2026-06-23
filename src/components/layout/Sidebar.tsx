import { useState } from 'react'
import {
  LayoutGrid,
  Users,
  MapPin,
  Shield,
  Sparkles,
  Bug,
  Languages,
  Package,
  BookOpen,
  Calendar,
  StickyNote,
  Settings,
  ChevronDown,
  ChevronRight,
  Globe,
  Plus,
  Pencil,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  GripVertical,
  BarChart2,
  Archive,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import type { SidebarLibraryItem } from '../../data/mockWorld'
import { supabase } from '../../lib/supabase'
import { getCategoryIcon } from '../../lib/categoryIcons'
import { useWorldStore } from '../../store/useWorldStore'

const APP_VERSION = '1.07'

export default function Sidebar({
  isMobile = false,
  isOpen = true,
  isCollapsed = false,
  onClose,
  onToggleCollapse,
  onOpenSettings,
  onOpenCategories,
  onOpenUniverseCreate,
  onOpenUniverseEdit,
}: {
  isMobile?: boolean
  isOpen?: boolean
  isCollapsed?: boolean
  onClose?: () => void
  onToggleCollapse?: () => void
  onOpenSettings: () => void
  onOpenCategories: () => void
  onOpenUniverseCreate: () => void
  onOpenUniverseEdit: (universeId: string) => void
}) {
  const [universeOpen, setUniverseOpen] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const universes = useWorldStore((state) => state.universes)
  const libraryItems = useWorldStore((state) => state.libraryItems)
  const activeUniverseId = useWorldStore((state) => state.activeUniverseId)
  const setActiveUniverse = useWorldStore((state) => state.setActiveUniverse)
  const setUniversesLocal = useWorldStore((state) => state.setUniversesLocal)
  const removeLibraryItem = useWorldStore((state) => state.removeLibraryItem)
  const reorderLibraryItems = useWorldStore((state) => state.reorderLibraryItems)
  const loadWorldData = useWorldStore((state) => state.loadWorldData)
  const user = useWorldStore((state) => state.user)
  const showToast = useWorldStore((state) => state.showToast)
  const openConfirmDialog = useWorldStore((state) => state.openConfirmDialog)
  const activeUniverse = universes.find((universe) => universe.id === activeUniverseId) ?? universes[0]

  const handleDeleteUniverse = async (universeId: string, universeName: string) => {
    if (universes.length <= 1) {
      showToast('Mindestens ein Universum muss bestehen bleiben')
      return
    }

    const confirmed = await openConfirmDialog({
      title: `"${universeName}" wirklich löschen?`,
      description: 'Alle zugehörigen Inhalte werden entfernt.',
      confirmLabel: 'Universum löschen',
      confirmVariant: 'danger',
    })

    if (!confirmed) {
      return
    }

    const { error } = await supabase
      .from('universes')
      .delete()
      .eq('id', universeId)
      .eq('user_id', user?.id ?? '')
      .select('id')
      .single()

    if (error) {
      showToast(error.message)
      return
    }

    const nextUniverses = universes.filter((universe) => universe.id !== universeId)
    setUniversesLocal(nextUniverses)

    if (activeUniverseId === universeId && nextUniverses[0]) {
      setActiveUniverse(nextUniverses[0].id)
    }

    await loadWorldData()
    showToast(`"${universeName}" gelöscht`)
  }

  const sidebarWidth = isCollapsed ? 56 : 240

  // Mobile: hidden off-screen, slides in as fixed overlay
  // Desktop: inline, collapses to icon-only
  const sidebarStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        width: 'min(300px, 85vw)',
        height: '100%',
        zIndex: 50,
        backgroundColor: 'var(--color-sidebar)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 250ms ease',
        boxShadow: isOpen ? 'var(--shadow-xl)' : 'none',
      }
    : {
        width: sidebarWidth,
        minWidth: sidebarWidth,
        backgroundColor: 'var(--color-sidebar)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transition: 'width 200ms ease, min-width 200ms ease',
        overflow: 'hidden',
      }

  return (
    <aside style={sidebarStyle}>
      <style>{`@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>
      <div
        style={{
          padding: isCollapsed ? '14px 0' : '20px 16px 16px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          gap: 8,
          flexShrink: 0,
        }}
      >
        {isCollapsed ? (
          /* Collapsed: just the expand button, no separate logo */
          <button onClick={onToggleCollapse} style={iconButtonStyle} title="Expand sidebar">
            <PanelLeftOpen size={15} strokeWidth={1.5} color="var(--color-text-secondary)" />
          </button>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  backgroundColor: 'var(--color-primary)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Globe size={15} color="var(--color-primary-text)" strokeWidth={1.5} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 20,
                    fontWeight: 700,
                    color: 'var(--color-text)',
                    letterSpacing: '-0.02em',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.1,
                  }}
                >
                  Worldify
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-ui)',
                    fontSize: 11,
                    fontWeight: 500,
                    color: 'var(--color-text-secondary)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    lineHeight: 1.4,
                  }}
                >
                  v{APP_VERSION}
                </span>
              </div>
            </div>
            {/* Mobile: Close button | Desktop: Collapse toggle */}
            {isMobile ? (
              <button onClick={onClose} style={iconButtonStyle}>
                <X size={15} strokeWidth={1.5} color="var(--color-text-secondary)" />
              </button>
            ) : (
              <button onClick={onToggleCollapse} style={iconButtonStyle} title="Collapse sidebar">
                <PanelLeftClose size={15} strokeWidth={1.5} color="var(--color-text-secondary)" />
              </button>
            )}
          </>
        )}
      </div>

      <div style={{ padding: '12px 12px 4px', display: isCollapsed ? 'none' : undefined }}>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setUniverseOpen((open) => !open)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              padding: '7px 10px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-surface)',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
              <UniverseIconPreview label={activeUniverse.name} iconUrl={activeUniverse.iconUrl} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 400,
                    color: 'var(--color-text-secondary)',
                    marginBottom: 1,
                  }}
                >
                  Universe
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--color-text)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {activeUniverse.name}
                </div>
              </div>
            </div>
            <ChevronDown
              size={16}
              strokeWidth={1.5}
              color="var(--color-text-secondary)"
              style={{
                transform: universeOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 150ms ease',
                flexShrink: 0,
              }}
            />
          </button>

          {universeOpen ? (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                right: 0,
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-md)',
                padding: 8,
                zIndex: 20,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {universes.map((universe) => {
                  const isActive = universe.id === activeUniverse.id

                  return (
                    <div
                      key={universe.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setActiveUniverse(universe.id)
                        setUniverseOpen(false)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setActiveUniverse(universe.id)
                          setUniverseOpen(false)
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: isActive ? 'var(--color-primary-light)' : 'transparent',
                        color: isActive ? 'var(--color-primary)' : 'var(--color-text)',
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <UniverseIconPreview label={universe.name} iconUrl={universe.iconUrl} small />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {universe.name}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              setUniverseOpen(false)
                              onOpenUniverseEdit(universe.id)
                            }}
                            style={universeIconButtonStyle}
                          >
                            <Pencil size={12} strokeWidth={1.5} />
                          </button>
                          {universes.length > 1 ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                void handleDeleteUniverse(universe.id, universe.name)
                              }}
                              style={universeIconButtonStyle}
                            >
                              <Trash2 size={12} strokeWidth={1.5} />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                })}

                <button
                  onClick={() => {
                    setUniverseOpen(false)
                    onOpenUniverseCreate()
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    height: 32,
                    marginTop: 4,
                    border: '1px dashed var(--color-border-strong)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-bg)',
                    color: 'var(--color-text-secondary)',
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={15} strokeWidth={1.5} />
                  Neues Universe
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 8px 4px' }}>
          {!isCollapsed ? <SectionLabel>Overview</SectionLabel> : null}
          <SidebarItem icon={LayoutGrid} label="Dashboard" to="/" collapsed={isCollapsed} onClick={isMobile ? onClose : undefined} />
          {!isCollapsed ? <SectionLabel>Library</SectionLabel> : null}
          {libraryItems.map((item, index) => (
            <LibraryItemRow
              key={item.id}
              item={item}
              collapsed={isCollapsed}
              onRemove={() => removeLibraryItem(item.id)}
              onNavClick={isMobile ? onClose : undefined}
              isDragging={draggingIndex === index}
              isDragOver={dragOverIndex === index && dragOverIndex !== draggingIndex}
              onDragStart={() => setDraggingIndex(index)}
              onDragOver={() => { if (dragOverIndex !== index) setDragOverIndex(index) }}
              onDrop={() => {
                if (draggingIndex !== null && draggingIndex !== index) {
                  reorderLibraryItems(draggingIndex, index)
                }
                setDraggingIndex(null)
                setDragOverIndex(null)
              }}
              onDragEnd={() => {
                setDraggingIndex(null)
                setDragOverIndex(null)
              }}
            />
          ))}
        </nav>

        <div style={{ borderTop: '1px solid var(--color-border)', padding: '4px 8px' }}>
          {!isCollapsed ? (
            <button
              onClick={() => setToolsOpen((v) => !v)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--color-text-secondary)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-ui)',
              }}
            >
              Tools
              {toolsOpen
                ? <ChevronDown size={13} strokeWidth={1.5} />
                : <ChevronRight size={13} strokeWidth={1.5} />}
            </button>
          ) : null}
          {toolsOpen || isCollapsed ? (
            <>
              <SidebarItem icon={BarChart2} label="Statistik" to="/stats" collapsed={isCollapsed} onClick={isMobile ? onClose : undefined} />
              <SidebarItem icon={Archive} label="Archiv" to="/archive" collapsed={isCollapsed} onClick={isMobile ? onClose : undefined} />
              <SidebarItem icon={Trash2} label="Papierkorb" to="/trash" collapsed={isCollapsed} onClick={isMobile ? onClose : undefined} />
            </>
          ) : null}
        </div>

        {!isCollapsed ? (
        <div
          style={{
            padding: '8px 8px 4px',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <button
            onClick={onOpenCategories}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              padding: '6px 8px',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'transparent',
              color: 'var(--color-text-secondary)',
              fontSize: 13,
              fontWeight: 500,
              fontFamily: 'var(--font-ui)',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Plus size={12} strokeWidth={1.5} color="var(--color-text-secondary)" />
              </span>
              Kategorie hinzufügen
            </span>
            <span
              style={{
                fontSize: 11,
                color: 'var(--color-text-secondary)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Neu
            </span>
          </button>
        </div>
        ) : null}
      </div>

      <div
        style={{
          padding: '8px',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: isCollapsed ? 'center' : undefined,
        }}
      >
        {isCollapsed ? (
          <button
            onClick={onOpenSettings}
            title="Settings"
            style={{
              width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'transparent', border: 'none',
              borderRadius: 'var(--radius-md)', cursor: 'pointer',
              color: 'var(--color-text-secondary)',
            }}
          >
            <Settings size={15} strokeWidth={1.5} />
          </button>
        ) : (
          <SidebarButton icon={Settings} label="Settings" onClick={onOpenSettings} />
        )}
      </div>
    </aside>
  )
}

const iconButtonStyle: React.CSSProperties = {
  width: 28, height: 28,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  backgroundColor: 'transparent', border: 'none',
  borderRadius: 'var(--radius-md)', cursor: 'pointer',
  flexShrink: 0,
}

const universeIconButtonStyle: React.CSSProperties = {
  width: 20,
  height: 20,
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  backgroundColor: 'var(--color-bg)',
  color: 'var(--color-text-secondary)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  flexShrink: 0,
}

function LibraryItemRow({
  item,
  collapsed = false,
  onRemove,
  onNavClick,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  item: SidebarLibraryItem
  collapsed?: boolean
  onRemove: () => void
  onNavClick?: () => void
  isDragging?: boolean
  isDragOver?: boolean
  onDragStart?: () => void
  onDragOver?: () => void
  onDrop?: () => void
  onDragEnd?: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const [confirmingRemove, setConfirmingRemove] = useState(false)

  const dragProps = {
    draggable: true,
    onDragStart: (e: React.DragEvent) => { e.dataTransfer.effectAllowed = 'move'; onDragStart?.() },
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; onDragOver?.() },
    onDrop: (e: React.DragEvent) => { e.preventDefault(); onDrop?.() },
    onDragEnd: () => onDragEnd?.(),
  }

  if (item.kind === 'divider') {
    if (collapsed) return null
    const hasLabel = item.label.trim().length > 0
    return (
      <div
        {...dragProps}
        style={{
          padding: hasLabel ? '8px 8px 4px' : '5px 8px',
          opacity: isDragging ? 0.4 : 1,
          transition: 'opacity 150ms ease',
          cursor: 'grab',
          position: 'relative',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setConfirmingRemove(false) }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {hasLabel ? (
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>
              {item.label}
            </span>
          ) : null}
          <div style={{
            flex: 1,
            height: isDragOver ? 2 : 1,
            backgroundColor: isDragOver ? 'var(--color-primary)' : hovered ? 'var(--color-border-strong)' : 'var(--color-border)',
            transition: 'all 150ms ease',
          }} />
          {item.id.startsWith('lib-divider-') ? (
            <div style={{ opacity: hovered ? 1 : 0, pointerEvents: hovered ? 'auto' : 'none', transition: 'opacity 150ms ease', flexShrink: 0 }}>
              {confirmingRemove ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>Löschen?</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onRemove() }}
                    title="Ja, löschen"
                    style={{
                      width: 20, height: 20, border: 'none', borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--color-error-light)', color: 'var(--color-error)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', flexShrink: 0,
                    }}
                  >
                    <Trash2 size={11} strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setConfirmingRemove(false) }}
                    title="Abbrechen"
                    style={{
                      width: 20, height: 20, border: 'none', borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--color-bg)', color: 'var(--color-text-secondary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', flexShrink: 0,
                    }}
                  >
                    <X size={11} strokeWidth={1.5} />
                  </button>
                </div>
              ) : (
                <SidebarInlineRemoveButton onClick={() => setConfirmingRemove(true)} />
              )}
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div
      {...dragProps}
      style={{
        display: 'flex',
        alignItems: 'center',
        borderRadius: 'var(--radius-md)',
        opacity: isDragging ? 0.4 : 1,
        outline: isDragOver ? '2px solid var(--color-primary)' : undefined,
        outlineOffset: '-1px',
        transition: 'opacity 150ms ease',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <SidebarItem
          icon={item.icon ? getCategoryIcon(item.icon) : iconForSlug(item.slug)}
          iconUrl={item.iconUrl}
          label={item.label}
          to={`/${item.slug}`}
          collapsed={collapsed}
          color={item.color}
          onClick={onNavClick}
        />
      </div>
      {!collapsed ? (
        <div style={{
          width: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          cursor: 'grab',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 150ms ease',
        }}>
          <GripVertical size={12} strokeWidth={1.5} color="var(--color-text-placeholder)" />
        </div>
      ) : null}
    </div>
  )
}

function SidebarInlineRemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Entfernen"
      style={{
        width: 24,
        height: 24,
        border: 'none',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'transparent',
        color: 'var(--color-text-placeholder)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background 100ms ease, color 100ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--color-error-light)'
        e.currentTarget.style.color = 'var(--color-error)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
        e.currentTarget.style.color = 'var(--color-text-placeholder)'
      }}
    >
      <Trash2 size={12} strokeWidth={1.5} />
    </button>
  )
}

function iconForSlug(slug: string) {
  const iconMap: Record<string, React.ElementType> = {
    characters: Users,
    locations: MapPin,
    factions: Shield,
    'magic-systems': Sparkles,
    creatures: Bug,
    languages: Languages,
    items: Package,
    stories: BookOpen,
    events: Calendar,
    notes: StickyNote,
  }

  return iconMap[slug] ?? StickyNote
}

function UniverseIconPreview({
  label,
  iconUrl,
  small = false,
}: {
  label: string
  iconUrl?: string
  small?: boolean
}) {
  const size = small ? 20 : 28
  const iconSize = small ? 11 : 15
  const initial = label.slice(0, 1).toUpperCase()

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 'var(--radius-md)',
        backgroundColor: iconUrl ? 'transparent' : 'var(--color-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {iconUrl ? (
        <img
          src={iconUrl}
          alt={`${label} icon`}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      ) : (
        <span
          style={{
            fontSize: iconSize,
            fontWeight: 600,
            color: 'var(--color-primary-text)',
            lineHeight: 1,
          }}
        >
          {initial}
        </span>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 500,
        color: 'var(--color-text-secondary)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        padding: '8px 8px 6px',
        fontFamily: 'var(--font-ui)',
      }}
    >
      {children}
    </div>
  )
}

function SidebarButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType
  label: string
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
        padding: '6px 8px',
        borderRadius: 'var(--radius-md)',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 400,
        fontFamily: 'var(--font-ui)',
        color: 'var(--color-text-secondary)',
        transition: 'background 100ms ease, color 100ms ease',
        textAlign: 'left',
      }}
    >
      <Icon size={15} strokeWidth={1.5} />
      {label}
    </button>
  )
}

function SidebarItem({
  icon: Icon,
  iconUrl,
  label,
  to,
  collapsed = false,
  color,
  onClick,
}: {
  icon: React.ElementType
  iconUrl?: string
  label: string
  to: string
  collapsed?: boolean
  color?: string
  onClick?: () => void
}) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      title={collapsed ? label : undefined}
      onClick={onClick}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : undefined,
        gap: 8,
        padding: collapsed ? '7px 0' : '7px 8px',
        borderRadius: 'var(--radius-md)',
        textDecoration: 'none',
        fontSize: 13,
        fontWeight: isActive ? 500 : 400,
        color: isActive ? (color ?? 'var(--color-primary)') : 'var(--color-text-secondary)',
        backgroundColor: isActive ? (color ? color + '18' : 'var(--color-primary-light)') : 'transparent',
        transition: 'background 100ms ease, color 100ms ease',
        marginBottom: 1,
      })}
    >
      {iconUrl
        ? <img src={iconUrl} alt="" style={{ width: 15, height: 15, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }} />
        : <Icon size={15} strokeWidth={1.5} color={color ?? 'currentColor'} />
      }
      {!collapsed ? label : null}
    </NavLink>
  )
}
