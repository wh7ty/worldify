import { useEffect, useState } from 'react'
import { X, Users, MapPin, Shield, Sparkles, Cog, Languages, PenSquare, CirclePlus, Bug, Package, BookOpen, Calendar, ArrowLeft, ChevronRight, Plus, Type, AlignLeft, Hash, UsersRound, Layers, ListChecks, Minus, Trash2, Image as ImageIcon } from 'lucide-react'
import { categoryFieldTypeMeta, type CategoryField, type CategoryFieldType, type EntityType, type SidebarCategoryItem } from '../../data/mockWorld'

import { supabase } from '../../lib/supabase'
import { useWorldStore } from '../../store/useWorldStore'
import { categoryFieldDefaultIcons, categoryIconOptions, getCategoryIcon } from '../../lib/categoryIcons'
import { compressIfNeeded } from '../../lib/imageUtils'

const suggestions: Array<{
  label: string
  description: string
  icon: React.ElementType
  iconName: string
  entityType?: EntityType
}> = [
  { label: 'Characters', description: 'Charaktere und wichtige Figuren.', icon: Users, iconName: 'users', entityType: 'character' },
  { label: 'Locations', description: 'Orte, Regionen und Schauplätze.', icon: MapPin, iconName: 'map-pin', entityType: 'location' },
  { label: 'Factions', description: 'Fraktionen, Gilden und Gruppen.', icon: Shield, iconName: 'shield', entityType: 'faction' },
  { label: 'Magic Systems', description: 'Magie, Kräfte und übernatürliche Systeme.', icon: Sparkles, iconName: 'sparkles', entityType: 'magic_system' },
  { label: 'Creatures', description: 'Monster, Tiere und Wesen.', icon: Bug, iconName: 'bug', entityType: 'creature' },
  { label: 'Languages', description: 'Sprachen, Schriften und Dialekte.', icon: Languages, iconName: 'languages', entityType: 'language' },
  { label: 'Items', description: 'Gegenstände, Artefakte und Ausrüstung.', icon: Package, iconName: 'package', entityType: 'item' },
  { label: 'Stories', description: 'Geschichten, Abenteuer und Handlungsbögen.', icon: BookOpen, iconName: 'book-open', entityType: 'story' },
  { label: 'Events', description: 'Ereignisse und historische Momente.', icon: Calendar, iconName: 'calendar', entityType: 'event' },
  { label: 'Technologien', description: 'Technologien, Erfindungen und Maschinen.', icon: Cog, iconName: 'cog' },
  { label: 'Schriften', description: 'Dokumente, Bücher und Texte.', icon: PenSquare, iconName: 'pen-square' },
]

const fieldTypeIcon: Record<CategoryFieldType, React.ElementType> = {
  text: Type,
  textarea: AlignLeft,
  number: Hash,
  participants: UsersRound,
  sections: Layers,
  tasks: ListChecks,
}

const COLOR_PRESETS = [
  '#e5534b', '#e07332', '#d4a017', '#3ba96e',
  '#2993b3', '#3b7dd8', '#7c5ce4', '#c45ca8',
  '#8a6548', '#5a6578',
]

const quickFieldSuggestions: Array<{ name: string; type: CategoryFieldType }> = [
  { name: 'Beschreibung', type: 'textarea' },
  { name: 'Status', type: 'text' },
  { name: 'Tags', type: 'text' },
  { name: 'Anzahl', type: 'number' },
  { name: 'Teilnehmer', type: 'participants' },
  { name: 'Aufgaben', type: 'tasks' },
]

export default function CategoryModal({
  open,
  onClose,
  onDeleteCategory,
  editingCategory,
}: {
  open: boolean
  onClose: () => void
  onDeleteCategory?: (category: SidebarCategoryItem) => void
  editingCategory?: SidebarCategoryItem | null
}) {
  const addCustomCategory = useWorldStore((state) => state.addCustomCategory)
  const updateCustomCategory = useWorldStore((state) => state.updateCustomCategory)
  const addLibraryDivider = useWorldStore((state) => state.addLibraryDivider)
  const user = useWorldStore((state) => state.user)
  const [dividerText, setDividerText] = useState('')
  const [customName, setCustomName] = useState('')
  const [customSingular, setCustomSingular] = useState('')
  const [customDescription, setCustomDescription] = useState('')
  const [customIcon, setCustomIcon] = useState<string>('sticky-note')
  const [customEntityType, setCustomEntityType] = useState<EntityType | undefined>(undefined)
  const [customColor, setCustomColor] = useState<string | undefined>(undefined)
  const [customIconUrl, setCustomIconUrl] = useState<string | undefined>(undefined)
  const [iconUploading, setIconUploading] = useState(false)
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const [fields, setFields] = useState<CategoryField[]>([])
  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldType, setNewFieldType] = useState<CategoryFieldType>('text')
  const [typePickerOpen, setTypePickerOpen] = useState(false)
  const [fieldIconPickerId, setFieldIconPickerId] = useState<string | null>(null)
  const [view, setView] = useState<'list' | 'custom' | 'divider'>('list')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleClose = () => {
    setCustomName('')
    setCustomSingular('')
    setCustomDescription('')
    setCustomIcon('sticky-note')
    setCustomColor(undefined)
    setCustomEntityType(undefined)
    setCustomIconUrl(undefined)
    setFields([])
    setNewFieldName('')
    setNewFieldType('text')
    setIconPickerOpen(false)
    setFieldIconPickerId(null)
    setDividerText('')
    setView('list')
    setShowDeleteConfirm(false)
    setFormError(null)
    setIsSaving(false)
    onClose()
  }

  useEffect(() => {
    if (!open || !editingCategory) {
      return
    }

    setCustomName(editingCategory.label)
    setCustomSingular(editingCategory.singular ?? '')
    setCustomDescription(editingCategory.description ?? '')
    setCustomIcon(editingCategory.icon ?? 'sticky-note')
    setCustomColor(editingCategory.color)
    setCustomEntityType(editingCategory.entityType)
    setCustomIconUrl(editingCategory.iconUrl)
    setFields(editingCategory.fields ?? [])
    setView('custom')
  }, [editingCategory, open])

  if (!open) {
    return null
  }

  const handleAddDivider = () => {
    addLibraryDivider(dividerText.trim() || undefined)
    handleClose()
  }

  const addField = () => {
    if (!newFieldName.trim()) return
    setFields((prev) => [...prev, {
      id: `field-${Date.now()}`,
      name: newFieldName.trim(),
      type: newFieldType,
      icon: categoryFieldDefaultIcons[newFieldType],
    }])
    setNewFieldName('')
    setNewFieldType('text')
  }

  const addSuggestedField = (name: string, type: CategoryFieldType) => {
    const exists = fields.some((field) => field.name.toLowerCase() === name.toLowerCase())

    if (exists) {
      return
    }

    setFields((prev) => [...prev, { id: `field-${Date.now()}`, name, type, icon: categoryFieldDefaultIcons[type] }])
  }

  const removeField = (id: string) => setFields((prev) => prev.filter((f) => f.id !== id))

  const updateFieldIcon = (id: string, icon: string) => {
    setFields((prev) => prev.map((field) => field.id === id ? { ...field, icon } : field))
    setFieldIconPickerId(null)
  }

  // Suggestion klick → Setup-Form vorausfüllen, dann customisieren
  const handleSuggestion = (s: typeof suggestions[number]) => {
    setCustomName(s.label)
    setCustomDescription(s.description)
    setCustomIcon(s.iconName)
    setCustomEntityType(s.entityType)
    setCustomColor(undefined)
    setFields([])
    setView('custom')
  }

  const handleCustom = async () => {
    if (!customName.trim()) {
      return
    }

    const normalizedName = customName.trim().toLowerCase()
    const hasConflict = useWorldStore.getState().libraryItems.some((item) =>
      item.kind === 'category' &&
      item.id !== editingCategory?.id &&
      item.label.trim().toLowerCase() === normalizedName,
    )

    if (hasConflict) {
      setFormError('Es gibt bereits eine Kategorie mit diesem Namen.')
      return
    }

    const payload = {
      label: customName.trim(),
      singular: customSingular.trim() || undefined,
      description: customDescription.trim() || undefined,
      icon: customIcon,
      iconUrl: customIconUrl,
      color: customColor,
      entityType: customEntityType,
      fields,
    }

    setIsSaving(true)
    const saved = editingCategory
      ? await updateCustomCategory(editingCategory.id, payload)
      : await addCustomCategory(payload)
    setIsSaving(false)
    if (!saved) {
      setFormError('Die Kategorie konnte nicht sicher synchronisiert werden. Bitte erneut versuchen.')
      return
    }
    setFormError(null)
    handleClose()
  }

  const handleDeleteCategory = () => {
    if (!editingCategory || !onDeleteCategory) {
      return
    }

    onDeleteCategory(editingCategory)
    setShowDeleteConfirm(false)
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
        zIndex: 110,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 580,
          height: '85vh',
          maxHeight: 760,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)',
          padding: 'var(--space-8)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
            marginBottom: 'var(--space-6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0 }}>
            {view !== 'list' ? (
              <button onClick={() => setView('list')} style={{
                width: 32, height: 32, borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0,
              }}>
                <ArrowLeft size={16} strokeWidth={1.5} color="var(--color-text-secondary)" />
              </button>
            ) : null}
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-ui)' }}>
                {view === 'list' ? 'Kategorie hinzufügen' : view === 'custom' ? (editingCategory ? 'Kategorie bearbeiten' : 'Eigene Kategorie') : 'Trennzeichen'}
              </h2>
              <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', marginTop: 2 }}>
                {view === 'list' ? 'Vorschläge wählen oder eigene erstellen' : view === 'custom' ? 'Name, Felder und Module zentral verwalten' : 'Optionaler Text, zentriert'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              width: 32, height: 32, borderRadius: 'var(--radius-full)',
              border: 'none', backgroundColor: 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <X size={18} strokeWidth={1.5} color="var(--color-text-secondary)" />
          </button>
        </div>

        {/* ── View: List ── */}
        {view === 'list' ? (
          <div key="list" style={{ animation: 'slideIn 200ms ease-out', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div className="ds-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', flex: 1, overflowY: 'auto', paddingRight: 'var(--space-2)' }}>
              {suggestions.map((suggestion) => {
                const Icon = suggestion.icon
                return (
                  <button
                    key={suggestion.label}
                    onClick={() => handleSuggestion(suggestion)}
                    style={rowButtonStyle}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface)')}
                  >
                    <span style={iconCircleStyle}>
                      <Icon size={16} strokeWidth={1.5} color="var(--color-primary)" />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-ui)' }}>
                        {suggestion.label}
                      </span>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', lineHeight: 1.4 }}>
                        {suggestion.description}
                      </span>
                    </span>
                    <ChevronRight size={16} strokeWidth={1.5} color="var(--color-text-placeholder)" />
                  </button>
                )
              })}

              {/* Eigene Kategorie — leeres Setup */}
              <button
                onClick={() => {
                  setCustomName('')
                  setCustomDescription('')
                  setCustomIcon('sticky-note')
                  setCustomEntityType(undefined)
                  setFields([])
                  setView('custom')
                }}
                style={{ ...rowButtonStyle, border: '1px dashed var(--color-border-strong)', backgroundColor: 'var(--color-bg)' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg)')}
              >
                <span style={iconCircleStyle}>
                  <CirclePlus size={16} strokeWidth={1.5} color="var(--color-primary)" />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-ui)' }}>
                    Eigene Kategorie erstellen
                  </span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', lineHeight: 1.4 }}>
                    Definiere eine komplett neue Kategorie.
                  </span>
                </span>
                <ChevronRight size={16} strokeWidth={1.5} color="var(--color-text-placeholder)" />
              </button>

              {/* Trennzeichen */}
              <button
                onClick={() => { setDividerText(''); setView('divider') }}
                style={{ ...rowButtonStyle, border: '1px dashed var(--color-border-strong)', backgroundColor: 'var(--color-bg)' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg)')}
              >
                <span style={iconCircleStyle}>
                  <Minus size={16} strokeWidth={1.5} color="var(--color-primary)" />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-ui)' }}>
                    Trennzeichen hinzufügen
                  </span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', lineHeight: 1.4 }}>
                    Gruppiert die Sidebar – mit oder ohne Text.
                  </span>
                </span>
                <ChevronRight size={16} strokeWidth={1.5} color="var(--color-text-placeholder)" />
              </button>
            </div>
          </div>
        ) : view === 'divider' ? (
          /* ── View: Divider ── */
          <div key="divider" style={{ animation: 'slideIn 200ms ease-out' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div>
                <label style={fieldLabelStyle}>Text (optional)</label>
                <input
                  autoFocus
                  value={dividerText}
                  onChange={(e) => setDividerText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddDivider() }}
                  placeholder="z.B. Hauptwelt, Nebenwelt..."
                  style={inputStyle}
                />
                <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', marginTop: 'var(--space-2)' }}>
                  Leer lassen für eine reine Trennlinie.
                </p>
              </div>

              {/* Live preview */}
              <div style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-placeholder)', fontFamily: 'var(--font-ui)', marginBottom: 'var(--space-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Vorschau</div>
                {dividerText.trim() ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-border-strong)' }} />
                    <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{dividerText}</span>
                    <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-border-strong)' }} />
                  </div>
                ) : (
                  <div style={{ height: 1, backgroundColor: 'var(--color-border-strong)' }} />
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                <button onClick={() => setView('list')} style={secondaryButtonStyle}>Zurück</button>
                <button onClick={handleAddDivider} style={primaryButtonStyle}>Trennzeichen anlegen</button>
              </div>
            </div>
          </div>
        ) : (
          /* ── View: Custom form ── */
          <div key="custom" className="ds-scroll" style={{ animation: 'slideIn 200ms ease-out', flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 'var(--space-2)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div>
                <label style={fieldLabelStyle}>Name & Icon</label>
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'stretch' }}>
                  {/* Compact icon button + popover */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => { if (!customIconUrl) setIconPickerOpen((o) => !o) }}
                      title={customIconUrl ? 'Eigenes Bild aktiv' : 'Icon wählen'}
                      style={{
                        width: 42, height: 42, borderRadius: 'var(--radius-md)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: customIconUrl ? 'default' : 'pointer',
                        border: iconPickerOpen ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                        backgroundColor: customIconUrl ? 'transparent' : 'var(--color-primary-light)',
                        overflow: 'hidden',
                        padding: 0,
                      }}
                    >
                      {customIconUrl
                        ? <img src={customIconUrl} alt="Icon" style={{ width: 42, height: 42, objectFit: 'cover' }} />
                        : (() => { const Icon = getCategoryIcon(customIcon); return <Icon size={18} strokeWidth={1.5} color="var(--color-primary)" /> })()
                      }
                    </button>

                    {iconPickerOpen ? (
                      <div style={{
                        position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 10,
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: 'var(--shadow-lg)',
                        padding: 'var(--space-2)',
                        display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4,
                        width: 252,
                      }}>
                        {categoryIconOptions.map(({ name, icon: Icon }) => {
                          const selected = customIcon === name
                          return (
                            <button
                              key={name}
                              type="button"
                              onClick={() => { setCustomIcon(name); setIconPickerOpen(false) }}
                              title={name}
                              style={{
                                width: 36, height: 36, borderRadius: 'var(--radius-md)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', border: 'none',
                                backgroundColor: selected ? 'var(--color-primary-light)' : 'transparent',
                                transition: 'background 100ms ease',
                              }}
                              onMouseEnter={(e) => { if (!selected) e.currentTarget.style.backgroundColor = 'var(--color-bg)' }}
                              onMouseLeave={(e) => { if (!selected) e.currentTarget.style.backgroundColor = 'transparent' }}
                            >
                              <Icon size={17} strokeWidth={1.5} color={selected ? 'var(--color-primary)' : 'var(--color-text-secondary)'} />
                            </button>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>

                  <input
                    autoFocus
                    value={customName}
                    onChange={(event) => {
                      setCustomName(event.target.value)
                      if (formError) setFormError(null)
                    }}
                    placeholder="z.B. Götter, Artefakte, Häuser..."
                    style={{ ...inputStyle, flex: 1 }}
                  />
                </div>

                {/* Image upload row */}
                <div style={{ marginTop: 'var(--space-2)' }}>
                  {customIconUrl ? (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', padding: '3px 10px 3px 6px', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
                      <img src={customIconUrl} alt="Icon" style={{ width: 18, height: 18, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)' }}>Eigenes Bild</span>
                      <button
                        type="button"
                        onClick={() => setCustomIconUrl(undefined)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-text-placeholder)', display: 'flex', lineHeight: 1 }}
                      >
                        <X size={12} strokeWidth={1.5} />
                      </button>
                    </div>
                  ) : (
                    <label style={{
                      display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
                      height: 28, padding: '0 var(--space-3)',
                      border: '1px dashed var(--color-border-strong)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-text-secondary)',
                      fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-ui)',
                      cursor: 'pointer',
                    }}>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file || !user) return
                          setIconUploading(true)
                          try {
                            const compressed = await compressIfNeeded(file)
                            const path = `${user.id}/icons/cat-icon-${Date.now()}`
                            const { error } = await supabase.storage
                              .from('worldify-images')
                              .upload(path, compressed, { upsert: true, contentType: compressed.type })
                            if (!error) {
                              const { data } = supabase.storage.from('worldify-images').getPublicUrl(path)
                              setCustomIconUrl(data.publicUrl)
                            }
                          } finally {
                            setIconUploading(false)
                            e.target.value = ''
                          }
                        }}
                      />
                      <ImageIcon size={11} strokeWidth={1.5} />
                      {iconUploading ? 'Lädt…' : 'Eigenes Bild hochladen'}
                    </label>
                  )}
                </div>
              </div>
              <div>
                <label style={fieldLabelStyle}>Farbe</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  {/* No color option */}
                  <button
                    type="button"
                    onClick={() => setCustomColor(undefined)}
                    title="Keine Farbe"
                    style={{
                      width: 28, height: 28, borderRadius: 'var(--radius-md)',
                      border: customColor === undefined ? '2px solid var(--color-primary)' : '1.5px solid var(--color-border)',
                      backgroundColor: 'var(--color-bg)',
                      cursor: 'pointer', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, color: 'var(--color-text-secondary)',
                    }}
                  >
                    ✕
                  </button>
                  {COLOR_PRESETS.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setCustomColor(hex)}
                      title={hex}
                      style={{
                        width: 28, height: 28, borderRadius: 'var(--radius-md)',
                        backgroundColor: hex,
                        border: customColor === hex ? `2px solid ${hex}` : '2px solid transparent',
                        outline: customColor === hex ? `2px solid ${hex}` : '2px solid transparent',
                        outlineOffset: 2,
                        cursor: 'pointer', flexShrink: 0,
                      }}
                    />
                  ))}

                  {/* Divider */}
                  <div style={{ width: 1, height: 20, backgroundColor: 'var(--color-border)', flexShrink: 0, marginLeft: 'var(--space-1)' }} />

                  {/* Custom color block preview */}
                  <div style={{
                    width: 28, height: 28, borderRadius: 'var(--radius-md)',
                    backgroundColor: customColor ?? 'var(--color-bg)',
                    border: '1.5px solid var(--color-border)',
                    flexShrink: 0,
                  }} />

                  {/* Native color picker */}
                  <label
                    title="Eigene Farbe"
                    style={{
                      width: 28, height: 28, borderRadius: 'var(--radius-md)',
                      border: '1.5px solid var(--color-border)',
                      backgroundColor: 'var(--color-bg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', flexShrink: 0, overflow: 'hidden',
                      fontSize: 15,
                    }}
                  >
                    <input
                      type="color"
                      value={customColor ?? '#e8752a'}
                      onChange={(e) => setCustomColor(e.target.value)}
                      style={{ opacity: 0, position: 'absolute', width: 0, height: 0 }}
                    />
                    🎨
                  </label>
                </div>
              </div>

              <div>
                <label style={fieldLabelStyle}>Singularname (optional)</label>
                <input
                  value={customSingular}
                  onChange={(event) => setCustomSingular(event.target.value)}
                  placeholder="z.B. Charakter, Ort, Pflanze"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={fieldLabelStyle}>Beschreibung (optional)</label>
                <textarea
                  value={customDescription}
                  onChange={(event) => setCustomDescription(event.target.value)}
                  placeholder="Kurze Beschreibung..."
                  rows={2}
                  style={{ ...inputStyle, resize: 'vertical', paddingTop: 'var(--space-3)', paddingBottom: 'var(--space-3)' }}
                />
              </div>

              {/* Field builder */}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
                <label style={fieldLabelStyle}>Eigene Element-Felder</label>

                <div style={{ marginBottom: 'var(--space-3)' }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', marginBottom: 'var(--space-2)' }}>
                    Schnellstart
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                    {quickFieldSuggestions.map((suggestion) => {
                      const SuggestionIcon = fieldTypeIcon[suggestion.type]
                      const isUsed = fields.some((field) => field.name.toLowerCase() === suggestion.name.toLowerCase())

                      return (
                        <button
                          key={`${suggestion.name}-${suggestion.type}`}
                          type="button"
                          onClick={() => addSuggestedField(suggestion.name, suggestion.type)}
                          disabled={isUsed}
                          style={{
                            height: 32,
                            padding: '0 var(--space-3)',
                            borderRadius: 'var(--radius-full)',
                            border: '1px solid var(--color-border)',
                            backgroundColor: isUsed ? 'var(--color-bg)' : 'var(--color-surface)',
                            color: isUsed ? 'var(--color-text-placeholder)' : 'var(--color-text)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            fontSize: 12,
                            fontWeight: 500,
                            fontFamily: 'var(--font-ui)',
                            cursor: isUsed ? 'default' : 'pointer',
                          }}
                        >
                          <SuggestionIcon size={14} strokeWidth={1.5} color={isUsed ? 'var(--color-text-placeholder)' : 'var(--color-primary)'} />
                          {suggestion.name}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {fields.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--color-text-placeholder)', fontFamily: 'var(--font-ui)', fontStyle: 'italic', margin: '4px 0 12px' }}>
                    Noch keine eigenen Felder hinzugefügt.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '6px 0 12px' }}>
                    {fields.map((f) => {
                      const selectedIconName = f.icon ?? categoryFieldDefaultIcons[f.type]
                      const FIcon = getCategoryIcon(selectedIconName)
                      return (
                        <div key={f.id} style={{
                          display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                          padding: '8px 10px', borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
                        }}>
                          <div style={{ position: 'relative', flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={() => setFieldIconPickerId((current) => current === f.id ? null : f.id)}
                              onKeyDown={(event) => { if (event.key === 'Escape') setFieldIconPickerId(null) }}
                              title={`Icon für ${f.name} wählen`}
                              aria-label={`Icon für ${f.name} wählen`}
                              aria-expanded={fieldIconPickerId === f.id}
                              aria-haspopup="menu"
                              style={{
                                width: 28, height: 28, borderRadius: 'var(--radius-md)',
                                backgroundColor: 'var(--color-primary-light)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: fieldIconPickerId === f.id ? '1px solid var(--color-primary)' : '1px solid transparent',
                                cursor: 'pointer', padding: 0,
                              }}
                            >
                              <FIcon size={14} strokeWidth={1.5} color="var(--color-primary)" />
                            </button>

                            {fieldIconPickerId === f.id ? (
                              <div
                                role="menu"
                                aria-label={`Icon für ${f.name}`}
                                style={{
                                  position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, zIndex: 20,
                                  width: 252,
                                  display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 'var(--space-1)',
                                  padding: 'var(--space-2)', border: '1px solid var(--color-border)',
                                  borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-surface)',
                                  boxShadow: 'var(--shadow-lg)',
                                }}
                              >
                                {categoryIconOptions.map(({ name, icon: Icon }) => {
                                  const selected = selectedIconName === name
                                  return (
                                    <button
                                      key={name}
                                      type="button"
                                      role="menuitemradio"
                                      aria-checked={selected}
                                      aria-label={name}
                                      title={name}
                                      onClick={() => updateFieldIcon(f.id, name)}
                                      style={{
                                        width: 36, height: 36, border: 'none', borderRadius: 'var(--radius-md)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                        backgroundColor: selected ? 'var(--color-primary-light)' : 'transparent',
                                        color: selected ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                                      }}
                                    >
                                      <Icon size={16} strokeWidth={1.5} />
                                    </button>
                                  )
                                })}
                              </div>
                            ) : null}
                          </div>
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text)', fontFamily: 'var(--font-ui)' }}>
                              {f.name}
                            </span>
                            <span style={{ display: 'block', fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)' }}>
                              {categoryFieldTypeMeta[f.type]}
                            </span>
                          </span>
                          <button type="button" onClick={() => removeField(f.id)} style={{
                            width: 24, height: 24, borderRadius: 'var(--radius-md)', border: 'none', background: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-placeholder)',
                          }}>
                            <X size={14} strokeWidth={1.5} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', marginBottom: 'var(--space-2)' }}>
                  Eigenes Feld
                </div>

                <div style={{
                  display: 'flex', gap: 'var(--space-2)', alignItems: 'center',
                  padding: 'var(--space-2)', borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)',
                }}>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flex: 1, minWidth: 0 }}>
                    {/* Type picker button + popover */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => setTypePickerOpen((o) => !o)}
                        style={{
                          height: 40, padding: '0 10px', borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)',
                          display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                          fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--color-text)',
                        }}
                      >
                        {(() => { const TI = fieldTypeIcon[newFieldType]; return <TI size={15} strokeWidth={1.5} color="var(--color-primary)" /> })()}
                        <ChevronRight size={13} strokeWidth={1.5} color="var(--color-text-placeholder)" style={{ transform: 'rotate(90deg)' }} />
                      </button>
                      {typePickerOpen ? (
                        <div style={{
                          position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, zIndex: 10,
                          backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
                          padding: 4, width: 200,
                        }}>
                          {(Object.keys(categoryFieldTypeMeta) as CategoryFieldType[]).map((t) => {
                            const TI = fieldTypeIcon[t]
                            const sel = newFieldType === t
                            return (
                              <button
                                key={t}
                                type="button"
                                onClick={() => { setNewFieldType(t); setTypePickerOpen(false) }}
                                style={{
                                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                                  padding: '7px 10px', borderRadius: 'var(--radius-md)', border: 'none',
                                  backgroundColor: sel ? 'var(--color-primary-light)' : 'transparent',
                                  cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-ui)',
                                  color: sel ? 'var(--color-primary)' : 'var(--color-text)', textAlign: 'left',
                                  transition: 'background 100ms ease',
                                }}
                                onMouseEnter={(e) => { if (!sel) e.currentTarget.style.backgroundColor = 'var(--color-bg)' }}
                                onMouseLeave={(e) => { if (!sel) e.currentTarget.style.backgroundColor = 'transparent' }}
                              >
                                <TI size={15} strokeWidth={1.5} />
                                {categoryFieldTypeMeta[t]}
                              </button>
                            )
                          })}
                        </div>
                      ) : null}
                    </div>

                    <input
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addField() } }}
                      placeholder="Eigenen Feldnamen eingeben..."
                      style={{ ...inputStyle, flex: 1, minWidth: 0, border: 'none', backgroundColor: 'transparent', paddingLeft: 'var(--space-2)', paddingRight: 'var(--space-2)' }}
                    />
                  </div>

                  <button type="button" onClick={addField} disabled={!newFieldName.trim()} title="Feld hinzufügen" style={{
                    width: 40, height: 40, flexShrink: 0,
                    borderRadius: 'var(--radius-md)', border: 'none',
                    backgroundColor: newFieldName.trim() ? 'var(--color-primary)' : 'var(--color-primary-light)',
                    color: newFieldName.trim() ? 'var(--color-primary-text)' : 'var(--color-primary)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    opacity: newFieldName.trim() ? 1 : 0.7,
                    cursor: newFieldName.trim() ? 'pointer' : 'not-allowed',
                  }}>
                    <Plus size={16} strokeWidth={1.5} />
                  </button>
                </div>

                {formError ? (
                  <div
                    style={{
                      marginTop: 'var(--space-3)',
                      padding: 'var(--space-3) var(--space-4)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--color-error-light)',
                      color: 'var(--color-error)',
                      fontSize: 13,
                      fontFamily: 'var(--font-ui)',
                    }}
                  >
                    {formError}
                  </div>
                ) : null}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
                {editingCategory ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    style={{
                      ...secondaryButtonStyle,
                      marginRight: 'auto',
                      color: 'var(--color-error)',
                      borderColor: 'var(--color-error-light)',
                      backgroundColor: 'var(--color-error-light)',
                    }}
                  >
                    <Trash2 size={14} strokeWidth={1.5} />
                    Kategorie löschen
                  </button>
                ) : null}
                <button onClick={() => setView('list')} style={secondaryButtonStyle}>
                  Zurück
                </button>
                <button onClick={() => void handleCustom()} disabled={!customName.trim() || isSaving} style={{
                  ...primaryButtonStyle,
                  opacity: customName.trim() && !isSaving ? 1 : 0.5,
                  cursor: customName.trim() && !isSaving ? 'pointer' : 'not-allowed',
                }}>
                  {isSaving ? 'Synchronisiert…' : editingCategory ? 'Kategorie speichern' : 'Kategorie anlegen'}
                </button>
              </div>
            </div>
          </div>
        )}

        <style>{`
          @keyframes slideIn { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }
          .ds-scroll { scrollbar-width: thin; scrollbar-color: var(--color-border-strong) transparent; }
          .ds-scroll::-webkit-scrollbar { width: 8px; }
          .ds-scroll::-webkit-scrollbar-track { background: transparent; }
          .ds-scroll::-webkit-scrollbar-thumb { background-color: var(--color-border-strong); border-radius: 9999px; border: 2px solid var(--color-surface); }
          .ds-scroll::-webkit-scrollbar-thumb:hover { background-color: var(--color-text-placeholder); }
        `}</style>
      </div>

      {showDeleteConfirm && editingCategory ? (
        <div
          onClick={() => setShowDeleteConfirm(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(28,25,23,0.3)',
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
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-xl)',
              padding: 'var(--space-6)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-4)',
            }}
          >
            <div>
              <h3 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-ui)', marginBottom: 'var(--space-2)' }}>
                Bist du sicher?
              </h3>
              <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)' }}>
                Die Kategorie <strong style={{ color: 'var(--color-text)' }}>{editingCategory.label}</strong> wird aus der Sidebar entfernt.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <button type="button" onClick={() => setShowDeleteConfirm(false)} style={secondaryButtonStyle}>
                Abbrechen
              </button>
              <button type="button" onClick={handleDeleteCategory} style={destructiveButtonStyle}>
                Ja, löschen
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

const rowButtonStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-3)',
  padding: 'var(--space-3) var(--space-4)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  backgroundColor: 'var(--color-surface)',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'background 100ms ease',
}

const iconCircleStyle: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--color-primary-light)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
}

const fieldLabelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 500,
  letterSpacing: '0.08em', textTransform: 'uppercase',
  color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)',
  marginBottom: 'var(--space-2)',
}

const secondaryButtonStyle: React.CSSProperties = {
  height: 36, padding: '0 var(--space-4)',
  border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--color-surface)', color: 'var(--color-text)',
  fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-ui)', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--color-surface)',
  padding: 'var(--space-3) var(--space-4)',
  fontFamily: 'var(--font-ui)',
  fontSize: 13,
  color: 'var(--color-text)',
  outline: 'none',
}

const primaryButtonStyle: React.CSSProperties = {
  height: 36,
  padding: '0 var(--space-4)',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--color-primary)',
  color: 'var(--color-primary-text)',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const destructiveButtonStyle: React.CSSProperties = {
  height: 36,
  padding: '0 var(--space-4)',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--color-error)',
  color: 'var(--color-primary-text)',
  fontSize: 13,
  fontWeight: 500,
  fontFamily: 'var(--font-ui)',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}
