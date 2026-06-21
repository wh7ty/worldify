import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import TagInput from '../ui/TagInput'
import {
  categoryFieldTypeMeta,
  mapEntityRow,
  statusMeta,
  type CategoryField,
  type DatabaseEntityRow,
  type Entity,
  type EntityStatus,
  type EntityType,
} from '../../data/mockWorld'
import { getEntityCategorySlug, setEntityCategorySlug } from '../../lib/entityCategoryAssignments'
import { resolveCategoryForEntityType } from '../../lib/categoryResolution'
import { getEntityFieldValues, saveEntityFieldValues } from '../../lib/entityFieldValues'
import { useWorldStore } from '../../store/useWorldStore'
import { supabase } from '../../lib/supabase'

const statusOptions = Object.keys(statusMeta) as EntityStatus[]

const ENTITY_TEMPLATES: Partial<Record<string, { label: string; tags: string[] }[]>> = {
  character: [
    { label: 'Held', tags: ['Protagonist', 'Held'] },
    { label: 'Antagonist', tags: ['Antagonist', 'Schurke'] },
    { label: 'Mentor', tags: ['Mentor', 'Weiser'] },
    { label: 'Sidekick', tags: ['Sidekick', 'Begleiter'] },
    { label: 'Händler', tags: ['Händler', 'NPC'] },
  ],
  location: [
    { label: 'Stadt', tags: ['Stadt', 'Siedlung'] },
    { label: 'Festung', tags: ['Festung', 'Militär'] },
    { label: 'Verlies', tags: ['Verlies', 'Dungeon'] },
    { label: 'Wald', tags: ['Wald', 'Natur'] },
    { label: 'Tempel', tags: ['Tempel', 'Religion'] },
  ],
  faction: [
    { label: 'Königreich', tags: ['Königreich', 'Herrschaft'] },
    { label: 'Gilde', tags: ['Gilde', 'Händler'] },
    { label: 'Orden', tags: ['Orden', 'Religion'] },
    { label: 'Geheimbund', tags: ['Geheimnis', 'Schatten'] },
  ],
  creature: [
    { label: 'Bestie', tags: ['Bestie', 'Gefährlich'] },
    { label: 'Geist', tags: ['Geist', 'Übernatürlich'] },
    { label: 'Golem', tags: ['Golem', 'Magisch'] },
    { label: 'Drache', tags: ['Drache', 'Mächtig'] },
  ],
  item: [
    { label: 'Waffe', tags: ['Waffe', 'Kampf'] },
    { label: 'Artefakt', tags: ['Artefakt', 'Magisch'] },
    { label: 'Relikt', tags: ['Relikt', 'Selten'] },
    { label: 'Trank', tags: ['Trank', 'Konsumierbar'] },
  ],
  magic_system: [
    { label: 'Elementar', tags: ['Elementar', 'Natur'] },
    { label: 'Nekromantie', tags: ['Nekromantie', 'Tod'] },
    { label: 'Runen', tags: ['Runen', 'Schrift'] },
    { label: 'Seelenbindung', tags: ['Seele', 'Bindung'] },
  ],
  story: [
    { label: 'Hauptgeschichte', tags: ['Hauptplot', 'Zentral'] },
    { label: 'Nebenquest', tags: ['Nebenplot', 'Optional'] },
    { label: 'Prolog', tags: ['Prolog', 'Einleitung'] },
    { label: 'Epilog', tags: ['Epilog', 'Abschluss'] },
  ],
}

type EntityDraft = {
  name: string
  type: EntityType
  shortDescription: string
  content: string
  tags: string[]
  status: EntityStatus
  timelineDate: string
  fieldValues: Record<string, string>
}

const initialDraft: EntityDraft = {
  name: '',
  type: 'character',
  shortDescription: '',
  content: '',
  tags: [],
  status: 'draft',
  timelineDate: '',
  fieldValues: {},
}

export default function EntityModal({
  open,
  onClose,
  entity,
  initialType,
  initialCategorySlug,
}: {
  open: boolean
  onClose: () => void
  entity?: Entity | null
  initialType?: EntityType
  initialCategorySlug?: string
}) {
  const updateEntityLocal = useWorldStore((state) => state.updateEntityLocal)
  const activeUniverseId = useWorldStore((state) => state.activeUniverseId)
  const loadWorldData = useWorldStore((state) => state.loadWorldData)
  const libraryItems = useWorldStore((state) => state.libraryItems)
  const entities = useWorldStore((state) => state.entities)
  const showToast = useWorldStore((state) => state.showToast)

  const tagSuggestions = useMemo(() => {
    const all = new Set<string>()
    entities.filter((e) => e.universeId === activeUniverseId).forEach((e) => e.tags.forEach((t) => all.add(t)))
    return Array.from(all).sort()
  }, [entities, activeUniverseId])
  const [draft, setDraft] = useState<EntityDraft>(initialDraft)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const wasOpenRef = useRef(false)
  const initialCategory = initialCategorySlug
    ? libraryItems.find((item) => item.kind === 'category' && item.slug === initialCategorySlug)
    : undefined

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current
    wasOpenRef.current = open

    if (!open || !justOpened) {
      return
    }

    if (!entity) {
      setDraft({
        ...initialDraft,
        type:
          initialCategory?.kind === 'category' && initialCategory.entityType
            ? initialCategory.entityType
            : initialType ?? 'character',
        fieldValues: {},
      })
      return
    }

    setDraft({
      name: entity.name,
      type: entity.type,
      shortDescription: entity.shortDescription,
      content: entity.content,
      tags: entity.tags,
      status: entity.status,
      timelineDate: entity.timelineDate ?? '',
      fieldValues: getEntityFieldValues(entity.id),
    })
  }, [entity, initialCategory, initialType, open])

  if (!open) {
    return null
  }

  const reset = () => {
    setDraft(initialDraft)
    setSubmitError(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const assignedCategorySlug = entity ? getEntityCategorySlug(entity.id) : initialCategorySlug
  const boundCategory = assignedCategorySlug
    ? libraryItems.find((item) => item.kind === 'category' && item.slug === assignedCategorySlug)
    : undefined
  const resolvedCategory = resolveCategoryForEntityType(libraryItems, draft.type, assignedCategorySlug)
  const activeCategory = boundCategory?.kind === 'category' ? boundCategory : resolvedCategory
  const categoryFields: CategoryField[] = activeCategory?.kind === 'category' ? activeCategory.fields ?? [] : []
  const isCategoryBound = Boolean(boundCategory?.kind === 'category')
  const modalTitle = entity
    ? 'Entity bearbeiten'
    : activeCategory?.kind === 'category'
      ? `${activeCategory.singular ?? activeCategory.label} erstellen`
      : 'New Entity'

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!draft.name.trim()) {
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    const cleanTags = draft.tags

    if (entity) {
      const { error } = await supabase
        .from('entities')
        .update({
          type: draft.type,
          name: draft.name.trim(),
          short_description: draft.shortDescription.trim() || null,
          content: draft.content.trim() || null,
          tags: cleanTags,
          status: draft.status,
          timeline_date: draft.timelineDate || null,
          category_slug: activeCategory?.kind === 'category' ? activeCategory.slug : null,
          field_values: draft.fieldValues,
        })
        .eq('id', entity.id)

      if (error) {
        setIsSubmitting(false)
        setSubmitError(error.message)
        return
      }

      updateEntityLocal(entity.id, {
        name: draft.name.trim(),
        type: draft.type,
        shortDescription: draft.shortDescription.trim(),
        content: draft.content.trim(),
        tags: cleanTags,
        status: draft.status,
        timelineDate: draft.timelineDate || undefined,
      })
      if (activeCategory?.kind === 'category') {
        setEntityCategorySlug(entity.id, activeCategory.slug)
      }
      saveEntityFieldValues(entity.id, draft.fieldValues)
    } else {
      const { data, error } = await supabase
        .from('entities')
        .insert({
          universe_id: activeUniverseId,
          type: draft.type,
          name: draft.name.trim(),
          short_description: draft.shortDescription.trim() || null,
          content: draft.content.trim() || null,
          tags: cleanTags,
          status: draft.status,
          timeline_date: draft.timelineDate || null,
          category_slug: activeCategory?.kind === 'category' ? activeCategory.slug : null,
          field_values: draft.fieldValues,
        })
        .select('id, universe_id, type, name, short_description, content, tags, status, created_at, updated_at, timeline_date')
        .single()

      if (error) {
        setIsSubmitting(false)
        setSubmitError(error.message)
        return
      }

      const createdEntity = mapEntityRow(data as DatabaseEntityRow)
      if (activeCategory?.kind === 'category') {
        setEntityCategorySlug(createdEntity.id, activeCategory.slug)
      }
      saveEntityFieldValues(createdEntity.id, draft.fieldValues)
    }

    await loadWorldData()

    setIsSubmitting(false)
    showToast(entity ? `„${draft.name.trim()}" gespeichert` : `„${draft.name.trim()}" erstellt`)
    handleClose()
  }

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(28,25,23,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-8)',
        zIndex: 100,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 720,
          maxHeight: '85vh',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--color-border)',
          padding: 'var(--space-8)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 'var(--space-4)',
            marginBottom: 'var(--space-6)',
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 24,
                fontWeight: 600,
                color: 'var(--color-text)',
                marginBottom: 'var(--space-2)',
              }}
            >
              {modalTitle}
            </h2>
            <p
              style={{
                fontSize: 13,
                color: 'var(--color-text-secondary)',
                maxWidth: '65ch',
              }}
            >
              {entity
                ? 'Passe Name, Typ, Tags und Inhalte direkt fur dieses Entity an.'
                : 'Erstelle ein neues Entity fur dein aktuelles Universe.'}
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={16} strokeWidth={1.5} color="var(--color-text-secondary)" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            flex: 1,
          }}
        >
          <div
            className="worldify-thin-scrollbar"
            style={{
              overflowY: 'auto',
              paddingRight: 'var(--space-2)',
              marginRight: '-8px',
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--color-border-strong) transparent',
            }}
          >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 'var(--space-5)',
              marginBottom: 'var(--space-5)',
            }}
          >
            <Field label="Name">
              <Input value={draft.name} onChange={(value) => setDraft((current) => ({ ...current, name: value }))} placeholder="Elara Moonwhisper" />
            </Field>
            {isCategoryBound && activeCategory?.kind === 'category' ? (
              <Field label="Kategorie">
                <div
                  style={{
                    ...inputStyle,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'var(--space-3)',
                    backgroundColor: 'var(--color-bg)',
                  }}
                >
                  <span>{activeCategory.label}</span>
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--color-text-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {activeCategory.singular ?? 'Individuell'}
                  </span>
                </div>
              </Field>
            ) : (
              <Field label="Kategorie">
                <Select
                  value={draft.type}
                  onChange={(value) => {
                    setDraft((current) => ({ ...current, type: value as EntityType }))
                  }}
                >
                  <option value="">-- Kategorie wählen --</option>
                  {libraryItems
                    .filter((item) => item.kind === 'category')
                    .map((cat) => (
                      <option key={cat.id} value={cat.entityType ?? 'character'}>
                        {cat.label}
                      </option>
                    ))}
                </Select>
              </Field>
            )}
            <Field label="Status">
              <Select value={draft.status} onChange={(value) => setDraft((current) => ({ ...current, status: value as EntityStatus }))}>
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {statusMeta[option].label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tags">
              <TagInput
                value={draft.tags}
                onChange={(tags) => setDraft((current) => ({ ...current, tags }))}
                suggestions={tagSuggestions}
              />
            </Field>
            <Field label="Timeline-Datum">
              <input
                type="date"
                value={draft.timelineDate}
                onChange={(e) => setDraft((current) => ({ ...current, timelineDate: e.target.value }))}
                style={{
                  width: '100%',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-surface)',
                  padding: 'var(--space-3) var(--space-4)',
                  fontFamily: 'var(--font-ui)',
                  fontSize: 15,
                  color: draft.timelineDate ? 'var(--color-text)' : 'var(--color-text-secondary)',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </Field>
          </div>

          {!entity && ENTITY_TEMPLATES[draft.type] ? (
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Schnellstart-Vorlage
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ENTITY_TEMPLATES[draft.type]!.map((tpl) => {
                  const isActive = tpl.tags.every((tag) => draft.tags.includes(tag))
                  return (
                    <button
                      key={tpl.label}
                      type="button"
                      onClick={() => {
                        setDraft((current) => ({
                          ...current,
                          tags: isActive ? [] : tpl.tags,
                        }))
                      }}
                      style={{
                        padding: '5px 14px',
                        borderRadius: 'var(--radius-sm)',
                        border: isActive ? 'none' : '1px solid var(--color-border)',
                        backgroundColor: isActive ? 'var(--color-primary)' : 'var(--color-bg)',
                        color: isActive ? '#fff' : 'var(--color-text-secondary)',
                        fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-ui)',
                        cursor: 'pointer', transition: 'all 120ms ease',
                      }}
                    >
                      {tpl.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

          <div style={{ marginBottom: 'var(--space-5)' }}>
            <Field label="Short Description">
              <Textarea
                value={draft.shortDescription}
                onChange={(value) => setDraft((current) => ({ ...current, shortDescription: value }))}
                placeholder="Kurze Einordnung fur Karten und Listen."
                rows={3}
              />
            </Field>
          </div>

          {categoryFields.length > 0 ? (
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-5)',
                }}
              >
                <div>
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
                    Kategorie-Felder
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                    Diese Felder kommen direkt aus deiner Kategorie-Definition.
                  </p>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    gap: 'var(--space-5)',
                  }}
                >
                  {categoryFields.map((field: CategoryField) => (
                    <CategoryFieldInput
                      key={field.id}
                      field={field}
                      value={draft.fieldValues[field.id] ?? ''}
                      onChange={(value) =>
                        setDraft((current) => ({
                          ...current,
                          fieldValues: {
                            ...current.fieldValues,
                            [field.id]: value,
                          },
                        }))
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {submitError ? (
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
              {submitError}
            </div>
          ) : null}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 'var(--space-4)',
              paddingTop: 'var(--space-4)',
              marginTop: 'var(--space-2)',
              borderTop: '1px solid var(--color-border)',
            }}
          >
            <p style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
              {entity ? 'Aenderungen werden direkt in Supabase gespeichert.' : 'Das neue Entity wird direkt in Supabase angelegt.'}
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button type="button" onClick={handleClose} style={secondaryButtonStyle}>
                Cancel
              </button>
              <button type="submit" style={primaryButtonStyle}>
                {isSubmitting ? (entity ? 'Saving...' : 'Creating...') : entity ? 'Save Changes' : 'Create Entity'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

function CategoryFieldInput({
  field,
  value,
  onChange,
}: {
  field: CategoryField
  value: string
  onChange: (value: string) => void
}) {
  const placeholder = `${field.name} (${categoryFieldTypeMeta[field.type]})`

  if (field.type === 'participants' || field.type === 'tasks' || field.type === 'sections') {
    return (
      <StructuredFieldInput
        field={field}
        value={value}
        onChange={onChange}
      />
    )
  }

  const isLongField = field.type === 'textarea'

  return (
    <Field label={field.name} hint={categoryFieldTypeMeta[field.type]}>
      {isLongField ? (
        <Textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={4}
        />
      ) : (
        <Input
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />
      )}
    </Field>
  )
}

function StructuredFieldInput({
  field,
  value,
  onChange,
}: {
  field: CategoryField
  value: string
  onChange: (value: string) => void
}) {
  const items = value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)

  const addItem = () => {
    const nextItemLabel = field.type === 'participants'
      ? 'Neue Person'
      : field.type === 'tasks'
        ? 'Neue Aufgabe'
        : 'Neuer Abschnitt'

    onChange([...items, nextItemLabel].join('\n'))
  }

  const updateItem = (index: number, nextValue: string) => {
    const nextItems = [...items]
    nextItems[index] = nextValue
    onChange(nextItems.filter(Boolean).join('\n'))
  }

  const removeItem = (index: number) => {
    const nextItems = items.filter((_, itemIndex) => itemIndex !== index)
    onChange(nextItems.join('\n'))
  }

  return (
    <Field label={field.name} hint={categoryFieldTypeMeta[field.type]}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
        }}
      >
        {items.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--color-text-placeholder)', fontStyle: 'italic' }}>
            Noch keine Einträge.
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={`${field.id}-${index}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
              }}
            >
              <input
                value={item}
                onChange={(event) => updateItem(index, event.target.value)}
                placeholder={`${field.name} ${index + 1}`}
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => removeItem(index)}
                style={smallIconButtonStyle}
              >
                <X size={14} strokeWidth={1.5} />
              </button>
            </div>
          ))
        )}

        <button
          type="button"
          onClick={addItem}
          style={addRowButtonStyle}
        >
          <Plus size={14} strokeWidth={1.5} />
          {field.type === 'participants'
            ? 'Person hinzufügen'
            : field.type === 'tasks'
              ? 'Aufgabe hinzufügen'
              : 'Abschnitt hinzufügen'}
        </button>
      </div>
    </Field>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--color-text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {label}
        </span>
        {hint ? (
          <span
            style={{
              fontSize: 11,
              color: 'var(--color-text-placeholder)',
              fontFamily: 'var(--font-ui)',
            }}
          >
            {hint}
          </span>
        ) : null}
      </div>
      {children}
    </label>
  )
}

function Input({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      style={inputStyle}
    />
  )
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} style={inputStyle}>
      {children}
    </select>
  )
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  rows: number
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        ...inputStyle,
        resize: 'vertical',
        paddingTop: 'var(--space-3)',
        paddingBottom: 'var(--space-3)',
      }}
    />
  )
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

const primaryButtonStyle: React.CSSProperties = {
  height: 36,
  padding: '0 var(--space-4)',
  borderRadius: 'var(--radius-md)',
  border: 'none',
  backgroundColor: 'var(--color-primary)',
  color: 'var(--color-primary-text)',
  fontFamily: 'var(--font-ui)',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
}

const secondaryButtonStyle: React.CSSProperties = {
  height: 36,
  padding: '0 var(--space-4)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-ui)',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
}

const addRowButtonStyle: React.CSSProperties = {
  height: 32,
  padding: '0 var(--space-3)',
  borderRadius: 'var(--radius-md)',
  border: '1px dashed var(--color-border-strong)',
  backgroundColor: 'var(--color-bg)',
  color: 'var(--color-text-secondary)',
  fontFamily: 'var(--font-ui)',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  alignSelf: 'flex-start',
}

const smallIconButtonStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-secondary)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  flexShrink: 0,
}
