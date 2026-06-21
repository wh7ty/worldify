import { useEffect, useMemo, useRef, useState } from 'react'
import { useWindowWidth } from '../hooks/useWindowWidth'
import { Activity, ArrowUpRight, GripVertical, Image, Plus, Upload, Download, Clock, Bug, BookOpen, Calendar, Languages, MapPin, Package, Shield, Sparkles, StickyNote, Users, X } from 'lucide-react'
import { getEntityCover, getEntityAvatar } from '../lib/entityMedia'
import { Link, useOutletContext } from 'react-router-dom'
import { entityTypeMeta, type EntityType } from '../data/mockWorld'
import { getCategoryIcon } from '../lib/categoryIcons'
import { isEntityInCategory } from '../lib/categoryMatching'
import { toSingular } from '../lib/toSingular'
import { useWorldStore } from '../store/useWorldStore'
import { exportWorldData } from '../lib/exportWorldData'
import { importWorldData } from '../lib/importWorldData'
import { getActivityForUniverse } from '../lib/activityLog'
import { cacheUniverseBanner, getUniverseBanner, refreshUniverseBannerFromDB, removeUniverseBanner, UNIVERSE_BANNER_EVENT, uploadUniverseBanner } from '../lib/universeBanner'
import { getUniverseBannerPosition, saveUniverseBannerPosition } from '../lib/bannerPosition'
import { useBannerDrag } from '../hooks/useBannerDrag'
import { supabase } from '../lib/supabase'

type OutletContext = {
  openCreateModal: (type?: EntityType, categorySlug?: string) => void
}

export default function DashboardPrototype() {
  const isMobile = useWindowWidth() < 640
  const { openCreateModal } = useOutletContext<OutletContext>()
  const universes = useWorldStore((state) => state.universes)
  const activeUniverseId = useWorldStore((state) => state.activeUniverseId)
  const libraryItems = useWorldStore((state) => state.libraryItems)
  const entities = useWorldStore((state) => state.entities)
  const loadWorldData = useWorldStore((state) => state.loadWorldData)
  const showToast = useWorldStore((state) => state.showToast)
  // Import state
  const [importOpen, setImportOpen] = useState(false)
  const [importStep, setImportStep] = useState<'name' | 'importing'>('name')
  const [importNewName, setImportNewName] = useState('')
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  const user = useWorldStore((state) => state.user)
  const setActiveUniverse = useWorldStore((state) => state.setActiveUniverse)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const [bannerUrl, setBannerUrl] = useState<string | null>(() => getUniverseBanner(activeUniverseId))
  const [isBannerBusy, setIsBannerBusy] = useState(false)

  useEffect(() => {
    if (import.meta.env.VITE_E2E_MODE === 'true' || !user) {
      setBannerUrl(getUniverseBanner(activeUniverseId))
      return
    }

    let disposed = false
    setBannerUrl(getUniverseBanner(activeUniverseId))

    const refreshBanner = async () => {
      try {
        const remoteUrl = await refreshUniverseBannerFromDB(activeUniverseId)
        if (!disposed) setBannerUrl(remoteUrl)
      } catch (error) {
        console.warn(error instanceof Error ? error.message : 'Universe-Banner konnte nicht aktualisiert werden.')
      }
    }
    const handleFocus = () => { void refreshBanner() }
    const handleVisibility = () => { if (document.visibilityState === 'visible') void refreshBanner() }
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'worldify-universe-banners') setBannerUrl(getUniverseBanner(activeUniverseId))
    }
    const handleLocalChange = (event: Event) => {
      const detail = (event as CustomEvent<{ universeId: string; url: string | null }>).detail
      if (detail?.universeId === activeUniverseId) setBannerUrl(detail.url)
    }

    window.addEventListener('focus', handleFocus)
    window.addEventListener('storage', handleStorage)
    window.addEventListener(UNIVERSE_BANNER_EVENT, handleLocalChange)
    document.addEventListener('visibilitychange', handleVisibility)

    const channel = supabase
      .channel(`worldify-universe-banner-${activeUniverseId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'universes', filter: `id=eq.${activeUniverseId}` },
        (payload) => {
          const remoteUrl = (payload.new as { banner_url?: string | null }).banner_url ?? null
          cacheUniverseBanner(activeUniverseId, remoteUrl)
        },
      )
      .subscribe()

    const pollId = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshBanner()
    }, 30_000)
    void refreshBanner()

    return () => {
      disposed = true
      window.clearInterval(pollId)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener(UNIVERSE_BANNER_EVENT, handleLocalChange)
      document.removeEventListener('visibilitychange', handleVisibility)
      void supabase.removeChannel(channel)
    }
  }, [activeUniverseId, user])

  const { position: bannerPosition, setPosition: setBannerPosition, isDragging: isBannerDragging, isHovering: isBannerHovering, setIsHovering: setBannerHovering, onMouseDown: startBannerDrag } = useBannerDrag(
    getUniverseBannerPosition(activeUniverseId),
    (pos) => saveUniverseBannerPosition(activeUniverseId, pos),
  )

  const activeUniverse = universes.find((universe) => universe.id === activeUniverseId) ?? universes[0]
  const universeName = activeUniverse?.name ?? 'Mein Universum'
  const universeDescription = activeUniverse?.description?.trim() || 'Baue dein Worldbuilding Schritt fur Schritt aus.'

  const handleExport = async () => {
    if (!activeUniverse) return
    const exportEntities = entities.filter((e) => e.universeId === activeUniverseId)
    try {
      await exportWorldData(exportEntities, libraryItems, activeUniverse.name, activeUniverseId)
      showToast('Backup erstellt')
    } catch (error) {
      console.error('Export error:', error)
      showToast(error instanceof Error ? error.message : 'Backup fehlgeschlagen')
    }
  }

  const handleOpenImport = () => {
    setImportStep('name')
    setImportNewName('')
    setImportMessage(null)
    setPendingFile(null)
    setImportOpen(true)
  }

  const handleImportFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) setPendingFile(file)
    // Reset so the same file can be re-selected
    event.target.value = ''
  }

  const handleImportStart = async () => {
    if (!pendingFile || !importNewName.trim() || !user) return

    setImportStep('importing')
    setIsImporting(true)
    setImportMessage(null)

    const result = await importWorldData(
      pendingFile,
      importNewName.trim(),
      user.id,
      (msg) => setImportMessage(msg),
    )

    if (result.success) {
      setImportMessage(`✓ ${result.message}`)
      await loadWorldData()
      if (result.newUniverseId) {
        setActiveUniverse(result.newUniverseId)
      }
      setTimeout(() => setImportOpen(false), 1800)
    } else {
      setImportMessage(`✗ ${result.message}`)
      setImportStep('name')
    }

    setIsImporting(false)
  }

  const categories = useMemo(() => {
    return libraryItems
      .filter((item) => item.kind === 'category')
      .map((category) => {
        const categoryEntities = entities.filter(
          (entity) => entity.universeId === activeUniverseId && isEntityInCategory(entity, category),
        )

        const previewItems = categoryEntities.slice(0, 4).map((e) => ({
          id: e.id,
          name: e.name,
          avatar: getEntityAvatar(e.id),
          cover: getEntityCover(e.id),
        }))
        const customColor = category.color
        const colorMeta = category.entityType ? entityTypeMeta[category.entityType] : null

        return {
          ...category,
          count: categoryEntities.length,
          previewItems,
          color: customColor ?? colorMeta?.color ?? 'var(--color-primary)',
          lightColor: customColor ? customColor + '18' : (colorMeta?.lightColor ?? 'var(--color-primary-light)'),
        }
      })
  }, [activeUniverseId, entities, libraryItems])

  const recentEntities = useMemo(() =>
    entities
      .filter((e) => e.universeId === activeUniverseId && e.status !== 'archived')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 8),
    [activeUniverseId, entities],
  )

  const recentActivity = useMemo(() => getActivityForUniverse(activeUniverseId, 8), [activeUniverseId])

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    const previousUrl = bannerUrl
    const preview = URL.createObjectURL(file)
    setBannerUrl(preview)
    setBannerPosition(50)
    setIsBannerBusy(true)
    try {
      const url = await uploadUniverseBanner(user.id, activeUniverseId, file)
      setBannerUrl(url)
      showToast('Banner synchronisiert')
    } catch (error) {
      setBannerUrl(previousUrl)
      showToast(error instanceof Error ? error.message : 'Banner-Upload fehlgeschlagen')
    } finally {
      URL.revokeObjectURL(preview)
      setIsBannerBusy(false)
      e.target.value = ''
    }
  }

  const handleRemoveBanner = async () => {
    if (!user || isBannerBusy) return
    setIsBannerBusy(true)
    try {
      await removeUniverseBanner(user.id, activeUniverseId)
      setBannerUrl(null)
      showToast('Banner entfernt')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Banner konnte nicht entfernt werden')
    } finally {
      setIsBannerBusy(false)
    }
  }

  return (
    <div>
      <div
        style={{
          position: 'relative',
          marginTop: isMobile ? -16 : -32,
          marginLeft: isMobile ? -16 : -32,
          marginRight: isMobile ? -16 : -32,
          marginBottom: 'var(--space-8)',
          padding: isMobile ? '40px 16px 32px' : '48px 32px 40px',
          cursor: bannerUrl ? (isBannerDragging ? 'grabbing' : 'grab') : undefined,
          background: bannerUrl
            ? `linear-gradient(to bottom, rgba(0,0,0,0.35), rgba(0,0,0,0.15) 60%, transparent), url(${bannerUrl}) center ${Math.round(bannerPosition)}%/cover no-repeat`
            : 'linear-gradient(180deg, var(--color-primary-light) 0%, transparent 100%)',
          borderBottom: '1px solid var(--color-border)',
        }}
        onMouseDown={bannerUrl ? startBannerDrag : undefined}
        onMouseEnter={bannerUrl ? () => setBannerHovering(true) : undefined}
        onMouseLeave={() => setBannerHovering(false)}
      >

        <input ref={bannerInputRef} type="file" accept="image/*" onChange={handleBannerChange} style={{ display: 'none' }} />

        {bannerUrl ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 1, opacity: isBannerHovering || isBannerDragging ? 1 : 0, transition: isBannerDragging ? 'none' : 'opacity 0.2s' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 'var(--radius-full)', backgroundColor: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(8px)', color: 'rgba(255,255,255,0.92)', fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-ui)', userSelect: 'none' }}>
              <GripVertical size={12} strokeWidth={1.5} />
              {isBannerDragging ? 'Loslassen zum Speichern' : 'Bild verschieben'}
            </div>
          </div>
        ) : null}

        <div onMouseDown={(e) => e.stopPropagation()} style={{ position: 'absolute', top: 'var(--space-4)', right: 'var(--space-4)', display: 'flex', gap: 'var(--space-2)', zIndex: 2 }}>
          <button disabled={isBannerBusy} onClick={() => bannerInputRef.current?.click()} style={{ ...heroBtnStyle, opacity: isBannerBusy ? 0.6 : 1 }} title="Banner ändern">
            <Image size={12} strokeWidth={1.5} />
            {!isMobile && (isBannerBusy ? 'Synchronisiert…' : 'Banner')}
          </button>
          {bannerUrl && user ? (
            <button
              disabled={isBannerBusy}
              onClick={() => void handleRemoveBanner()}
              style={{ ...heroBtnStyle, opacity: isBannerBusy ? 0.6 : 1 }}
              title="Banner entfernen"
            >
              <X size={12} strokeWidth={1.5} />
              {!isMobile && 'Entfernen'}
            </button>
          ) : null}
          <button onClick={() => void handleExport()} style={heroBtnStyle}>
            <Download size={12} strokeWidth={1.5} />
            {!isMobile && 'Backup'}
          </button>
          <button onClick={handleOpenImport} style={heroBtnStyle}>
            <Upload size={12} strokeWidth={1.5} />
            {!isMobile && 'Import'}
          </button>
        </div>

      {/* Hidden file input */}
      <input
        ref={importInputRef}
        type="file"
        accept=".zip"
        onChange={handleImportFileChange}
        style={{ display: 'none' }}
      />

      {/* Import: Name + Upload */}
      {importOpen && (
        <div style={overlayStyle} onClick={() => !isImporting && setImportOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={modalStyle}>
            <h2 style={modalTitleStyle}>Backup importieren</h2>
            <p style={modalSubtitleStyle}>
              {importStep === 'name'
                ? 'Gib dem neuen Universe einen Namen und wähle die ZIP-Datei aus.'
                : 'Import läuft...'}
            </p>

            {importStep === 'name' && (
              <>
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 'var(--space-2)' }}>
                    Name des neuen Universe
                  </label>
                  <input
                    autoFocus
                    value={importNewName}
                    onChange={(e) => setImportNewName(e.target.value)}
                    placeholder="z.B. Mein Worldbuilding"
                    style={inputStyle}
                  />
                </div>

                <div
                  onClick={() => importInputRef.current?.click()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-4)',
                    borderRadius: 'var(--radius-md)',
                    border: `2px dashed ${pendingFile ? 'var(--color-success)' : 'var(--color-border-strong)'}`,
                    backgroundColor: pendingFile ? 'var(--color-success-light)' : 'var(--color-bg)',
                    cursor: 'pointer',
                    marginBottom: 'var(--space-6)',
                  }}
                >
                  <Upload size={16} strokeWidth={1.5} color={pendingFile ? 'var(--color-success)' : 'var(--color-primary)'} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: pendingFile ? 'var(--color-success)' : 'var(--color-text)' }}>
                      {pendingFile ? pendingFile.name : 'ZIP-Datei auswählen'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                      {pendingFile ? 'Klicken zum Ändern' : 'Worldify-Backup (.zip)'}
                    </div>
                  </div>
                </div>
              </>
            )}

            {importMessage && (
              <div
                style={{
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: importMessage.startsWith('✓') ? 'var(--color-success-light)' : 'var(--color-error-light)',
                  color: importMessage.startsWith('✓') ? 'var(--color-success)' : 'var(--color-error)',
                  fontSize: 12,
                  marginBottom: 'var(--space-4)',
                }}
              >
                {importMessage}
              </div>
            )}

            {importStep === 'name' && (
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <button onClick={() => setImportOpen(false)} style={secondaryBtnStyle}>Abbrechen</button>
                <button
                  onClick={handleImportStart}
                  disabled={!pendingFile || !importNewName.trim()}
                  style={{ ...primaryBtnStyle, opacity: (pendingFile && importNewName.trim()) ? 1 : 0.5 }}
                >
                  <Upload size={14} strokeWidth={1.5} />
                  Importieren
                </button>
              </div>
            )}
          </div>
        </div>
      )}

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: bannerUrl ? 'rgba(255,255,255,0.7)' : 'var(--color-text-secondary)',
              fontFamily: 'var(--font-ui)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 'var(--space-2)',
            }}
          >
            Universe
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 32,
              fontWeight: 700,
              color: bannerUrl ? 'rgba(255,255,255,0.95)' : 'var(--color-text)',
              letterSpacing: '-0.02em',
              marginBottom: 'var(--space-3)',
            }}
          >
            {universeName}
          </h1>
          <p
            style={{
              maxWidth: '65ch',
              fontSize: 15,
              lineHeight: 1.6,
              color: bannerUrl ? 'rgba(255,255,255,0.75)' : 'var(--color-text-secondary)',
              fontFamily: 'var(--font-ui)',
            }}
          >
            {universeDescription}
          </p>
        </div>
      </div>

      {recentEntities.length > 0 ? (
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-4)' }}>
            <Clock size={13} strokeWidth={1.5} color="var(--color-text-secondary)" />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Zuletzt bearbeitet
            </span>
          </div>
          <div className="worldify-no-scrollbar" style={{ display: 'flex', gap: 'var(--space-3)', overflowX: 'auto' }}>
            {recentEntities.map((entity) => {
              const meta = entityTypeMeta[entity.type]
              const ICONS: Record<string, React.ElementType> = { character: Users, location: MapPin, faction: Shield, magic_system: Sparkles, creature: Bug, language: Languages, item: Package, story: BookOpen, event: Calendar, note: StickyNote }
              const Icon = ICONS[entity.type] ?? StickyNote
              const entityImg = getEntityAvatar(entity.id) ?? getEntityCover(entity.id)
              return (
                <Link
                  key={entity.id}
                  to={`/entities/${entity.id}`}
                  style={{
                    flexShrink: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                    padding: '8px 12px', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                    textDecoration: 'none',
                    transition: 'border-color 120ms, background 120ms',
                    minWidth: 0, maxWidth: 180,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.backgroundColor = 'var(--color-primary-light)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.backgroundColor = 'var(--color-surface)' }}
                >
                  <div style={{ width: 24, height: 24, borderRadius: 'var(--radius-sm)', backgroundColor: meta.lightColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                    {entityImg
                      ? <img src={entityImg} alt={entity.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <Icon size={13} strokeWidth={1.5} color={meta.color} />
                    }
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text)', fontFamily: 'var(--font-ui)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entity.name}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      ) : null}

      {recentActivity.length > 0 ? (
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-4)' }}>
            <Activity size={13} strokeWidth={1.5} color="var(--color-text-secondary)" />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Aktivitäten
            </span>
          </div>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', backgroundColor: 'var(--color-surface)' }}>
            {recentActivity.map((entry, idx) => {
              const isLast = idx === recentActivity.length - 1
              const actionLabels: Record<string, string> = {
                created: 'erstellt',
                updated: 'bearbeitet',
                deleted: 'gelöscht',
                archived: 'archiviert',
                restored: 'wiederhergestellt',
              }
              const actionColors: Record<string, string> = {
                created: 'var(--color-success)',
                updated: 'var(--color-primary)',
                deleted: 'var(--color-error)',
                archived: 'var(--color-text-secondary)',
                restored: 'var(--color-accent)',
              }
              const timeAgo = (() => {
                const diff = Date.now() - new Date(entry.timestamp).getTime()
                const mins = Math.floor(diff / 60000)
                if (mins < 1) return 'gerade eben'
                if (mins < 60) return `vor ${mins} Min.`
                const hours = Math.floor(mins / 60)
                if (hours < 24) return `vor ${hours} Std.`
                return `vor ${Math.floor(hours / 24)} Tagen`
              })()
              return (
                <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', borderBottom: isLast ? 'none' : '1px solid var(--color-border)' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: actionColors[entry.action] ?? 'var(--color-primary)', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--color-text)', fontFamily: 'var(--font-ui)', fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {entry.entityName}
                  </span>
                  <span style={{ fontSize: 11, color: actionColors[entry.action] ?? 'var(--color-primary)', fontFamily: 'var(--font-ui)', fontWeight: 500, flexShrink: 0 }}>
                    {actionLabels[entry.action] ?? entry.action}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--color-text-placeholder)', fontFamily: 'var(--font-ui)', flexShrink: 0 }}>{timeAgo}</span>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      {categories.length === 0 ? (
        <div
          style={{
            border: '1px dashed var(--color-border-strong)',
            borderRadius: 'var(--radius-xl)',
            backgroundColor: 'var(--color-surface)',
            padding: 'var(--space-8)',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--color-text)',
              fontFamily: 'var(--font-ui)',
              marginBottom: 'var(--space-2)',
            }}
          >
            Noch keine Kategorien vorhanden
          </p>
          <p
            style={{
              fontSize: 13,
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-ui)',
              marginBottom: 'var(--space-4)',
            }}
          >
            Lege zuerst eine Kategorie in der Sidebar an.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onCreate={() => openCreateModal(category.entityType, category.slug)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CategoryCard({
  category,
  onCreate,
}: {
  category: {
    id: string
    label: string
    slug: string
    description: string
    icon?: string
    singular?: string
    entityType?: EntityType
    count: number
    previewItems: Array<{
      id: string
      name: string
      avatar: string | null
      cover: string | null
    }>
    color: string
    lightColor: string
  }
  onCreate: () => void
}) {
  const [isHovered, setIsHovered] = useState(false)
  const Icon = getCategoryIcon(category.icon)
  const singularLabel = category.singular ?? toSingular(category.label)

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        border: isHovered ? '1px solid var(--color-border-strong)' : '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        backgroundColor: 'var(--color-surface)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: isHovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transition: 'box-shadow 200ms ease, border-color 200ms ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 'var(--space-4)',
          padding: 'var(--space-5)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-md)',
              backgroundColor: category.lightColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 'var(--space-3)',
            }}
          >
            <Icon size={18} strokeWidth={1.5} color={category.color} />
          </div>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: 'var(--color-text)',
              fontFamily: 'var(--font-ui)',
              marginBottom: 'var(--space-2)',
            }}
          >
            {category.label}
          </h2>
          <p
            style={{
              fontSize: 13,
              color: 'var(--color-text-secondary)',
              lineHeight: 1.5,
              fontFamily: 'var(--font-ui)',
              marginBottom: 'var(--space-3)',
            }}
          >
            {category.description || `Deine Kategorie für ${category.label.toLowerCase()}.`}
          </p>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-bg)',
              color: 'var(--color-text-secondary)',
              fontSize: 11,
              fontWeight: 500,
              fontFamily: 'var(--font-ui)',
            }}
          >
            {category.count} {category.count === 1 ? 'Eintrag' : 'Einträge'}
          </div>
        </div>

        <button
          onClick={onCreate}
          title={`${singularLabel} erstellen`}
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <Plus size={15} strokeWidth={1.5} color="var(--color-text-secondary)" />
        </button>
      </div>

      <div style={{ flex: 1 }}>
        {category.previewItems.length === 0 ? (
          <div
            style={{
              padding: 'var(--space-5)',
              fontSize: 13,
              color: 'var(--color-text-placeholder)',
              fontFamily: 'var(--font-ui)',
            }}
          >
            Noch keine Eintrage in dieser Kategorie.
          </div>
        ) : (
          category.previewItems.map((item, index) => {
            const img = item.avatar ?? item.cover
            return (
              <Link
                key={item.id}
                to={`/entities/${item.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3) var(--space-5)',
                  borderBottom: index < category.previewItems.length - 1 ? '1px solid var(--color-border)' : 'none',
                  textDecoration: 'none',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: category.lightColor,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {img
                    ? <img src={img} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <Icon size={15} strokeWidth={1.5} color={category.color} />
                  }
                </div>
                <span
                  style={{
                    fontSize: 13,
                    color: 'var(--color-text)',
                    fontFamily: 'var(--font-ui)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.name}
                </span>
              </Link>
            )
          })
        )}
      </div>

      <Link
        to={`/${category.slug}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-1)',
          padding: 'var(--space-3)',
          borderTop: '1px solid var(--color-border)',
          backgroundColor: 'transparent',
          color: 'var(--color-primary)',
          fontSize: 12,
          fontWeight: 500,
          fontFamily: 'var(--font-ui)',
          textDecoration: 'none',
        }}
      >
        Alle ansehen
        <ArrowUpRight size={13} strokeWidth={1.5} />
      </Link>
    </div>
  )
}

const heroBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  height: 28,
  padding: '0 10px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border-strong)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontSize: 12,
  fontWeight: 500,
  fontFamily: 'var(--font-ui)',
  cursor: 'pointer',
  transition: 'background 150ms ease',
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(28,25,23,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 200,
}

const modalStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  borderRadius: 'var(--radius-xl)',
  border: '1px solid var(--color-border)',
  padding: 'var(--space-8)',
  width: '100%',
  maxWidth: 440,
  boxShadow: 'var(--shadow-xl)',
}

const modalTitleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  color: 'var(--color-text)',
  fontFamily: 'var(--font-ui)',
  marginBottom: 'var(--space-2)',
}

const modalSubtitleStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--color-text-secondary)',
  marginBottom: 'var(--space-6)',
}

const primaryBtnStyle: React.CSSProperties = {
  flex: 1,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--space-2)',
  padding: '8px 16px',
  borderRadius: 'var(--radius-md)',
  border: 'none',
  backgroundColor: 'var(--color-primary)',
  color: 'var(--color-primary-text)',
  fontSize: 13,
  fontWeight: 500,
  fontFamily: 'var(--font-ui)',
  cursor: 'pointer',
}

const secondaryBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 16px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontSize: 13,
  fontWeight: 500,
  fontFamily: 'var(--font-ui)',
  cursor: 'pointer',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--color-surface)',
  padding: 'var(--space-3) var(--space-4)',
  fontFamily: 'var(--font-ui)',
  fontSize: 15,
  color: 'var(--color-text)',
  outline: 'none',
}
