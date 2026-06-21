import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Upload, X } from 'lucide-react'
import { getUniverseMeta, uploadUniverseIcon } from '../../lib/universeMeta'
import { supabase } from '../../lib/supabase'
import { useWorldStore } from '../../store/useWorldStore'
import type { Universe } from '../../data/mockWorld'

export default function UniverseModal({
  open,
  onClose,
  universe,
}: {
  open: boolean
  onClose: () => void
  universe?: Universe | null
}) {
  const user = useWorldStore((state) => state.user)
  const loadWorldData = useWorldStore((state) => state.loadWorldData)
  const setActiveUniverse = useWorldStore((state) => state.setActiveUniverse)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [iconPreviewUrl, setIconPreviewUrl] = useState<string | undefined>(undefined)
  const [pendingIconFile, setPendingIconFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const iconObjectUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (iconObjectUrlRef.current) { URL.revokeObjectURL(iconObjectUrlRef.current); iconObjectUrlRef.current = null }
    setPendingIconFile(null)
    if (universe) {
      setName(universe.name)
      setDescription(universe.description)
      setIconPreviewUrl(universe.iconUrl ?? getUniverseMeta(universe.id).iconUrl)
      return
    }

    setName('')
    setDescription('')
    setIconPreviewUrl(undefined)
  }, [universe, open])

  if (!open) {
    return null
  }

  const reset = () => {
    if (iconObjectUrlRef.current) { URL.revokeObjectURL(iconObjectUrlRef.current); iconObjectUrlRef.current = null }
    setPendingIconFile(null)
    setName('')
    setDescription('')
    setIconPreviewUrl(undefined)
    setSubmitError(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!user || !name.trim()) {
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    const { data, error } = universe
      ? await supabase
          .from('universes')
          .update({
            name: name.trim(),
            description: description.trim() || null,
          })
          .eq('id', universe.id)
          .select('id')
          .single()
      : await supabase
          .from('universes')
          .insert({
            user_id: user.id,
            name: name.trim(),
            description: description.trim() || null,
          })
          .select('id')
          .single()

    if (error) {
      setIsSubmitting(false)
      setSubmitError(error.message)
      return
    }

    if (data?.id && pendingIconFile && user) {
      const uploadedUrl = await uploadUniverseIcon(user.id, data.id, pendingIconFile)
      if (iconObjectUrlRef.current) { URL.revokeObjectURL(iconObjectUrlRef.current); iconObjectUrlRef.current = null }
      if (uploadedUrl) setIconPreviewUrl(uploadedUrl)
      setPendingIconFile(null)
    }

    await loadWorldData()

    if (data?.id) {
      setActiveUniverse(data.id)
    }

    setIsSubmitting(false)
    handleClose()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (iconObjectUrlRef.current) { URL.revokeObjectURL(iconObjectUrlRef.current); iconObjectUrlRef.current = null }
    const url = URL.createObjectURL(file)
    iconObjectUrlRef.current = url
    setIconPreviewUrl(url)
    setPendingIconFile(file)
    event.target.value = ''
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
          maxWidth: 560,
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)',
          padding: 'var(--space-8)',
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
                fontSize: 24,
                fontWeight: 600,
                color: 'var(--color-text)',
                marginBottom: 'var(--space-2)',
              }}
            >
              {universe ? 'Universe bearbeiten' : 'Universe erstellen'}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              {universe
                ? 'Passe Name und Beschreibung deiner Welt an.'
                : 'Lege eine neue Welt an, damit du ihre Entities getrennt organisieren kannst.'}
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

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', marginBottom: 'var(--space-6)' }}>
            <Field label="Universe Icon">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-4)',
                  padding: 'var(--space-4)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: 'var(--color-bg)',
                }}
              >
                <UniverseModalIconPreview label={name || 'U'} iconUrl={iconPreviewUrl} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--color-text)',
                      marginBottom: 'var(--space-1)',
                    }}
                  >
                    Einfache Vorschau fur dein Universe
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--color-text-secondary)',
                      lineHeight: 1.5,
                    }}
                  >
                    Wird in Supabase Storage gespeichert und geräteübergreifend synchronisiert.
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={secondaryButtonStyle}
                >
                  <Upload size={15} strokeWidth={1.5} />
                  Icon
                </button>
              </div>
            </Field>
            <Field label="Name">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Aethoria"
                style={inputStyle}
              />
            </Field>
            <Field label="Beschreibung">
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Kurze Einordnung fur diese Welt."
                rows={4}
                style={{
                  ...inputStyle,
                  resize: 'vertical',
                  paddingTop: 'var(--space-3)',
                  paddingBottom: 'var(--space-3)',
                }}
              />
            </Field>
          </div>

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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
            <button type="button" onClick={handleClose} style={secondaryButtonStyle}>
              Cancel
            </button>
            <button type="submit" style={primaryButtonStyle}>
              {isSubmitting ? (universe ? 'Saving...' : 'Creating...') : universe ? 'Universe speichern' : 'Universe erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
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
      {children}
    </label>
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
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
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
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
}

function UniverseModalIconPreview({
  label,
  iconUrl,
}: {
  label: string
  iconUrl?: string
}) {
  const initial = label.slice(0, 1).toUpperCase()

  return (
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: 'var(--radius-lg)',
        border: '1px dashed var(--color-border-strong)',
        backgroundColor: 'var(--color-primary-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {iconUrl ? (
        <img
          src={iconUrl}
          alt="Universe icon preview"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-1)',
          }}
        >
          <ImagePlus size={16} strokeWidth={1.5} color="var(--color-primary)" />
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--color-primary)',
              lineHeight: 1,
            }}
          >
            {initial}
          </span>
        </div>
      )}
    </div>
  )
}
