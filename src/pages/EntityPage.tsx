import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getEntityCategorySlug, setEntityCategorySlug } from '../lib/entityCategoryAssignments'
import { resolveCategoryForEntityType } from '../lib/categoryResolution'
import { categoryFieldDefaultIcons, getCategoryIcon } from '../lib/categoryIcons'
import { getEntityCover, uploadEntityCover, removeEntityCover, getEntityAvatar, uploadEntityAvatar, removeEntityAvatar } from '../lib/entityMedia'
import { getEntityCoverPosition, saveEntityCoverPosition } from '../lib/bannerPosition'
import { useBannerDrag } from '../hooks/useBannerDrag'
import { getEntityFieldValues, saveEntityFieldValues } from '../lib/entityFieldValues'
import { addEntityLink, getEntityLinks, getIncomingEntityLinks, removeEntityLink } from '../lib/entityLinks'
import {
  buildParticipantOptions,
  decodeEntityReference,
  getEntityReferenceLabel,
  hasEntityReference,
} from '../lib/entityRelations'
import {
  Pencil,
  Trash2,
  Check,
  Calendar,
  ArrowLeft,
  Hash,
  BookOpen,
  Link2,
  LayoutDashboard,
  FileText,
  ImagePlus,
  Plus,
  User,
  Paperclip,
  X,
  Camera,
  Shapes,
  Search,
  CopyPlus,
  Quote,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FileDown,
  GripVertical,
} from 'lucide-react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { categoryFieldTypeMeta, entityTypeMeta, mapEntityRow, statusMeta, type CategoryField, type DatabaseEntityRow } from '../data/mockWorld'
import { useWorldStore } from '../store/useWorldStore'
import { supabase } from '../lib/supabase'
import EntityModal from '../components/entities/EntityModal'
import { findCategoryBySlug } from '../lib/categoryMatching'
import MentionText, { MentionChip } from '../components/editor/MentionText'
import LiveMentionEditor from '../components/editor/LiveMentionEditor'
import { parseTextMentions } from '../lib/entityMentions'
import { useWindowWidth } from '../hooks/useWindowWidth'

const TABS = [
  { id: 'Overview', icon: LayoutDashboard },
  { id: 'Notes', icon: FileText },
] as const

type BaseTab = typeof TABS[number]['id']
type Tab = BaseTab | string

export default function EntityPage() {
  const { id } = useParams()
  const entities = useWorldStore((state) => state.entities)
  const navigate = useNavigate()
  const trashEntityLocally = useWorldStore((state) => state.trashEntityLocally)
  const updateEntityLocal = useWorldStore((state) => state.updateEntityLocal)
  const loadWorldData = useWorldStore((state) => state.loadWorldData)
  const showToast = useWorldStore((state) => state.showToast)
  const openConfirmDialog = useWorldStore((state) => state.openConfirmDialog)
  const libraryItems = useWorldStore((state) => state.libraryItems)
  const user = useWorldStore((state) => state.user)
  const entity = entities.find((item) => item.id === id)
  const [editOpen, setEditOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('Overview')
  const [coverImage, setCoverImage] = useState<string | null>(() => (id ? getEntityCover(id) : null))
  const [avatarImage, setAvatarImage] = useState<string | null>(() => (id ? getEntityAvatar(id) : null))
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => (id ? getEntityFieldValues(id) : {}))
  const [repositionMode, setRepositionMode] = useState(false)
  const [savedCoverPosition, setSavedCoverPosition] = useState(() => (id ? getEntityCoverPosition(id) : 50))
  const { position: coverPosition, onMouseDown: onCoverDragStart, isDragging: isCoverDragging } = useBannerDrag(
    savedCoverPosition,
    () => {} // position is only saved when user clicks Done
  )
  const coverInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const isMobile = useWindowWidth() < 640

  // Sync image and field state when navigating between entities
  useEffect(() => {
    setCoverImage(id ? getEntityCover(id) : null)
    setAvatarImage(id ? getEntityAvatar(id) : null)
    setFieldValues(id ? getEntityFieldValues(id) : {})
    setSavedCoverPosition(id ? (entity?.coverPosition ?? getEntityCoverPosition(id)) : 50)
    setRepositionMode(false)
    setActiveTab('Overview')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!entity) {
    return <Navigate to="/" replace />
  }

  const typeMeta = entityTypeMeta[entity.type]
  const assignedCategorySlug = getEntityCategorySlug(entity.id)
  const matchingCategory = findCategoryBySlug(libraryItems, assignedCategorySlug) ?? resolveCategoryForEntityType(libraryItems, entity.type, assignedCategorySlug)
  const categoryLabel = matchingCategory?.label ?? typeMeta.label
  const singularLabel = matchingCategory?.kind === 'category'
    ? matchingCategory.singular ?? toSingular(categoryLabel)
    : toSingular(categoryLabel)
  const categoryFields: CategoryField[] = matchingCategory?.kind === 'category' ? matchingCategory.fields ?? [] : []
  const topFieldTabs = categoryFields.filter(
    (field) => field.type === 'tasks' || field.type === 'sections' || field.type === 'textarea',
  )

  const handleDuplicate = async () => {
    const { data, error } = await supabase
      .from('entities')
      .insert({
        universe_id: entity.universeId,
        type: entity.type,
        name: `Kopie von ${entity.name}`,
        short_description: entity.shortDescription || null,
        content: entity.content || null,
        tags: entity.tags,
        status: 'draft',
        timeline_date: entity.timelineDate ?? null,
        category_slug: assignedCategorySlug ?? null,
        field_values: fieldValues,
      })
      .select('id, universe_id, type, name, short_description, content, tags, status, created_at, updated_at, timeline_date, cover_position, category_slug, field_values')
      .single()

    if (error || !data) {
      showToast('Kopie konnte nicht erstellt werden')
      return
    }

    const duplicatedEntity = mapEntityRow(data as DatabaseEntityRow)
    if ((data as DatabaseEntityRow & { category_slug?: string | null }).category_slug) {
      setEntityCategorySlug(duplicatedEntity.id, (data as DatabaseEntityRow & { category_slug?: string | null }).category_slug!)
    }
    saveEntityFieldValues(duplicatedEntity.id, ((data as DatabaseEntityRow & { field_values?: Record<string, string> | null }).field_values as Record<string, string> | null) ?? fieldValues)
    await loadWorldData()
    navigate(`/entities/${duplicatedEntity.id}`)
  }

  const handleExportPDF = () => {
    const notes = parseNotes(entity.content ?? '')
    const links = getEntityLinks(entity.id)
    const linkedEntities = links
      .map((l) => entities.find((e) => e.id === l.targetId))
      .filter((e): e is NonNullable<typeof e> => Boolean(e))

    const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    const renderNoteText = (text: string) =>
      text
        .split('\n')
        .map((line) => {
          if (line.startsWith('## ')) return `<h3>${escHtml(line.slice(3))}</h3>`
          if (line.startsWith('# ')) return `<h2>${escHtml(line.slice(2))}</h2>`
          if (line.trim() === '') return '<br>'
          return `<p>${escHtml(line)}</p>`
        })
        .join('')

    const notesHtml = notes.length
      ? notes.map((note) => `
        <div class="note-block">
          <div class="note-header">${note.icon} ${escHtml(note.title || 'Notiz')}</div>
          <div class="note-body">${renderNoteText(note.text)}</div>
        </div>`).join('')
      : ''

    const fieldsHtml = categoryFields.length
      ? `<div class="section"><h2>Felder</h2><table class="fields-table">${
          categoryFields.map((f) => {
            const val = fieldValues[f.id]?.trim()
            if (!val) return ''
            return `<tr><td class="field-label">${escHtml(f.name)}</td><td>${escHtml(val)}</td></tr>`
          }).join('')
        }</table></div>`
      : ''

    const linksHtml = linkedEntities.length
      ? `<div class="section"><h2>Verknüpfungen</h2><ul>${
          linkedEntities.map((e) => `<li><strong>${escHtml(e.name)}</strong> <span class="tag">${escHtml(entityTypeMeta[e.type].label)}</span>${e.shortDescription ? ` — ${escHtml(e.shortDescription)}` : ''}</li>`).join('')
        }</ul></div>`
      : ''

    const tagsHtml = entity.tags.length
      ? entity.tags.map((t) => `<span class="tag">#${escHtml(t)}</span>`).join(' ')
      : ''

    const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>${escHtml(entity.name)} — Worldify</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; line-height: 1.6; color: #1a1a1a; padding: 40px; max-width: 780px; margin: 0 auto; }
  @media print { body { padding: 0; } @page { margin: 20mm 18mm; } }
  h1 { font-family: Georgia, 'Times New Roman', serif; font-size: 32px; font-weight: 700; margin-bottom: 6px; }
  h2 { font-size: 15px; font-weight: 600; color: #444; margin: 24px 0 10px; border-bottom: 1px solid #e5e5e5; padding-bottom: 6px; }
  h3 { font-size: 14px; font-weight: 600; margin: 16px 0 6px; }
  p { margin: 6px 0; color: #333; }
  ul { padding-left: 20px; }
  li { margin: 5px 0; }
  .meta { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; background: #f0f0f0; color: #444; }
  .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; background: #f4f4f4; color: #555; margin: 2px; }
  .short-desc { font-size: 15px; color: #555; margin-bottom: 28px; font-style: italic; }
  .section { margin-bottom: 28px; }
  .note-block { margin-bottom: 24px; padding: 16px 20px; border: 1px solid #e5e5e5; border-radius: 8px; break-inside: avoid; }
  .note-header { font-size: 14px; font-weight: 700; margin-bottom: 12px; color: #222; }
  .note-body h2 { font-size: 13px; border: none; padding: 0; margin: 14px 0 4px; color: #333; }
  .note-body h3 { font-size: 12px; margin: 10px 0 3px; }
  .note-body p { font-size: 13px; line-height: 1.7; }
  .fields-table { width: 100%; border-collapse: collapse; }
  .fields-table td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; font-size: 13px; vertical-align: top; }
  .field-label { font-weight: 600; color: #555; width: 180px; }
  .divider { border: none; border-top: 1px solid #e5e5e5; margin: 24px 0; }
  .footer { margin-top: 40px; font-size: 11px; color: #aaa; text-align: right; }
</style>
</head>
<body>
  <h1>${escHtml(entity.name)}</h1>
  <div class="meta">
    <span class="badge">${escHtml(entityTypeMeta[entity.type].label)}</span>
    <span class="badge">${escHtml(statusMeta[entity.status].label)}</span>
    ${tagsHtml}
    ${entity.timelineDate ? `<span class="badge">📅 ${new Date(entity.timelineDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>` : ''}
  </div>
  ${entity.shortDescription ? `<div class="short-desc">${escHtml(entity.shortDescription)}</div>` : ''}
  <hr class="divider">
  ${notes.length ? `<div class="section"><h2>Notizen</h2>${notesHtml}</div>` : ''}
  ${fieldsHtml}
  ${linksHtml}
  <div class="footer">Exportiert aus Worldify · ${new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
</body>
</html>`

    const win = window.open('', '_blank')
    if (!win) { alert('Popup blockiert — bitte Popup-Blocker deaktivieren'); return }
    win.document.write(html)
    win.document.close()
    setTimeout(() => { win.focus(); win.print() }, 400)
  }

  const handleDelete = async () => {
    const confirmed = await openConfirmDialog({
      title: `"${entity.name}" wirklich löschen?`,
      description: 'Der Eintrag wird in den Papierkorb verschoben.',
      confirmLabel: 'In Papierkorb verschieben',
      confirmVariant: 'danger',
    })

    if (!confirmed) {
      return
    }

    setIsDeleting(true)
    setDeleteError(null)

    const movedToTrash = await trashEntityLocally(entity.id)

    if (!movedToTrash) {
      setIsDeleting(false)
      setDeleteError('Eintrag konnte nicht in den Papierkorb verschoben werden')
      return
    }

    await loadWorldData()
    window.history.back()
  }

  const handleSaveFieldValue = async (fieldId: string, nextValue: string) => {
    const previousFieldValues = fieldValues
    const nextFieldValues = {
      ...fieldValues,
      [fieldId]: nextValue,
    }

    setFieldValues(nextFieldValues)
    saveEntityFieldValues(entity.id, nextFieldValues)

    const { data, error } = await supabase
      .from('entities')
      .update({ field_values: nextFieldValues })
      .eq('id', entity.id)
      .select('field_values')
      .single()

    if (error || !data) {
      setFieldValues(previousFieldValues)
      saveEntityFieldValues(entity.id, previousFieldValues)
      showToast('Feld konnte nicht gespeichert werden')
      return
    }
  }

  const handleSaveNotes = async (nextContent: string) => {
    const normalizedContent = nextContent.trim()

    const { error } = await supabase
      .from('entities')
      .update({
        content: normalizedContent || null,
      })
      .eq('id', entity.id)

    if (error) {
      showToast('Speichern fehlgeschlagen — Verbindung prüfen')
      return
    }

    updateEntityLocal(entity.id, {
      name: entity.name,
      type: entity.type,
      shortDescription: entity.shortDescription,
      content: normalizedContent,
      tags: entity.tags,
      status: entity.status,
      timelineDate: entity.timelineDate,
    })
  }

  const handleStatusChange = async (newStatus: string) => {
    const { error } = await supabase
      .from('entities')
      .update({ status: newStatus })
      .eq('id', entity.id)

    if (error) {
      console.error('Status update error:', error)
      return
    }

    updateEntityLocal(entity.id, {
      name: entity.name,
      type: entity.type,
      shortDescription: entity.shortDescription,
      content: entity.content,
      tags: entity.tags,
      status: newStatus as any,
    })
  }

  const handleQuickUpdateTags = async (newTags: string[]) => {
    const { error } = await supabase.from('entities').update({ tags: newTags }).eq('id', entity.id)
    if (error) { console.error('Tags update error:', error); return }
    updateEntityLocal(entity.id, {
      name: entity.name, type: entity.type, shortDescription: entity.shortDescription,
      content: entity.content, tags: newTags, status: entity.status,
    })
  }

  return (
    <div>
      <div
        style={{
          position: 'relative',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          marginBottom: 'var(--space-6)',
          minHeight: 320,
          backgroundColor: typeMeta.lightColor,
          backgroundImage: coverImage ? `url(${coverImage})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: coverImage ? `center ${Math.round(coverPosition)}%` : 'center',
          cursor: repositionMode ? (isCoverDragging ? 'grabbing' : 'grab') : (!coverImage ? 'pointer' : 'default'),
          userSelect: repositionMode ? 'none' : undefined,
        }}
        onMouseDown={repositionMode ? onCoverDragStart : undefined}
        onClick={() => {
          if (!coverImage && !repositionMode) {
            coverInputRef.current?.click()
          }
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: coverImage
              ? 'linear-gradient(to bottom, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.55) 100%)'
              : 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.06) 100%)',
          }}
        />

        {!coverImage ? (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              opacity: 0.4,
              pointerEvents: 'none',
            }}
          >
            <ImagePlus size={32} strokeWidth={1.5} color={typeMeta.color} />
            <span
              style={{
                fontSize: 12,
                fontFamily: 'var(--font-ui)',
                fontWeight: 500,
                color: typeMeta.color,
                whiteSpace: 'nowrap',
              }}
            >
              Cover hinzufügen
            </span>
          </div>
        ) : null}

        <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 6, zIndex: 2 }}>
          {repositionMode ? (
            <>
              <div style={{ ...overlayButtonStyle, pointerEvents: 'none', opacity: 0.8, gap: 5 }}>
                <GripVertical size={12} strokeWidth={1.5} />
                Ziehen zum Verschieben
              </div>
              <button
                onClick={async (event) => {
                  event.stopPropagation()
                  const pos = Math.round(coverPosition)
                  const previousPosition = savedCoverPosition
                  saveEntityCoverPosition(entity.id, pos)
                  setSavedCoverPosition(pos)
                  setRepositionMode(false)
                  const { error } = await supabase
                    .from('entities')
                    .update({ cover_position: pos })
                    .eq('id', entity.id)
                    .select('cover_position')
                    .single()
                  if (error) {
                    saveEntityCoverPosition(entity.id, previousPosition)
                    setSavedCoverPosition(previousPosition)
                    showToast('Cover-Position konnte nicht gespeichert werden')
                  }
                }}
                style={{ ...overlayButtonStyle, backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-text)', border: 'none' }}
              >
                ✓ Done
              </button>
            </>
          ) : coverImage ? (
            <>
              <button
                onClick={(event) => {
                  event.stopPropagation()
                  coverInputRef.current?.click()
                }}
                style={overlayButtonStyle}
              >
                <ImagePlus size={12} strokeWidth={1.5} />
                Ändern
              </button>
              <button
                onClick={(event) => {
                  event.stopPropagation()
                  setRepositionMode(true)
                }}
                style={overlayButtonStyle}
              >
                <GripVertical size={12} strokeWidth={1.5} />
                Verschieben
              </button>
              <button
                onClick={async (event) => {
                  event.stopPropagation()
                  setCoverImage(null)
                  setRepositionMode(false)
                  if (!user) return
                  try {
                    await removeEntityCover(user.id, entity.id)
                  } catch (error) {
                    setCoverImage(getEntityCover(entity.id))
                    showToast(error instanceof Error ? error.message : 'Cover konnte nicht entfernt werden')
                  }
                }}
                style={overlayButtonStyle}
              >
                Entfernen
              </button>
            </>
          ) : null}

          {!repositionMode ? <>
          <button
            onClick={(event) => { event.stopPropagation(); setEditOpen(true) }}
            style={overlayButtonStyle}
            title="Bearbeiten"
          >
            <Pencil size={12} strokeWidth={1.5} />
            {!isMobile && 'Edit'}
          </button>
          <button
            onClick={(event) => { event.stopPropagation(); void handleDuplicate() }}
            style={overlayButtonStyle}
            title="Duplizieren"
          >
            <CopyPlus size={12} strokeWidth={1.5} />
            {!isMobile && 'Kopie'}
          </button>
          <button
            onClick={(event) => { event.stopPropagation(); handleExportPDF() }}
            style={overlayButtonStyle}
            title="Als PDF exportieren"
          >
            <FileDown size={12} strokeWidth={1.5} />
            {!isMobile && 'PDF'}
          </button>
          <button
            onClick={(event) => { event.stopPropagation(); void handleStatusChange('archived') }}
            style={overlayButtonStyle}
            title="In Archiv verschieben"
          >
            <Shapes size={12} strokeWidth={1.5} />
          </button>
          <button
            onClick={(event) => { event.stopPropagation(); void handleDelete() }}
            style={{ ...overlayButtonStyle, backgroundColor: 'rgba(220,38,38,0.88)', color: '#fff' }}
            title="Löschen"
          >
            <Trash2 size={12} strokeWidth={1.5} />
            {!isMobile && (isDeleting ? 'Löschen...' : 'Delete')}
          </button>
          </> : null}
        </div>


        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (!file || !user) return
            // Show local preview instantly
            const preview = URL.createObjectURL(file)
            setCoverImage(preview)
            setRepositionMode(true)
            void uploadEntityCover(user.id, entity.id, file)
              .then((url) => {
                if (url) {
                  setCoverImage(url)
                  URL.revokeObjectURL(preview)
                }
              })
              .catch((error) => {
                setCoverImage(getEntityCover(entity.id))
                setRepositionMode(false)
                URL.revokeObjectURL(preview)
                showToast(error instanceof Error ? error.message : 'Cover konnte nicht gespeichert werden')
              })
            event.target.value = ''
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            padding: 'var(--space-8)',
            paddingTop: 120,
          }}
        >
          <div style={{ position: 'relative', display: 'inline-flex', marginBottom: 'var(--space-4)' }}>
            <div
              role="button"
              onClick={() => avatarInputRef.current?.click()}
              style={{
                width: 60,
                height: 60,
                borderRadius: 'var(--radius-lg)',
                backgroundColor: avatarImage ? 'transparent' : typeMeta.color,
                backgroundImage: avatarImage ? `url(${avatarImage})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
                cursor: 'pointer',
                overflow: 'hidden',
              }}
            >
              {avatarImage ? null : (() => { const Icon = getCategoryIcon(entity.type); return <Icon size={24} strokeWidth={1.5} color="var(--color-primary-text)" /> })()}
            </div>

            {avatarImage ? (
              <button
                onClick={async () => {
                  setAvatarImage(null)
                  if (!user) return
                  try {
                    await removeEntityAvatar(user.id, entity.id)
                  } catch (error) {
                    setAvatarImage(getEntityAvatar(entity.id))
                    showToast(error instanceof Error ? error.message : 'Avatar konnte nicht entfernt werden')
                  }
                }}
                style={{
                  position: 'absolute',
                  top: -5,
                  right: -5,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-surface)',
                  border: '1.5px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                  padding: 0,
                }}
              >
                <X size={9} strokeWidth={2.5} color="var(--color-text-secondary)" />
              </button>
            ) : null}

            <button
              onClick={() => avatarInputRef.current?.click()}
              style={{
                position: 'absolute',
                bottom: -5,
                right: -5,
                width: 20,
                height: 20,
                borderRadius: '50%',
                backgroundColor: 'var(--color-surface)',
                border: '1.5px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                padding: 0,
              }}
            >
              <Camera size={10} strokeWidth={1.5} color="var(--color-text-secondary)" />
            </button>

            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (!file || !user) return
                const preview = URL.createObjectURL(file)
                setAvatarImage(preview)
                void uploadEntityAvatar(user.id, entity.id, file)
                  .then((url) => {
                    if (url) {
                      setAvatarImage(url)
                      URL.revokeObjectURL(preview)
                    }
                  })
                  .catch((error) => {
                    setAvatarImage(getEntityAvatar(entity.id))
                    URL.revokeObjectURL(preview)
                    showToast(error instanceof Error ? error.message : 'Avatar konnte nicht gespeichert werden')
                  })
                event.target.value = ''
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <span style={coverImage ? coverBadgeStyle : badgeStyle(typeMeta.color, typeMeta.lightColor)}>{singularLabel}</span>
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 32,
              fontWeight: 700,
              color: coverImage ? '#fff' : 'var(--color-text)',
              letterSpacing: '-0.02em',
              marginBottom: entity.shortDescription ? 'var(--space-3)' : 0,
              textShadow: coverImage ? '0 1px 6px rgba(0,0,0,0.3)' : 'none',
            }}
          >
            {entity.name}
          </h1>

          {entity.shortDescription ? (
            <p
              style={{
                fontSize: 15,
                lineHeight: 1.6,
                maxWidth: '65ch',
                color: coverImage ? 'rgba(255,255,255,0.88)' : 'var(--color-text-secondary)',
                marginBottom: entity.tags.length ? 'var(--space-4)' : 0,
              }}
            >
              {entity.shortDescription}
            </p>
          ) : null}

          {entity.tags.length > 0 ? (
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              {entity.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    padding: '2px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: coverImage ? 'rgba(255,255,255,0.18)' : 'var(--color-accent-light)',
                    color: coverImage ? '#fff' : 'var(--color-accent)',
                    fontSize: 11,
                    fontWeight: 500,
                    fontFamily: 'var(--font-ui)',
                    backdropFilter: coverImage ? 'blur(4px)' : undefined,
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div>
        {deleteError ? (
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
            {deleteError}
          </div>
        ) : null}

        <div style={{ borderBottom: '1px solid var(--color-border)', marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'flex', gap: 0 }}>
            {TABS.map(({ id: tabId, icon: Icon }) => (
              <button
                key={tabId}
                onClick={() => setActiveTab(tabId)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontFamily: 'var(--font-ui)',
                  fontWeight: activeTab === tabId ? 600 : 400,
                  color: activeTab === tabId ? 'var(--color-text)' : 'var(--color-text-secondary)',
                  borderBottom: activeTab === tabId ? '2px solid var(--color-primary)' : '2px solid transparent',
                  marginBottom: -1,
                  transition: 'color 150ms ease',
                }}
              >
                <Icon size={13} strokeWidth={1.5} />
                {tabId}
              </button>
            ))}
            {topFieldTabs.map((field) => {
              const FieldIcon = getCategoryIcon(field.icon ?? categoryFieldDefaultIcons[field.type])
              return (
              <button
                key={field.id}
                onClick={() => setActiveTab(`field:${field.id}`)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontFamily: 'var(--font-ui)',
                  fontWeight: activeTab === `field:${field.id}` ? 600 : 400,
                  color: activeTab === `field:${field.id}` ? 'var(--color-text)' : 'var(--color-text-secondary)',
                  borderBottom: activeTab === `field:${field.id}` ? '2px solid var(--color-primary)' : '2px solid transparent',
                  marginBottom: -1,
                  transition: 'color 150ms ease',
                }}
              >
                <FieldIcon size={13} strokeWidth={1.5} />
                {field.name}
              </button>
              )
            })}
          </div>
        </div>

        {activeTab === 'Overview' ? (
          <OverviewTab
            entity={entity}
            entities={entities}
            libraryItems={libraryItems}
            categoryLabel={categoryLabel}
            categoryFields={categoryFields}
            fieldValues={fieldValues}
            onSaveFieldValue={handleSaveFieldValue}
            onSwitchToNotes={() => setActiveTab('Notes')}
            onStatusChange={(s) => void handleStatusChange(s)}
            onTagsChange={(t) => void handleQuickUpdateTags(t)}
          />
        ) : null}
        {activeTab === 'Notes' ? (
          <NotesTab
            content={entity.content}
            onSave={handleSaveNotes}
            entities={entities.filter((e) => e.universeId === entity.universeId)}
            currentEntityId={entity.id}
          />
        ) : null}
        {activeTab.startsWith('field:') ? (
          <CategoryFieldTab
            field={categoryFields.find((field) => `field:${field.id}` === activeTab) ?? null}
            fieldValue={fieldValues[(categoryFields.find((field) => `field:${field.id}` === activeTab)?.id ?? '')] ?? ''}
            entities={entities.filter((e) => e.universeId === entity.universeId)}
            currentEntityId={entity.id}
            onSave={(nextValue) => {
              const f = categoryFields.find((field) => `field:${field.id}` === activeTab)
              if (f) handleSaveFieldValue(f.id, nextValue)
            }}
          />
        ) : null}
      </div>

      <EntityModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        entity={entity}
        initialCategorySlug={matchingCategory?.kind === 'category' ? matchingCategory.slug : undefined}
      />
    </div>
  )
}

function MiniGraph({ entity, linkedEntities }: {
  entity: ReturnType<typeof useWorldStore.getState>['entities'][number]
  linkedEntities: ReturnType<typeof useWorldStore.getState>['entities']
}) {
  const navigate = useNavigate()
  const W = 240, H = 160
  const cx = W / 2, cy = H / 2
  const radius = 62
  const nodes = linkedEntities.slice(0, 8)
  const centerMeta = entityTypeMeta[entity.type]

  return (
    <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
      {nodes.map((n, i) => {
        const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2
        const nx = cx + radius * Math.cos(angle)
        const ny = cy + radius * Math.sin(angle)
        return <line key={`l-${n.id}`} x1={cx} y1={cy} x2={nx} y2={ny} stroke="var(--color-border-strong)" strokeWidth={1} />
      })}
      {/* Center node */}
      <circle cx={cx} cy={cy} r={14} fill={centerMeta.lightColor} stroke={centerMeta.color} strokeWidth={1.5} style={{ cursor: 'pointer' }} onClick={() => navigate(`/entities/${entity.id}`)} />
      <text x={cx} y={cy + 22} textAnchor="middle" style={{ fontSize: 9, fill: 'var(--color-text)', fontFamily: 'var(--font-ui)', fontWeight: 600 }}>
        {entity.name.slice(0, 10)}{entity.name.length > 10 ? '…' : ''}
      </text>
      {/* Outer nodes */}
      {nodes.map((n, i) => {
        const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2
        const nx = cx + radius * Math.cos(angle)
        const ny = cy + radius * Math.sin(angle)
        const nm = entityTypeMeta[n.type]
        const label = n.name.slice(0, 8) + (n.name.length > 8 ? '…' : '')
        const labelY = ny + (ny > cy ? 18 : -10)
        return (
          <g key={n.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/entities/${n.id}`)}>
            <circle cx={nx} cy={ny} r={9} fill={nm.lightColor} stroke={nm.color} strokeWidth={1.5} />
            <text x={nx} y={labelY} textAnchor="middle" style={{ fontSize: 8, fill: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)' }}>{label}</text>
          </g>
        )
      })}
    </svg>
  )
}

function OverviewTab({
  entity,
  entities,
  libraryItems,
  categoryLabel,
  categoryFields,
  fieldValues,
  onSaveFieldValue,
  onSwitchToNotes,
  onStatusChange,
  onTagsChange,
}: {
  entity: ReturnType<typeof useWorldStore.getState>['entities'][number]
  entities: ReturnType<typeof useWorldStore.getState>['entities']
  libraryItems: ReturnType<typeof useWorldStore.getState>['libraryItems']
  categoryLabel: string
  categoryFields: CategoryField[]
  fieldValues: Record<string, string>
  onSaveFieldValue: (fieldId: string, nextValue: string) => void
  onSwitchToNotes: () => void
  onStatusChange: (newStatus: string) => void
  onTagsChange: (newTags: string[]) => void
}) {
  const user = useWorldStore((state) => state.user)
  const showToast = useWorldStore((state) => state.showToast)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [openFieldId, setOpenFieldId] = useState<string | null>(null)
  const [openSidebarFieldId, setOpenSidebarFieldId] = useState<string | null>(null)
  const [relationsModalOpen, setRelationsModalOpen] = useState(false)
  const [pendingRelationRemoval, setPendingRelationRemoval] = useState<null | { id: string; name: string }>(null)
  const [relationLinks, setRelationLinks] = useState(() => getEntityLinks(entity.id))
  const [statusPickerOpen, setStatusPickerOpen] = useState(false)
  const [tagInputOpen, setTagInputOpen] = useState(false)
  const [tagInputValue, setTagInputValue] = useState('')
  useEffect(() => { setRelationLinks(getEntityLinks(entity.id)) }, [entity.id])

  // Incoming (bidirectional) — entities that linked TO this one, not already in outgoing
  const incomingRelationLinks = useMemo(() => {
    const outgoingIds = new Set(relationLinks.map((r) => r.targetId))
    return getIncomingEntityLinks(entity.id).filter((l) => !outgoingIds.has(l.entityId))
  }, [entity.id, relationLinks])
  const incomingLinkedEntities = useMemo(
    () => incomingRelationLinks.map((l) => entities.find((e) => e.id === l.entityId)).filter((e): e is NonNullable<typeof e> => Boolean(e)),
    [incomingRelationLinks, entities],
  )

  const currentStatus = statusMeta[entity.status]
  const participantSidebarFields = categoryFields.filter((field) => field.type === 'participants')
  const numberSidebarFields = categoryFields.filter((field) => field.type === 'number')
  const mainCategoryFields = categoryFields.filter(
    (field) => field.type !== 'participants' && field.type !== 'number',
  )
  const participantOptions = buildParticipantOptions(entities, entity)
  const linkTypeByTargetId = useMemo<Record<string, string | undefined>>(
    () => Object.fromEntries(relationLinks.map((rl) => [rl.targetId, rl.relationType])),
    [relationLinks],
  )
  const linkedEntities = relationLinks
    .map((relationLink) => entities.find((item) => item.id === relationLink.targetId))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
  const linkedEntitiesByCategory = linkedEntities.reduce<Record<string, typeof linkedEntities>>((groups, linkedEntity) => {
    const resolvedCategory = findCategoryBySlug(libraryItems, getEntityCategorySlug(linkedEntity.id))
      ?? resolveCategoryForEntityType(
        libraryItems,
        linkedEntity.type,
        getEntityCategorySlug(linkedEntity.id),
      )
    const key = resolvedCategory?.kind === 'category' ? resolvedCategory.label : entityTypeMeta[linkedEntity.type].label

    if (!groups[key]) {
      groups[key] = []
    }

    groups[key].push(linkedEntity)
    return groups
  }, {})
  const windowWidth = useWindowWidth()
  const isMobile = windowWidth < 640

  const backlinks = useMemo(() => {
    return entities
      .filter((e) => e.id !== entity.id)
      .filter((e) => {
        const notes = parseNotes(e.content ?? '')
        return notes.some((note) => {
          const segments = parseTextMentions(note.text, entities, e.id)
          return segments.some((s) => s.kind === 'mention' && s.entity.id === entity.id)
        })
      })
  }, [entities, entity.id])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 280px', gap: 'var(--space-6)', alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <Section title="Galerie" icon={ImagePlus}>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setGalleryOpen(true)}
              style={{
                width: 180,
                height: 128,
                borderRadius: 'var(--radius-md)',
                border: '1.5px dashed var(--color-border-strong)',
                backgroundColor: 'var(--color-bg)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <ImagePlus size={18} strokeWidth={1.5} color="var(--color-text-placeholder)" />
              <span style={{ fontSize: 11, color: 'var(--color-text-placeholder)', fontFamily: 'var(--font-ui)' }}>
                Galerie öffnen
              </span>
            </button>
          </div>
        </Section>

        <Section
          title="Notizen"
          icon={BookOpen}
          action={(
            <button
              type="button"
              title="Notizen öffnen"
              onClick={onSwitchToNotes}
              style={sectionIconActionStyle}
            >
              <Plus size={14} strokeWidth={1.5} />
            </button>
          )}
        >
          <QuickNotesList content={entity.content} onOpen={onSwitchToNotes} />
        </Section>

        {mainCategoryFields.map((field) => {
          const FieldIcon = getCategoryIcon(field.icon ?? categoryFieldDefaultIcons[field.type])
          return (
          <Section
            key={field.id}
            title={field.name}
            icon={FieldIcon}
            action={(
              <button
                type="button"
                title={`${field.name} hinzufügen`}
                onClick={() => setOpenFieldId((current) => (current === field.id ? null : field.id))}
                style={sectionIconActionStyle}
              >
                {openFieldId === field.id ? <span style={{ fontSize: 14, lineHeight: 1 }}>×</span> : <Plus size={14} strokeWidth={1.5} />}
              </button>
            )}
          >
            <QuickAddField
              field={field}
              value={fieldValues[field.id] ?? ''}
              onSave={(nextValue) => onSaveFieldValue(field.id, nextValue)}
              isOpen={openFieldId === field.id}
              onOpen={() => setOpenFieldId((current) => (current === field.id ? null : field.id))}
              onClose={() => setOpenFieldId(null)}
              hideToggle
            />
          </Section>
          )
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <Section title="Profil" icon={User}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <MetaItem icon={Hash} label="Kategorie" value={categoryLabel} />
            {entity.timelineDate ? (
              <MetaItem icon={Calendar} label="Timeline-Datum" value={new Date(entity.timelineDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} />
            ) : null}

            {/* Status — inline picker */}
            <div>
              <div style={metaLabelStyle}>Status</div>
              <div style={{ position: 'relative', marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setStatusPickerOpen((v) => !v)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '3px 8px', border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)', backgroundColor: currentStatus.lightColor,
                    color: currentStatus.color, fontSize: 12, fontWeight: 500,
                    fontFamily: 'var(--font-ui)', cursor: 'pointer',
                  }}
                >
                  {currentStatus.label}
                  <ChevronDown size={11} strokeWidth={1.5} />
                </button>
                {statusPickerOpen ? (
                  <div
                    style={{
                      position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 10,
                      backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)',
                      padding: 4, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 120,
                    }}
                  >
                    {(Object.entries(statusMeta) as Array<[string, typeof currentStatus]>)
                      .filter(([key]) => key !== 'archived')
                      .map(([key, meta]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => { onStatusChange(key); setStatusPickerOpen(false) }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '5px 8px', border: 'none', borderRadius: 'var(--radius-sm)',
                            backgroundColor: entity.status === key ? meta.lightColor : 'transparent',
                            color: entity.status === key ? meta.color : 'var(--color-text)',
                            fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-ui)', cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: meta.color, flexShrink: 0 }} />
                          {meta.label}
                        </button>
                      ))}
                  </div>
                ) : null}
              </div>
            </div>

            <MetaItem icon={Calendar} label="Erstellt" value={entity.createdAt} />
            <MetaItem icon={Calendar} label="Geändert" value={entity.updatedAt} />

            {/* Tags — inline editor */}
            <div>
              <div style={metaLabelStyle}>Tags</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                {entity.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      padding: '2px 6px 2px 8px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--color-accent-light)',
                      color: 'var(--color-accent)',
                      fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-ui)',
                    }}
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => onTagsChange(entity.tags.filter((t) => t !== tag))}
                      style={{
                        border: 'none', background: 'transparent', cursor: 'pointer',
                        color: 'var(--color-accent)', padding: 0, lineHeight: 1,
                        display: 'flex', alignItems: 'center',
                      }}
                    >
                      <X size={10} strokeWidth={2} />
                    </button>
                  </span>
                ))}
                {tagInputOpen ? (
                  <input
                    autoFocus
                    value={tagInputValue}
                    onChange={(e) => setTagInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault()
                        const trimmed = tagInputValue.trim().replace(/^#/, '')
                        if (trimmed && !entity.tags.includes(trimmed)) {
                          onTagsChange([...entity.tags, trimmed])
                        }
                        setTagInputValue('')
                        setTagInputOpen(false)
                      }
                      if (e.key === 'Escape') { setTagInputValue(''); setTagInputOpen(false) }
                    }}
                    onBlur={() => {
                      const trimmed = tagInputValue.trim().replace(/^#/, '')
                      if (trimmed && !entity.tags.includes(trimmed)) onTagsChange([...entity.tags, trimmed])
                      setTagInputValue('')
                      setTagInputOpen(false)
                    }}
                    placeholder="Tag…"
                    style={{
                      width: 72, height: 22, padding: '0 6px', fontSize: 11,
                      border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--color-surface)', color: 'var(--color-text)',
                      fontFamily: 'var(--font-ui)', outline: 'none',
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setTagInputOpen(true)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      padding: '2px 6px', border: '1px dashed var(--color-border-strong)',
                      borderRadius: 'var(--radius-sm)', backgroundColor: 'transparent',
                      color: 'var(--color-text-placeholder)', fontSize: 11,
                      fontFamily: 'var(--font-ui)', cursor: 'pointer',
                    }}
                  >
                    <Plus size={10} strokeWidth={2} />
                    Tag
                  </button>
                )}
              </div>
            </div>
          </div>
        </Section>

        {participantSidebarFields.length > 0 ? (
          <Section
            title="Teilnehmer"
            icon={getCategoryIcon(participantSidebarFields[0]?.icon ?? categoryFieldDefaultIcons.participants)}
            action={participantSidebarFields[0] ? (
              <button
                type="button"
                title={`${participantSidebarFields[0].name} hinzufügen`}
                onClick={() => setOpenSidebarFieldId((current) => (current === participantSidebarFields[0].id ? null : participantSidebarFields[0].id))}
                style={sectionIconActionStyle}
              >
                {openSidebarFieldId === participantSidebarFields[0].id ? <span style={{ fontSize: 14, lineHeight: 1 }}>×</span> : <Plus size={14} strokeWidth={1.5} />}
              </button>
            ) : null}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {participantSidebarFields.map((field) => (
                <div
                  key={field.id}
                  style={{
                    padding: 0,
                  }}
                >
                  <QuickAddField
                    field={field}
                    value={fieldValues[field.id] ?? ''}
                    onSave={(nextValue) => onSaveFieldValue(field.id, nextValue)}
                    isOpen={openSidebarFieldId === field.id}
                    onOpen={() => setOpenSidebarFieldId((current) => (current === field.id ? null : field.id))}
                    onClose={() => setOpenSidebarFieldId(null)}
                    participantOptions={participantOptions}
                    hideToggle
                    compact
                  />
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        {numberSidebarFields.length > 0 ? (
          <Section
            title="Zahl"
            icon={getCategoryIcon(numberSidebarFields[0]?.icon ?? categoryFieldDefaultIcons.number)}
            action={numberSidebarFields[0] ? (
              <button
                type="button"
                title={`${numberSidebarFields[0].name} hinzufügen`}
                onClick={() => setOpenSidebarFieldId((current) => (current === numberSidebarFields[0].id ? null : numberSidebarFields[0].id))}
                style={sectionIconActionStyle}
              >
                {openSidebarFieldId === numberSidebarFields[0].id ? <span style={{ fontSize: 14, lineHeight: 1 }}>×</span> : <Plus size={14} strokeWidth={1.5} />}
              </button>
            ) : null}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {numberSidebarFields.map((field) => (
                <div
                  key={field.id}
                  style={{
                    padding: 0,
                  }}
                >
                  <QuickAddField
                    field={field}
                    value={fieldValues[field.id] ?? ''}
                    onSave={(nextValue) => onSaveFieldValue(field.id, nextValue)}
                    isOpen={openSidebarFieldId === field.id}
                    onOpen={() => setOpenSidebarFieldId((current) => (current === field.id ? null : field.id))}
                    onClose={() => setOpenSidebarFieldId(null)}
                    hideToggle
                    compact
                  />
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        <Section title="Erwähnt in" icon={Quote}>
          {backlinks.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {backlinks.map((bl) => {
                const blMeta = entityTypeMeta[bl.type]
                const blIcon = getCategoryIcon(bl.type)
                const BlIcon = blIcon
                return (
                  <Link
                    key={bl.id}
                    to={`/entities/${bl.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-2)',
                      padding: 'var(--space-2) var(--space-3)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--color-surface)',
                      textDecoration: 'none',
                      transition: 'border-color 150ms ease',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border-strong)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)' }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: blMeta.lightColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <BlIcon size={13} strokeWidth={1.5} color={blMeta.color} />
                    </div>
                    <span style={{ flex: 1, fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {bl.name}
                    </span>
                  </Link>
                )
              })}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--color-text-placeholder)', fontFamily: 'var(--font-ui)', fontStyle: 'italic' }}>
              Keine Erwähnungen in anderen Notizen.
            </p>
          )}
        </Section>

        {linkedEntities.length > 0 ? (
          <Section title="Mini-Graph" icon={Shapes}>
            <MiniGraph entity={entity} linkedEntities={linkedEntities} />
          </Section>
        ) : null}

        <Section title="Anhänge" icon={Paperclip}>
          <p style={{ fontSize: 13, color: 'var(--color-text-placeholder)', fontFamily: 'var(--font-ui)', fontStyle: 'italic' }}>
            Keine Anhänge verfügbar.
          </p>
        </Section>

        <Section title="Verknüpfungen" icon={Link2}>
          {linkedEntities.length > 0 || incomingLinkedEntities.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
              {/* Outgoing links */}
              {linkedEntities.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {Object.entries(linkedEntitiesByCategory).map(([groupLabel, groupEntities]) => (
                    <div key={groupLabel} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        {groupLabel}
                      </div>
                      {groupEntities.map((linkedEntity) => (
                        <div key={linkedEntity.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface)' }}>
                          <div style={{ width: 24, height: 24, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Shapes size={14} strokeWidth={1.5} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Link to={`/entities/${linkedEntity.id}`} style={{ display: 'block', color: 'var(--color-text)', textDecoration: 'none', fontSize: 13, fontFamily: 'var(--font-ui)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {linkedEntity.name}
                            </Link>
                            {linkTypeByTargetId[linkedEntity.id] ? (
                              <span style={{ display: 'inline-block', marginTop: 2, fontSize: 10, fontWeight: 500, fontFamily: 'var(--font-ui)', padding: '1px 6px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                                {linkTypeByTargetId[linkedEntity.id]}
                              </span>
                            ) : null}
                          </div>
                          <button type="button" onClick={() => setPendingRelationRemoval({ id: linkedEntity.id, name: linkedEntity.name })} style={compactFieldActionStyle}>
                            <X size={14} strokeWidth={1.5} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* Incoming (bidirectional) links */}
              {incomingLinkedEntities.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ArrowLeft size={10} strokeWidth={2} />
                    Verknüpft von
                  </div>
                  {incomingLinkedEntities.map((linkedEntity) => {
                    const incomingLink = incomingRelationLinks.find((l) => l.entityId === linkedEntity.id)
                    return (
                      <div key={linkedEntity.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)' }}>
                        <div style={{ width: 24, height: 24, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-border)', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Shapes size={14} strokeWidth={1.5} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Link to={`/entities/${linkedEntity.id}`} style={{ display: 'block', color: 'var(--color-text)', textDecoration: 'none', fontSize: 13, fontFamily: 'var(--font-ui)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {linkedEntity.name}
                          </Link>
                          {incomingLink?.relationType ? (
                            <span style={{ display: 'inline-block', marginTop: 2, fontSize: 10, fontWeight: 500, fontFamily: 'var(--font-ui)', padding: '1px 6px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                              {incomingLink.relationType}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--color-text-placeholder)', fontFamily: 'var(--font-ui)', fontStyle: 'italic', marginBottom: 'var(--space-3)' }}>
              Keine anderen Elemente verknüpft.
            </p>
          )}
          <button
            type="button"
            onClick={() => setRelationsModalOpen(true)}
            style={{
              width: '100%',
              padding: 'var(--space-2) 0',
              border: '1.5px dashed var(--color-border-strong)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'transparent',
              color: 'var(--color-primary)',
              fontSize: 12,
              fontWeight: 500,
              fontFamily: 'var(--font-ui)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Link2 size={13} strokeWidth={1.5} />
            Link hinzufügen
          </button>
        </Section>

        {relationsModalOpen ? (
          <RelationsPickerModal
            entity={entity}
            entities={entities}
            libraryItems={libraryItems}
            linkedTargetIds={relationLinks.map((item) => item.targetId)}
            onClose={() => setRelationsModalOpen(false)}
            onLink={async (targetId, relationType) => {
              addEntityLink(entity.id, targetId, relationType)
              setRelationLinks(getEntityLinks(entity.id))
              if (user) {
                const { error } = await supabase
                  .from('entity_links')
                  .upsert(
                    { user_id: user.id, universe_id: entity.universeId, entity_id: entity.id, target_id: targetId, relation_type: relationType ?? 'related' },
                    { onConflict: 'user_id,entity_id,target_id' },
                  )
                  .select('entity_id, target_id')
                  .single()

                if (error) {
                  removeEntityLink(entity.id, targetId)
                  setRelationLinks(getEntityLinks(entity.id))
                  showToast('Verknüpfung konnte nicht gespeichert werden')
                }
              }
            }}
          />
        ) : null}

        {pendingRelationRemoval ? (
          <ConfirmActionModal
            title="Verknüpfung entfernen"
            description={`Die Verknüpfung zu ${pendingRelationRemoval.name} wird entfernt.`}
            confirmLabel="Entfernen"
            tone="danger"
            onClose={() => setPendingRelationRemoval(null)}
            onConfirm={async () => {
              removeEntityLink(entity.id, pendingRelationRemoval.id)
              setRelationLinks(getEntityLinks(entity.id))
              const removedLink = pendingRelationRemoval
              setPendingRelationRemoval(null)
              if (!user) {
                return
              }

              const { error } = await supabase
                .from('entity_links')
                .delete()
                .eq('user_id', user.id)
                .eq('entity_id', entity.id)
                .eq('target_id', removedLink.id)
                .select('entity_id, target_id')
                .maybeSingle()

              if (error) {
                addEntityLink(entity.id, removedLink.id)
                setRelationLinks(getEntityLinks(entity.id))
                showToast('Verknüpfung konnte nicht entfernt werden')
              }
            }}
          />
        ) : null}

        {galleryOpen ? (
          <GalleryModal entity={entity} onClose={() => setGalleryOpen(false)} />
        ) : null}
      </div>
    </div>
  )
}

function QuickNotesList({ content, onOpen }: { content: string | null | undefined; onOpen: () => void }) {
  const all = parseNotes(content)
  const filled = all.filter((n) => n.title?.trim() || n.text?.trim())

  if (filled.length === 0) {
    return (
      <button
        type="button"
        onClick={onOpen}
        style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          color: 'var(--color-text-placeholder)', fontSize: 13,
          fontFamily: 'var(--font-ui)', fontStyle: 'italic',
        }}
      >
        Keine Notizen — klicken zum Erstellen
      </button>
    )
  }

  const visible = filled.slice(0, 3)
  const rest = filled.length - visible.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {visible.map((note, i) => (
        <button
          key={note.id}
          type="button"
          onClick={onOpen}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
            gap: 4, background: 'none', border: 'none', padding: 0,
            cursor: 'pointer', textAlign: 'left', width: '100%',
            paddingTop: i > 0 ? 'var(--space-4)' : 0,
            borderTop: i > 0 ? '1px solid var(--color-border)' : 'none',
          }}
        >
          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
            <span style={{ fontSize: 13, flexShrink: 0 }}>{note.icon}</span>
            <span style={{
              fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-ui)',
              color: note.title ? 'var(--color-text)' : 'var(--color-text-placeholder)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {note.title || 'Ohne Titel'}
            </span>
          </div>
          {/* Body preview — Instrument Serif for that document feel */}
          {note.text.trim() && (
            <p style={{
              margin: 0,
              fontSize: 13,
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.6,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              paddingLeft: 19,
            }}>
              {note.text.replace(/\n+/g, ' ')}
            </p>
          )}
        </button>
      ))}
      {rest > 0 && (
        <button
          type="button"
          onClick={onOpen}
          style={{
            background: 'none', border: 'none', padding: 0,
            cursor: 'pointer', fontSize: 12, fontWeight: 500,
            color: 'var(--color-text-placeholder)', fontFamily: 'var(--font-ui)',
            textAlign: 'left',
          }}
        >
          +{rest} weitere
        </button>
      )}
    </div>
  )
}

function GalleryModal({
  entity,
  onClose,
}: {
  entity: ReturnType<typeof useWorldStore.getState>['entities'][number]
  onClose: () => void
}) {
  const user = useWorldStore((state) => state.user)
  const showToast = useWorldStore((state) => state.showToast)
  const [preview, setPreview] = useState<string | null>(() => getEntityCover(entity.id))
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(28,25,23,0.32)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6)',
        zIndex: 130,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 840,
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          backgroundColor: 'var(--color-surface)',
          boxShadow: 'var(--shadow-xl)',
          padding: 'var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-ui)' }}>
              Galerie
            </div>
            <div style={{ marginTop: 'var(--space-1)', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              Cover und Bildmaterial direkt an diesem Ort verwalten.
            </div>
          </div>
          <button type="button" onClick={onClose} style={compactFieldActionStyle}>
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>

        <div
          style={{
            minHeight: 320,
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            backgroundColor: 'var(--color-bg)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {preview ? (
            <img
              src={preview}
              alt={`${entity.name} cover`}
              style={{ width: '100%', height: 320, objectFit: 'cover' }}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)', color: 'var(--color-text-placeholder)' }}>
              <ImagePlus size={24} strokeWidth={1.5} />
              <span style={{ fontSize: 13, fontFamily: 'var(--font-ui)' }}>Noch kein Bild ausgewählt</span>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (!file || !user) return
            const localUrl = URL.createObjectURL(file)
            setPreview(localUrl)
            void uploadEntityCover(user.id, entity.id, file)
              .then((url) => {
                if (url) {
                  setPreview(url)
                  URL.revokeObjectURL(localUrl)
                }
              })
              .catch((error) => {
                setPreview(getEntityCover(entity.id))
                URL.revokeObjectURL(localUrl)
                showToast(error instanceof Error ? error.message : 'Cover konnte nicht gespeichert werden')
              })
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
          <button
            type="button"
            onClick={async () => {
              setPreview(null)
              if (!user) return
              try {
                await removeEntityCover(user.id, entity.id)
              } catch (error) {
                setPreview(getEntityCover(entity.id))
                showToast(error instanceof Error ? error.message : 'Cover konnte nicht entfernt werden')
              }
            }}
            style={quickAddSecondaryButtonStyle}
          >
            Entfernen
          </button>

          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button type="button" onClick={onClose} style={quickAddSecondaryButtonStyle}>
              Schließen
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} style={quickAddPrimaryButtonStyle}>
              {preview ? 'Bild ersetzen' : 'Bild hochladen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ConfirmActionModal({
  title,
  description,
  confirmLabel,
  tone = 'default',
  onClose,
  onConfirm,
}: {
  title: string
  description: string
  confirmLabel: string
  tone?: 'default' | 'danger'
  onClose: () => void
  onConfirm: () => void
}) {
  const isDanger = tone === 'danger'

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(28,25,23,0.32)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6)',
        zIndex: 140,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 420,
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          backgroundColor: 'var(--color-surface)',
          boxShadow: 'var(--shadow-xl)',
          padding: 'var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-ui)' }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          {description}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <button type="button" onClick={onClose} style={quickAddSecondaryButtonStyle}>
            Abbrechen
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              ...quickAddPrimaryButtonStyle,
              backgroundColor: isDanger ? 'var(--color-error)' : 'var(--color-primary)',
              color: 'var(--color-primary-text)',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function QuickAddField({
  field,
  value,
  onSave,
  isOpen,
  onOpen,
  onClose,
  participantOptions = [],
  hideToggle = false,
  compact = false,
}: {
  field: CategoryField
  value: string
  onSave: (nextValue: string) => void
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  participantOptions?: Array<{ id: string; label: string; encodedValue: string }>
  hideToggle?: boolean
  compact?: boolean
}) {
  const [draft, setDraft] = useState('')
  const usesRichModal = !compact && (field.type === 'tasks' || field.type === 'sections' || field.type === 'textarea')

  const handleSave = () => {
    const trimmedDraft = draft.trim()

    if (!trimmedDraft) {
      return
    }

    const shouldAppend = field.type === 'tasks' || field.type === 'sections' || field.type === 'text' || field.type === 'textarea' || field.type === 'participants'
    const nextValue = value.trim() && shouldAppend ? `${value.trim()}\n${trimmedDraft}` : trimmedDraft

    onSave(nextValue)
    setDraft('')
    onClose()
  }

  return (
    <>
      {!hideToggle ? (
        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', marginBottom: 'var(--space-3)' }}>
          <button
            type="button"
            title={`${field.name} hinzufügen`}
            onClick={onOpen}
            style={compact ? compactFieldActionStyle : sectionIconActionStyle}
          >
            {isOpen ? <span style={{ fontSize: 14, lineHeight: 1 }}>×</span> : <Plus size={14} strokeWidth={1.5} />}
          </button>
        </div>
      ) : null}

      {isOpen && !usesRichModal ? (
        <div style={quickAddPanelStyle}>
          {field.type === 'participants' ? null : field.type === 'textarea' ? (
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={`${field.name} eingeben...`}
              rows={4}
              style={quickAddTextareaStyle}
            />
          ) : field.type === 'number' ? (
            <input
              value={draft}
              inputMode="numeric"
              onChange={(event) => setDraft(event.target.value.replace(/[^0-9.,-]/g, ''))}
              placeholder={`${field.name} eingeben...`}
              style={quickAddInputStyle}
            />
          ) : (
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={`${field.name} eingeben...`}
              style={quickAddInputStyle}
            />
          )}
          {field.type !== 'participants' ? (
            <QuickAddActions
              onCancel={() => {
                onClose()
                setDraft('')
              }}
              onSave={handleSave}
              saveLabel="Hinzufügen"
            />
          ) : null}
        </div>
      ) : null}

      {field.type === 'participants' && isOpen ? (
        <ParticipantPicker
          fieldLabel={field.name}
          value={value}
          options={participantOptions}
          onSave={onSave}
          onClose={onClose}
        />
      ) : null}

      {field.type === 'number' && compact && isOpen ? (
        <NumberFieldModal
          field={field}
          value={value}
          draft={draft}
          onChange={setDraft}
          onSave={(nextValue) => {
            onSave(nextValue)
            setDraft('')
            onClose()
          }}
          onClose={() => {
            setDraft('')
            onClose()
          }}
        />
      ) : null}

      {usesRichModal && isOpen ? (
        <FieldEditorModal
          field={field}
          value={value}
          onSave={(nextValue) => {
            onSave(nextValue)
            onClose()
          }}
          onClose={onClose}
        />
      ) : null}

      <FieldValuePreview fieldType={field.type} value={value} />
    </>
  )
}

function FieldEditorModal({
  field,
  value,
  onSave,
  onClose,
}: {
  field: CategoryField
  value: string
  onSave: (nextValue: string) => void
  onClose: () => void
}) {
  const isListField = field.type === 'tasks' || field.type === 'sections'
  const [singleValueDraft, setSingleValueDraft] = useState(value)
  const [items, setItems] = useState(
    isListField
      ? value
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean)
      : [],
  )
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const saveList = (nextItems: string[]) => {
    const cleaned = nextItems.map((item) => item.trim()).filter(Boolean)
    setItems(cleaned)
    onSave(cleaned.join('\n'))
  }

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) {
      return
    }

    const nextItems = [...items]
    const [movedItem] = nextItems.splice(fromIndex, 1)
    nextItems.splice(toIndex, 0, movedItem)
    saveList(nextItems)

    if (activeIndex === fromIndex) {
      setActiveIndex(toIndex)
    } else if (activeIndex !== null) {
      if (fromIndex < activeIndex && toIndex >= activeIndex) {
        setActiveIndex(activeIndex - 1)
      } else if (fromIndex > activeIndex && toIndex <= activeIndex) {
        setActiveIndex(activeIndex + 1)
      }
    }
  }

  if (!isListField) {
    return (
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(28,25,23,0.32)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-6)',
          zIndex: 130,
        }}
      >
        <div
          onClick={(event) => event.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 720,
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            backgroundColor: 'var(--color-surface)',
            boxShadow: 'var(--shadow-xl)',
            padding: 'var(--space-6)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-ui)' }}>
                {field.name}
              </div>
              <div style={{ marginTop: 'var(--space-1)', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                Inhalt direkt und ohne Umwege bearbeiten.
              </div>
            </div>
            <button type="button" onClick={onClose} style={compactFieldActionStyle}>
              <X size={14} strokeWidth={1.5} />
            </button>
          </div>

          <textarea
            autoFocus
            value={singleValueDraft}
            rows={12}
            onChange={(event) => setSingleValueDraft(event.target.value)}
            placeholder={`${field.name} eingeben...`}
            style={{
              ...quickAddTextareaStyle,
              minHeight: 280,
              resize: 'vertical',
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <button type="button" onClick={onClose} style={quickAddSecondaryButtonStyle}>
              Abbrechen
            </button>
            <button
              type="button"
              onClick={() => onSave(singleValueDraft.trim())}
              style={quickAddPrimaryButtonStyle}
            >
              Speichern
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(28,25,23,0.32)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6)',
        zIndex: 130,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 760,
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          backgroundColor: 'var(--color-surface)',
          boxShadow: 'var(--shadow-xl)',
          padding: 'var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-ui)' }}>
              {field.name}
            </div>
            <div style={{ marginTop: 'var(--space-1)', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              Einträge hinzufügen, bearbeiten oder direkt wieder entfernen.
            </div>
          </div>
          <button type="button" onClick={onClose} style={compactFieldActionStyle}>
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.05fr)', gap: 'var(--space-5)' }}>
          <div
            className="worldify-thin-scrollbar"
            style={{
              maxHeight: 420,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
              paddingRight: 'var(--space-1)',
            }}
          >
            {items.length ? (
              items.map((item, index) => (
                <div
                  key={`${field.id}-${index}`}
                  draggable
                  onClick={() => {
                    setActiveIndex(index)
                    setDraft(item)
                  }}
                  onDragStart={() => {
                    setDragIndex(index)
                    setDragOverIndex(index)
                  }}
                  onDragOver={(event) => {
                    event.preventDefault()
                    if (dragOverIndex !== index) {
                      setDragOverIndex(index)
                    }
                  }}
                  onDragEnd={() => {
                    setDragIndex(null)
                    setDragOverIndex(null)
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    if (dragIndex === null) {
                      return
                    }

                    moveItem(dragIndex, index)
                    setDragIndex(null)
                    setDragOverIndex(null)
                  }}
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: activeIndex === index ? 'var(--color-primary-light)' : 'var(--color-surface)',
                    padding: 'var(--space-4)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 'var(--space-3)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    opacity: dragIndex === index ? 0.72 : 1,
                    boxShadow: dragOverIndex === index && dragIndex !== index ? 'var(--shadow-md)' : 'none',
                    transform: dragOverIndex === index && dragIndex !== index ? 'translateY(-2px)' : 'translateY(0)',
                    transition: 'transform 140ms ease, box-shadow 140ms ease, opacity 140ms ease',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
                      {field.type === 'tasks' ? `Aufgabe ${index + 1}` : `Abschnitt ${index + 1}`}
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--color-text)', lineHeight: 1.5, overflowWrap: 'anywhere' }}>
                      {item}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      const nextItems = items.filter((_, currentIndex) => currentIndex !== index)
                      if (activeIndex === index) {
                        setActiveIndex(null)
                        setDraft('')
                      }
                      saveList(nextItems)
                    }}
                    style={compactFieldActionStyle}
                  >
                    <Trash2 size={14} strokeWidth={1.5} />
                  </button>
                </div>
              ))
            ) : (
              <div
                style={{
                  border: '1px dashed var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-5)',
                  fontSize: 13,
                  color: 'var(--color-text-secondary)',
                  textAlign: 'center',
                }}
              >
                Noch keine Einträge vorhanden.
              </div>
            )}
          </div>

          <div
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--color-bg)',
              padding: 'var(--space-5)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-4)',
            }}
          >
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>
                {activeIndex === null ? 'Neuen Eintrag erstellen' : 'Eintrag bearbeiten'}
              </div>
              <div style={{ marginTop: 'var(--space-1)', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                {field.type === 'tasks' ? 'Kurze Aufgabe oder To-do eintragen.' : 'Abschnitt mit freiem Inhalt pflegen.'}
              </div>
            </div>

            <textarea
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={`${field.name} eingeben...`}
              rows={field.type === 'sections' ? 8 : 5}
              style={{
                ...quickAddTextareaStyle,
                minHeight: field.type === 'sections' ? 220 : 140,
                resize: 'vertical',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
              <button
                type="button"
                onClick={() => {
                  setActiveIndex(null)
                  setDraft('')
                }}
                style={quickAddSecondaryButtonStyle}
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextDraft = draft.trim()
                  if (!nextDraft) {
                    return
                  }

                  if (activeIndex === null) {
                    saveList([...items, nextDraft])
                  } else {
                    const nextItems = [...items]
                    nextItems[activeIndex] = nextDraft
                    saveList(nextItems)
                  }

                  setActiveIndex(null)
                  setDraft('')
                }}
                style={quickAddPrimaryButtonStyle}
              >
                {activeIndex === null ? 'Eintrag hinzufügen' : 'Änderungen speichern'}
              </button>
            </div>

            {items.length > 1 ? (
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                <div
                  style={{
                    width: '100%',
                    fontSize: 12,
                    color: 'var(--color-text-secondary)',
                    marginBottom: 'var(--space-1)',
                  }}
                >
                  Einträge können jetzt auch direkt per Drag & Drop verschoben werden.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (activeIndex === null || activeIndex === 0) {
                      return
                    }

                    const nextItems = [...items]
                    const swapValue = nextItems[activeIndex - 1]
                    nextItems[activeIndex - 1] = nextItems[activeIndex]
                    nextItems[activeIndex] = swapValue
                    saveList(nextItems)
                    setActiveIndex(activeIndex - 1)
                  }}
                  disabled={activeIndex === null || activeIndex === 0}
                  style={{
                    ...quickAddSecondaryButtonStyle,
                    opacity: activeIndex === null || activeIndex === 0 ? 0.5 : 1,
                    cursor: activeIndex === null || activeIndex === 0 ? 'default' : 'pointer',
                  }}
                >
                  Nach oben
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (activeIndex === null || activeIndex === items.length - 1) {
                      return
                    }

                    const nextItems = [...items]
                    const swapValue = nextItems[activeIndex + 1]
                    nextItems[activeIndex + 1] = nextItems[activeIndex]
                    nextItems[activeIndex] = swapValue
                    saveList(nextItems)
                    setActiveIndex(activeIndex + 1)
                  }}
                  disabled={activeIndex === null || activeIndex === items.length - 1}
                  style={{
                    ...quickAddSecondaryButtonStyle,
                    opacity: activeIndex === null || activeIndex === items.length - 1 ? 0.5 : 1,
                    cursor: activeIndex === null || activeIndex === items.length - 1 ? 'default' : 'pointer',
                  }}
                >
                  Nach unten
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <button type="button" onClick={onClose} style={quickAddSecondaryButtonStyle}>
            Fertig
          </button>
        </div>
      </div>
    </div>
  )
}

function ParticipantPicker({
  fieldLabel,
  value,
  options,
  onSave,
  onClose,
}: {
  fieldLabel: string
  value: string
  options: Array<{ id: string; label: string; encodedValue: string }>
  onSave: (nextValue: string) => void
  onClose: () => void
}) {
  const availableOptions = options.filter((option) => !hasEntityReference(value, option.id))
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedValues, setSelectedValues] = useState<string[]>([])
  const filteredOptions = availableOptions.filter((option) =>
    option.label.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  )

  const handleAdd = () => {
    if (!selectedValues.length) {
      return
    }

    const nextItems = value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)

    nextItems.push(...selectedValues)
    onSave(nextItems.join('\n'))
    setSelectedValues([])
    onClose()
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(28,25,23,0.32)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6)',
        zIndex: 120,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 420,
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          backgroundColor: 'var(--color-surface)',
          boxShadow: 'var(--shadow-xl)',
          padding: 'var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
          <div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: 'var(--color-text)',
                fontFamily: 'var(--font-ui)',
              }}
            >
              {fieldLabel} hinzufügen
            </div>
            <div
              style={{
                marginTop: 'var(--space-1)',
                fontSize: 13,
                color: 'var(--color-text-secondary)',
                lineHeight: 1.5,
              }}
            >
              Bestehende Einträge direkt auswählen und gesammelt verknüpfen.
            </div>
          </div>
          <button type="button" onClick={onClose} style={compactFieldActionStyle}>
            <span style={{ fontSize: 14, lineHeight: 1 }}>×</span>
          </button>
        </div>

        {availableOptions.length > 0 ? (
          <>
            <div
              style={{
                ...quickAddInputStyle,
                minHeight: 40,
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
              }}
            >
              <Search size={16} strokeWidth={1.5} color="var(--color-text-secondary)" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={`${fieldLabel} suchen...`}
                style={{
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text)',
                  fontSize: 15,
                  fontFamily: 'var(--font-ui)',
                }}
              />
            </div>

            <div
              className="worldify-thin-scrollbar"
              style={{
                maxHeight: 280,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
                paddingRight: 'var(--space-1)',
              }}
            >
              {filteredOptions.length > 0 ? filteredOptions.map((option) => {
                const isSelected = selectedValues.includes(option.encodedValue)

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      setSelectedValues((current) =>
                        isSelected
                          ? current.filter((item) => item !== option.encodedValue)
                          : [...current, option.encodedValue],
                      )
                    }
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-lg)',
                      backgroundColor: isSelected ? 'var(--color-primary-light)' : 'var(--color-surface)',
                      padding: 'var(--space-4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 'var(--space-3)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: 'var(--color-primary-light)',
                          color: 'var(--color-primary)',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: 12,
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        {option.label.slice(0, 1).toUpperCase()}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{option.label}</div>
                    </div>
                    <span
                      style={{
                        borderRadius: 'var(--radius-pill)',
                        backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--color-bg)',
                        color: isSelected ? 'var(--color-primary-text)' : 'var(--color-text-secondary)',
                        padding: '6px 10px',
                        fontSize: 12,
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      {isSelected ? 'Ausgewählt' : 'Wählen'}
                    </span>
                  </button>
                )
              }) : (
                <div style={emptyFieldValueStyle}>Keine Treffer für deine Suche.</div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <button type="button" onClick={onClose} style={quickAddSecondaryButtonStyle}>
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={!selectedValues.length}
                style={{
                  ...quickAddPrimaryButtonStyle,
                  height: 36,
                  opacity: selectedValues.length ? 1 : 0.5,
                  cursor: selectedValues.length ? 'pointer' : 'default',
                }}
              >
                Hinzufügen
              </button>
            </div>
          </>
        ) : (
          <div style={emptyFieldValueStyle}>Keine weiteren Characters verfügbar.</div>
        )}
      </div>
    </div>
  )
}

const RELATION_TYPES = ['Verbündeter', 'Feind', 'Familie', 'Mentor', 'Rivale', 'Partner', 'Untergebener', 'Neutral']

function RelationsPickerModal({
  entity,
  entities,
  libraryItems,
  linkedTargetIds,
  onClose,
  onLink,
}: {
  entity: ReturnType<typeof useWorldStore.getState>['entities'][number]
  entities: ReturnType<typeof useWorldStore.getState>['entities']
  libraryItems: ReturnType<typeof useWorldStore.getState>['libraryItems']
  linkedTargetIds: string[]
  onClose: () => void
  onLink: (targetId: string, relationType?: string) => void
}) {
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<'all' | string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [relationType, setRelationType] = useState<string | undefined>(undefined)
  const categories = libraryItems.filter((item) => item.kind === 'category')

  const availableEntities = entities.filter((item) => {
    const itemCategory = findCategoryBySlug(libraryItems, getEntityCategorySlug(item.id))
      ?? resolveCategoryForEntityType(
        libraryItems,
        item.type,
        getEntityCategorySlug(item.id),
      )
    const sameUniverse = item.universeId === entity.universeId
    const notSelf = item.id !== entity.id
    const notLinkedYet = !linkedTargetIds.includes(item.id)
    const matchesCategory = selectedCategorySlug === 'all'
      ? true
      : itemCategory?.kind === 'category' && itemCategory.slug === selectedCategorySlug
    const matchesSearch = searchQuery.trim()
      ? `${item.name} ${item.shortDescription} ${itemCategory?.label ?? entityTypeMeta[item.type].label}`.toLowerCase().includes(searchQuery.trim().toLowerCase())
      : true

    return sameUniverse && notSelf && notLinkedYet && matchesCategory && matchesSearch
  })

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(28,25,23,0.32)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6)',
        zIndex: 130,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 520,
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          backgroundColor: 'var(--color-surface)',
          boxShadow: 'var(--shadow-xl)',
          padding: 'var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-ui)' }}>
              Verknüpfung erstellen
            </div>
            <div style={{ marginTop: 'var(--space-1)', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              Kategorie wählen und mehrere Verknüpfungen direkt hintereinander anlegen.
            </div>
          </div>
          <button type="button" onClick={onClose} style={compactFieldActionStyle}>
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>

        {/* Relation type chips */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Beziehungstyp
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {RELATION_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setRelationType((prev) => prev === type ? undefined : type)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: relationType === type ? 'none' : '1px solid var(--color-border)',
                  backgroundColor: relationType === type ? 'var(--color-primary)' : 'var(--color-bg)',
                  color: relationType === type ? '#fff' : 'var(--color-text-secondary)',
                  fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-ui)',
                  cursor: 'pointer', transition: 'all 120ms ease',
                }}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <select value={selectedCategorySlug} onChange={(event) => setSelectedCategorySlug(event.target.value)} style={quickAddInputStyle}>
          <option value="all">Alle Kategorien</option>
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.label}
            </option>
          ))}
        </select>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--color-surface)',
            paddingInline: 'var(--space-4)',
            minHeight: 44,
          }}
        >
          <Search size={16} strokeWidth={1.5} color="var(--color-text-secondary)" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Entity suchen..."
            style={{
              border: 'none',
              outline: 'none',
              width: '100%',
              backgroundColor: 'transparent',
              color: 'var(--color-text)',
              fontSize: 15,
              fontFamily: 'var(--font-ui)',
            }}
          />
        </div>

        <div
          className="worldify-thin-scrollbar"
          style={{
            maxHeight: 320,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
            paddingRight: 'var(--space-1)',
          }}
        >
          {availableEntities.length ? (
            availableEntities.map((availableEntity) => {
              const resolvedCategory = findCategoryBySlug(libraryItems, getEntityCategorySlug(availableEntity.id))
                ?? resolveCategoryForEntityType(
                  libraryItems,
                  availableEntity.type,
                  getEntityCategorySlug(availableEntity.id),
                )
              const meta = entityTypeMeta[availableEntity.type]
              const Icon = resolvedCategory?.kind === 'category'
                ? getCategoryIcon(resolvedCategory.icon)
                : Hash

              return (
                <button
                  key={availableEntity.id}
                  type="button"
                  onClick={() =>
                    setSelectedIds((current) =>
                      current.includes(availableEntity.id)
                        ? current.filter((id) => id !== availableEntity.id)
                        : [...current, availableEntity.id],
                    )
                  }
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: selectedIds.includes(availableEntity.id) ? 'var(--color-primary-light)' : 'var(--color-surface)',
                    padding: 'var(--space-4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'var(--space-3)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        backgroundColor: meta.lightColor,
                        color: meta.color,
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                        fontSize: 15,
                      }}
                    >
                      <Icon size={15} strokeWidth={1.5} color={resolvedCategory?.kind === 'category' ? meta.color : 'var(--color-text-secondary)'} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: 'var(--color-text)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {availableEntity.name}
                      </div>
                      <div
                        style={{
                          marginTop: 'var(--space-1)',
                          fontSize: 12,
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        {resolvedCategory?.kind === 'category' ? resolvedCategory.label : meta.label}
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: selectedIds.includes(availableEntity.id) ? 'var(--color-primary)' : 'var(--color-primary-light)',
                      color: selectedIds.includes(availableEntity.id) ? 'var(--color-primary-text)' : 'var(--color-primary)',
                      padding: '6px 10px',
                      fontSize: 12,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {selectedIds.includes(availableEntity.id) ? 'Ausgewählt' : 'Wählen'}
                  </span>
                </button>
              )
            })
          ) : (
            <div
              style={{
                border: '1px dashed var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-5)',
                fontSize: 13,
                color: 'var(--color-text-secondary)',
                textAlign: 'center',
              }}
            >
              Keine passenden Entities gefunden.
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <button type="button" onClick={onClose} style={quickAddSecondaryButtonStyle}>
            Schließen
          </button>
          <button
            type="button"
            onClick={() => {
              selectedIds.forEach((targetId) => onLink(targetId, relationType))
              setSelectedIds([])
              setSearchQuery('')
              onClose()
            }}
            disabled={!selectedIds.length}
            style={{
              ...quickAddPrimaryButtonStyle,
              opacity: selectedIds.length ? 1 : 0.5,
              cursor: selectedIds.length ? 'pointer' : 'default',
            }}
          >
            {relationType ? `${relationType} verknüpfen` : 'Verknüpfen'}
          </button>
        </div>
      </div>
    </div>
  )
}

function NumberFieldModal({
  field,
  value,
  draft,
  onChange,
  onSave,
  onClose,
}: {
  field: CategoryField
  value: string
  draft: string
  onChange: (value: string) => void
  onSave: (nextValue: string) => void
  onClose: () => void
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(28,25,23,0.32)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6)',
        zIndex: 130,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 420,
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          backgroundColor: 'var(--color-surface)',
          boxShadow: 'var(--shadow-xl)',
          padding: 'var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-ui)' }}>
              {field.name}
            </div>
            <div style={{ marginTop: 'var(--space-1)', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              Zahlenwert hinzufügen oder aktualisieren.
            </div>
          </div>
          <button type="button" onClick={onClose} style={compactFieldActionStyle}>
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>

        <input
          value={draft}
          inputMode="numeric"
          onChange={(event) => onChange(event.target.value.replace(/[^0-9.,-]/g, ''))}
          placeholder={value.trim() ? value : 'Zahl eingeben...'}
          style={quickAddInputStyle}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <button type="button" onClick={onClose} style={quickAddSecondaryButtonStyle}>
            Abbrechen
          </button>
          <button
            type="button"
            onClick={() => {
              const nextValue = draft.trim()

              if (!nextValue) {
                return
              }

              onSave(nextValue)
            }}
            disabled={!draft.trim()}
            style={{
              ...quickAddPrimaryButtonStyle,
              opacity: draft.trim() ? 1 : 0.5,
              cursor: draft.trim() ? 'pointer' : 'default',
            }}
          >
            Hinzufügen
          </button>
        </div>
      </div>
    </div>
  )
}

function QuickAddActions({
  onCancel,
  onSave,
  saveLabel,
}: {
  onCancel: () => void
  onSave: () => void
  saveLabel: string
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
      <button type="button" onClick={onCancel} style={quickAddSecondaryButtonStyle}>
        Abbrechen
      </button>
      <button type="button" onClick={onSave} style={quickAddPrimaryButtonStyle}>
        {saveLabel}
      </button>
    </div>
  )
}

function Section({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string
  icon: React.ElementType
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        backgroundColor: 'var(--color-surface)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: 'var(--space-4) var(--space-5)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <Icon size={14} strokeWidth={1.5} color="var(--color-text-secondary)" />
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-ui)' }}>
          {title}
        </h3>
        <div style={{ marginLeft: 'auto' }}>{action}</div>
      </div>
      <div style={{ padding: 'var(--space-5)' }}>{children}</div>
    </div>
  )
}

// ── Note types + helpers ──────────────────────────────────────────────────────

interface Note {
  id: string
  icon: string
  title: string
  text: string
  createdAt: string
}

const NOTE_ICONS = ['📝', '📖', '💡', '🔍', '⚔️', '🗺️', '👤', '📋', '❓', '🔒', '✅', '🎯', '🌍', '🏰', '✨', '🔮', '🐉', '📜', '🗡️', '🌙']

function parseNotes(content: string | null | undefined): Note[] {
  if (!content?.trim()) return []
  try {
    const parsed = JSON.parse(content) as unknown
    if (Array.isArray(parsed) && parsed.length > 0 && typeof (parsed as Record<string, unknown>[])[0] === 'object' && (parsed as Record<string, unknown>[])[0] !== null && 'id' in (parsed as Record<string, unknown>[])[0]) {
      return (parsed as Note[]).map((n) => ({
        ...n,
        title: typeof n.title === 'string' ? n.title : '',
        text: typeof n.text === 'string' ? n.text : '',
        icon: typeof n.icon === 'string' ? n.icon : '📝',
      }))
    }
  } catch {
    // Legacy plain-text notes intentionally fall through to the single-note fallback below.
  }
  return [{ id: crypto.randomUUID(), icon: '📝', title: 'Notizen', text: content.trim(), createdAt: new Date().toISOString() }]
}

function serializeNotes(notes: Note[]): string {
  return notes.length === 0 ? '' : JSON.stringify(notes)
}

// ── Markdown + Mention renderer for reading mode ─────────────────────────────

function renderInlineMarkdown(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  let i = 0
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`${keyPrefix}-t${i++}`}>{text.slice(lastIndex, match.index)}</span>)
    }
    if (match[1] !== undefined) {
      parts.push(<strong key={`${keyPrefix}-b${i++}`}>{match[1]}</strong>)
    } else if (match[2] !== undefined) {
      parts.push(<em key={`${keyPrefix}-e${i++}`}>{match[2]}</em>)
    }
    lastIndex = regex.lastIndex
  }
  if (lastIndex < text.length) {
    parts.push(<span key={`${keyPrefix}-t${i++}`}>{text.slice(lastIndex)}</span>)
  }
  return parts.length > 0 ? parts : [<span key={`${keyPrefix}-t0`}>{text}</span>]
}

function renderLineContent(
  line: string,
  entities: import('../data/mockWorld').Entity[],
  currentEntityId: string | undefined,
  lineKey: number,
): React.ReactNode[] {
  const segments = parseTextMentions(line, entities, currentEntityId)
  return segments.flatMap<React.ReactNode>((seg, j) => {
    if (seg.kind === 'mention') {
      return <MentionChip key={`${lineKey}-m${j}`} entity={seg.entity} text={seg.text} />
    }
    return renderInlineMarkdown(seg.text, `${lineKey}-${j}`)
  })
}

function renderMarkdownNote(
  text: string,
  entities: import('../data/mockWorld').Entity[],
  currentEntityId: string | undefined,
): React.ReactNode {
  const lines = text.split('\n')
  const blocks: React.ReactNode[] = []
  let listItems: React.ReactNode[] = []

  const flushList = (key: string) => {
    if (listItems.length > 0) {
      blocks.push(
        <ul key={key} style={{ margin: '8px 0', paddingLeft: 20, listStyleType: 'disc' }}>
          {listItems}
        </ul>,
      )
      listItems = []
    }
  }

  lines.forEach((line, i) => {
    if (line.startsWith('## ')) {
      flushList(`list-${i}`)
      blocks.push(
        <h3 key={i} style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--color-text)', margin: '28px 0 8px', letterSpacing: '-0.01em', lineHeight: 1.3 }}>
          {line.slice(3)}
        </h3>,
      )
    } else if (line.startsWith('# ')) {
      flushList(`list-${i}`)
      blocks.push(
        <h2 key={i} style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: 'var(--color-text)', margin: '36px 0 12px', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          {line.slice(2)}
        </h2>,
      )
    } else if (line.startsWith('- ')) {
      listItems.push(
        <li key={i} style={{ fontFamily: 'var(--font-display)', fontSize: 18, lineHeight: 1.85, color: 'var(--color-text)', marginBottom: 4 }}>
          {renderLineContent(line.slice(2), entities, currentEntityId, i)}
        </li>,
      )
    } else if (line.trim() === '') {
      flushList(`list-${i}`)
      blocks.push(<div key={i} style={{ height: 12 }} />)
    } else {
      flushList(`list-${i}`)
      blocks.push(
        <p key={i} style={{ fontFamily: 'var(--font-display)', fontSize: 18, lineHeight: 1.85, color: 'var(--color-text)', margin: '4px 0' }}>
          {renderLineContent(line, entities, currentEntityId, i)}
        </p>,
      )
    }
  })
  flushList('list-end')

  return <>{blocks}</>
}

// ── NotesTab — 2-panel wiki-style writing tool ────────────────────────────────

function NotesTab({ content, onSave, entities = [], currentEntityId }: { content: string | null | undefined; onSave: (nextContent: string) => Promise<void>; entities?: import('../data/mockWorld').Entity[]; currentEntityId?: string }) {
  const [notes, setNotes] = useState<Note[]>(() => parseNotes(content))
  const [selectedId, setSelectedId] = useState<string | null>(() => parseNotes(content)[0]?.id ?? null)
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const [readingMode, setReadingMode] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const editorTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const isMobile = useWindowWidth() < 640
  // On mobile: mobileView controls whether list or editor is shown
  const [mobileShowEditor, setMobileShowEditor] = useState(() => parseNotes(content).length === 0)

  const NOTE_TEMPLATES = [
    { label: 'Leer', icon: '📝', title: '', text: '' },
    { label: 'Charakter', icon: '👤', title: 'Charakterprofil', text: '## Hintergrund\n\n## Motivation\n\n## Aussehen\n\n## Beziehungen\n' },
    { label: 'Ort', icon: '🏰', title: 'Ortbeschreibung', text: '## Atmosphäre\n\n## Geschichte\n\n## Besonderheiten\n\n## Bewohner\n' },
    { label: 'Szene', icon: '✨', title: 'Szene', text: '## Setup\n\n## Konflikt\n\n## Wendepunkt\n\n## Ausgang\n' },
  ]

  const selectedNote = notes.find((n) => n.id === selectedId) ?? null
  const wordCount = selectedNote?.text?.trim() ? selectedNote.text.trim().split(/\s+/).length : 0

  // Focus title input whenever the selected note changes to an untitled one
  useEffect(() => {
    if (selectedNote && !selectedNote.title) {
      setTimeout(() => titleInputRef.current?.focus(), 50)
    }
  }, [selectedId])

  // Escape closes focus mode
  useEffect(() => {
    if (!focusMode) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setFocusMode(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [focusMode])

  // Arrow key navigation in reading mode
  useEffect(() => {
    if (!readingMode) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setReadingMode(false); return }
      const idx = notes.findIndex((n) => n.id === selectedId)
      if (e.key === 'ArrowLeft' && idx > 0) setSelectedId(notes[idx - 1].id)
      if (e.key === 'ArrowRight' && idx < notes.length - 1) setSelectedId(notes[idx + 1].id)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [readingMode, selectedId, notes])

  // Lock body scroll when overlay is open
  useEffect(() => {
    if (!readingMode && !focusMode) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [readingMode, focusMode])

  const persistNotes = (updated: Note[]) => {
    setNotes(updated)
    setSaveStatus('saving')
    void onSave(serializeNotes(updated)).then(() => {
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    })
  }

  const addNote = (template?: typeof NOTE_TEMPLATES[number]) => {
    const tpl = template ?? NOTE_TEMPLATES[0]
    const note: Note = { id: crypto.randomUUID(), icon: tpl.icon, title: tpl.title, text: tpl.text, createdAt: new Date().toISOString() }
    persistNotes([note, ...notes])
    setSelectedId(note.id)
    setIconPickerOpen(false)
    setTemplatePickerOpen(false)
    if (isMobile) setMobileShowEditor(true)
  }

  const updateSelected = (patch: Partial<Note>) => {
    if (!selectedId) return
    persistNotes(notes.map((n) => (n.id === selectedId ? { ...n, ...patch } : n)))
  }

  const deleteSelected = () => {
    if (!selectedId) return
    const remaining = notes.filter((n) => n.id !== selectedId)
    persistNotes(remaining)
    setSelectedId(remaining[0]?.id ?? null)
    setIconPickerOpen(false)
  }

  return (
    <div style={{
      display: 'flex',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      minHeight: isMobile ? 480 : 540,
      backgroundColor: 'var(--color-surface)',
    }}>

      {/* ── Left panel: note list ─────────────────────────────────────────── */}
      <div style={{
        width: isMobile ? '100%' : 220,
        borderRight: isMobile ? 'none' : '1px solid var(--color-border)',
        display: isMobile && mobileShowEditor ? 'none' : 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--color-bg)',
        flexShrink: 0,
      }}>
        {/* Panel header */}
        <div style={{
          padding: '11px 14px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <BookOpen size={13} strokeWidth={1.5} color="var(--color-text-secondary)" />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Notizen
            </span>
            {notes.length > 0 && (
              <span style={{ fontSize: 10, color: 'var(--color-text-placeholder)', fontFamily: 'var(--font-ui)' }}>
                {notes.length}
              </span>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              title="Neue Notiz"
              onClick={() => setTemplatePickerOpen((v) => !v)}
              style={{
                width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)',
                background: templatePickerOpen ? 'var(--color-primary-light)' : 'none',
                cursor: 'pointer',
                color: templatePickerOpen ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              }}
            >
              <Plus size={12} strokeWidth={2} />
            </button>
            {templatePickerOpen ? (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 60, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', padding: 6, minWidth: 140 }}>
                {NOTE_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.label}
                    type="button"
                    onClick={() => addNote(tpl)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', border: 'none', borderRadius: 'var(--radius-sm)', backgroundColor: 'transparent', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-ui)', color: 'var(--color-text)', textAlign: 'left' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-bg)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
                  >
                    <span style={{ fontSize: 14 }}>{tpl.icon}</span>
                    {tpl.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Note list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {notes.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: 'var(--color-text-placeholder)', fontFamily: 'var(--font-ui)', margin: 0, lineHeight: 1.6 }}>
                Noch keine Notizen — starte mit dem + Button.
              </p>
            </div>
          ) : (
            notes.map((note, idx) => (
              <button
                key={note.id}
                type="button"
                onClick={() => { setSelectedId(note.id); setIconPickerOpen(false); if (isMobile) setMobileShowEditor(true) }}
                style={{
                  width: '100%', padding: '10px 14px',
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  backgroundColor: selectedId === note.id ? 'var(--color-accent-light)' : 'transparent',
                  border: 'none',
                  borderBottom: idx < notes.length - 1 ? '1px solid var(--color-border)' : 'none',
                  borderLeft: selectedId === note.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'background 80ms',
                }}
              >
                <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{note.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12, fontWeight: selectedId === note.id ? 600 : 400,
                    fontFamily: 'var(--font-ui)',
                    color: note.title ? 'var(--color-text)' : 'var(--color-text-placeholder)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {note.title || 'Ohne Titel'}
                  </div>
                  {note.text.trim() && (
                    <div style={{
                      fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)',
                      marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {note.text.slice(0, 50)}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Add note footer */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--color-border)' }}>
          <button
            type="button"
            onClick={() => addNote()}
            style={{
              width: '100%', padding: '6px 0',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)',
              background: 'none', cursor: 'pointer',
              color: 'var(--color-text-secondary)', fontSize: 11, fontFamily: 'var(--font-ui)',
            }}
          >
            <Plus size={11} strokeWidth={2} />
            Neue Notiz
          </button>
        </div>
      </div>

      {/* ── Right panel: editor ───────────────────────────────────────────── */}
      <div style={{ flex: 1, display: isMobile && !mobileShowEditor ? 'none' : 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!selectedNote ? (
          /* Empty state */
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 12, padding: 40, textAlign: 'center',
          }}>
            <FileText size={32} strokeWidth={1} color="var(--color-text-placeholder)" />
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-display)', margin: 0 }}>
              Noch keine Notizen
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', margin: 0, maxWidth: 300, lineHeight: 1.6 }}>
              Schreibe Lore, Charakterhintergründe, Weltenbau-Notizen oder ganze Kapitel — alles mit automatischen Entity-Links.
            </p>
            <button type="button" onClick={() => addNote()} style={{ ...quickAddPrimaryButtonStyle, marginTop: 8 }}>
              Erste Notiz erstellen
            </button>
          </div>
        ) : (
          <>
            {/* Editor toolbar */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '9px 20px', borderBottom: '1px solid var(--color-border)',
              flexShrink: 0,
            }}>
              {/* Mobile back button */}
              {isMobile ? (
                <button
                  type="button"
                  onClick={() => setMobileShowEditor(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 12, fontFamily: 'var(--font-ui)', color: 'var(--color-text-secondary)',
                    padding: '3px 6px', borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <ChevronLeft size={14} strokeWidth={1.5} />
                  Notizen
                </button>
              ) : (
              /* Icon picker */
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  title="Icon ändern"
                  onClick={() => setIconPickerOpen((v) => !v)}
                  style={{
                    fontSize: 18, lineHeight: 1, background: 'none', border: 'none',
                    cursor: 'pointer', padding: '3px 5px', borderRadius: 'var(--radius-sm)',
                  }}
                >
                  {selectedNote.icon}
                </button>
                {iconPickerOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 60,
                    backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
                    padding: 8, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4,
                  }}>
                    {NOTE_ICONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => { updateSelected({ icon: emoji }); setIconPickerOpen(false) }}
                        style={{
                          width: 32, height: 32, borderRadius: 'var(--radius-sm)', border: 'none',
                          backgroundColor: selectedNote.icon === emoji ? 'var(--color-accent-light)' : 'transparent',
                          cursor: 'pointer', fontSize: 16,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              )}

              {/* Right actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {saveStatus !== 'idle' && (
                  <span style={{ fontSize: 11, color: saveStatus === 'saved' ? 'var(--color-success)' : 'var(--color-text-placeholder)', fontFamily: 'var(--font-ui)', display: 'flex', alignItems: 'center', gap: 4, transition: 'color 300ms' }}>
                    <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: saveStatus === 'saved' ? 'var(--color-success)' : 'var(--color-text-placeholder)', animation: saveStatus === 'saving' ? 'shimmer 1s infinite' : 'none' }} />
                    {saveStatus === 'saving' ? 'Speichert…' : 'Gespeichert'}
                  </span>
                )}
                {wordCount > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--color-text-placeholder)', fontFamily: 'var(--font-ui)' }}>
                    {wordCount} {wordCount === 1 ? 'Wort' : 'Wörter'}
                  </span>
                )}
                <button
                  type="button"
                  title="Fokus-Modus (Vollbild Schreiben)"
                  onClick={() => setFocusMode(true)}
                  style={{
                    width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: 'none', borderRadius: 'var(--radius-sm)', background: 'none',
                    cursor: 'pointer', color: 'var(--color-text-secondary)',
                  }}
                >
                  <Maximize2 size={13} strokeWidth={1.5} />
                </button>
                {selectedNote.text.trim() ? (
                  <button
                    type="button"
                    title="Leseansicht"
                    onClick={() => setReadingMode(true)}
                    style={{
                      width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: 'none', borderRadius: 'var(--radius-sm)', background: 'none',
                      cursor: 'pointer', color: 'var(--color-text-secondary)',
                    }}
                  >
                    <BookOpen size={13} strokeWidth={1.5} />
                  </button>
                ) : null}
                <button
                  type="button"
                  title="Notiz löschen"
                  onClick={deleteSelected}
                  style={{
                    width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: 'none', borderRadius: 'var(--radius-sm)', background: 'none',
                    cursor: 'pointer', color: 'var(--color-text-secondary)',
                  }}
                >
                  <Trash2 size={13} strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* Reading mode overlay — portal to document.body to escape overflow:hidden */}
            {readingMode && selectedNote ? createPortal((() => {
                const readingIdx = notes.findIndex((n) => n.id === selectedId)
                const prevNote = notes[readingIdx - 1] ?? null
                const nextNote = notes[readingIdx + 1] ?? null

                if (isMobile) {
                  // Full-screen sheet on mobile
                  return (
                    <div style={{
                      position: 'fixed', inset: 0, zIndex: 9000,
                      backgroundColor: 'var(--color-surface)',
                      display: 'flex', flexDirection: 'column',
                      overscrollBehavior: 'contain',
                    }}>
                      {/* Mobile header */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--color-border)',
                        flexShrink: 0,
                        backgroundColor: 'var(--color-surface)',
                      }}>
                        <span style={{ fontSize: 20, flexShrink: 0 }}>{selectedNote.icon}</span>
                        <span style={{
                          flex: 1, fontSize: 15, fontWeight: 600,
                          fontFamily: 'var(--font-display)', color: 'var(--color-text)',
                          letterSpacing: '-0.01em', overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {selectedNote.title || 'Ohne Titel'}
                        </span>
                        <button type="button" onClick={() => setReadingMode(false)} style={{
                          width: 36, height: 36, borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', color: 'var(--color-text-secondary)', flexShrink: 0,
                        }}>
                          <X size={16} strokeWidth={1.5} />
                        </button>
                      </div>

                      {/* Scrollable content */}
                      <div style={{
                        flex: 1, overflowY: 'auto', overscrollBehavior: 'contain',
                        padding: '24px 20px 32px',
                        WebkitOverflowScrolling: 'touch',
                      } as React.CSSProperties}>
                        <div style={{ minHeight: 40 }}>
                          {renderMarkdownNote(selectedNote.text, entities ?? [], currentEntityId)}
                        </div>
                        <div style={{ marginTop: 32, fontSize: 11, color: 'var(--color-text-placeholder)', fontFamily: 'var(--font-ui)' }}>
                          {wordCount} {wordCount === 1 ? 'Wort' : 'Wörter'} · {readingIdx + 1} / {notes.length}
                        </div>
                      </div>

                      {/* Mobile prev/next footer */}
                      {(prevNote || nextNote) ? (
                        <div style={{
                          display: 'flex', gap: 8, padding: '10px 16px 20px',
                          borderTop: '1px solid var(--color-border)',
                          backgroundColor: 'var(--color-bg)', flexShrink: 0,
                        }}>
                          <button
                            type="button"
                            onClick={() => prevNote && setSelectedId(prevNote.id)}
                            disabled={!prevNote}
                            style={{
                              flex: 1, height: 44,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                              border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                              backgroundColor: 'var(--color-surface)', cursor: prevNote ? 'pointer' : 'default',
                              opacity: prevNote ? 1 : 0.35,
                              fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--color-text)',
                            }}
                          >
                            <ChevronLeft size={16} strokeWidth={1.5} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>
                              {prevNote?.title || 'Vorherige'}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => nextNote && setSelectedId(nextNote.id)}
                            disabled={!nextNote}
                            style={{
                              flex: 1, height: 44,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                              border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                              backgroundColor: 'var(--color-surface)', cursor: nextNote ? 'pointer' : 'default',
                              opacity: nextNote ? 1 : 0.35,
                              fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--color-text)',
                            }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>
                              {nextNote?.title || 'Nächste'}
                            </span>
                            <ChevronRight size={16} strokeWidth={1.5} />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )
                }

                // Desktop reading mode
                const navBtnStyle: React.CSSProperties = {
                  position: 'fixed', top: '50%', transform: 'translateY(-50%)',
                  zIndex: 9001, width: 44, height: 44, borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.2)',
                  backgroundColor: 'rgba(255,255,255,0.14)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#fff',
                }
                return (
                  <div
                    onClick={() => setReadingMode(false)}
                    style={{
                      position: 'fixed', inset: 0, zIndex: 9000,
                      backgroundColor: 'rgba(28,25,23,0.85)',
                      backdropFilter: 'blur(8px)',
                      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                      padding: '48px 96px', overflowY: 'auto',
                      overscrollBehavior: 'contain',
                    }}
                  >
                    {prevNote ? (
                      <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedId(prevNote.id) }} style={{ ...navBtnStyle, left: 24 }} title={prevNote.title || 'Vorherige Notiz'}>
                        <ChevronLeft size={20} strokeWidth={1.5} />
                      </button>
                    ) : null}
                    {nextNote ? (
                      <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedId(nextNote.id) }} style={{ ...navBtnStyle, right: 24 }} title={nextNote.title || 'Nächste Notiz'}>
                        <ChevronRight size={20} strokeWidth={1.5} />
                      </button>
                    ) : null}

                    <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 680, backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-xl)', padding: '48px 56px 56px', position: 'relative', flexShrink: 0 }}>
                      <button type="button" onClick={() => setReadingMode(false)} style={{ position: 'absolute', top: 20, right: 20, width: 32, height: 32, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                        <X size={14} strokeWidth={1.5} />
                      </button>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                        <span style={{ fontSize: 32 }}>{selectedNote.icon}</span>
                        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.02em', margin: 0, flex: 1 }}>
                          {selectedNote.title || 'Ohne Titel'}
                        </h1>
                      </div>

                      <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', marginBottom: 32 }} />

                      <div style={{ minHeight: 40 }}>
                        {renderMarkdownNote(selectedNote.text, entities ?? [], currentEntityId)}
                      </div>

                      <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                        <span style={{ fontSize: 12, color: 'var(--color-text-placeholder)', fontFamily: 'var(--font-ui)' }}>{wordCount} {wordCount === 1 ? 'Wort' : 'Wörter'}</span>
                        <span style={{ fontSize: 12, color: 'var(--color-text-placeholder)', fontFamily: 'var(--font-ui)' }}>{readingIdx + 1} / {notes.length} · ← → Wechseln · Esc Schließen</span>
                      </div>
                    </div>
                  </div>
                )
              })(), document.body) : null}

            {/* Focus Mode overlay */}
            {focusMode && selectedNote ? createPortal(
              <div style={{ position: 'fixed', inset: 0, zIndex: 9000, backgroundColor: 'var(--color-bg)', display: 'flex', flexDirection: 'column', animation: 'fadeIn 150ms ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{selectedNote.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-ui)' }}>{selectedNote.title || 'Ohne Titel'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {saveStatus !== 'idle' ? <span style={{ fontSize: 11, color: saveStatus === 'saved' ? 'var(--color-success)' : 'var(--color-text-placeholder)', fontFamily: 'var(--font-ui)' }}>{saveStatus === 'saving' ? 'Speichert…' : 'Gespeichert'}</span> : null}
                    <span style={{ fontSize: 11, color: 'var(--color-text-placeholder)', fontFamily: 'var(--font-ui)' }}>{wordCount} Wörter</span>
                    <button type="button" onClick={() => setFocusMode(false)} title="Fokus-Modus beenden (Esc)" style={{ padding: '5px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-ui)', color: 'var(--color-text-secondary)' }}>Esc</button>
                  </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center', padding: '48px 24px' }}>
                  <div style={{ width: '100%', maxWidth: 680 }}>
                    <input
                      key={`focus-title-${selectedNote.id}`}
                      type="text"
                      defaultValue={selectedNote.title}
                      placeholder="Titel der Notiz…"
                      onBlur={(e) => updateSelected({ title: e.target.value })}
                      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setFocusMode(false) }}
                      style={{ width: '100%', border: 'none', outline: 'none', backgroundColor: 'transparent', fontSize: 32, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-text)', marginBottom: 24, lineHeight: 1.2, display: 'block', boxSizing: 'border-box' }}
                    />
                    <LiveMentionEditor
                      key={`focus-${selectedNote.id}`}
                      value={selectedNote.text}
                      onChange={(text) => updateSelected({ text })}
                      placeholder="Schreibe hier…"
                      entities={entities}
                      currentEntityId={currentEntityId}
                    />
                  </div>
                </div>
              </div>,
              document.body
            ) : null}

            {/* Writing area */}
            <div style={{ flex: 1, padding: '28px 36px 48px', overflowY: 'auto' }}>
              {/* Title */}
              <input
                ref={titleInputRef}
                key={`title-${selectedNote.id}`}
                type="text"
                defaultValue={selectedNote.title}
                placeholder="Titel der Notiz…"
                onBlur={(e) => updateSelected({ title: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                style={{
                  width: '100%', border: 'none', outline: 'none',
                  backgroundColor: 'transparent',
                  fontSize: 24, fontWeight: 700,
                  fontFamily: 'var(--font-display)', color: 'var(--color-text)',
                  marginBottom: 20, lineHeight: 1.3, display: 'block', boxSizing: 'border-box',
                }}
              />

              {/* Divider */}
              <div style={{ height: 1, backgroundColor: 'var(--color-border)', marginBottom: 28 }} />

              {/* Markdown toolbar */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                {([
                  { label: 'B', title: 'Fett', wrap: ['**', '**'] },
                  { label: 'I', title: 'Kursiv', wrap: ['*', '*'] },
                  { label: 'H1', title: 'Überschrift 1', prefix: '# ' },
                  { label: 'H2', title: 'Überschrift 2', prefix: '## ' },
                  { label: '—', title: 'Trennlinie', insert: '\n---\n' },
                  { label: '•', title: 'Liste', prefix: '- ' },
                ] as Array<{ label: string; title: string; wrap?: [string, string]; prefix?: string; insert?: string }>).map((btn) => (
                  <button
                    key={btn.label}
                    type="button"
                    title={btn.title}
                    onClick={() => {
                      const ta = editorTextareaRef.current
                      if (!ta) return
                      const start = ta.selectionStart
                      const end = ta.selectionEnd
                      const old = selectedNote.text
                      let next = old
                      if (btn.insert) {
                        next = old.slice(0, start) + btn.insert + old.slice(end)
                      } else if (btn.wrap) {
                        const sel = old.slice(start, end) || btn.title
                        next = old.slice(0, start) + btn.wrap[0] + sel + btn.wrap[1] + old.slice(end)
                      } else if (btn.prefix) {
                        const lineStart = old.lastIndexOf('\n', start - 1) + 1
                        next = old.slice(0, lineStart) + btn.prefix + old.slice(lineStart)
                      }
                      updateSelected({ text: next })
                      setTimeout(() => { ta.focus() }, 0)
                    }}
                    style={{
                      height: 26, minWidth: 28, padding: '0 7px',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--color-bg)',
                      color: 'var(--color-text-secondary)',
                      fontSize: btn.label.length <= 2 ? 13 : 11,
                      fontWeight: btn.label === 'B' ? 700 : btn.label === 'I' ? 400 : 600,
                      fontStyle: btn.label === 'I' ? 'italic' : 'normal',
                      fontFamily: 'var(--font-ui)',
                      cursor: 'pointer',
                      lineHeight: 1,
                    }}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              {/* Live mention editor — transparent textarea + styled mirror */}
              <LiveMentionEditor
                key={selectedNote.id}
                value={selectedNote.text}
                onChange={(text) => updateSelected({ text })}
                placeholder="Schreibe hier Lore, Charakterhintergründe oder Weltenbau-Notizen…&#10;&#10;Entity-Namen werden automatisch verlinkt — probiere es aus!"
                entities={entities}
                currentEntityId={currentEntityId}
                textareaRef={editorTextareaRef}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

type SectionItem = { title: string; body: string; label: string }

function parseSections(value: string): SectionItem[] {
  if (!value?.trim()) return []
  try {
    const p = JSON.parse(value)
    if (Array.isArray(p)) return p.map((s) => ({
      title: String(s.title ?? ''),
      body: String(s.body ?? ''),
      label: String(s.label ?? ''),
    }))
  } catch {
    // Legacy newline-based sections intentionally fall through to the text-splitting fallback below.
  }
  return value.split('\n').map((s) => s.trim()).filter(Boolean).map((body) => ({ title: '', body, label: '' }))
}

function serializeSections(sections: SectionItem[]): string {
  return JSON.stringify(sections)
}

function CategoryFieldTab({
  field,
  fieldValue,
  entities = [],
  currentEntityId,
  onSave,
}: {
  field: CategoryField | null
  fieldValue: string
  entities?: import('../data/mockWorld').Entity[]
  currentEntityId?: string
  onSave?: (value: string) => void
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingText, setEditingText] = useState('')
  const [editSectionTitle, setEditSectionTitle] = useState('')
  const [editSectionLabel, setEditSectionLabel] = useState('')
  const openConfirmDialog = useWorldStore((state) => state.openConfirmDialog)
  const [addText, setAddText] = useState('')
  const [addSectionTitle, setAddSectionTitle] = useState('')
  const [addSectionLabel, setAddSectionLabel] = useState('Kapitel')
  const [isAdding, setIsAdding] = useState(false)
  const [localText, setLocalText] = useState(fieldValue)
  const [showArchived, setShowArchived] = useState(false)
  const fieldTabWidth = useWindowWidth()
  const isCompactWriter = fieldTabWidth < 768
  const isMobileWriter = fieldTabWidth < 640
  const editingEditorRef = useRef<HTMLDivElement | null>(null)
  const addEditorRef = useRef<HTMLDivElement | null>(null)
  const editingTextRef = useRef(editingText)
  const addTextRef = useRef(addText)

  useEffect(() => { setLocalText(fieldValue) }, [fieldValue])
  useEffect(() => { editingTextRef.current = editingText }, [editingText])
  useEffect(() => { addTextRef.current = addText }, [addText])

  useEffect(() => {
    if (editingIndex === null || !editingEditorRef.current) return
    const nextHtml = getWriterEditorHtml(editingTextRef.current)
    if (editingEditorRef.current.innerHTML !== nextHtml) {
      editingEditorRef.current.innerHTML = nextHtml
    }
  }, [editingIndex])

  useEffect(() => {
    if (!isAdding || !addEditorRef.current) return
    const nextHtml = getWriterEditorHtml(addTextRef.current)
    if (addEditorRef.current.innerHTML !== nextHtml) {
      addEditorRef.current.innerHTML = nextHtml
    }
  }, [isAdding])

  if (!field) return null

  const FieldIcon = getCategoryIcon(field.icon ?? categoryFieldDefaultIcons[field.type])
  const items = fieldValue.split('\n').map((s) => s.trim()).filter(Boolean)
  const sectionItems = field.type === 'sections' ? parseSections(fieldValue) : ([] as SectionItem[])
  const saveItems = (next: string[]) => onSave?.(next.join('\n'))

  // Task parsing — [x] = done, [~] = archived
  const taskItems = field.type === 'tasks'
    ? items.map((raw, index) => {
        if (raw.startsWith('[x] ')) return { text: raw.slice(4), done: true, archived: false, index }
        if (raw.startsWith('[~] ')) return { text: raw.slice(4), done: false, archived: true, index }
        return { text: raw, done: false, archived: false, index }
      })
    : ([] as { text: string; done: boolean; archived: boolean; index: number }[])

  const activeTaskItems = taskItems.filter((t) => !t.archived)
  const archivedTaskItems = taskItems.filter((t) => t.archived)
  const doneActiveCount = activeTaskItems.filter((t) => t.done).length

  const toggleTask = (origIdx: number, currentlyDone: boolean) => {
    const t = taskItems[origIdx]
    const next = [...items]
    next[origIdx] = currentlyDone ? t.text : `[x] ${t.text}`
    saveItems(next)
  }

  const archiveDone = () => {
    saveItems(items.map((raw) => raw.startsWith('[x] ') ? `[~] ${raw.slice(4)}` : raw))
  }

  const restoreArchived = (origIdx: number) => {
    const next = [...items]
    next[origIdx] = taskItems[origIdx].text
    saveItems(next)
  }

  const handleAdd = () => {
    if (!addText.trim()) { setIsAdding(false); return }
    saveItems([...items, addText.trim()])
    setAddText('')
    setIsAdding(false)
  }

  const handleEditStart = (origIdx: number) => {
    setEditingIndex(origIdx)
    setEditingText(field.type === 'tasks' ? (taskItems[origIdx]?.text ?? items[origIdx]) : items[origIdx])
  }

  const handleEditSave = (origIdx: number) => {
    if (!editingText.trim()) { setEditingIndex(null); return }
    const next = [...items]
    if (field.type === 'tasks') {
      const t = taskItems[origIdx]
      next[origIdx] = t?.done ? `[x] ${editingText.trim()}` : editingText.trim()
    } else {
      next[origIdx] = editingText.trim()
    }
    saveItems(next)
    setEditingIndex(null)
  }

  const handleDelete = async (origIdx: number) => {
    const rawText = field.type === 'tasks' ? (taskItems[origIdx]?.text ?? items[origIdx]) : items[origIdx]
    const preview = rawText.slice(0, 40) + (rawText.length > 40 ? '…' : '')
    const confirmed = await openConfirmDialog({
      title: `"${preview}" wirklich löschen?`,
      description: 'Dieser Eintrag wird sofort aus diesem Feld entfernt.',
      confirmLabel: 'Eintrag löschen',
      confirmVariant: 'danger',
    })
    if (!confirmed) return
    saveItems(items.filter((_, idx) => idx !== origIdx))
  }

  const cfBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, border: 'none', borderRadius: 'var(--radius-sm)',
    backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--color-text-secondary)',
    padding: 0, flexShrink: 0,
  }

  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: isMobileWriter ? 'var(--space-4)' : isCompactWriter ? 'var(--space-5)' : 'var(--space-8)', backgroundColor: 'var(--color-surface)', minHeight: 220 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <FieldIcon size={18} strokeWidth={1.5} color="var(--color-primary)" />
          <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-ui)' }}>
            {field.name}
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {field.type === 'tasks' && doneActiveCount > 0 && (
            <button
              onClick={archiveDone}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 10px', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text-secondary)', fontSize: 11, fontWeight: 500,
                fontFamily: 'var(--font-ui)', cursor: 'pointer',
              }}
            >
              <Check size={11} strokeWidth={2} />
              Erledigte archivieren ({doneActiveCount})
            </button>
          )}
          <span style={{ padding: '3px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text-secondary)', fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-ui)' }}>
            {categoryFieldTypeMeta[field.type]}
          </span>
        </div>
      </div>

      {/* Tasks */}
      {field.type === 'tasks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {activeTaskItems.map((task) => (
            <div
              key={task.index}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                padding: 'var(--space-3)',
                border: editingIndex === task.index ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface)',
                transition: 'border-color 120ms', opacity: task.done ? 0.65 : 1,
              }}
            >
              {/* Clickable checkbox */}
              <div
                onClick={() => toggleTask(task.index, task.done)}
                style={{
                  width: 16, height: 16, borderRadius: 'var(--radius-sm)',
                  border: task.done ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border-strong)',
                  backgroundColor: task.done ? 'var(--color-primary)' : 'var(--color-bg)',
                  flexShrink: 0, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 120ms', marginTop: editingIndex === task.index ? 3 : 1,
                }}
              >
                {task.done && <Check size={10} strokeWidth={2.5} color="white" />}
              </div>
              {editingIndex === task.index ? (
                <input
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleEditSave(task.index); if (e.key === 'Escape') setEditingIndex(null) }}
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--color-text)', backgroundColor: 'transparent' }}
                  autoFocus
                />
              ) : (
                <span style={{ flex: 1, fontSize: 13, color: task.done ? 'var(--color-text-secondary)' : 'var(--color-text)', textDecoration: task.done ? 'line-through' : 'none', lineHeight: 1.5, overflowWrap: 'anywhere' }}>
                  {task.text}
                </span>
              )}
              <div style={{ display: 'flex', gap: 2, flexShrink: 0, alignItems: 'center' }}>
                {editingIndex === task.index ? (
                  <>
                    <button onClick={() => handleEditSave(task.index)} style={{ ...cfBtn, color: 'var(--color-primary)', fontWeight: 600 }}>✓</button>
                    <button onClick={() => setEditingIndex(null)} style={cfBtn}>✕</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleEditStart(task.index)} style={cfBtn} title="Bearbeiten"><Pencil size={13} strokeWidth={1.5} /></button>
                    <button onClick={() => handleDelete(task.index)} style={{ ...cfBtn, color: '#dc2626' }} title="Löschen"><Trash2 size={13} strokeWidth={1.5} /></button>
                  </>
                )}
              </div>
            </div>
          ))}

          {/* Add row */}
          {isAdding ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-3)', border: '1px dashed var(--color-primary)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-primary-light)' }}>
              <div style={{ width: 16, height: 16, borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg)', flexShrink: 0 }} />
              <input
                value={addText}
                onChange={(e) => setAddText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setIsAdding(false); setAddText('') } }}
                placeholder="Aufgabe eingeben…"
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--color-text)', backgroundColor: 'transparent' }}
                autoFocus
              />
              <button onClick={handleAdd} style={{ ...cfBtn, color: 'var(--color-primary)', fontWeight: 600 }}>✓</button>
              <button onClick={() => { setIsAdding(false); setAddText('') }} style={cfBtn}>✕</button>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                padding: 'var(--space-3)', border: '1px dashed var(--color-border)',
                borderRadius: 'var(--radius-md)', backgroundColor: 'transparent',
                color: 'var(--color-text-secondary)', fontSize: 13, fontFamily: 'var(--font-ui)',
                cursor: 'pointer', marginTop: activeTaskItems.length > 0 ? 4 : 0,
              }}
            >
              <Plus size={14} strokeWidth={1.5} />
              Aufgabe hinzufügen
            </button>
          )}

          {/* Archived section */}
          {archivedTaskItems.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <button
                onClick={() => setShowArchived(!showArchived)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                  padding: '8px 0', border: 'none', borderTop: '1px solid var(--color-border)',
                  background: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)',
                  fontSize: 12, fontFamily: 'var(--font-ui)', fontWeight: 500,
                }}
              >
                {showArchived ? <ChevronDown size={13} strokeWidth={1.5} /> : <ChevronRight size={13} strokeWidth={1.5} />}
                Erledigt ({archivedTaskItems.length})
              </button>
              {showArchived && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                  {archivedTaskItems.map((task) => (
                    <div
                      key={task.index}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                        padding: '6px var(--space-3)', borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--color-bg)', opacity: 0.6,
                      }}
                    >
                      <div style={{ width: 16, height: 16, borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--color-primary)', backgroundColor: 'var(--color-primary)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={10} strokeWidth={2.5} color="white" />
                      </div>
                      <span style={{ flex: 1, fontSize: 12, color: 'var(--color-text-secondary)', textDecoration: 'line-through', lineHeight: 1.5 }}>
                        {task.text}
                      </span>
                      <button
                        onClick={() => restoreArchived(task.index)}
                        title="Wiederherstellen"
                        style={{ ...cfBtn, fontSize: 14 }}
                      >
                        ↩
                      </button>
                      <button onClick={() => handleDelete(task.index)} style={{ ...cfBtn, color: '#dc2626' }} title="Löschen">
                        <Trash2 size={12} strokeWidth={1.5} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sections — chapter cards with title + body */}
      {field.type === 'sections' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {sectionItems.map((section, i) => (
            <div
              key={i}
              style={{
                border: editingIndex === i ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)', overflow: 'hidden', backgroundColor: 'var(--color-surface)',
                boxShadow: editingIndex === i ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                transition: 'border-color 150ms ease, box-shadow 150ms ease',
              }}
            >
              {editingIndex === i ? (
                <>
                  <div style={{ padding: isMobileWriter ? 'var(--space-4)' : 'var(--space-6)', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                      <BookOpen size={16} strokeWidth={1.5} color="var(--color-primary)" />
                      <input
                        value={editSectionLabel}
                        onChange={(e) => setEditSectionLabel(e.target.value)}
                        placeholder="Kapitel, Szene, Dialog, Quest, Lore …"
                        aria-label="Art des Abschnitts"
                        style={{ width: '100%', border: 'none', outline: 'none', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-ui)', color: 'var(--color-primary)', backgroundColor: 'transparent' }}
                      />
                    </div>
                    <input
                      value={editSectionTitle}
                      onChange={(e) => setEditSectionTitle(e.target.value)}
                      placeholder="Titel des Abschnitts …"
                      style={{ width: '100%', border: 'none', outline: 'none', fontSize: isMobileWriter ? 20 : 24, fontWeight: 600, fontFamily: 'var(--font-ui)', color: 'var(--color-text)', backgroundColor: 'transparent', boxSizing: 'border-box' }}
                      autoFocus
                    />
                  </div>
                  <div style={{ padding: isMobileWriter ? 'var(--space-4)' : 'var(--space-6)' }}>
                    <WriterToolbar
                      compact={isCompactWriter}
                      mobile={isMobileWriter}
                      onAction={(action) => {
                        if (!editingEditorRef.current) return
                        applyWriterCommand(editingEditorRef.current, action)
                        setEditingText(sanitizeWriterHtml(editingEditorRef.current.innerHTML))
                      }}
                    />
                    <div
                      ref={editingEditorRef}
                      contentEditable
                      suppressContentEditableWarning
                      className="writer-surface worldify-thin-scrollbar"
                      data-placeholder="Beginne zu schreiben … Dialoge, Szenenbeschreibungen, Lore, Buchkapitel oder Game-Texte finden hier ihren Platz."
                      onKeyDown={(e) => {
                        if (handleWriterShortcut(e, editingEditorRef.current, setEditingText)) return
                        if (handleWriterStructuralKeys(e, editingEditorRef.current, setEditingText)) return
                        if (e.key === 'Escape') setEditingIndex(null)
                      }}
                      onInput={(e) => setEditingText(sanitizeWriterHtml((e.currentTarget as HTMLDivElement).innerHTML))}
                      style={{ width: '100%', outline: 'none', overflowY: 'auto', fontSize: isMobileWriter ? 15 : 16, fontFamily: 'var(--font-ui)', color: 'var(--color-text)', lineHeight: 1.8, backgroundColor: 'transparent', minHeight: isMobileWriter ? 240 : isCompactWriter ? 300 : 360, boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: isMobileWriter ? 'column' : 'row', alignItems: isMobileWriter ? 'stretch' : 'center', justifyContent: 'space-between', gap: 'var(--space-3)', padding: isMobileWriter ? 'var(--space-4)' : 'var(--space-3) var(--space-6)', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
                    <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)' }}>
                      {getWriterPlainText(editingText).trim() ? getWriterPlainText(editingText).trim().split(/\s+/).length : 0} Wörter · {getWriterPlainText(editingText).length} Zeichen
                    </span>
                    <div style={{ display: 'flex', flexDirection: isMobileWriter ? 'column' : 'row', justifyContent: 'flex-end', gap: 'var(--space-2)', width: isMobileWriter ? '100%' : 'auto' }}>
                    <button
                      onClick={() => setEditingIndex(null)}
                      style={{ ...cfBtn, width: isMobileWriter ? '100%' : 'auto', padding: '0 var(--space-3)', gap: 'var(--space-1)', fontSize: 13 }}
                    >
                      <X size={15} strokeWidth={1.5} /> Abbrechen
                    </button>
                    <button
                      onClick={() => { const next = [...sectionItems]; next[i] = { title: editSectionTitle.trim(), body: editingText, label: editSectionLabel.trim() }; onSave?.(serializeSections(next)); setEditingIndex(null) }}
                      style={{ ...cfBtn, width: isMobileWriter ? '100%' : 'auto', height: 36, padding: '0 var(--space-4)', gap: 'var(--space-2)', fontSize: 13, color: 'var(--color-primary-text)', backgroundColor: 'var(--color-primary)', borderRadius: 'var(--radius-md)' }}
                    >
                      <Check size={15} strokeWidth={1.5} /> Speichern
                    </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ padding: isMobileWriter ? 'var(--space-4)' : 'var(--space-5) var(--space-6) var(--space-4)', display: 'flex', flexDirection: isMobileWriter ? 'column' : 'row', alignItems: isMobileWriter ? 'stretch' : 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)', borderBottom: '1px solid var(--color-border)' }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-primary)', fontFamily: 'var(--font-ui)', marginBottom: 'var(--space-2)' }}>
                        {section.label || `Abschnitt ${i + 1}`}
                      </div>
                      <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-ui)' }}>
                        {section.title || 'Unbenannter Abschnitt'}
                      </h3>
                    </div>
                    <div style={{ display: 'flex', gap: 2, flexShrink: 0, alignSelf: isMobileWriter ? 'flex-end' : 'auto' }}>
                      <button onClick={() => { setEditingIndex(i); setEditSectionTitle(section.title); setEditSectionLabel(section.label || 'Kapitel'); setEditingText(section.body) }} style={cfBtn} title="Im Writer öffnen"><Pencil size={15} strokeWidth={1.5} /></button>
                      <button
                        onClick={async () => {
                          const label = (section.title || section.body).slice(0, 40)
                          const confirmed = await openConfirmDialog({
                            title: `"${label}" wirklich löschen?`,
                            description: 'Dieser Abschnitt wird sofort entfernt.',
                            confirmLabel: 'Abschnitt löschen',
                            confirmVariant: 'danger',
                          })
                          if (!confirmed) return
                          onSave?.(serializeSections(sectionItems.filter((_, idx) => idx !== i)))
                        }}
                        style={{ ...cfBtn, color: 'var(--color-error)' }} title="Löschen"
                      ><Trash2 size={15} strokeWidth={1.5} /></button>
                    </div>
                  </div>
                  <div style={{ padding: isMobileWriter ? 'var(--space-4)' : 'var(--space-6)' }}>
                    {section.body ? (
                      <div style={{ margin: 0, fontSize: 15, color: 'var(--color-text)', lineHeight: 1.8, overflowWrap: 'anywhere', fontFamily: 'var(--font-ui)' }}>
                        <WriterRenderedContent text={section.body} compact={isCompactWriter} />
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-placeholder)', lineHeight: 1.7, fontStyle: 'italic', fontFamily: 'var(--font-ui)' }}>Noch kein Text — öffne den Abschnitt zum Schreiben.</p>
                    )}
                  </div>
                  <div style={{ padding: isMobileWriter ? 'var(--space-3) var(--space-4)' : 'var(--space-3) var(--space-6)', borderTop: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: 11, fontFamily: 'var(--font-ui)', backgroundColor: 'var(--color-bg)' }}>
                    {section.body.trim() ? section.body.trim().split(/\s+/).length : 0} Wörter · {section.body.length} Zeichen
                  </div>
                </>
              )}
            </div>
          ))}

          {/* Add new section */}
          {isAdding ? (
            <div style={{ border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', backgroundColor: 'var(--color-surface)', boxShadow: 'var(--shadow-md)' }}>
              <div style={{ padding: isMobileWriter ? 'var(--space-4)' : 'var(--space-6)', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                  <BookOpen size={16} strokeWidth={1.5} color="var(--color-primary)" />
                  <input
                    value={addSectionLabel}
                    onChange={(e) => setAddSectionLabel(e.target.value)}
                    placeholder="Kapitel, Szene, Dialog, Quest, Lore …"
                    aria-label="Art des Abschnitts"
                    style={{ width: '100%', border: 'none', outline: 'none', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-ui)', color: 'var(--color-primary)', backgroundColor: 'transparent' }}
                  />
                </div>
                <input
                  value={addSectionTitle}
                  onChange={(e) => setAddSectionTitle(e.target.value)}
                  placeholder="Titel des Abschnitts …"
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: isMobileWriter ? 20 : 24, fontWeight: 600, fontFamily: 'var(--font-ui)', color: 'var(--color-text)', backgroundColor: 'transparent', boxSizing: 'border-box' }}
                  autoFocus
                />
              </div>
              <div style={{ padding: isMobileWriter ? 'var(--space-4)' : 'var(--space-6)' }}>
                <WriterToolbar
                  compact={isCompactWriter}
                  mobile={isMobileWriter}
                  onAction={(action) => {
                    if (!addEditorRef.current) return
                    applyWriterCommand(addEditorRef.current, action)
                    setAddText(sanitizeWriterHtml(addEditorRef.current.innerHTML))
                  }}
                />
                <div
                  ref={addEditorRef}
                  contentEditable
                  suppressContentEditableWarning
                  className="writer-surface worldify-thin-scrollbar"
                  data-placeholder="Beginne zu schreiben … Dialoge, Szenenbeschreibungen, Lore, Buchkapitel oder Game-Texte finden hier ihren Platz."
                  onKeyDown={(e) => {
                    if (handleWriterShortcut(e, addEditorRef.current, setAddText)) return
                    if (handleWriterStructuralKeys(e, addEditorRef.current, setAddText)) return
                    if (e.key === 'Escape') { setIsAdding(false); setAddText(''); setAddSectionTitle(''); setAddSectionLabel('Kapitel') }
                  }}
                  onInput={(e) => setAddText(sanitizeWriterHtml((e.currentTarget as HTMLDivElement).innerHTML))}
                  style={{ width: '100%', outline: 'none', overflowY: 'auto', fontSize: isMobileWriter ? 15 : 16, fontFamily: 'var(--font-ui)', color: 'var(--color-text)', lineHeight: 1.8, backgroundColor: 'transparent', minHeight: isMobileWriter ? 240 : isCompactWriter ? 300 : 360, boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: isMobileWriter ? 'column' : 'row', alignItems: isMobileWriter ? 'stretch' : 'center', justifyContent: 'space-between', gap: 'var(--space-3)', padding: isMobileWriter ? 'var(--space-4)' : 'var(--space-3) var(--space-6)', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
                <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)' }}>
                  {getWriterPlainText(addText).trim() ? getWriterPlainText(addText).trim().split(/\s+/).length : 0} Wörter · {getWriterPlainText(addText).length} Zeichen
                </span>
                <div style={{ display: 'flex', flexDirection: isMobileWriter ? 'column' : 'row', justifyContent: 'flex-end', gap: 'var(--space-2)', width: isMobileWriter ? '100%' : 'auto' }}>
                  <button onClick={() => { setIsAdding(false); setAddText(''); setAddSectionTitle(''); setAddSectionLabel('Kapitel') }} style={{ ...cfBtn, width: isMobileWriter ? '100%' : 'auto', padding: '0 var(--space-3)', gap: 'var(--space-1)', fontSize: 13 }}>
                    <X size={15} strokeWidth={1.5} /> Abbrechen
                  </button>
                <button
                  onClick={() => { if (!addText.trim() && !addSectionTitle.trim()) { setIsAdding(false); return }; onSave?.(serializeSections([...sectionItems, { title: addSectionTitle.trim(), body: addText, label: addSectionLabel.trim() }])); setAddText(''); setAddSectionTitle(''); setAddSectionLabel('Kapitel'); setIsAdding(false) }}
                  style={{ ...cfBtn, width: isMobileWriter ? '100%' : 'auto', height: 36, padding: '0 var(--space-4)', gap: 'var(--space-2)', fontSize: 13, color: 'var(--color-primary-text)', backgroundColor: 'var(--color-primary)', borderRadius: 'var(--radius-md)' }}
                >
                  <Check size={15} strokeWidth={1.5} /> Abschnitt anlegen
                </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                padding: 'var(--space-3)', border: '1px dashed var(--color-border)',
                borderRadius: 'var(--radius-md)', backgroundColor: 'transparent',
                color: 'var(--color-text-secondary)', fontSize: 13, fontFamily: 'var(--font-ui)',
                cursor: 'pointer',
              }}
            >
              <Plus size={14} strokeWidth={1.5} />
              Neuen Schreibabschnitt anlegen
            </button>
          )}
        </div>
      )}

      {/* Textarea */}
      {field.type === 'textarea' && (
        <textarea
          value={localText}
          onChange={(e) => setLocalText(e.target.value)}
          onBlur={() => onSave?.(localText)}
          placeholder="Inhalt eingeben…"
          rows={8}
          style={{
            width: '100%', padding: 'var(--space-4)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)', fontSize: 13, fontFamily: 'var(--font-ui)',
            color: 'var(--color-text)', backgroundColor: 'var(--color-bg)', outline: 'none',
            lineHeight: 1.7, resize: 'vertical', minHeight: 140, boxSizing: 'border-box',
            transition: 'border-color 120ms',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)' }}
          onBlurCapture={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
        />
      )}

      {/* Text */}
      {field.type === 'text' && (
        <input
          value={localText}
          onChange={(e) => setLocalText(e.target.value)}
          onBlur={() => onSave?.(localText)}
          placeholder="Text eingeben…"
          style={{
            width: '100%', padding: 'var(--space-3) var(--space-4)',
            border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
            fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--color-text)',
            backgroundColor: 'var(--color-bg)', outline: 'none', boxSizing: 'border-box',
          }}
        />
      )}

      {/* Number */}
      {field.type === 'number' && (
        <input
          type="number"
          value={localText}
          onChange={(e) => setLocalText(e.target.value)}
          onBlur={() => onSave?.(localText)}
          placeholder="Zahl eingeben…"
          style={{
            width: 180, padding: 'var(--space-3) var(--space-4)',
            border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
            fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--color-text)',
            backgroundColor: 'var(--color-bg)', outline: 'none', boxSizing: 'border-box',
          }}
        />
      )}

      {/* Participants — read-only */}
      {field.type === 'participants' && (
        <FieldValuePreview fieldType={field.type} value={fieldValue} entities={entities} currentEntityId={currentEntityId} />
      )}
    </div>
  )
}

function MetaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div>
      <div style={metaLabelStyle}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <Icon size={12} strokeWidth={1.5} color="var(--color-text-secondary)" />
        <span style={{ fontSize: 13, color: 'var(--color-text)', fontFamily: 'var(--font-ui)' }}>{value}</span>
      </div>
    </div>
  )
}

function FieldValuePreview({
  fieldType,
  value,
  entities = [],
  currentEntityId,
}: {
  fieldType: keyof typeof categoryFieldTypeMeta
  value: string
  entities?: import('../data/mockWorld').Entity[]
  currentEntityId?: string
}) {
  const relatedEntityLabel = fieldType === 'participants' ? getEntityReferenceLabel(value) : null
  const items = value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)

  if (fieldType === 'sections') {
    const sectionPreviews = parseSections(value)
    return sectionPreviews.length > 0 ? (
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {sectionPreviews.map((section, index) => (
          <div
            key={index}
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              backgroundColor: 'var(--color-surface)',
            }}
          >
            {section.title && (
              <div style={{
                padding: '8px 12px',
                borderBottom: '1px solid var(--color-border)',
                fontSize: 12, fontWeight: 600,
                color: 'var(--color-text)', fontFamily: 'var(--font-ui)',
              }}>
                {section.title}
              </div>
            )}
            <div style={{ padding: '8px 12px', fontSize: 13, color: 'var(--color-text)', lineHeight: 1.7, fontFamily: 'var(--font-ui)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {section.body || <span style={{ color: 'var(--color-text-placeholder)', fontStyle: 'italic' }}>Kein Inhalt</span>}
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div style={emptyFieldValueStyle}>Noch kein Wert gesetzt.</div>
    )
  }

  if (fieldType === 'participants' || fieldType === 'tasks') {
    return items.length > 0 ? (
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {items.map((item, index) => (
          <StructuredPreviewItem
            key={`${fieldType}-${index}`}
            fieldType={fieldType}
            item={item}
          />
        ))}
      </div>
    ) : (
      <div style={emptyFieldValueStyle}>Noch kein Wert gesetzt.</div>
    )
  }

  if (fieldType === 'number') {
    return value.trim() ? (
      <div
        style={{
          marginTop: 4,
          display: 'inline-flex',
          alignItems: 'baseline',
          gap: 'var(--space-2)',
          padding: 'var(--space-3) var(--space-4)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: 'var(--color-surface)',
        }}
      >
        <span
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: 'var(--color-text)',
            fontFamily: 'var(--font-ui)',
            lineHeight: 1,
          }}
        >
          {relatedEntityLabel ?? value}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--color-text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Wert
        </span>
      </div>
    ) : (
      <div style={emptyFieldValueStyle}>Noch kein Wert gesetzt.</div>
    )
  }

  if (fieldType === 'textarea') {
    return value.trim() ? (
      <div
        style={{
          marginTop: 4,
          padding: 'var(--space-4)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: 'var(--color-surface)',
          fontSize: 13,
          color: 'var(--color-text)',
          lineHeight: 1.7,
        }}
      >
        <MentionText text={relatedEntityLabel ?? value} entities={entities} currentEntityId={currentEntityId} style={{ fontSize: 13, lineHeight: 1.7, fontFamily: 'var(--font-ui)' }} />
      </div>
    ) : (
      <div style={emptyFieldValueStyle}>Noch kein Wert gesetzt.</div>
    )
  }

  if (fieldType === 'text') {
    return value.trim() ? (
      <div
        style={{
          marginTop: 4,
          display: 'inline-flex',
          alignItems: 'center',
          padding: 'var(--space-2) var(--space-3)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'var(--color-surface)',
          fontSize: 13,
          color: 'var(--color-text)',
          lineHeight: 1.4,
          maxWidth: '100%',
          overflowWrap: 'anywhere',
        }}
      >
        {value}
      </div>
    ) : (
      <div style={emptyFieldValueStyle}>Noch kein Wert gesetzt.</div>
    )
  }

  return (
    <div
      style={{
        marginTop: 4,
        fontSize: 13,
        color: value.trim() ? 'var(--color-text)' : 'var(--color-text-placeholder)',
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        fontStyle: value.trim() ? 'normal' : 'italic',
      }}
      >
        {relatedEntityLabel ?? (value.trim() || 'Noch kein Wert gesetzt.')}
      </div>
  )
}

function StructuredPreviewItem({
  fieldType,
  item,
}: {
  fieldType: 'participants' | 'tasks' | 'sections'
  item: string
}) {
  if (fieldType === 'participants') {
    const relatedEntity = decodeEntityReference(item)
    const label = relatedEntity?.label ?? item

    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          width: 'fit-content',
          maxWidth: '100%',
          padding: 'var(--space-2) var(--space-3)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'var(--color-surface)',
          fontSize: 13,
          color: 'var(--color-text)',
          lineHeight: 1.4,
        }}
      >
        <span
          style={{
            width: 20,
            height: 20,
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--color-primary-light)',
            color: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {label.slice(0, 1).toUpperCase()}
        </span>
        {relatedEntity ? (
          <Link
            to={`/entities/${relatedEntity.id}`}
            style={{
              color: 'var(--color-text)',
              textDecoration: 'none',
              overflowWrap: 'anywhere',
            }}
          >
            {label}
          </Link>
        ) : (
          <span style={{ overflowWrap: 'anywhere' }}>{label}</span>
        )}
      </div>
    )
  }

  if (fieldType === 'tasks') {
    // Strip internal prefixes: [x] = done, [~] = archived (hidden in preview)
    if (item.startsWith('[~] ')) return null
    const isDone = item.startsWith('[x] ')
    const text = isDone ? item.slice(4) : item
    return (
      <div
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)',
          padding: 'var(--space-3)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface)',
          fontSize: 13, color: isDone ? 'var(--color-text-secondary)' : 'var(--color-text)',
          lineHeight: 1.5, opacity: isDone ? 0.65 : 1,
        }}
      >
        <div
          style={{
            width: 16, height: 16, borderRadius: 'var(--radius-sm)',
            border: isDone ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border-strong)',
            backgroundColor: isDone ? 'var(--color-primary)' : 'var(--color-bg)',
            flexShrink: 0, marginTop: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {isDone && <Check size={10} strokeWidth={2.5} color="white" />}
        </div>
        <span style={{ overflowWrap: 'anywhere', textDecoration: isDone ? 'line-through' : 'none' }}>{text}</span>
      </div>
    )
  }

  return (
    <div
      style={{
        padding: 'var(--space-4)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        backgroundColor: 'var(--color-surface)',
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: 'var(--color-text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 'var(--space-2)',
        }}
      >
        Abschnitt
      </div>
      <div
        style={{
          fontSize: 13,
          color: 'var(--color-text)',
          lineHeight: 1.6,
          overflowWrap: 'anywhere',
        }}
      >
        {item}
      </div>
    </div>
  )
}


function toSingular(label: string) {
  return label.endsWith('s') ? label.slice(0, -1) : label
}

type WriterAction = 'bold' | 'italic' | 'strike' | 'h1' | 'h2' | 'pill' | 'dialogue' | 'divider'

function handleWriterShortcut(
  event: React.KeyboardEvent<HTMLDivElement>,
  editor: HTMLDivElement | null,
  setValue: (value: string) => void,
) {
  if (!editor) return false
  if (!(event.metaKey || event.ctrlKey) || event.altKey) return false

  const key = event.key.toLowerCase()
  let action: WriterAction | null = null

  if (key === 'b') action = 'bold'
  else if (key === 'i') action = 'italic'
  else if (key === 'd') action = 'divider'
  else if (key === '1') action = 'h1'
  else if (key === '2') action = 'h2'
  else if (key === '7' && event.shiftKey) action = 'strike'

  if (!action) return false

  event.preventDefault()
  applyWriterCommand(editor, action)
  setValue(sanitizeWriterHtml(editor.innerHTML))
  return true
}

function handleWriterStructuralKeys(
  event: React.KeyboardEvent<HTMLDivElement>,
  editor: HTMLDivElement | null,
  setValue: (value: string) => void,
) {
  if (!editor) return false
  if (event.key !== 'Enter' || event.shiftKey) return false

  const selection = window.getSelection()
  const anchorNode = selection?.anchorNode
  if (!anchorNode) return false
  const anchorElement = anchorNode instanceof Element ? anchorNode : anchorNode.parentElement
  const dialogueRoot = anchorElement?.closest?.('[data-role="dialogue"]') as HTMLDivElement | null
  if (!dialogueRoot) return false

  event.preventDefault()
  const paragraph = document.createElement('p')
  paragraph.innerHTML = '<br>'
  dialogueRoot.insertAdjacentElement('afterend', paragraph)
  placeCaretAtStart(paragraph)
  setValue(sanitizeWriterHtml(editor.innerHTML))
  return true
}

function WriterToolbar({
  compact,
  mobile,
  onAction,
}: {
  compact: boolean
  mobile: boolean
  onAction: (action: WriterAction) => void
}) {
  const actions: Array<{ action: WriterAction; label: string; title: string; style?: React.CSSProperties }> = [
    { action: 'bold', label: 'B', title: 'Fett', style: { fontWeight: 700 } },
    { action: 'italic', label: 'I', title: 'Kursiv', style: { fontStyle: 'italic' } },
    { action: 'strike', label: 'S', title: 'Durchgestrichen', style: { textDecoration: 'line-through' } },
    { action: 'h1', label: 'H1', title: 'Große Überschrift' },
    { action: 'h2', label: 'H2', title: 'Kleine Überschrift' },
    { action: 'pill', label: 'Pill', title: 'Pill / Badge' },
    { action: 'dialogue', label: 'Dialog', title: 'Charakterdialog' },
    { action: 'divider', label: '---', title: 'Trennlinie' },
  ]

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--space-2)',
        marginBottom: 'var(--space-4)',
        paddingBottom: 'var(--space-4)',
        borderBottom: '1px solid var(--color-border)',
        alignItems: 'stretch',
      }}
    >
      {actions.map((item) => (
        <button
          key={item.action}
          type="button"
          onClick={() => onAction(item.action)}
          title={item.title}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: mobile ? '1 1 calc(50% - var(--space-2))' : '0 0 auto',
            minWidth: mobile ? 0 : compact ? 36 : item.action === 'pill' ? 52 : 40,
            height: 32,
            padding: compact ? '0 var(--space-2)' : '0 var(--space-3)',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text)',
            fontSize: item.action === 'pill' ? 11 : 13,
            fontWeight: 600,
            fontFamily: 'var(--font-ui)',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
            ...item.style,
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

function applyWriterCommand(editor: HTMLDivElement, action: WriterAction) {
  editor.focus()
  if (action === 'bold') document.execCommand('bold')
  else if (action === 'italic') document.execCommand('italic')
  else if (action === 'strike') document.execCommand('strikeThrough')
  else if (action === 'h1') document.execCommand('formatBlock', false, 'h3')
  else if (action === 'h2') document.execCommand('formatBlock', false, 'h4')
  else if (action === 'pill') insertWriterHtml(editor, '<span data-role="pill">Label</span>&nbsp;')
  else if (action === 'dialogue') insertWriterHtml(editor, createDialogueHtml('Charakter', 'Gesprochener Dialog', true))
  else if (action === 'divider') insertWriterHtml(editor, '<hr />')
}

function insertWriterHtml(editor: HTMLDivElement, html: string) {
  editor.focus()
  document.execCommand('insertHTML', false, html)
  moveCaretToWriterMarker(editor)
}

function createDialogueHtml(speaker: string, speech: string, withTrailingCursor = false) {
  const trailingParagraph = withTrailingCursor
    ? '<p><span data-role="cursor-marker">\u200b</span><br></p>'
    : '<p><br></p>'
  return `<div data-role="dialogue"><div data-role="speaker">${escapeHtml(speaker)}</div><p>„${escapeHtml(speech)}“</p></div>${trailingParagraph}`
}

function moveCaretToWriterMarker(editor: HTMLDivElement) {
  const marker = editor.querySelector('[data-role="cursor-marker"]')
  if (!marker) return
  placeCaretAtStart(marker)
  marker.parentNode?.removeChild(marker)
}

function placeCaretAtStart(node: Node) {
  const selection = window.getSelection()
  if (!selection) return
  const range = document.createRange()
  range.setStart(node, 0)
  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
}

function getWriterPlainText(value: string) {
  if (!value.trim()) return ''
  const temp = typeof document !== 'undefined' ? document.createElement('div') : null
  if (!temp) return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  temp.innerHTML = getWriterEditorHtml(value)
  return (temp.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function sanitizeWriterHtml(html: string) {
  if (typeof document === 'undefined') return html
  const parser = new DOMParser()
  const parsed = parser.parseFromString(`<div>${html}</div>`, 'text/html')
  const root = parsed.body.firstElementChild as HTMLDivElement | null
  if (!root) return ''
  const allowedTags = new Set(['DIV', 'P', 'H3', 'H4', 'STRONG', 'EM', 'S', 'HR', 'SPAN', 'BR'])

  const walk = (node: Element) => {
    Array.from(node.children).forEach((child) => {
      if (!allowedTags.has(child.tagName)) {
        child.replaceWith(...Array.from(child.childNodes))
        return
      }
      Array.from(child.attributes).forEach((attribute) => {
        if (attribute.name === 'data-role') return
        if (attribute.name.startsWith('on')) {
          child.removeAttribute(attribute.name)
          return
        }
        child.removeAttribute(attribute.name)
      })
      walk(child)
    })
  }

  walk(root)
  return root.innerHTML
}

function renderLegacyInlineHtml(input: string) {
  return escapeHtml(input)
    .replace(/\[\[pill:(.+?)\]\]/g, '<span data-role="pill">$1</span>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
}

function getWriterEditorHtml(value: string) {
  if (!value.trim()) return ''
  if (/<[a-z][\s\S]*>/i.test(value)) return sanitizeWriterHtml(value)

  const normalizedText = value.replace(/\[\[say:([^|\]]+)\|(.+?)\]\]/g, '\n[[say:$1|$2]]\n')
  return normalizedText
    .split('\n')
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed) return '<p><br></p>'
      if (trimmed === '---') return '<hr />'
      if (trimmed.startsWith('## ')) return `<h4>${renderLegacyInlineHtml(trimmed.slice(3))}</h4>`
      if (trimmed.startsWith('# ')) return `<h3>${renderLegacyInlineHtml(trimmed.slice(2))}</h3>`
      if (trimmed.startsWith('[[say:') && trimmed.endsWith(']]')) {
        const content = trimmed.slice(6, -2)
        const separatorIndex = content.indexOf('|')
        const speaker = separatorIndex >= 0 ? content.slice(0, separatorIndex).trim() : 'Dialog'
        const speech = separatorIndex >= 0 ? content.slice(separatorIndex + 1).trim() : content.trim()
        return createDialogueHtml(speaker, speech)
      }
      return `<p>${renderLegacyInlineHtml(line)}</p>`
    })
    .join('')
}

function WriterRenderedContent({ text, compact }: { text: string; compact: boolean }) {
  return (
    <div
      className={`writer-rendered${compact ? ' writer-rendered-compact' : ''}`}
      dangerouslySetInnerHTML={{ __html: getWriterEditorHtml(text) }}
    />
  )
}


const metaLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--color-text-secondary)',
  fontFamily: 'var(--font-ui)',
}

function badgeStyle(color: string, backgroundColor: string): React.CSSProperties {
  return {
    padding: '3px 10px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor,
    color,
    fontSize: 11,
    fontWeight: 500,
    fontFamily: 'var(--font-ui)',
  }
}

const coverBadgeStyle: React.CSSProperties = {
  padding: '3px 10px',
  borderRadius: 'var(--radius-sm)',
  backgroundColor: 'rgba(255,255,255,0.22)',
  backdropFilter: 'blur(4px)',
  color: '#fff',
  fontSize: 11,
  fontWeight: 500,
  fontFamily: 'var(--font-ui)',
}

const overlayButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  height: 28,
  padding: '0 10px',
  borderRadius: 'var(--radius-md)',
  border: 'none',
  backgroundColor: 'rgba(255,255,255,0.82)',
  backdropFilter: 'blur(4px)',
  color: 'var(--color-text)',
  fontSize: 12,
  fontWeight: 500,
  fontFamily: 'var(--font-ui)',
  cursor: 'pointer',
  boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
}

const emptyFieldValueStyle: React.CSSProperties = {
  marginTop: 4,
  fontSize: 13,
  color: 'var(--color-text-placeholder)',
  lineHeight: 1.6,
  fontStyle: 'italic',
}

const sectionIconActionStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-full)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-secondary)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
}

const quickAddPanelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-3)',
  marginBottom: 'var(--space-4)',
}

const quickAddInputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 40,
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--color-surface)',
  padding: '0 var(--space-4)',
  fontFamily: 'var(--font-ui)',
  fontSize: 15,
  color: 'var(--color-text)',
  outline: 'none',
}

const quickAddTextareaStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--color-surface)',
  padding: 'var(--space-3) var(--space-4)',
  fontFamily: 'var(--font-ui)',
  fontSize: 15,
  color: 'var(--color-text)',
  outline: 'none',
  resize: 'vertical',
}

const quickAddPrimaryButtonStyle: React.CSSProperties = {
  height: 32,
  padding: '0 var(--space-3)',
  borderRadius: 'var(--radius-md)',
  border: 'none',
  backgroundColor: 'var(--color-primary)',
  color: 'var(--color-primary-text)',
  fontFamily: 'var(--font-ui)',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
}

const quickAddSecondaryButtonStyle: React.CSSProperties = {
  height: 32,
  padding: '0 var(--space-3)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-secondary)',
  fontFamily: 'var(--font-ui)',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
}

const compactFieldActionStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-full)',
  backgroundColor: 'var(--color-bg)',
  color: 'var(--color-text-secondary)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
}
