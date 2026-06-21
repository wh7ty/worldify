type ConfirmDialogProps = {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: 'primary' | 'danger'
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Bestätigen',
  cancelLabel = 'Abbrechen',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  const isDanger = confirmVariant === 'danger'

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        backgroundColor: 'rgba(28,25,23,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          width: '100%',
          maxWidth: 480,
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)',
          padding: 32,
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 style={{
            margin: 0,
            fontSize: 20,
            lineHeight: 1.35,
            fontWeight: 600,
            color: 'var(--color-text)',
            fontFamily: 'var(--font-ui)',
          }}>
            {title}
          </h2>
          {description ? (
            <p style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.5,
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-ui)',
            }}>
              {description}
            </p>
          ) : null}
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <button
            onClick={onCancel}
            style={{
              height: 36,
              padding: '0 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text)',
              fontSize: 13,
              fontWeight: 500,
              fontFamily: 'var(--font-ui)',
              cursor: 'pointer',
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              height: 36,
              padding: '0 16px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: isDanger ? 'var(--color-error)' : 'var(--color-primary)',
              color: 'var(--color-primary-text)',
              fontSize: 13,
              fontWeight: 500,
              fontFamily: 'var(--font-ui)',
              cursor: 'pointer',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
