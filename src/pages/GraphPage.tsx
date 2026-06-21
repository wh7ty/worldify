import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Network, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { entityTypeMeta, type EntityType } from '../data/mockWorld'
import { getEntityLinks } from '../lib/entityLinks'
import { useWorldStore } from '../store/useWorldStore'
import { useWindowWidth } from '../hooks/useWindowWidth'

type Pos = { x: number; y: number }

const TYPE_EMOJI: Record<EntityType, string> = {
  character: '👤', location: '🗺', faction: '🛡',
  magic_system: '✨', creature: '🐉', language: '🔤',
  item: '📦', story: '📖', event: '📅', note: '📝',
}

function computeLayout(
  nodeIds: string[],
  links: { source: string; target: string }[],
  W: number,
  H: number,
): Record<string, Pos> {
  const positions: Record<string, Pos> = {}

  nodeIds.forEach((id, i) => {
    const angle = (i / nodeIds.length) * 2 * Math.PI - Math.PI / 2
    const radius = Math.min(W, H) * 0.33
    positions[id] = {
      x: W / 2 + radius * Math.cos(angle),
      y: H / 2 + radius * Math.sin(angle),
    }
  })

  if (nodeIds.length <= 1) return positions

  for (let iter = 0; iter < 180; iter++) {
    const forces: Record<string, Pos> = {}
    for (const id of nodeIds) forces[id] = { x: 0, y: 0 }

    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const a = positions[nodeIds[i]], b = positions[nodeIds[j]]
        const dx = b.x - a.x, dy = b.y - a.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01
        const f = 14000 / (dist * dist)
        forces[nodeIds[i]].x -= (f * dx) / dist
        forces[nodeIds[i]].y -= (f * dy) / dist
        forces[nodeIds[j]].x += (f * dx) / dist
        forces[nodeIds[j]].y += (f * dy) / dist
      }
    }

    for (const link of links) {
      const a = positions[link.source], b = positions[link.target]
      if (!a || !b) continue
      const dx = b.x - a.x, dy = b.y - a.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01
      const f = 0.09 * (dist - 140)
      forces[link.source].x += (f * dx) / dist
      forces[link.source].y += (f * dy) / dist
      forces[link.target].x -= (f * dx) / dist
      forces[link.target].y -= (f * dy) / dist
    }

    for (const id of nodeIds) {
      forces[id].x += (W / 2 - positions[id].x) * 0.012
      forces[id].y += (H / 2 - positions[id].y) * 0.012
    }

    const cooling = Math.max(0.05, 1 - iter / 180) * 0.85
    const pad = 72
    for (const id of nodeIds) {
      positions[id].x = Math.max(pad, Math.min(W - pad, positions[id].x + forces[id].x * cooling))
      positions[id].y = Math.max(pad, Math.min(H - pad, positions[id].y + forces[id].y * cooling))
    }
  }

  return positions
}

export default function GraphPage() {
  const navigate = useNavigate()
  const isMobile = useWindowWidth() < 640
  const entities = useWorldStore((state) => state.entities)
  const activeUniverseId = useWorldStore((state) => state.activeUniverseId)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set())
  const [transform, setTransform] = useState({ scale: 1, tx: 0, ty: 0 })
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{ startX: number; startY: number; startTx: number; startTy: number } | null>(null)
  const touchRef = useRef<{ id0: number; x0: number; y0: number; tx: number; ty: number; id1?: number; x1?: number; y1?: number; dist?: number; scale: number } | null>(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const rect = svg.getBoundingClientRect()
      const mx = ((e.clientX - rect.left) / rect.width) * W
      const my = ((e.clientY - rect.top) / rect.height) * H
      setTransform((prev) => {
        const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
        const newScale = Math.max(0.25, Math.min(6, prev.scale * factor))
        const ratio = newScale / prev.scale
        return { scale: newScale, tx: mx - (mx - prev.tx) * ratio, ty: my - (my - prev.ty) * ratio }
      })
    }
    svg.addEventListener('wheel', handler, { passive: false })
    return () => svg.removeEventListener('wheel', handler)
  }, [])

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return
    dragRef.current = { startX: e.clientX, startY: e.clientY, startTx: transform.tx, startTy: transform.ty }
    e.currentTarget.style.cursor = 'grabbing'
  }
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    const rect = svgRef.current!.getBoundingClientRect()
    const scaleX = W / rect.width
    const scaleY = H / rect.height
    setTransform((prev) => ({ ...prev, tx: dragRef.current!.startTx + dx * scaleX, ty: dragRef.current!.startTy + dy * scaleY }))
  }
  const handleMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    dragRef.current = null
    e.currentTarget.style.cursor = 'grab'
  }

  const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    e.preventDefault()
    if (e.touches.length === 1) {
      const t = e.touches[0]
      setTransform((prev) => {
        touchRef.current = { id0: t.identifier, x0: t.clientX, y0: t.clientY, tx: prev.tx, ty: prev.ty, scale: prev.scale }
        return prev
      })
    } else if (e.touches.length === 2) {
      const t0 = e.touches[0], t1 = e.touches[1]
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)
      setTransform((prev) => {
        touchRef.current = { id0: t0.identifier, x0: t0.clientX, y0: t0.clientY, tx: prev.tx, ty: prev.ty, id1: t1.identifier, x1: t1.clientX, y1: t1.clientY, dist, scale: prev.scale }
        return prev
      })
    }
  }

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    e.preventDefault()
    if (!touchRef.current) return
    const rect = svgRef.current!.getBoundingClientRect()
    const scaleX = W / rect.width
    const scaleY = H / rect.height
    const ref = touchRef.current
    if (e.touches.length === 1 && ref.id1 === undefined) {
      const t = e.touches[0]
      const dx = (t.clientX - ref.x0) * scaleX
      const dy = (t.clientY - ref.y0) * scaleY
      setTransform((prev) => ({ ...prev, tx: ref.tx + dx, ty: ref.ty + dy }))
    } else if (e.touches.length === 2 && ref.dist !== undefined) {
      const t0 = Array.from(e.touches).find((t) => t.identifier === ref.id0)
      const t1 = Array.from(e.touches).find((t) => t.identifier === ref.id1)
      if (!t0 || !t1) return
      const newDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)
      const factor = newDist / ref.dist
      const newScale = Math.max(0.25, Math.min(6, ref.scale * factor))
      const midX = ((t0.clientX + t1.clientX) / 2 - rect.left) / rect.width * W
      const midY = ((t0.clientY + t1.clientY) / 2 - rect.top) / rect.height * H
      const ratio = newScale / ref.scale
      setTransform({ scale: newScale, tx: midX - (midX - ref.tx) * ratio, ty: midY - (midY - ref.ty) * ratio })
    }
  }

  const handleTouchEnd = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 0) touchRef.current = null
  }

  const universeEntities = useMemo(
    () => entities.filter((e) => e.universeId === activeUniverseId),
    [entities, activeUniverseId],
  )

  const allLinks = useMemo(() => {
    const result: { source: string; target: string }[] = []
    const seen = new Set<string>()
    const entityIdSet = new Set(universeEntities.map((e) => e.id))
    for (const entity of universeEntities) {
      for (const link of getEntityLinks(entity.id)) {
        if (!entityIdSet.has(link.targetId)) continue
        const key = [link.entityId, link.targetId].sort().join('|')
        if (!seen.has(key)) {
          seen.add(key)
          result.push({ source: link.entityId, target: link.targetId })
        }
      }
    }
    return result
  }, [universeEntities])

  const W = 940, H = 580

  const positions = useMemo(
    () => computeLayout(universeEntities.map((e) => e.id), allLinks, W, H),
    [universeEntities, allLinks],
  )

  const isLinked = (id: string) =>
    hoveredId
      ? allLinks.some((l) => (l.source === hoveredId && l.target === id) || (l.target === hoveredId && l.source === id))
      : false

  const usedTypes = [...new Set(universeEntities.map((e) => e.type))]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16,
        padding: isMobile ? '10px 12px' : '12px 24px',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        flexShrink: 0,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            height: 34, padding: '0 12px',
            backgroundColor: 'transparent',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer', fontSize: 13, fontWeight: 500,
            fontFamily: 'var(--font-ui)',
            color: 'var(--color-text-secondary)',
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          {!isMobile && 'Zurück'}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <Network size={18} strokeWidth={1.5} color="var(--color-primary)" style={{ flexShrink: 0 }} />
          {!isMobile && (
            <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-ui)', margin: 0 }}>
              Entity-Graph
            </h1>
          )}
        </div>
        <span style={{
          fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-ui)',
          color: 'var(--color-text-secondary)',
          backgroundColor: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-full)',
          padding: '3px 10px',
          flexShrink: 0,
        }}>
          {universeEntities.length} · {allLinks.length}
        </span>
      </div>

      {universeEntities.length === 0 ? (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
        }}>
          <Network size={48} strokeWidth={1} color="var(--color-border)" />
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-ui)', margin: 0 }}>Noch keine Entitäten</p>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', margin: 0 }}>Erstelle Entitäten und verknüpfe sie miteinander.</p>
        </div>
      ) : (
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: 'var(--color-bg)' }}>
          {/* Zoom controls */}
          <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { icon: ZoomIn, action: () => setTransform((p) => ({ ...p, scale: Math.min(6, p.scale * 1.25) })), title: 'Vergrößern' },
              { icon: ZoomOut, action: () => setTransform((p) => ({ ...p, scale: Math.max(0.25, p.scale / 1.25) })), title: 'Verkleinern' },
              { icon: Maximize2, action: () => setTransform({ scale: 1, tx: 0, ty: 0 }), title: 'Zurücksetzen' },
            ].map(({ icon: Icon, action, title }) => (
              <button key={title} onClick={action} title={title} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                <Icon size={15} strokeWidth={1.5} />
              </button>
            ))}
          </div>
          <svg
            ref={svgRef}
            width="100%" height="100%"
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ display: 'block', cursor: 'grab', touchAction: 'none' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <defs>
              <pattern id="graphDots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="var(--color-border)" />
              </pattern>
              <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="var(--color-primary)" fillOpacity="0.6" />
              </marker>
            </defs>
            <rect width={W} height={H} fill="url(#graphDots)" />
            <g transform={`translate(${transform.tx},${transform.ty}) scale(${transform.scale})`}>

            {/* Edges */}
            {allLinks.map((link, i) => {
              const a = positions[link.source], b = positions[link.target]
              if (!a || !b) return null
              const srcEntity = universeEntities.find((e) => e.id === link.source)
              const tgtEntity = universeEntities.find((e) => e.id === link.target)
              const edgeHidden = (srcEntity && hiddenTypes.has(srcEntity.type)) || (tgtEntity && hiddenTypes.has(tgtEntity.type))
              const active = hoveredId === link.source || hoveredId === link.target
              return (
                <line
                  key={i}
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={active ? 'var(--color-primary)' : 'var(--color-border)'}
                  strokeWidth={active ? 2 : 1}
                  strokeOpacity={edgeHidden ? 0 : active ? 1 : 0.7}
                  style={{ transition: 'stroke 200ms, stroke-width 200ms, stroke-opacity 200ms' }}
                />
              )
            })}

            {/* Nodes */}
            {universeEntities.map((entity) => {
              const pos = positions[entity.id]
              if (!pos) return null
              const meta = entityTypeMeta[entity.type]
              const isMe = hoveredId === entity.id
              const linked = isLinked(entity.id)
              const typeHidden = hiddenTypes.has(entity.type)
              const dimmed = typeHidden || (hoveredId !== null && !isMe && !linked)
              const rBase = isMobile ? 22 : 17
              const r = isMe ? (isMobile ? 28 : 22) : rBase

              return (
                <g
                  key={entity.id}
                  transform={`translate(${pos.x},${pos.y})`}
                  style={{ cursor: typeHidden ? 'default' : 'pointer', pointerEvents: typeHidden ? 'none' : 'all' }}
                  onMouseEnter={() => !typeHidden && setHoveredId(entity.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => !typeHidden && navigate(`/entities/${entity.id}`)}
                >
                  {/* Glow ring for hovered */}
                  {isMe ? (
                    <circle r={r + 6} fill={meta.color} fillOpacity={0.15} />
                  ) : null}
                  <circle
                    r={r}
                    fill={meta.lightColor}
                    stroke={isMe || linked ? meta.color : 'var(--color-border)'}
                    strokeWidth={isMe ? 2.5 : linked ? 2 : 1}
                    opacity={dimmed ? 0.25 : 1}
                    style={{ transition: 'r 150ms, opacity 150ms, stroke 150ms' }}
                  />
                  {/* Emoji icon */}
                  <text
                    y={6}
                    textAnchor="middle"
                    fontSize={isMe ? (isMobile ? 20 : 16) : (isMobile ? 16 : 13)}
                    opacity={dimmed ? 0.25 : 1}
                    style={{ transition: 'opacity 150ms, font-size 150ms', userSelect: 'none' }}
                  >
                    {TYPE_EMOJI[entity.type]}
                  </text>
                  {/* Name label */}
                  <text
                    y={-r - 8}
                    textAnchor="middle"
                    fontSize={11}
                    fontFamily="var(--font-ui)"
                    fontWeight={isMe ? 700 : 500}
                    fill={dimmed ? 'var(--color-text-secondary)' : 'var(--color-text)'}
                    opacity={dimmed ? 0.25 : 1}
                    style={{ transition: 'opacity 150ms', userSelect: 'none' }}
                  >
                    {entity.name.length > (isMobile ? 14 : 18) ? entity.name.slice(0, isMobile ? 12 : 16) + '…' : entity.name}
                  </text>
                </g>
              )
            })}
            </g>
          </svg>
        </div>
      )}

      {/* Low-links hint */}
      {universeEntities.length > 0 && allLinks.length < Math.max(3, universeEntities.length * 0.05) ? (
        <div style={{
          padding: '10px 24px',
          backgroundColor: 'var(--color-primary-light)',
          borderTop: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        }}>
          <span style={{ fontSize: 12, color: 'var(--color-primary)', fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
            {allLinks.length === 0
              ? 'Noch keine Verbindungen — öffne eine Entity und verknüpfe sie mit anderen, um den Graph zu füllen.'
              : `Nur ${allLinks.length} Verbindung${allLinks.length === 1 ? '' : 'en'} — mehr Verknüpfungen machen den Graph aussagekräftiger.`}
          </span>
        </div>
      ) : null}

      {/* Legend / footer */}
      <div style={{
        padding: isMobile ? '8px 12px' : '10px 24px',
        borderTop: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16,
        flexShrink: 0, overflow: 'hidden',
      }}>
        {!isMobile && (
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', flexShrink: 0 }}>
            Scroll = Zoom · Drag = Verschieben · Klick = Öffnen · <kbd style={{ padding: '1px 5px', borderRadius: 3, border: '1px solid var(--color-border)', fontSize: 10, fontFamily: 'var(--font-ui)', backgroundColor: 'var(--color-bg)' }}>G</kbd>
          </span>
        )}
        {isMobile && (
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', flexShrink: 0 }}>
            Pinch = Zoom · Tippen = Öffnen
          </span>
        )}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 'auto', overflowX: 'auto', flexShrink: 1 }}>
          {hiddenTypes.size > 0 ? (
            <button onClick={() => setHiddenTypes(new Set())} style={{ fontSize: 11, fontFamily: 'var(--font-ui)', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: '1px 4px', flexShrink: 0 }}>
              Alle
            </button>
          ) : null}
          {usedTypes.map((type) => {
            const meta = entityTypeMeta[type]
            const hidden = hiddenTypes.has(type)
            return (
              <button
                key={type}
                onClick={() => setHiddenTypes((prev) => {
                  const next = new Set(prev)
                  if (next.has(type)) next.delete(type)
                  else next.add(type)
                  return next
                })}
                title={hidden ? `${meta.label} einblenden` : `${meta.label} ausblenden`}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontFamily: 'var(--font-ui)', color: hidden ? 'var(--color-text-secondary)' : meta.color, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 'var(--radius-sm)', opacity: hidden ? 0.45 : 1, transition: 'opacity 150ms', flexShrink: 0 }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: hidden ? 'var(--color-border)' : meta.color, flexShrink: 0, transition: 'background 150ms' }} />
                {!isMobile && meta.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
