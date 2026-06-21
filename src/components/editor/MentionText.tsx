import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { entityTypeMeta } from '../../data/mockWorld'
import type { Entity } from '../../data/mockWorld'
import { parseTextMentions } from '../../lib/entityMentions'
import { getCategoryIcon } from '../../lib/categoryIcons'

export function MentionChip({ entity, text }: { entity: Entity; text: string }) {
  const navigate = useNavigate()
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const meta = entityTypeMeta[entity.type]
  const TypeIcon = getCategoryIcon(entity.type)

  return (
    <span style={{ position: 'relative', display: 'inline' }}>
      <span
        onClick={(e) => { e.stopPropagation(); navigate(`/entities/${entity.id}`) }}
        onMouseEnter={() => setTooltipVisible(true)}
        onMouseLeave={() => setTooltipVisible(false)}
        style={{
          color: meta.color,
          borderBottom: `1px solid ${meta.color}`,
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: 'inherit',
          lineHeight: 'inherit',
        }}
      >
        {text}
      </span>

      {tooltipVisible ? (
        <span
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 10px)',
            left: 0,
            zIndex: 200,
            backgroundColor: 'var(--color-text)',
            borderRadius: 'var(--radius-lg)',
            padding: '10px 12px',
            minWidth: 200,
            maxWidth: 280,
            boxShadow: 'var(--shadow-xl)',
            pointerEvents: 'none',
            whiteSpace: 'normal',
          }}
        >
          {/* Arrow */}
          <span style={{
            position: 'absolute', bottom: -5, left: 14,
            width: 10, height: 10,
            backgroundColor: 'var(--color-text)',
            transform: 'rotate(45deg)',
            borderRadius: 2,
          }} />

          {/* Header: icon + name + type */}
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: entity.shortDescription ? 8 : 0 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 24, height: 24, borderRadius: 6,
              backgroundColor: meta.color, flexShrink: 0,
            }}>
              <TypeIcon size={13} strokeWidth={1.5} color="#fff" />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-ui)', lineHeight: 1.2 }}>
                {entity.name}
              </span>
              <span style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.50)', fontFamily: 'var(--font-ui)', marginTop: 1 }}>
                {meta.label}
              </span>
            </span>
          </span>

          {entity.shortDescription ? (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', fontFamily: 'var(--font-ui)', lineHeight: 1.45, display: 'block' }}>
              {entity.shortDescription.length > 100
                ? entity.shortDescription.slice(0, 97) + '…'
                : entity.shortDescription}
            </span>
          ) : null}

          {entity.tags.length > 0 ? (
            <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
              {entity.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  style={{
                    padding: '1px 6px',
                    borderRadius: 3,
                    backgroundColor: 'rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: 10,
                    fontFamily: 'var(--font-ui)',
                  }}
                >
                  #{tag}
                </span>
              ))}
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  )
}

export default function MentionText({
  text,
  entities,
  currentEntityId,
  style,
}: {
  text: string
  entities: Entity[]
  currentEntityId?: string
  style?: React.CSSProperties
}) {
  const segments = parseTextMentions(text, entities, currentEntityId)

  // Render line by line to handle \n correctly
  const lines = segments.reduce<React.ReactNode[][]>((acc, seg) => {
    if (seg.kind === 'text') {
      const parts = seg.text.split('\n')
      parts.forEach((part, i) => {
        if (i > 0) acc.push([])
        acc[acc.length - 1].push(part)
      })
    } else {
      acc[acc.length - 1].push(
        <MentionChip key={`${seg.entity.id}-${acc.length}`} entity={seg.entity} text={seg.text} />,
      )
    }
    return acc
  }, [[]])

  return (
    <span style={{ display: 'block', ...style }}>
      {lines.map((line, i) => (
        <span key={i} style={{ display: 'block' }}>
          {line.length === 0 || (line.length === 1 && line[0] === '') ? <br /> : line}
        </span>
      ))}
    </span>
  )
}
