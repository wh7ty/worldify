import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Bug, Calendar, Check, ChevronDown, Clock, Columns2, Copy, GalleryThumbnails, GripVertical, Image, KanbanSquare, Languages, LayoutGrid, List, MapPin, NotebookPen, Package, Pencil, Pin, Plus, Shield, Sparkles, StickyNote, Table2, Tag, Trash2, Users, X } from 'lucide-react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  entityTypeMeta,
  statusMeta,
  type CategoryField,
  type SidebarCategoryItem,
  type DashboardNoteContainer,
  type Entity,
  type EntityStatus,
  type EntityType,
} from '../data/mockWorld'
import { toSingular } from '../lib/toSingular'
import { getEntityOrderForScope } from '../lib/entityOrder'
import { findCategoryBySlug, isEntityInCategory } from '../lib/categoryMatching'
import { getEntityCover, getEntityAvatar } from '../lib/entityMedia'
import { getCategoryBanner, uploadCategoryBanner, removeCategoryBanner } from '../lib/categoryBanner'
import { getCategoryBannerPosition, saveCategoryBannerPosition } from '../lib/bannerPosition'
import { useBannerDrag } from '../hooks/useBannerDrag'
import { useWindowWidth } from '../hooks/useWindowWidth'

const ENTITY_TYPE_ICONS: Record<string, React.ElementType> = {
  character: Users,
  location: MapPin,
  faction: Shield,
  magic_system: Sparkles,
  creature: Bug,
  language: Languages,
  item: Package,
  story: BookOpen,
  event: Calendar,
  note: StickyNote,
}
import { getEntityFieldValues } from '../lib/entityFieldValues'
import { getCategoryIcon } from '../lib/categoryIcons'
import { categoryFieldDefaultIcons } from '../lib/categoryIcons'
import { useWorldStore } from '../store/useWorldStore'

export default function Dashboard() {
  const isMobile = useWindowWidth() < 640
  const [statusFilter, setStatusFilter] = useState<'all' | EntityStatus>('all')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'updated_desc' | 'created_desc' | 'name_asc'>('updated_desc')
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'gallery' | 'timeline' | 'kanban' | 'table' | 'split'>(
    () => (localStorage.getItem('worldify_view_mode') as 'grid' | 'list' | 'gallery' | 'timeline' | 'kanban' | 'table' | 'split') ?? 'grid',
  )
  const [splitPreviewId, setSplitPreviewId] = useState<string | null>(null)

  const handleSetViewMode = (mode: 'grid' | 'list' | 'gallery' | 'timeline' | 'kanban' | 'table' | 'split') => {
    localStorage.setItem('worldify_view_mode', mode)
    setViewMode(mode)
  }
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [focusedCardIndex, setFocusedCardIndex] = useState<number | null>(null)
  const { categorySlug } = useParams()
  const navigate = useNavigate()
  const { openCreateModal, openCategoryEdit } = useOutletContext<{
    openCreateModal: (type?: EntityType, categorySlug?: string) => void
    openCategoryEdit: (category: {
      id: string
      kind: 'category'
      label: string
      slug: string
      icon?: string
      iconUrl?: string
      entityType?: EntityType
      singular?: string
      description?: string
      color?: string
      fields?: CategoryField[]
    }) => void
  }>()
  const user = useWorldStore((state) => state.user)
  const activeUniverseId = useWorldStore((state) => state.activeUniverseId)
  const universes = useWorldStore((state) => state.universes)
  const entities = useWorldStore((state) => state.entities)
  const libraryItems = useWorldStore((state) => state.libraryItems)
  const dashboardContainers = useWorldStore((state) => state.dashboardContainers)
  const addDashboardNoteContainer = useWorldStore((state) => state.addDashboardNoteContainer)
  const showToast = useWorldStore((state) => state.showToast)
  const openConfirmDialog = useWorldStore((state) => state.openConfirmDialog)
  const moveCategoryEntity = useWorldStore((state) => state.moveCategoryEntity)
  const trashEntityLocally = useWorldStore((state) => state.trashEntityLocally)
  const updateEntityLocal = useWorldStore((state) => state.updateEntityLocal)
  const pinnedEntityIds = useWorldStore((state) => state.pinnedEntityIds)
  const togglePinEntity = useWorldStore((state) => state.togglePinEntity)
  const isLoadingWorld = useWorldStore((state) => state.isLoadingWorld)
  const worldError = useWorldStore((state) => state.worldError)
  const searchQuery = useWorldStore((state) => state.searchQuery)
  const activeUniverse = universes.find((universe) => universe.id === activeUniverseId) ?? universes[0]
  const categoryItems = libraryItems.filter((item): item is SidebarCategoryItem => item.kind === 'category')

  // Derive active category + type from libraryItems — no hardcoded slug map
  const activeCategory = findCategoryBySlug(categoryItems, categorySlug)
  const activeType: EntityType | null = (activeCategory?.kind === 'category' ? activeCategory.entityType : undefined) ?? null
  const customCategory = activeCategory?.kind === 'category' ? activeCategory : undefined
  const singularLabel = customCategory?.kind === 'category'
    ? customCategory.singular ?? toSingular(customCategory.label)
    : activeType
      ? toSingular(entityTypeMeta[activeType].label)
      : 'Eintrag'

  const filteredEntities = useMemo(() => {
    if (!activeUniverse) return []
    const nextEntities = entities.filter((entity) => {
      const matchesUniverse = entity.universeId === activeUniverse.id
      const matchesType = customCategory?.kind === 'category'
        ? isEntityInCategory(entity, customCategory)
        : activeType
          ? entity.type === activeType
          : true
      const matchesStatus = statusFilter === 'all'
        ? entity.status !== 'archived'
        : entity.status === statusFilter
      const entityFields = getEntityFieldValues(entity.id)
      const fieldText = Object.values(entityFields).join(' ')
      let contentText = ''
      try {
        const parsed = JSON.parse(entity.content)
        if (Array.isArray(parsed)) {
          contentText = (parsed as Array<{ title?: string; text?: string }>)
            .map((n) => `${n.title ?? ''} ${n.text ?? ''}`)
            .join(' ')
        } else {
          contentText = entity.content
        }
      } catch {
        contentText = entity.content
      }
      const haystack = `${entity.name} ${entity.shortDescription} ${entity.tags.join(' ')} ${fieldText} ${contentText}`.toLowerCase()
      const matchesSearch = searchQuery.trim()
        ? haystack.includes(searchQuery.trim().toLowerCase())
        : true
      const matchesTag = tagFilter ? entity.tags.includes(tagFilter) : true

      return matchesUniverse && matchesType && matchesStatus && matchesSearch && matchesTag
    })

    const sortedEntities = nextEntities.sort((leftEntity, rightEntity) => {
      if (sortBy === 'name_asc') {
        return leftEntity.name.localeCompare(rightEntity.name)
      }

      if (sortBy === 'created_desc') {
        return rightEntity.createdAt.localeCompare(leftEntity.createdAt)
      }

      return rightEntity.updatedAt.localeCompare(leftEntity.updatedAt)
    })

    const categoryKey = activeType ?? categorySlug

    if (!user || !categoryKey) {
      return sortedEntities
    }

    const entityOrder = getEntityOrderForScope(user.id, activeUniverse.id, categoryKey)

    if (entityOrder.length === 0) {
      return sortedEntities
    }

    return [...sortedEntities].sort((leftEntity, rightEntity) => {
      const leftIndex = entityOrder.indexOf(leftEntity.id)
      const rightIndex = entityOrder.indexOf(rightEntity.id)

      if (leftIndex === -1 && rightIndex === -1) {
        return 0
      }

      if (leftIndex === -1) {
        return 1
      }

      if (rightIndex === -1) {
        return -1
      }

      return leftIndex - rightIndex
    })
  }, [activeType, activeUniverse.id, categorySlug, customCategory, entities, searchQuery, sortBy, statusFilter, tagFilter, user])

  const pinnedEntities = useMemo(() =>
    entities.filter((e) => {
      if (!pinnedEntityIds.includes(e.id)) return false
      if (e.universeId !== activeUniverse.id) return false
      if (customCategory?.kind === 'category') return isEntityInCategory(e, customCategory)
      if (activeType) return e.type === activeType
      return true
    }),
    [activeType, activeUniverse.id, customCategory, entities, pinnedEntityIds],
  )

  const totalCategoryCount = useMemo(() =>
    searchQuery.trim()
      ? entities.filter((e) => {
          if (e.universeId !== activeUniverse.id) return false
          const matchesType = customCategory
            ? isEntityInCategory(e, customCategory)
            : activeType ? e.type === activeType : true
          return matchesType && (statusFilter === 'all' ? e.status !== 'archived' : e.status === statusFilter)
        }).length
      : filteredEntities.length,
    [activeType, activeUniverse.id, customCategory, entities, filteredEntities.length, searchQuery, statusFilter],
  )

  const statusCounts = useMemo(() => {
    const base = entities.filter((e) => {
      if (e.universeId !== activeUniverse.id) return false
      if (customCategory) return isEntityInCategory(e, customCategory)
      if (activeType) return e.type === activeType
      return true
    })
    const counts: Record<string, number> = { active: 0, draft: 0, concept: 0, archived: 0 }
    for (const e of base) {
      if (e.status in counts) counts[e.status]++
    }
    counts.all = base.filter((e) => e.status !== 'archived').length
    return counts
  }, [activeType, activeUniverse.id, customCategory, entities])

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>()
    for (const e of entities) {
      if (e.universeId !== activeUniverse.id) continue
      const matchesType = customCategory ? isEntityInCategory(e, customCategory) : activeType ? e.type === activeType : true
      if (!matchesType) continue
      const matchesStatus = statusFilter === 'all' ? e.status !== 'archived' : e.status === statusFilter
      if (!matchesStatus) continue
      for (const tag of e.tags) tagSet.add(tag)
    }
    return [...tagSet].sort()
  }, [activeType, activeUniverse.id, customCategory, entities, statusFilter])

  const pageTitle = customCategory?.kind === 'category'
    ? customCategory.label
    : activeType
      ? entityTypeMeta[activeType].label
      : 'Dashboard'

  const categoryColor = customCategory?.kind === 'category' ? customCategory.color : undefined
  const categoryColorLight = categoryColor ? categoryColor + '18' : undefined

  const bannerInputRef = useRef<HTMLInputElement>(null)
  const [bannerUrl, setBannerUrl] = useState<string | null>(() =>
    categorySlug ? getCategoryBanner(categorySlug) : null,
  )
  useEffect(() => {
    setBannerUrl(categorySlug ? getCategoryBanner(categorySlug) : null)
  }, [categorySlug])

  const { position: bannerPosition, setPosition: setBannerPosition, isDragging: isBannerDragging, isHovering: isBannerHovering, setIsHovering: setBannerHovering, onMouseDown: startBannerDrag } = useBannerDrag(
    categorySlug ? getCategoryBannerPosition(categorySlug) : 50,
    (pos) => { if (categorySlug) saveCategoryBannerPosition(categorySlug, pos) },
  )

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !categorySlug || !user) return
    const preview = URL.createObjectURL(file)
    setBannerUrl(preview)
    setBannerPosition(50)
    const url = await uploadCategoryBanner(user.id, activeUniverseId, categorySlug, file)
    URL.revokeObjectURL(preview)
    if (url) setBannerUrl(url)
    e.target.value = ''
  }

  // Reset bulk selection and split preview when navigating to a different category
  useEffect(() => {
    setSelectedIds(new Set())
    setBulkMode(false)
    setSplitPreviewId(null)
  }, [categorySlug])

  // Keyboard navigation in grid view
  useEffect(() => {
    if (viewMode !== 'grid') return
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedCardIndex((prev) => prev === null ? 0 : Math.min(prev + 1, filteredEntities.length - 1))
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedCardIndex((prev) => prev === null ? 0 : Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && focusedCardIndex !== null) {
        e.preventDefault()
        const entity = filteredEntities[focusedCardIndex]
        if (entity) navigate(`/entities/${entity.id}`)
      } else if (e.key === 'Escape') {
        setFocusedCardIndex(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [viewMode, filteredEntities, focusedCardIndex, navigate])

  const categoryNoteContainers = dashboardContainers.filter(
    (container): container is DashboardNoteContainer =>
      container.kind === 'note' && container.categorySlug === (customCategory?.kind === 'category' ? customCategory.slug : undefined),
  )

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-8)' }}>
        {/* Banner Hero — full bleed */}
        <div
          style={{
            position: 'relative',
            marginTop: isMobile ? -16 : -32,
            marginLeft: isMobile ? -16 : -32,
            marginRight: isMobile ? -16 : -32,
            marginBottom: 'var(--space-4)',
            minHeight: 220,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: isMobile ? '0 16px 24px' : '0 32px 32px',
            cursor: bannerUrl ? (isBannerDragging ? 'grabbing' : 'grab') : undefined,
            background: bannerUrl
              ? `linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.05) 45%, rgba(0,0,0,0.6) 100%), url(${bannerUrl}) center ${Math.round(bannerPosition)}%/cover no-repeat`
              : categoryColorLight
                ? `linear-gradient(180deg, ${categoryColorLight} 0%, transparent 100%)`
                : 'linear-gradient(180deg, var(--color-primary-light) 0%, transparent 100%)',
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

          <div onMouseDown={(e) => e.stopPropagation()} style={{ position: 'absolute', top: 'var(--space-3)', right: 'var(--space-4)', display: 'flex', gap: 'var(--space-2)', zIndex: 2 }}>
            <button
              onClick={() => bannerInputRef.current?.click()}
              title="Kategorie-Banner ändern"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
                height: 28, padding: isMobile ? '0 8px' : '0 10px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border-strong)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
                fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-ui)',
                cursor: 'pointer',
              }}
            >
              <Image size={12} strokeWidth={1.5} />
              {!isMobile && 'Banner'}
            </button>
            {bannerUrl && user && categorySlug ? (
              <button
                onClick={() => { void removeCategoryBanner(user.id, activeUniverseId, categorySlug); setBannerUrl(null) }}
                title="Banner entfernen"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
                  height: 28, padding: isMobile ? '0 8px' : '0 10px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border-strong)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-ui)',
                  cursor: 'pointer',
                }}
              >
                <X size={12} strokeWidth={1.5} />
                {!isMobile && 'Entfernen'}
              </button>
            ) : null}
          </div>

          {/* Title + count */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 32,
                fontWeight: 700,
                color: bannerUrl ? '#fff' : 'var(--color-text)',
                letterSpacing: '-0.02em',
                textShadow: bannerUrl ? '0 1px 6px rgba(0,0,0,0.5)' : 'none',
              }}
            >
              {pageTitle}
            </h1>
            <span style={{
              flexShrink: 0,
              fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-ui)',
              color: bannerUrl ? 'rgba(255,255,255,0.9)' : 'var(--color-text-secondary)',
              backgroundColor: bannerUrl ? 'rgba(0,0,0,0.28)' : 'var(--color-bg)',
              border: `1px solid ${bannerUrl ? 'rgba(255,255,255,0.3)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-full)',
              padding: '3px 10px',
            }}>
              {searchQuery.trim() ? `${filteredEntities.length} von ${totalCategoryCount}` : filteredEntities.length} {filteredEntities.length === 1 && !searchQuery.trim() ? 'Eintrag' : 'Einträge'}
            </span>
          </div>
        </div>

        {/* Status bar + Actions */}
        <div style={{ paddingBottom: 'var(--space-6)', borderBottom: '1px solid var(--color-border)' }}>
          {statusCounts.all > 0 ? (
            <div style={{ display: 'flex', gap: 2, height: 4, borderRadius: 'var(--radius-full)', overflow: 'hidden', marginBottom: 'var(--space-4)' }}>
              {statusCounts.active > 0 ? <div title={`Active: ${statusCounts.active}`} style={{ flex: statusCounts.active, backgroundColor: statusMeta.active.color, opacity: 0.65 }} /> : null}
              {statusCounts.draft > 0 ? <div title={`Draft: ${statusCounts.draft}`} style={{ flex: statusCounts.draft, backgroundColor: statusMeta.draft.color, opacity: 0.65 }} /> : null}
              {statusCounts.concept > 0 ? <div title={`Concept: ${statusCounts.concept}`} style={{ flex: statusCounts.concept, backgroundColor: statusMeta.concept.color, opacity: 0.65 }} /> : null}
            </div>
          ) : null}

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <HeaderActionButton
              icon={Plus}
              label={`${singularLabel} erstellen`}
              variant="primary"
              onClick={() => openCreateModal(activeType ?? undefined, customCategory?.kind === 'category' ? customCategory.slug : undefined)}
            />
            {customCategory?.kind === 'category' ? (
              <>
                <HeaderActionButton
                  icon={Pencil}
                  label="Kategorie bearbeiten"
                  onClick={() => openCategoryEdit(customCategory)}
                />
                <HeaderActionButton
                  icon={NotebookPen}
                  label="Notiz hinzufügen"
                  onClick={() => {
                    addDashboardNoteContainer(customCategory.slug)
                    handleSetViewMode('grid')
                    showToast('Notizblock hinzugefügt')
                  }}
                />
              </>
            ) : null}
          </div>
        </div>
      </div>

      {worldError ? (
        <div
          style={{
            marginBottom: 'var(--space-6)',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--color-error-light)',
            color: 'var(--color-error)',
            fontSize: 13,
          }}
        >
          {worldError}
        </div>
      ) : null}

      {isLoadingWorld ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-5)' }}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--space-4)',
              marginBottom: 'var(--space-6)',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <DashboardSelect
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as 'all' | EntityStatus)}
                options={[
                  { value: 'all', label: `Alle (${statusCounts.all})` },
                  { value: 'active', label: `Active (${statusCounts.active})` },
                  { value: 'draft', label: `Draft (${statusCounts.draft})` },
                  { value: 'concept', label: `Concept (${statusCounts.concept})` },
                  { value: 'archived', label: `Archived (${statusCounts.archived})` },
                ]}
              />
              <DashboardSelect
                value={sortBy}
                onChange={(value) => setSortBy(value as 'updated_desc' | 'created_desc' | 'name_asc')}
                isModified={sortBy !== 'updated_desc'}
                options={[
                  { value: 'updated_desc', label: 'Zuletzt bearbeitet' },
                  { value: 'created_desc', label: 'Neu erstellt' },
                  { value: 'name_asc', label: 'Name A-Z' },
                ]}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              {/* Grid / List / Gallery toggle */}
              <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                {([
                  { mode: 'grid', icon: <LayoutGrid size={14} strokeWidth={1.5} />, title: 'Kartenansicht' },
                  { mode: 'list', icon: <List size={14} strokeWidth={1.5} />, title: 'Listenansicht' },
                  { mode: 'gallery', icon: <GalleryThumbnails size={14} strokeWidth={1.5} />, title: 'Galerieansicht' },
                  { mode: 'timeline', icon: <Clock size={14} strokeWidth={1.5} />, title: 'Zeitstrahl' },
                  { mode: 'kanban', icon: <KanbanSquare size={14} strokeWidth={1.5} />, title: 'Kanban' },
                  { mode: 'table', icon: <Table2 size={14} strokeWidth={1.5} />, title: 'Tabelle' },
                  { mode: 'split', icon: <Columns2 size={14} strokeWidth={1.5} />, title: 'Split-Ansicht' },
                ] as const).map(({ mode, icon, title }) => (
                  <button
                    key={mode}
                    onClick={() => handleSetViewMode(mode)}
                    title={title}
                    style={{
                      width: 32, height: 32,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: 'none', cursor: 'pointer',
                      backgroundColor: viewMode === mode ? 'var(--color-text)' : 'var(--color-surface)',
                      color: viewMode === mode ? 'var(--color-bg)' : 'var(--color-text-secondary)',
                      transition: 'background 100ms ease, color 100ms ease',
                    }}
                  >
                    {icon}
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setBulkMode((v) => !v); setSelectedIds(new Set()) }}
                title="Mehrfachauswahl"
                style={{
                  height: 32,
                  padding: '0 var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  border: bulkMode ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                  backgroundColor: bulkMode ? 'var(--color-primary-light)' : 'var(--color-surface)',
                  color: bulkMode ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  fontSize: 12,
                  fontWeight: 500,
                  fontFamily: 'var(--font-ui)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  transition: 'background 150ms ease, border-color 150ms ease, color 150ms ease',
                }}
              >
                <Check size={12} strokeWidth={2} />
                Auswahl
              </button>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {searchQuery.trim() ? `${filteredEntities.length} von ${totalCategoryCount}` : filteredEntities.length} Einträge
              </div>
            </div>
          </div>

          {availableTags.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 'var(--space-5)' }}>
              <Tag size={12} strokeWidth={1.5} color="var(--color-text-secondary)" />
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                  style={{
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    border: tagFilter === tag ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                    backgroundColor: tagFilter === tag ? 'var(--color-accent-light)' : 'transparent',
                    color: tagFilter === tag ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                    fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-ui)',
                    cursor: 'pointer',
                    transition: 'background 100ms, border-color 100ms, color 100ms',
                  }}
                >
                  #{tag}
                </button>
              ))}
              {tagFilter ? (
                <button
                  onClick={() => setTagFilter(null)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px', borderRadius: 'var(--radius-full)', border: 'none', background: 'none', color: 'var(--color-text-secondary)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}
                >
                  <X size={11} strokeWidth={2} /> Filter löschen
                </button>
              ) : null}
            </div>
          ) : null}

          {/* Pinned section */}
          {pinnedEntities.length > 0 && viewMode === 'grid' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Pin size={13} strokeWidth={1.5} color="var(--color-primary)" />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', fontFamily: 'var(--font-ui)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Angepinnt
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-5)', alignItems: 'start' }}>
                {pinnedEntities.map((entity) => (
                  <EntityCard
                    key={entity.id}
                    entity={entity}
                    singularLabel={singularLabel}
                    categoryFields={customCategory?.kind === 'category' ? customCategory.fields ?? [] : []}
                    categoryColor={categoryColor}
                    categoryColorLight={categoryColorLight}
                    categoryIcon={customCategory?.kind === 'category' ? customCategory.icon : undefined}
                    isPinned
                    onPin={() => togglePinEntity(entity.id)}
                    onTagClick={(tag) => setTagFilter(tagFilter === tag ? null : tag)}
                  />
                ))}
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '0' }} />
            </div>
          ) : null}

          {filteredEntities.length === 0 && categoryNoteContainers.length === 0 ? (
            <EmptyPanel
              categoryLabel={pageTitle}
              singularLabel={singularLabel}
              onCreateClick={() => openCreateModal(activeType ?? undefined, customCategory?.kind === 'category' ? customCategory.slug : undefined)}
            />
          ) : viewMode === 'timeline' ? (
            (() => {
              const MONTH_NAMES = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
              const dated = filteredEntities.filter((e) => e.timelineDate?.trim())
              const undated = filteredEntities.filter((e) => !e.timelineDate?.trim())
              const grouped: Record<string, typeof filteredEntities> = {}
              for (const entity of dated) {
                const d = new Date(entity.timelineDate!)
                const key = isNaN(d.getTime()) ? '?' : `${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}`
                if (!grouped[key]) grouped[key] = []
                grouped[key].push(entity)
              }
              const sortedYears = Object.keys(grouped).sort((a, b) => a.localeCompare(b))
              const formatGroupKey = (key: string) => {
                if (key === '?') return '?'
                const [year, monthIdx] = key.split('-')
                return `${MONTH_NAMES[Number(monthIdx)]} ${year}`
              }

              const renderTimelineRow = (entity: Entity, accentColor: string, accentLight: string) => {
                const TypeIcon = ENTITY_TYPE_ICONS[entity.type] ?? StickyNote
                const currentStatus = statusMeta[entity.status]
                const isSelected = selectedIds.has(entity.id)
                const handleSelect = () => setSelectedIds((prev) => {
                  const next = new Set(prev)
                  if (next.has(entity.id)) next.delete(entity.id)
                  else next.add(entity.id)
                  return next
                })
                return (
                  <Link
                    key={entity.id}
                    to={bulkMode ? '#' : `/entities/${entity.id}`}
                    onClick={bulkMode ? (e) => { e.preventDefault(); handleSelect() } : undefined}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', textDecoration: 'none',
                      backgroundColor: isSelected ? 'var(--color-primary-light)' : 'var(--color-surface)',
                      border: isSelected ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-lg)',
                      transition: 'border-color 150ms ease, background 150ms ease',
                    }}
                    onMouseEnter={(e) => { if (!bulkMode) { e.currentTarget.style.borderColor = accentColor; e.currentTarget.style.backgroundColor = 'var(--color-bg)' } }}
                    onMouseLeave={(e) => { if (!bulkMode) { e.currentTarget.style.borderColor = isSelected ? 'var(--color-primary)' : 'var(--color-border)'; e.currentTarget.style.backgroundColor = isSelected ? 'var(--color-primary-light)' : 'var(--color-surface)' } }}
                  >
                    {bulkMode ? (
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSelect() }}
                        style={{
                          width: 20, height: 20, borderRadius: 'var(--radius-sm)', flexShrink: 0,
                          border: isSelected ? 'none' : '2px solid var(--color-border)',
                          backgroundColor: isSelected ? 'var(--color-primary)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        }}
                      >
                        {isSelected ? <Check size={11} strokeWidth={2.5} color="white" /> : null}
                      </button>
                    ) : null}
                    <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', backgroundColor: accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <TypeIcon size={15} strokeWidth={1.5} color={accentColor} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {entity.name}
                      </div>
                      {entity.shortDescription ? (
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {entity.shortDescription}
                        </div>
                      ) : null}
                      {entity.timelineDate ? (
                        <div style={{ fontSize: 11, color: 'var(--color-text-placeholder)', fontFamily: 'var(--font-ui)', marginTop: 2 }}>
                          {new Date(entity.timelineDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </div>
                      ) : null}
                    </div>
                    <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-sm)', flexShrink: 0, backgroundColor: currentStatus.lightColor, color: currentStatus.color, fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-ui)' }}>
                      {currentStatus.label}
                    </span>
                  </Link>
                )
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {sortedYears.length === 0 && undated.length === 0 ? (
                    <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--color-text-placeholder)', fontSize: 13, fontFamily: 'var(--font-ui)' }}>
                      Keine Einträge
                    </div>
                  ) : null}
                  {sortedYears.map((year) => {
                    const groupEntities = grouped[year]
                    const [labelTop, labelBottom] = formatGroupKey(year).split(' ')
                    return (
                      <div key={year} style={{ display: 'flex', alignItems: 'stretch' }}>
                        <div style={{ width: 72, flexShrink: 0, paddingRight: 16, paddingTop: 12, textAlign: 'right' }}>
                          <div style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{labelTop}</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap' }}>{labelBottom}</div>
                          </div>
                        </div>
                        <div style={{ width: 2, backgroundColor: 'var(--color-border)', flexShrink: 0, position: 'relative' }}>
                          <div style={{ position: 'absolute', top: 20, left: -5, width: 12, height: 12, borderRadius: '50%', backgroundColor: categoryColor ?? 'var(--color-primary)', border: '2.5px solid var(--color-bg)' }} />
                        </div>
                        <div style={{ flex: 1, paddingLeft: 20, paddingBottom: 20, paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {groupEntities.map((entity) => renderTimelineRow(entity, categoryColor ?? entityTypeMeta[entity.type].color, categoryColorLight ?? entityTypeMeta[entity.type].lightColor))}
                        </div>
                      </div>
                    )
                  })}
                  {undated.length > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'stretch' }}>
                      <div style={{ width: 72, flexShrink: 0, paddingRight: 16, paddingTop: 14, textAlign: 'right' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-placeholder)', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                          Ohne<br/>Datum
                        </span>
                      </div>
                      <div style={{ width: 2, backgroundColor: 'var(--color-border)', flexShrink: 0, position: 'relative' }}>
                        <div style={{ position: 'absolute', top: 20, left: -5, width: 12, height: 12, borderRadius: '50%', backgroundColor: 'var(--color-border-strong)', border: '2.5px solid var(--color-bg)' }} />
                      </div>
                      <div style={{ flex: 1, paddingLeft: 20, paddingBottom: 20, paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {undated.map((entity) => renderTimelineRow(entity, categoryColor ?? entityTypeMeta[entity.type].color, categoryColorLight ?? entityTypeMeta[entity.type].lightColor))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            })()
          ) : viewMode === 'split' ? (
            <div style={{ display: 'flex', gap: 'var(--space-5)', alignItems: 'flex-start' }}>
              {/* Left: compact list */}
              <div style={{ flex: '0 0 280px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', backgroundColor: 'var(--color-surface)' }}>
                {filteredEntities.map((entity, idx) => {
                  const meta = entityTypeMeta[entity.type]
                  const sm = statusMeta[entity.status]
                  const TypeIcon = ENTITY_TYPE_ICONS[entity.type] ?? StickyNote
                  const isSelected = splitPreviewId === entity.id
                  return (
                    <button
                      key={entity.id}
                      type="button"
                      onClick={() => setSplitPreviewId(entity.id === splitPreviewId ? null : entity.id)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: 'none', borderBottom: idx < filteredEntities.length - 1 ? '1px solid var(--color-border)' : 'none', backgroundColor: isSelected ? 'var(--color-primary-light)' : 'transparent', borderLeft: isSelected ? '2px solid var(--color-primary)' : '2px solid transparent', cursor: 'pointer', textAlign: 'left', transition: 'background 80ms' }}
                    >
                      <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', backgroundColor: meta.lightColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <TypeIcon size={13} strokeWidth={1.5} color={meta.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: isSelected ? 'var(--color-primary)' : 'var(--color-text)', fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entity.name}</div>
                        {entity.shortDescription ? <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entity.shortDescription}</div> : null}
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 500, padding: '1px 6px', borderRadius: 'var(--radius-sm)', backgroundColor: sm.lightColor, color: sm.color, flexShrink: 0 }}>{sm.label}</span>
                    </button>
                  )
                })}
                {filteredEntities.length === 0 ? <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: 12, color: 'var(--color-text-placeholder)', fontFamily: 'var(--font-ui)' }}>Keine Einträge</div> : null}
              </div>
              {/* Right: preview panel */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {splitPreviewId ? (() => {
                  const preview = entities.find((e) => e.id === splitPreviewId)
                  if (!preview) return null
                  const meta = entityTypeMeta[preview.type]
                  const sm = statusMeta[preview.status]
                  const cover = getEntityCover(preview.id)
                  const TypeIcon = ENTITY_TYPE_ICONS[preview.type] ?? StickyNote
                  let notePreview = ''
                  try {
                    const p = JSON.parse(preview.content) as Array<{title?: string; text?: string}>
                    notePreview = p.filter((n) => n.text?.trim()).map((n) => n.text).join('\n\n').slice(0, 300)
                  } catch { notePreview = preview.content.slice(0, 300) }
                  return (
                    <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', backgroundColor: 'var(--color-surface)' }}>
                      <div style={{ height: 140, backgroundColor: meta.lightColor, backgroundImage: cover ? `url(${cover})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {!cover ? <TypeIcon size={48} strokeWidth={0.8} color={meta.color} style={{ opacity: 0.25 }} /> : null}
                        <span style={{ position: 'absolute', top: 12, right: 12, padding: '3px 9px', borderRadius: 'var(--radius-sm)', backgroundColor: cover ? 'rgba(255,255,255,0.85)' : sm.lightColor, color: sm.color, fontSize: 11, fontWeight: 500, backdropFilter: 'blur(4px)' }}>{sm.label}</span>
                      </div>
                      <div style={{ padding: '20px 24px' }}>
                        <h2 style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-text)', letterSpacing: '-0.01em', marginBottom: 6 }}>{preview.name}</h2>
                        {preview.shortDescription ? <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', lineHeight: 1.5, marginBottom: 16 }}>{preview.shortDescription}</p> : null}
                        {preview.tags.length > 0 ? <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>{preview.tags.slice(0, 6).map((tag) => <span key={tag} style={{ padding: '2px 8px', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--color-accent-light)', color: 'var(--color-accent)', fontSize: 11, fontWeight: 500 }}>#{tag}</span>)}</div> : null}
                        {notePreview ? <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', lineHeight: 1.6, borderTop: '1px solid var(--color-border)', paddingTop: 16, marginTop: 4, whiteSpace: 'pre-wrap' }}>{notePreview}{notePreview.length >= 300 ? '…' : ''}</p> : null}
                        <Link to={`/entities/${preview.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 20, padding: '7px 16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-text)', textDecoration: 'none', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-ui)' }}>
                          Vollständig öffnen
                        </Link>
                      </div>
                    </div>
                  )
                })() : (
                  <div style={{ border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '80px 24px', textAlign: 'center', color: 'var(--color-text-placeholder)', fontSize: 13, fontFamily: 'var(--font-ui)' }}>
                    Eintrag auswählen um Vorschau anzuzeigen
                  </div>
                )}
              </div>
            </div>
          ) : viewMode === 'kanban' ? (
            <KanbanView
              entities={filteredEntities}
              categoryColor={categoryColor}
              categoryColorLight={categoryColorLight}
              onTagClick={(tag) => setTagFilter(tagFilter === tag ? null : tag)}
            />
          ) : viewMode === 'table' ? (
            <TableView
              entities={filteredEntities}
              onTagClick={(tag) => setTagFilter(tagFilter === tag ? null : tag)}
            />
          ) : viewMode === 'gallery' ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 'var(--space-3)',
                alignItems: 'start',
              }}
            >
              {filteredEntities.map((entity) => (
                <GalleryCard
                  key={entity.id}
                  entity={entity}
                  categoryColor={categoryColor}
                  categoryColorLight={categoryColorLight}
                  bulkMode={bulkMode}
                  isSelected={selectedIds.has(entity.id)}
                  onSelect={() => setSelectedIds((prev) => {
                    const next = new Set(prev)
                    if (next.has(entity.id)) next.delete(entity.id)
                    else next.add(entity.id)
                    return next
                  })}
                />
              ))}
            </div>
          ) : viewMode === 'grid' ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 'var(--space-5)',
                alignItems: 'stretch',
              }}
            >
              {categoryNoteContainers.map((container) => (
                <CategoryNoteCard key={container.id} container={container} />
              ))}

              {filteredEntities.map((entity, cardIdx) => (
                <div
                  key={entity.id}
                  style={{ position: 'relative', outline: focusedCardIndex === cardIdx ? '2px solid var(--color-primary)' : 'none', outlineOffset: 2, borderRadius: 'var(--radius-lg)' }}
                  onDragOver={(event) => {
                    event.preventDefault()
                    if (dragOverId !== entity.id) setDragOverId(entity.id)
                  }}
                  onDragLeave={() => { if (dragOverId === entity.id) setDragOverId(null) }}
                  onDrop={() => {
                    if (draggingId) moveCategoryEntity(draggingId, entity.id, activeType ?? categorySlug ?? 'category')
                    setDraggingId(null)
                    setDragOverId(null)
                  }}
                >
                  {bulkMode ? (
                    <button
                      onClick={() => setSelectedIds((prev) => {
                        const next = new Set(prev)
                        if (next.has(entity.id)) next.delete(entity.id)
                        else next.add(entity.id)
                        return next
                      })}
                      style={{
                        position: 'absolute', top: 10, left: 10, zIndex: 5,
                        width: 22, height: 22, borderRadius: 'var(--radius-sm)',
                        border: selectedIds.has(entity.id) ? 'none' : '2px solid rgba(0,0,0,0.3)',
                        backgroundColor: selectedIds.has(entity.id) ? 'var(--color-primary)' : 'rgba(255,255,255,0.9)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', backdropFilter: 'blur(4px)',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      {selectedIds.has(entity.id) ? <Check size={12} strokeWidth={2.5} color="white" /> : null}
                    </button>
                  ) : null}
                  <EntityCard
                    entity={entity}
                    singularLabel={singularLabel}
                    categoryFields={customCategory?.kind === 'category' ? customCategory.fields ?? [] : []}
                    categoryColor={categoryColor}
                    categoryColorLight={categoryColorLight}
                    categoryIcon={customCategory?.kind === 'category' ? customCategory.icon : undefined}
                    onDragStart={() => setDraggingId(entity.id)}
                    onDragEnd={() => { setDraggingId(null); setDragOverId(null) }}
                    isDragging={draggingId === entity.id}
                    isDropTarget={dragOverId === entity.id && draggingId !== entity.id}
                    onTagClick={(tag) => setTagFilter(tagFilter === tag ? null : tag)}
                    isPinned={pinnedEntityIds.includes(entity.id)}
                    onPin={() => togglePinEntity(entity.id)}
                  />
                </div>
              ))}

            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {categoryNoteContainers.map((container) => <CategoryNoteCard key={container.id} container={container} />)}
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', backgroundColor: 'var(--color-surface)' }}>
                {filteredEntities.map((entity, index) => (
                <EntityListRow
                  key={entity.id}
                  entity={entity}
                  isLast={index === filteredEntities.length - 1}
                  isDropTarget={dragOverId === entity.id && draggingId !== entity.id}
                  onDragOver={(event) => {
                    event.preventDefault()
                    if (dragOverId !== entity.id) setDragOverId(entity.id)
                  }}
                  onDragLeave={() => { if (dragOverId === entity.id) setDragOverId(null) }}
                  onDrop={() => {
                    if (draggingId) moveCategoryEntity(draggingId, entity.id, activeType ?? categorySlug ?? 'category')
                    setDraggingId(null)
                    setDragOverId(null)
                  }}
                  bulkMode={bulkMode}
                  isSelected={selectedIds.has(entity.id)}
                  onSelect={() => setSelectedIds((prev) => {
                    const next = new Set(prev)
                    if (next.has(entity.id)) next.delete(entity.id)
                    else next.add(entity.id)
                    return next
                  })}
                  onTagClick={(tag) => setTagFilter(tagFilter === tag ? null : tag)}
                />
                ))}
              </div>
            </div>
          )}

          {bulkMode && selectedIds.size > 0 ? (
            <BulkActionBar
              count={selectedIds.size}
              onDelete={async () => {
                const count = selectedIds.size
                const confirmed = await openConfirmDialog({
                  title: `${count} ${count === 1 ? 'Eintrag' : 'Einträge'} wirklich löschen?`,
                  description: 'Die Auswahl wird in den Papierkorb verschoben.',
                  confirmLabel: 'In Papierkorb verschieben',
                  confirmVariant: 'danger',
                })
                if (!confirmed) return
                let failed = 0
                for (const id of selectedIds) {
                  const movedToTrash = await trashEntityLocally(id)
                  if (!movedToTrash) {
                    failed += 1
                    continue
                  }
                }
                setSelectedIds(new Set())
                setBulkMode(false)
                if (failed > 0) {
                  showToast(`${failed} ${failed === 1 ? 'Eintrag konnte' : 'Einträge konnten'} nicht gelöscht werden`)
                }
              }}
              onStatusChange={async (newStatus) => {
                const ids = Array.from(selectedIds)
                let failed = 0
                for (const id of ids) {
                  const entity = entities.find((e) => e.id === id)
                  if (entity) {
                    const { error } = await supabase.from('entities').update({ status: newStatus }).eq('id', id)
                    if (error) {
                      failed += 1
                      continue
                    }
                    updateEntityLocal(id, {
                      name: entity.name,
                      type: entity.type,
                      shortDescription: entity.shortDescription,
                      content: entity.content,
                      tags: entity.tags,
                      status: newStatus,
                    })
                  }
                }
                setSelectedIds(new Set())
                setBulkMode(false)
                if (failed > 0) {
                  showToast(`${failed} ${failed === 1 ? 'Status-Update ist' : 'Status-Updates sind'} fehlgeschlagen`)
                }
              }}
              onSelectAll={() => setSelectedIds(new Set(filteredEntities.map((e) => e.id)))}
              onClear={() => { setBulkMode(false); setSelectedIds(new Set()) }}
            />
          ) : null}
        </>
      )}
    </div>
  )
}

function CategoryNoteCard({ container }: { container: DashboardNoteContainer }) {
  const [isHovered, setIsHovered] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const updateDashboardNoteContainer = useWorldStore((state) => state.updateDashboardNoteContainer)
  const removeDashboardNoteContainer = useWorldStore((state) => state.removeDashboardNoteContainer)

  const noteText = container.notes[0] ?? ''

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: isHovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'transform 150ms ease, box-shadow 150ms ease',
        height: '100%',
        minHeight: 268,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: '10px 12px', flexShrink: 0 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
          padding: '3px 8px', borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--color-note-light)', color: 'var(--color-note)',
          fontSize: 11, fontWeight: 500,
        }}>
          <NotebookPen size={13} strokeWidth={1.5} />
          Notiz
        </span>
        {editingTitle ? (
          <input
            autoFocus
            defaultValue={container.title}
            onBlur={(event) => {
              updateDashboardNoteContainer(container.id, { title: event.target.value || container.title })
              setEditingTitle(false)
            }}
            onKeyDown={(event) => { if (event.key === 'Enter' || event.key === 'Escape') event.currentTarget.blur() }}
            style={{
              flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--color-text)',
              border: 'none', outline: '2px solid var(--color-primary)',
              borderRadius: 'var(--radius-sm)', padding: '2px 6px',
              backgroundColor: 'var(--color-bg)', fontFamily: 'var(--font-ui)',
            }}
          />
        ) : (
          <span
            onClick={() => setEditingTitle(true)}
            title="Klicken zum Bearbeiten"
            style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--color-text)', cursor: 'text', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            {container.title}
            <Pencil size={11} strokeWidth={1.5} color="var(--color-text-secondary)" style={{ flexShrink: 0, opacity: isHovered ? 1 : 0, transition: 'opacity 150ms ease' }} />
          </span>
        )}
        <button
          onClick={() => removeDashboardNoteContainer(container.id)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 24, height: 24, border: 'none', cursor: 'pointer',
            borderRadius: 'var(--radius-sm)', backgroundColor: 'transparent',
            color: 'var(--color-text-secondary)',
            opacity: isHovered ? 1 : 0, transition: 'opacity 150ms ease', flexShrink: 0,
          }}
          title="Notiz löschen"
        >
          <Trash2 size={13} strokeWidth={1.5} />
        </button>
      </div>

      {/* Full-card textarea */}
      <textarea
        value={noteText}
        onChange={(event) => {
          updateDashboardNoteContainer(container.id, { notes: [event.target.value] })
        }}
        placeholder="Kurze Idee festhalten…"
        style={{
          flex: 1,
          width: '100%',
          padding: '4px 12px 12px',
          border: 'none',
          outline: 'none',
          resize: 'none',
          backgroundColor: 'transparent',
          fontFamily: 'var(--font-ui)',
          fontSize: 13,
          lineHeight: 1.6,
          color: 'var(--color-text)',
        }}
      />
    </div>
  )
}

function HeaderActionButton({
  icon: Icon,
  label,
  variant = 'secondary',
  onClick,
}: {
  icon: React.ElementType
  label: string
  variant?: 'primary' | 'secondary'
  onClick?: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const isPrimary = variant === 'primary'

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        height: 36,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        padding: '0 var(--space-4)',
        borderRadius: 'var(--radius-md)',
        border: isPrimary ? 'none' : '1px solid var(--color-border)',
        backgroundColor: isPrimary
          ? (hovered ? 'var(--color-primary-hover)' : 'var(--color-primary)')
          : (hovered ? 'var(--color-bg)' : 'var(--color-surface)'),
        color: isPrimary ? 'var(--color-primary-text)' : 'var(--color-text)',
        fontSize: 13,
        fontWeight: 500,
        fontFamily: 'var(--font-ui)',
        cursor: 'pointer',
        transition: 'background 150ms ease',
      }}
    >
      <Icon size={15} strokeWidth={1.5} />
      {label}
    </button>
  )
}

function DashboardSelect({
  value,
  onChange,
  options,
  isModified = false,
}: {
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  isModified?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  const selectedLabel = options.find((opt) => opt.value === value)?.label ?? value

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen((o) => !o)}
        style={{
          height: 36,
          minWidth: 180,
          padding: '0 36px 0 var(--space-4)',
          border: isModified ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
          borderRadius: isOpen ? 'var(--radius-md) var(--radius-md) 0 0' : 'var(--radius-md)',
          backgroundColor: isModified ? 'var(--color-primary-light)' : (isOpen ? 'var(--color-bg)' : 'var(--color-surface)'),
          color: isModified ? 'var(--color-primary)' : 'var(--color-text)',
          fontSize: 13,
          fontWeight: 500,
          fontFamily: 'var(--font-ui)',
          cursor: 'pointer',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          transition: 'background 100ms ease',
        }}
      >
        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedLabel}</span>
        <ChevronDown
          size={14}
          strokeWidth={1.5}
          color="var(--color-text-secondary)"
          style={{
            position: 'absolute', right: 12, top: '50%',
            transform: `translateY(-50%) rotate(${isOpen ? 180 : 0}deg)`,
            transition: 'transform 150ms ease',
            pointerEvents: 'none',
          }}
        />
      </button>
      {isOpen ? (
        <div
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)', borderTop: 'none',
            borderRadius: '0 0 var(--radius-md) var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            zIndex: 50, overflow: 'hidden',
          }}
        >
          {options.map((option) => {
            const active = option.value === value
            return (
              <button
                key={option.value}
                onClick={() => { onChange(option.value); setIsOpen(false) }}
                style={{
                  width: '100%', height: 32,
                  padding: '0 var(--space-4)',
                  border: 'none',
                  backgroundColor: active ? 'var(--color-primary-light)' : 'transparent',
                  color: active ? 'var(--color-primary)' : 'var(--color-text)',
                  fontSize: 13, fontFamily: 'var(--font-ui)',
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                  transition: 'background 80ms ease',
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = 'var(--color-bg)' }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = 'transparent' }}
              >
                {active ? <Check size={12} strokeWidth={2} /> : <span style={{ width: 12 }} />}
                {option.label}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function EntityCard({
  entity,
  singularLabel,
  categoryFields,
  categoryColor,
  categoryColorLight,
  categoryIcon,
  onDragStart,
  onDragEnd,
  isDragging = false,
  isDropTarget = false,
  onTagClick,
  isPinned = false,
  onPin,
}: {
  entity: Entity
  singularLabel?: string
  categoryFields?: CategoryField[]
  categoryColor?: string
  categoryColorLight?: string
  categoryIcon?: string
  onDragStart?: () => void
  onDragEnd?: () => void
  isDragging?: boolean
  isDropTarget?: boolean
  onTagClick?: (tag: string) => void
  isPinned?: boolean
  onPin?: () => void
}) {
  const [isCardHovered, setIsCardHovered] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [editValue, setEditValue] = useState(entity.name)
  const editRef = useRef<HTMLInputElement>(null)
  const trashEntityLocally = useWorldStore((s) => s.trashEntityLocally)
  const updateEntityLocal = useWorldStore((s) => s.updateEntityLocal)
  const showToast = useWorldStore((s) => s.showToast)
  const loadWorldData = useWorldStore((s) => s.loadWorldData)
  const openConfirmDialog = useWorldStore((s) => s.openConfirmDialog)
  const typeMeta = entityTypeMeta[entity.type]
  const accentColor = categoryColor ?? typeMeta.color
  const accentLight = categoryColorLight ?? typeMeta.lightColor
  const currentStatus = statusMeta[entity.status]
  const resolvedSingularLabel = singularLabel ?? toSingular(typeMeta.label)
  const cover = getEntityCover(entity.id)
  const avatar = getEntityAvatar(entity.id)
  const TypeIcon = categoryIcon ? getCategoryIcon(categoryIcon) : (ENTITY_TYPE_ICONS[entity.type] ?? StickyNote)

  useEffect(() => {
    if (editingName) {
      setEditValue(entity.name)
      setTimeout(() => { editRef.current?.focus(); editRef.current?.select() }, 0)
    }
  }, [editingName, entity.name])

  const commitNameEdit = async () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== entity.name) {
      const previousName = entity.name
      updateEntityLocal(entity.id, { name: trimmed, type: entity.type, shortDescription: entity.shortDescription, content: entity.content, tags: entity.tags, status: entity.status })
      const { error } = await supabase.from('entities').update({ name: trimmed }).eq('id', entity.id)
      if (error) {
        updateEntityLocal(entity.id, { name: previousName, type: entity.type, shortDescription: entity.shortDescription, content: entity.content, tags: entity.tags, status: entity.status })
        showToast(error.message)
      }
    }
    setEditingName(false)
  }

  const handleQuickDelete = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    const confirmed = await openConfirmDialog({
      title: `"${entity.name}" löschen?`,
      description: 'Der Eintrag wird in den Papierkorb verschoben.',
      confirmLabel: 'In Papierkorb verschieben',
      confirmVariant: 'danger',
    })
    if (!confirmed) return
    const movedToTrash = await trashEntityLocally(entity.id)
    if (!movedToTrash) {
      return
    }
  }

  const handleQuickDuplicate = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    const copyId = `entity-${Date.now()}`
    const copyName = `${entity.name} (Kopie)`
    const { error } = await supabase.from('entities').insert({
      id: copyId,
      name: copyName,
      type: entity.type,
      short_description: entity.shortDescription,
      tags: entity.tags,
      status: 'draft',
      content: entity.content,
      universe_id: entity.universeId,
      timeline_date: entity.timelineDate ?? null,
    })
    if (error) {
      showToast(error.message)
      return
    }
    await loadWorldData()
    showToast(`"${copyName}" erstellt`)
  }

  const handleQuickStatus = async (e: React.MouseEvent, nextStatus: EntityStatus) => {
    e.preventDefault(); e.stopPropagation()
    const previousStatus = entity.status
    updateEntityLocal(entity.id, { status: nextStatus } as Parameters<typeof updateEntityLocal>[1])
    const { error } = await supabase.from('entities').update({ status: nextStatus }).eq('id', entity.id)
    if (error) {
      updateEntityLocal(entity.id, { status: previousStatus } as Parameters<typeof updateEntityLocal>[1])
      showToast(error.message)
    }
  }
  const fieldValues = getEntityFieldValues(entity.id)
  const fieldSummaries = (categoryFields ?? []).flatMap((field) => {
    const value = fieldValues[field.id] ?? ''
    const count = countFieldItems(field.type, value)
    return count > 0 ? [{ field, count }] : []
  })
  const filledFieldCount = fieldSummaries.length


  return (
    <div
      onMouseEnter={() => setIsCardHovered(true)}
      onMouseLeave={() => setIsCardHovered(false)}
      style={{
        position: 'relative',
        backgroundColor: 'var(--color-surface)',
        border: isDropTarget ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: isDragging ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        opacity: isDragging ? 0.72 : 1,
        transform: isDragging ? 'scale(0.985)' : 'scale(1)',
        transition: 'border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease, opacity 150ms ease',
      }}
    >
      <button
        type="button"
        draggable
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = 'move'
          onDragStart?.()
        }}
        onDragEnd={onDragEnd}
        title="Verschieben"
        style={{
          position: 'absolute',
          top: 'var(--space-3)',
          right: 'var(--space-3)',
          zIndex: 3,
          width: 28,
          height: 28,
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          backgroundColor: 'rgba(255,255,255,0.88)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-secondary)',
          cursor: 'grab',
          backdropFilter: 'blur(4px)',
          opacity: isCardHovered ? 1 : 0,
          pointerEvents: isCardHovered ? 'auto' : 'none',
          transition: 'opacity 150ms ease',
        }}
      >
        <GripVertical size={15} strokeWidth={1.5} />
      </button>

      <Link
        to={`/entities/${entity.id}`}
        style={{
          textDecoration: 'none',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
        }}
      >
      {/* Cover */}
      <div style={{
        position: 'relative',
        height: 170,
        backgroundColor: accentLight,
        backgroundImage: cover ? `url(${cover})` : undefined,
        backgroundSize: 'cover', backgroundPosition: 'center',
      }}>
        {cover ? <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.22), transparent 55%)' }} /> : null}
        {!cover ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <TypeIcon size={80} strokeWidth={0.75} color={accentColor} style={{ opacity: 0.2 }} />
          </div>
        ) : null}
        <div style={{ position: 'absolute', top: 10, left: 10, right: 46, display: 'flex', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
          <span style={{ padding: '3px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: cover ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.6)', color: accentColor, fontSize: 11, fontWeight: 500, backdropFilter: cover ? 'blur(4px)' : undefined }}>
            {resolvedSingularLabel}
          </span>
          <span style={{ padding: '3px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: cover ? 'rgba(255,255,255,0.85)' : currentStatus.lightColor, color: currentStatus.color, fontSize: 11, fontWeight: 500, backdropFilter: cover ? 'blur(4px)' : undefined }}>
            {currentStatus.label}
          </span>
        </div>
        {/* Pin button */}
        {onPin ? (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPin() }}
            title={isPinned ? 'Lospinnen' : 'Anpinnen'}
            style={{
              position: 'absolute', bottom: 8, right: 8,
              width: 26, height: 26, borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255,255,255,0.4)',
              backgroundColor: isPinned ? 'var(--color-primary)' : 'rgba(255,255,255,0.88)',
              backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              color: isPinned ? '#fff' : 'var(--color-text-secondary)',
              opacity: isPinned || isCardHovered ? 1 : 0,
              transition: 'opacity 150ms ease, background-color 150ms ease',
              zIndex: 2,
            }}
          >
            <Pin size={13} strokeWidth={1.5} style={{ transform: isPinned ? 'none' : 'rotate(45deg)' }} />
          </button>
        ) : null}
      </div>

      {/* Body */}
      <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', flex: 1 }}>

        {/* Avatar + Text */}
        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 'var(--radius-lg)', flexShrink: 0,
            backgroundColor: avatar ? 'transparent' : accentLight,
            backgroundImage: avatar ? `url(${avatar})` : undefined,
            backgroundSize: 'cover', backgroundPosition: 'center',
            border: avatar ? '1px solid var(--color-border)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}>
            {avatar ? null : <TypeIcon size={22} strokeWidth={1.5} color={accentColor} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingName ? (
              <input
                ref={editRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitNameEdit}
                onKeyDown={(e) => { if (e.key === 'Enter') commitNameEdit(); if (e.key === 'Escape') setEditingName(false) }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
                onMouseDown={(e) => e.stopPropagation()}
                style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-sm)', outline: 'none', padding: '2px 6px', fontFamily: 'var(--font-ui)', width: '100%', backgroundColor: 'var(--color-bg)', lineHeight: 1.3 }}
              />
            ) : (
              <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.3, marginBottom: entity.shortDescription ? 4 : 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {entity.name}
              </h2>
            )}
            {entity.shortDescription ? (
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                {entity.shortDescription}
              </p>
            ) : null}
          </div>
        </div>

        {/* Compact field summaries + tags */}
        {(filledFieldCount > 0 || entity.tags.length > 0) ? (
          <div
            className="ds-scroll"
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
              flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 'var(--space-1)',
            }}
          >
            {filledFieldCount > 0 ? (
              <span style={{ flexShrink: 0, padding: '3px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text-secondary)', fontSize: 11, fontWeight: 500 }}>
                {filledFieldCount} {filledFieldCount === 1 ? 'Feld' : 'Felder'}
              </span>
            ) : null}
            {fieldSummaries.map(({ field, count }) => {
              const FieldIcon = getCategoryIcon(field.icon ?? categoryFieldDefaultIcons[field.type])
              return (
              <span
                key={field.id}
                title={`${count} Einträge in ${field.name}`}
                style={{
                  flexShrink: 0, padding: '3px 8px', borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)',
                  fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-ui)',
                  display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)',
                }}
              >
                <FieldIcon size={11} strokeWidth={1.5} />
                {count} {field.name}
              </span>
              )
            })}
            {entity.tags.slice(0, 2).map((tag) => (
              <button key={tag} onClick={(e) => { e.stopPropagation(); e.preventDefault(); onTagClick?.(tag) }} style={{ flexShrink: 0, padding: '3px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-accent-light)', color: 'var(--color-accent)', fontSize: 11, fontWeight: 500, border: 'none', cursor: onTagClick ? 'pointer' : 'default', fontFamily: 'var(--font-ui)' }}>
                #{tag}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      </Link>

      {/* Quick-Action-Bar — visible on hover */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 12px',
        borderTop: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg)',
        opacity: isCardHovered ? 1 : 0,
        transition: 'opacity 150ms ease',
        gap: 'var(--space-2)',
      }}>
        {/* Status pills */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['draft', 'active', 'concept'] as EntityStatus[]).map((s) => {
            const sm = statusMeta[s]
            const active = entity.status === s
            return (
              <button
                key={s}
                type="button"
                onClick={(e) => handleQuickStatus(e, s)}
                title={sm.label}
                style={{
                  padding: '2px 7px', borderRadius: 'var(--radius-full)',
                  border: active ? 'none' : '1px solid var(--color-border)',
                  backgroundColor: active ? sm.lightColor : 'transparent',
                  color: active ? sm.color : 'var(--color-text-secondary)',
                  fontSize: 11, fontWeight: 500, cursor: 'pointer',
                  fontFamily: 'var(--font-ui)',
                  transition: 'background 100ms, color 100ms',
                }}
              >
                {sm.label}
              </button>
            )
          })}
        </div>
        {/* Icon actions */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingName(true) }} title="Umbenennen"
            style={{ width: 26, height: 26, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
            <Pencil size={13} strokeWidth={1.5} />
          </button>
          <button type="button" onClick={handleQuickDuplicate} title="Duplizieren"
            style={{ width: 26, height: 26, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
            <Copy size={13} strokeWidth={1.5} />
          </button>
          <button type="button" onClick={handleQuickDelete} title="Löschen"
            style={{ width: 26, height: 26, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
            <Trash2 size={13} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  )
}

function EntityListRow({
  entity,
  isLast,
  isDropTarget,
  onDragOver,
  onDragLeave,
  onDrop,
  bulkMode = false,
  isSelected = false,
  onSelect,
  onTagClick,
}: {
  entity: Entity
  isLast: boolean
  isDropTarget: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: () => void
  bulkMode?: boolean
  isSelected?: boolean
  onSelect?: () => void
  onTagClick?: (tag: string) => void
}) {
  const typeMeta = entityTypeMeta[entity.type]
  const currentStatus = statusMeta[entity.status]
  const cover = getEntityCover(entity.id)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(entity.name)
  const editRef = useRef<HTMLInputElement>(null)
  const updateEntityLocalRow = useWorldStore((state) => state.updateEntityLocal)
  const showToast = useWorldStore((state) => state.showToast)

  const startEdit = (e: React.MouseEvent) => {
    if (bulkMode) return
    e.preventDefault()
    e.stopPropagation()
    setEditValue(entity.name)
    setEditing(true)
    setTimeout(() => { editRef.current?.focus(); editRef.current?.select() }, 0)
  }

  const commitEdit = async () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== entity.name) {
      const previousName = entity.name
      updateEntityLocalRow(entity.id, { name: trimmed, type: entity.type, shortDescription: entity.shortDescription, content: entity.content, tags: entity.tags, status: entity.status })
      const { error } = await supabase.from('entities').update({ name: trimmed }).eq('id', entity.id)
      if (error) {
        updateEntityLocalRow(entity.id, { name: previousName, type: entity.type, shortDescription: entity.shortDescription, content: entity.content, tags: entity.tags, status: entity.status })
        showToast(error.message)
      }
    }
    setEditing(false)
  }

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{
        borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
        backgroundColor: isSelected ? 'var(--color-primary-light)' : isDropTarget ? 'var(--color-primary-light)' : 'transparent',
        transition: 'background 100ms ease',
      }}
    >
      <Link
        to={bulkMode ? '#' : `/entities/${entity.id}`}
        onClick={bulkMode ? (e) => { e.preventDefault(); onSelect?.() } : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-4)',
          padding: 'var(--space-3) var(--space-4)',
          textDecoration: 'none',
        }}
      >
        {bulkMode ? (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSelect?.() }}
            style={{
              width: 20, height: 20, borderRadius: 'var(--radius-sm)', flexShrink: 0,
              border: isSelected ? 'none' : '2px solid var(--color-border)',
              backgroundColor: isSelected ? 'var(--color-primary)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            {isSelected ? <Check size={11} strokeWidth={2.5} color="white" /> : null}
          </button>
        ) : null}
        {/* Thumbnail */}
        <div style={{
          width: 40, height: 40, borderRadius: 'var(--radius-md)', flexShrink: 0,
          backgroundColor: typeMeta.lightColor,
          backgroundImage: cover ? `url(${cover})` : undefined,
          backgroundSize: 'cover', backgroundPosition: 'center',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {!cover ? (() => { const Icon = ENTITY_TYPE_ICONS[entity.type] ?? StickyNote; return <Icon size={18} strokeWidth={1.5} color={typeMeta.color} /> })() : null}
        </div>

        {/* Name + description */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <input
              ref={editRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false) }}
              onClick={(e) => e.stopPropagation()}
              style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-sm)', padding: '1px 6px', outline: 'none', fontFamily: 'var(--font-ui)', width: '100%', backgroundColor: 'var(--color-bg)' }}
            />
          ) : (
            <div
              onDoubleClick={startEdit}
              title="Doppelklick zum Bearbeiten"
              style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'text' }}
            >
              {entity.name}
            </div>
          )}
          {entity.shortDescription ? (
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {entity.shortDescription}
            </div>
          ) : null}
        </div>

        {/* Tags */}
        {entity.tags.length > 0 ? (
          <div style={{ display: 'flex', gap: 'var(--space-1)', flexShrink: 0 }}>
            {entity.tags.slice(0, 2).map((tag) => (
              <button key={tag} onClick={(e) => { e.stopPropagation(); e.preventDefault(); onTagClick?.(tag) }} style={{ padding: '2px 6px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-accent-light)', color: 'var(--color-accent)', fontSize: 11, fontWeight: 500, border: 'none', cursor: onTagClick ? 'pointer' : 'default', fontFamily: 'var(--font-ui)' }}>
                #{tag}
              </button>
            ))}
          </div>
        ) : null}

        {/* Status */}
        <span style={{
          padding: '2px 8px', borderRadius: 'var(--radius-sm)', flexShrink: 0,
          backgroundColor: currentStatus.lightColor,
          color: currentStatus.color, fontSize: 11, fontWeight: 500,
        }}>
          {currentStatus.label}
        </span>
      </Link>
    </div>
  )
}

function countFieldItems(fieldType: CategoryField['type'], value: string) {
  if (!value.trim()) return 0

  if (fieldType === 'sections') {
    try {
      const parsed: unknown = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.length
    } catch {
      // Legacy section values were stored line-by-line.
    }
  }

  if (fieldType === 'participants' || fieldType === 'sections' || fieldType === 'tasks') {
    return value.split('\n').filter((item) => item.trim().length > 0).length
  }

  return 1
}

function SkeletonCard() {
  return (
    <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ height: 170, backgroundColor: 'var(--color-bg)', animation: 'shimmer 1.6s ease-in-out infinite' }} />
      <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-bg)', flexShrink: 0, animation: 'shimmer 1.6s ease-in-out infinite' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ height: 14, borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-bg)', width: '72%', animation: 'shimmer 1.6s ease-in-out infinite' }} />
            <div style={{ height: 12, borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-bg)', width: '52%', animation: 'shimmer 1.6s ease-in-out infinite' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ height: 20, borderRadius: 'var(--radius-full)', backgroundColor: 'var(--color-bg)', width: 52, animation: 'shimmer 1.6s ease-in-out infinite' }} />
          <div style={{ height: 20, borderRadius: 'var(--radius-full)', backgroundColor: 'var(--color-bg)', width: 64, animation: 'shimmer 1.6s ease-in-out infinite' }} />
        </div>
      </div>
    </div>
  )
}

function KanbanView({ entities, categoryColor, categoryColorLight, onTagClick }: {
  entities: Entity[]
  categoryColor?: string
  categoryColorLight?: string
  onTagClick?: (tag: string) => void
}) {
  const [groupBy, setGroupBy] = useState<'status' | 'tags'>('status')

  const allTags = useMemo(() => {
    const s = new Set<string>()
    entities.forEach((e) => e.tags.forEach((t) => s.add(t)))
    return [...s].sort()
  }, [entities])

  const TAG_COLORS = [
    { color: 'var(--color-primary)', light: 'var(--color-primary-light)' },
    { color: 'var(--color-success)', light: 'var(--color-success-light)' },
    { color: 'var(--color-warning)', light: 'var(--color-warning-light)' },
    { color: 'var(--color-character)', light: 'var(--color-character-light)' },
    { color: 'var(--color-location)', light: 'var(--color-location-light)' },
    { color: 'var(--color-faction)', light: 'var(--color-faction-light)' },
    { color: 'var(--color-magic)', light: 'var(--color-magic-light)' },
  ]

  const renderCard = (entity: Entity, accentColor: string, colTag?: string) => {
    const typeMeta = entityTypeMeta[entity.type]
    const ac = categoryColor ?? accentColor
    const al = categoryColorLight ?? typeMeta.lightColor
    const TypeIcon = ENTITY_TYPE_ICONS[entity.type] ?? StickyNote
    const cover = getEntityCover(entity.id)
    const sm = statusMeta[entity.status]
    return (
      <Link
        key={entity.id + (colTag ?? '')}
        to={`/entities/${entity.id}`}
        style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)', transition: 'box-shadow 150ms ease, border-color 150ms ease' }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = ac; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
      >
        <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', backgroundColor: al, backgroundImage: cover ? `url(${cover})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
          {!cover ? <TypeIcon size={14} strokeWidth={1.5} color={ac} /> : null}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entity.name}</div>
          {entity.shortDescription ? <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entity.shortDescription}</div> : null}
          {groupBy === 'tags' ? (
            <span style={{ display: 'inline-block', marginTop: 3, padding: '1px 6px', borderRadius: 'var(--radius-sm)', backgroundColor: sm.lightColor, color: sm.color, fontSize: 10, fontWeight: 500, fontFamily: 'var(--font-ui)' }}>{sm.label}</span>
          ) : entity.tags.length > 0 ? (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
              {entity.tags.slice(0, 2).map((tag) => (
                <button key={tag} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTagClick?.(tag) }} style={{ padding: '1px 5px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-accent-light)', color: 'var(--color-accent)', fontSize: 10, fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>#{tag}</button>
              ))}
            </div>
          ) : null}
        </div>
      </Link>
    )
  }

  const statusColumns: { status: EntityStatus; label: string }[] = [
    { status: 'concept', label: 'Concept' },
    { status: 'draft', label: 'Draft' },
    { status: 'active', label: 'Active' },
  ]

  return (
    <div>
      {/* Group-by toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 'var(--space-4)' }}>
        {(['status', 'tags'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setGroupBy(mode)}
            style={{
              padding: '4px 12px', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)', cursor: 'pointer',
              fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-ui)',
              backgroundColor: groupBy === mode ? 'var(--color-primary)' : 'var(--color-surface)',
              color: groupBy === mode ? 'var(--color-primary-text)' : 'var(--color-text-secondary)',
              transition: 'all 100ms ease',
            }}
          >
            {mode === 'status' ? 'Nach Status' : 'Nach Tags'}
          </button>
        ))}
      </div>

      {groupBy === 'status' ? (
        <div className="worldify-no-scrollbar" style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(180px, 1fr))', gap: 'var(--space-5)', alignItems: 'start', minWidth: 480 }}>
          {statusColumns.map(({ status, label }) => {
            const col = entities.filter((e) => e.status === status)
            const sm = statusMeta[status]
            return (
              <div key={status}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-3)', padding: '0 2px' }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: sm.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-ui)', letterSpacing: '0.02em' }}>{label}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)', padding: '1px 7px' }}>{col.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3)', minHeight: 80 }}>
                  {col.map((entity) => renderCard(entity, entityTypeMeta[entity.type].color))}
                  {col.length === 0 ? <div style={{ fontSize: 12, color: 'var(--color-text-placeholder)', fontFamily: 'var(--font-ui)', textAlign: 'center', padding: '16px 0' }}>Keine Einträge</div> : null}
                </div>
              </div>
            )
          })}
        </div>
        </div>
      ) : (
        <div className="worldify-no-scrollbar" style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(allTags.length + 1, 1)}, minmax(200px, 1fr))`, gap: 'var(--space-5)', alignItems: 'start' }}>
          {allTags.map((tag, i) => {
            const tc = TAG_COLORS[i % TAG_COLORS.length]
            const col = entities.filter((e) => e.tags.includes(tag))
            return (
              <div key={tag}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-3)', padding: '0 2px' }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: tc.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-ui)', letterSpacing: '0.02em' }}>#{tag}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)', padding: '1px 7px' }}>{col.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3)', minHeight: 80 }}>
                  {col.map((entity) => renderCard(entity, tc.color, tag))}
                  {col.length === 0 ? <div style={{ fontSize: 12, color: 'var(--color-text-placeholder)', fontFamily: 'var(--font-ui)', textAlign: 'center', padding: '16px 0' }}>Keine Einträge</div> : null}
                </div>
              </div>
            )
          })}
          {/* Ohne Tag */}
          {(() => {
            const col = entities.filter((e) => e.tags.length === 0)
            return (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-3)', padding: '0 2px' }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--color-border-strong)', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', letterSpacing: '0.02em' }}>Ohne Tag</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)', padding: '1px 7px' }}>{col.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3)', minHeight: 80 }}>
                  {col.map((entity) => renderCard(entity, entityTypeMeta[entity.type].color))}
                  {col.length === 0 ? <div style={{ fontSize: 12, color: 'var(--color-text-placeholder)', fontFamily: 'var(--font-ui)', textAlign: 'center', padding: '16px 0' }}>Keine Einträge</div> : null}
                </div>
              </div>
            )
          })()}
        </div>
        </div>
      )}
    </div>
  )
}

function TableView({ entities, onTagClick }: {
  entities: Entity[]
  onTagClick?: (tag: string) => void
}) {
  const updateEntityLocal = useWorldStore((s) => s.updateEntityLocal)
  const showToast = useWorldStore((s) => s.showToast)
  const [editingCell, setEditingCell] = useState<{ id: string; field: 'name' | 'shortDescription' } | null>(null)
  const [cellValue, setCellValue] = useState('')
  const editRef = useRef<HTMLInputElement>(null)
  const [sortField, setSortField] = useState<'name' | 'status' | 'updatedAt' | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const handleSort = (field: 'name' | 'status' | 'updatedAt') => {
    if (sortField === field) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sortedEntities = sortField
    ? [...entities].sort((a, b) => {
        let av = '', bv = ''
        if (sortField === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase() }
        else if (sortField === 'status') { av = a.status; bv = b.status }
        else if (sortField === 'updatedAt') { av = a.updatedAt; bv = b.updatedAt }
        const cmp = av < bv ? -1 : av > bv ? 1 : 0
        return sortDir === 'asc' ? cmp : -cmp
      })
    : entities

  const startEdit = (entity: Entity, field: 'name' | 'shortDescription') => {
    setEditingCell({ id: entity.id, field })
    setCellValue(field === 'name' ? entity.name : entity.shortDescription)
    setTimeout(() => { editRef.current?.focus(); editRef.current?.select() }, 0)
  }

  const commitCell = async (entity: Entity) => {
    if (!editingCell) return
    const trimmed = cellValue.trim()
    if (trimmed) {
      const previousValue = editingCell.field === 'name' ? entity.name : entity.shortDescription
      const update = editingCell.field === 'name' ? { name: trimmed } : { shortDescription: trimmed }
      updateEntityLocal(entity.id, { ...entity, ...update })
      const { error } = await supabase.from('entities').update(
        editingCell.field === 'name' ? { name: trimmed } : { short_description: trimmed }
      ).eq('id', entity.id)
      if (error) {
        updateEntityLocal(
          entity.id,
          editingCell.field === 'name'
            ? { ...entity, name: previousValue }
            : { ...entity, shortDescription: previousValue },
        )
        showToast(error.message)
      }
    }
    setEditingCell(null)
  }

  const cols: { key: string; label: string; width: string; sortable?: 'name' | 'status' | 'updatedAt' }[] = [
    { key: 'name', label: 'Name', width: '30%', sortable: 'name' },
    { key: 'shortDescription', label: 'Beschreibung', width: '35%' },
    { key: 'tags', label: 'Tags', width: '15%' },
    { key: 'status', label: 'Status', width: '12%', sortable: 'status' },
    { key: 'updatedAt', label: 'Bearbeitet', width: '12%', sortable: 'updatedAt' },
  ]

  return (
    <div className="worldify-no-scrollbar" style={{ overflowX: 'auto', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
    <div style={{ minWidth: 560, backgroundColor: 'var(--color-surface)' }}>
      {/* Header */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
        {cols.map((col) => (
          <div
            key={col.key}
            onClick={col.sortable ? () => handleSort(col.sortable!) : undefined}
            style={{
              width: col.width, flexShrink: 0, padding: '8px 12px',
              fontSize: 11, fontWeight: 600, color: sortField === col.sortable ? 'var(--color-text)' : 'var(--color-text-secondary)',
              fontFamily: 'var(--font-ui)', letterSpacing: '0.06em', textTransform: 'uppercase',
              cursor: col.sortable ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', gap: 4,
              userSelect: 'none',
            }}
          >
            {col.label}
            {col.sortable ? (
              <span style={{ opacity: sortField === col.sortable ? 1 : 0.3, fontSize: 10 }}>
                {sortField === col.sortable ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
              </span>
            ) : null}
          </div>
        ))}
      </div>
      {/* Rows */}
      {sortedEntities.map((entity, idx) => {
        const sm = statusMeta[entity.status]
        const typeMeta = entityTypeMeta[entity.type]
        const TypeIcon = ENTITY_TYPE_ICONS[entity.type] ?? StickyNote
        const isLast = idx === sortedEntities.length - 1
        const updatedLabel = (() => {
          const d = new Date(entity.updatedAt)
          return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
        })()
        return (
          <div key={entity.id} style={{ display: 'flex', alignItems: 'center', borderBottom: isLast ? 'none' : '1px solid var(--color-border)', transition: 'background 80ms ease' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-bg)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
          >
            {/* Name */}
            <div style={{ width: '30%', flexShrink: 0, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', backgroundColor: typeMeta.lightColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <TypeIcon size={13} strokeWidth={1.5} color={typeMeta.color} />
              </div>
              {editingCell?.id === entity.id && editingCell.field === 'name' ? (
                <input ref={editRef} value={cellValue} onChange={(e) => setCellValue(e.target.value)}
                  onBlur={() => commitCell(entity)}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitCell(entity); else if (e.key === 'Escape') setEditingCell(null) }}
                  style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--color-text)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-sm)', padding: '2px 6px', outline: 'none', fontFamily: 'var(--font-ui)', backgroundColor: 'var(--color-bg)' }}
                />
              ) : (
                <Link to={`/entities/${entity.id}`} onDoubleClick={(e) => { e.preventDefault(); startEdit(entity, 'name') }}
                  style={{ textDecoration: 'none', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'text' }}>
                  {entity.name}
                </Link>
              )}
            </div>
            {/* Description */}
            <div style={{ width: '35%', flexShrink: 0, padding: '10px 12px' }}>
              {editingCell?.id === entity.id && editingCell.field === 'shortDescription' ? (
                <input ref={editRef} value={cellValue} onChange={(e) => setCellValue(e.target.value)}
                  onBlur={() => commitCell(entity)}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitCell(entity); else if (e.key === 'Escape') setEditingCell(null) }}
                  style={{ width: '100%', fontSize: 12, color: 'var(--color-text)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-sm)', padding: '2px 6px', outline: 'none', fontFamily: 'var(--font-ui)', backgroundColor: 'var(--color-bg)' }}
                />
              ) : (
                <span onDoubleClick={() => startEdit(entity, 'shortDescription')}
                  style={{ fontSize: 12, color: entity.shortDescription ? 'var(--color-text-secondary)' : 'var(--color-text-placeholder)', fontFamily: 'var(--font-ui)', cursor: 'text', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {entity.shortDescription || '—'}
                </span>
              )}
            </div>
            {/* Tags */}
            <div style={{ width: '15%', flexShrink: 0, padding: '10px 12px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {entity.tags.slice(0, 2).map((tag) => (
                <button key={tag} onClick={() => onTagClick?.(tag)} style={{ padding: '1px 6px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-accent-light)', color: 'var(--color-accent)', fontSize: 10, fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>#{tag}</button>
              ))}
            </div>
            {/* Status */}
            <div style={{ width: '12%', flexShrink: 0, padding: '10px 12px' }}>
              <span style={{ padding: '2px 7px', borderRadius: 'var(--radius-sm)', backgroundColor: sm.lightColor, color: sm.color, fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-ui)' }}>{sm.label}</span>
            </div>
            {/* Updated */}
            <div style={{ width: '12%', flexShrink: 0, padding: '10px 12px', fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)' }}>{updatedLabel}</div>
          </div>
        )
      })}
      {entities.length === 0 ? (
        <div style={{ padding: '40px 24px', textAlign: 'center', fontSize: 13, color: 'var(--color-text-placeholder)', fontFamily: 'var(--font-ui)' }}>Keine Einträge</div>
      ) : null}
    </div>
    </div>
  )
}

function EmptyPanel({
  categoryLabel,
  singularLabel,
  onCreateClick,
}: {
  categoryLabel?: string
  singularLabel?: string
  onCreateClick?: () => void
}) {
  const label = categoryLabel ?? 'Kategorie'
  const resolvedSingularLabel = singularLabel ?? toSingular(label)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 24px',
        border: '1px dashed var(--color-border-strong)',
        borderRadius: 'var(--radius-xl)',
        backgroundColor: 'var(--color-surface)',
        textAlign: 'center',
        gap: 'var(--space-4)',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          backgroundColor: 'var(--color-primary-light)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
        }}
      >
        📭
      </div>
      <div>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>
          Keine {label} vorhanden
        </p>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
          Erstelle deinen ersten {resolvedSingularLabel} für dieses Universe.
        </p>
      </div>
      {onCreateClick ? (
        <button
          onClick={onCreateClick}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            height: 36,
            padding: '0 var(--space-4)',
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-primary-text)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            fontWeight: 500,
            fontFamily: 'var(--font-ui)',
            cursor: 'pointer',
          }}
        >
          <Plus size={14} strokeWidth={1.5} />
          {resolvedSingularLabel} erstellen
        </button>
      ) : null}
    </div>
  )
}

function GalleryCard({
  entity,
  categoryColor,
  categoryColorLight,
  bulkMode = false,
  isSelected = false,
  onSelect,
}: {
  entity: Entity
  categoryColor?: string
  categoryColorLight?: string
  bulkMode?: boolean
  isSelected?: boolean
  onSelect?: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const typeMeta = entityTypeMeta[entity.type]
  const accentColor = categoryColor ?? typeMeta.color
  const accentLight = categoryColorLight ?? typeMeta.lightColor
  const currentStatus = statusMeta[entity.status]
  const cover = getEntityCover(entity.id)
  const TypeIcon = ENTITY_TYPE_ICONS[entity.type] ?? StickyNote

  return (
    <div style={{ position: 'relative' }}>
      {bulkMode ? (
        <button
          onClick={onSelect}
          style={{
            position: 'absolute', top: 8, left: 8, zIndex: 5,
            width: 22, height: 22, borderRadius: 'var(--radius-sm)',
            border: isSelected ? 'none' : '2px solid rgba(0,0,0,0.3)',
            backgroundColor: isSelected ? 'var(--color-primary)' : 'rgba(255,255,255,0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', backdropFilter: 'blur(4px)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {isSelected ? <Check size={12} strokeWidth={2.5} color="white" /> : null}
        </button>
      ) : null}
      <Link
        to={bulkMode ? '#' : `/entities/${entity.id}`}
        onClick={bulkMode ? (e) => { e.preventDefault(); onSelect?.() } : undefined}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          textDecoration: 'none',
          display: 'block',
          position: 'relative',
          height: 220,
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          border: isSelected ? `2px solid var(--color-primary)` : '1px solid var(--color-border)',
          backgroundColor: accentLight,
          backgroundImage: cover ? `url(${cover})` : undefined,
          backgroundSize: 'cover', backgroundPosition: 'center',
          transform: hovered && !bulkMode ? 'scale(1.02)' : 'scale(1)',
          transition: 'transform 200ms ease, box-shadow 200ms ease, border-color 150ms ease',
          boxShadow: hovered && !bulkMode ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        }}
      >
        {!cover ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TypeIcon size={52} strokeWidth={1} color={accentColor} style={{ opacity: 0.35 }} />
          </div>
        ) : null}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)',
          padding: 'var(--space-8) var(--space-3) var(--space-3)',
        }}>
          <div style={{
            fontSize: 13, fontWeight: 600,
            color: 'rgba(255,255,255,0.95)',
            lineHeight: 1.3,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {entity.name}
          </div>
          <span style={{
            display: 'inline-block', marginTop: 4,
            padding: '2px 6px', borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(255,255,255,0.18)',
            color: 'rgba(255,255,255,0.9)',
            fontSize: 10, fontWeight: 500,
          }}>
            {currentStatus.label}
          </span>
        </div>
      </Link>
    </div>
  )
}

function BulkActionBar({
  count,
  onDelete,
  onStatusChange,
  onSelectAll,
  onClear,
}: {
  count: number
  onDelete: () => void
  onStatusChange: (status: EntityStatus) => void
  onSelectAll: () => void
  onClear: () => void
}) {
  const [statusOpen, setStatusOpen] = useState(false)
  const statusRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!statusOpen) return
    const handler = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [statusOpen])

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 100,
      backgroundColor: '#1C1917',
      borderRadius: 'var(--radius-xl)',
      padding: 'var(--space-3) var(--space-4)',
      display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
      fontFamily: 'var(--font-ui)',
      animation: 'modalIn 150ms ease-out',
    }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>
        {count} ausgewählt
      </span>
      <div style={{ width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />
      <button
        onClick={onSelectAll}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, fontWeight: 500,
          color: 'rgba(255,255,255,0.75)',
          fontFamily: 'var(--font-ui)',
          whiteSpace: 'nowrap', padding: 0,
        }}
      >
        Alle auswählen
      </button>
      {/* Status change dropdown */}
      <div ref={statusRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setStatusOpen((o) => !o)}
          style={{
            background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.8)',
            fontFamily: 'var(--font-ui)',
            borderRadius: 'var(--radius-md)',
            padding: '0 var(--space-3)',
            height: 28,
            display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
            whiteSpace: 'nowrap',
            transition: 'background 100ms ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.16)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
        >
          <Tag size={12} strokeWidth={1.5} />
          Status
          <ChevronDown size={11} strokeWidth={1.5} style={{ transform: `rotate(${statusOpen ? 180 : 0}deg)`, transition: 'transform 150ms' }} />
        </button>
        {statusOpen ? (
          <div style={{
            position: 'absolute', bottom: 'calc(100% + 8px)', left: 0,
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            padding: 4, minWidth: 148, zIndex: 110,
            animation: 'modalIn 100ms ease-out',
          }}>
            {(['active', 'draft', 'concept', 'archived'] as EntityStatus[]).map((s) => {
              const meta = statusMeta[s]
              return (
                <button
                  key={s}
                  onClick={() => { onStatusChange(s); setStatusOpen(false) }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 10px', background: 'transparent', border: 'none',
                    borderRadius: 'var(--radius-md)', cursor: 'pointer',
                    fontSize: 13, fontFamily: 'var(--font-ui)',
                    color: 'var(--color-text)', textAlign: 'left',
                    transition: 'background 80ms ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: meta.color, flexShrink: 0 }} />
                  {meta.label}
                </button>
              )
            })}
          </div>
        ) : null}
      </div>
      <button
        onClick={onDelete}
        style={{
          backgroundColor: '#DC2626', border: 'none', cursor: 'pointer',
          fontSize: 13, fontWeight: 500, color: 'white',
          fontFamily: 'var(--font-ui)',
          borderRadius: 'var(--radius-md)',
          padding: '0 var(--space-3)',
          height: 28,
          display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
          whiteSpace: 'nowrap',
        }}
      >
        <Trash2 size={12} strokeWidth={2} />
        Löschen
      </button>
      <button
        onClick={onClear}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center',
          padding: 0,
        }}
      >
        <X size={14} strokeWidth={1.5} />
      </button>
    </div>
  )
}
