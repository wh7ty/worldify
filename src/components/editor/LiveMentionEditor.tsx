import { useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Entity } from '../../data/mockWorld'
import { entityTypeMeta } from '../../data/mockWorld'
import { parseTextMentions } from '../../lib/entityMentions'

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeAttribute(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export default function LiveMentionEditor({
  value,
  onChange,
  placeholder,
  entities,
  currentEntityId,
  textareaRef: externalRef,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  entities: Entity[]
  currentEntityId?: string
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>
}) {
  const navigate = useNavigate()
  const internalRef = useRef<HTMLTextAreaElement>(null)
  const textareaRef = externalRef ?? internalRef

  // Auto-grow textarea to fit content
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  // Build the mention-highlighted HTML for the mirror div
  const mentionHTML = useMemo(() => {
    if (!value) return ''
    const segments = parseTextMentions(value, entities, currentEntityId)
    return (
      segments
        .map((seg) => {
          if (seg.kind === 'text') return escapeHtml(seg.text)
          const meta = entityTypeMeta[seg.entity.type]
          return `<span data-entity-id="${escapeAttribute(seg.entity.id)}" style="color:${meta.color};border-bottom:1px solid ${meta.color};cursor:pointer;pointer-events:auto;">${escapeHtml(seg.text)}</span>`
        })
        .join('') + '<br/>'
    )
  }, [value, entities, currentEntityId])

  const sharedStyle: React.CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontSize: 16,
    lineHeight: 1.9,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    padding: 0,
    margin: 0,
    border: 'none',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ position: 'relative', minHeight: 200 }}>
      {/* Mirror layer — renders mention highlights behind the textarea */}
      <div
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: mentionHTML }}
        onClick={(e) => {
          const id = (e.target as HTMLElement).dataset?.entityId
          if (id) navigate(`/entities/${id}`)
        }}
        style={{
          ...sharedStyle,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          color: 'var(--color-text)',
          backgroundColor: 'transparent',
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 1,
          overflow: 'hidden',
        }}
      />

      {/* Textarea — on top, transparent text so mirror shows through */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck
        style={{
          ...sharedStyle,
          position: 'relative',
          zIndex: 2,
          display: 'block',
          color: 'transparent',
          caretColor: 'var(--color-text)',
          background: 'transparent',
          resize: 'none',
          overflow: 'hidden',
          minHeight: 200,
        }}
      />
    </div>
  )
}
