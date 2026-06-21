import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { statusMeta } from '../data/mockWorld'
import { useWorldStore } from '../store/useWorldStore'
import { isEntityInCategory } from '../lib/categoryMatching'

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100)
  return (
    <div style={{ height: 8, backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-full)', overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: 'var(--radius-full)', transition: 'width 600ms ease' }} />
    </div>
  )
}

export default function StatsPage() {
  const entities = useWorldStore((s) => s.entities)
  const activeUniverseId = useWorldStore((s) => s.activeUniverseId)
  const libraryItems = useWorldStore((s) => s.libraryItems)

  const universeEntities = useMemo(
    () => entities.filter((e) => e.universeId === activeUniverseId && e.status !== 'archived'),
    [entities, activeUniverseId],
  )

  const byStatus = useMemo(() => {
    const counts = { active: 0, draft: 0, concept: 0, archived: 0 }
    for (const e of entities.filter((e) => e.universeId === activeUniverseId)) {
      if (e.status in counts) (counts as Record<string, number>)[e.status]++
    }
    return counts
  }, [entities, activeUniverseId])

  const byCategory = useMemo(() => {
    return libraryItems
      .filter((item) => item.kind === 'category')
      .map((cat) => {
        const count = universeEntities.filter((e) => isEntityInCategory(e, cat)).length
        return { ...cat, count }
      })
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count)
  }, [libraryItems, universeEntities])

  const topTags = useMemo(() => {
    const tagCount: Record<string, number> = {}
    for (const e of universeEntities) {
      for (const tag of e.tags) {
        tagCount[tag] = (tagCount[tag] ?? 0) + 1
      }
    }
    return Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 12)
  }, [universeEntities])

  const recentDays = useMemo(() => {
    const map: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      map[d.toISOString().slice(0, 10)] = 0
    }
    for (const e of entities.filter((e) => e.universeId === activeUniverseId)) {
      if (e.createdAt in map) map[e.createdAt]++
    }
    return Object.entries(map)
  }, [entities, activeUniverseId])

  const maxDay = Math.max(...recentDays.map(([, v]) => v), 1)
  const maxCat = Math.max(...byCategory.map((c) => c.count), 1)
  const totalActive = byStatus.active + byStatus.draft + byStatus.concept
  const total = totalActive + byStatus.archived

  const statCards = [
    { label: 'Gesamt', value: total, color: 'var(--color-text)' },
    { label: 'Aktiv / Draft / Concept', value: totalActive, color: 'var(--color-success)' },
    { label: 'Archiviert', value: byStatus.archived, color: 'var(--color-text-secondary)' },
    { label: 'Tags gesamt', value: topTags.length, color: 'var(--color-accent)' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-8)', paddingBottom: 'var(--space-6)', borderBottom: '1px solid var(--color-border)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.02em', marginBottom: 'var(--space-2)' }}>
          World-Statistik
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)' }}>
          Ein Überblick über den Zustand deines Universums.
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
        {statCards.map((card) => (
          <div key={card.label} style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 32, fontWeight: 700, fontFamily: 'var(--font-display)', color: card.color, letterSpacing: '-0.02em' }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Status distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
        <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-ui)', marginBottom: 'var(--space-5)' }}>Status-Verteilung</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(['active', 'draft', 'concept', 'archived'] as const).map((s) => {
              const sm = statusMeta[s]
              const count = byStatus[s]
              const pct = total === 0 ? 0 : Math.round((count / total) * 100)
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-ui)', color: sm.color, minWidth: 60 }}>{sm.label}</span>
                  <Bar value={count} max={total} color={sm.color} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-ui)', minWidth: 28, textAlign: 'right' }}>{count}</span>
                  <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', minWidth: 32, textAlign: 'right' }}>{pct}%</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Activity last 7 days */}
        <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-ui)', marginBottom: 'var(--space-5)' }}>Erstellt (letzte 7 Tage)</h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
            {recentDays.map(([date, count]) => {
              const h = maxDay === 0 ? 4 : Math.max(4, Math.round((count / maxDay) * 80))
              const day = new Date(date).toLocaleDateString('de-DE', { weekday: 'short' })
              return (
                <div key={date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: '100%', height: h, backgroundColor: count > 0 ? 'var(--color-primary)' : 'var(--color-border)', borderRadius: '3px 3px 0 0', transition: 'height 600ms ease' }} title={`${count} erstellt`} />
                  <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)' }}>{day}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Categories */}
      {byCategory.length > 0 ? (
        <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px', boxShadow: 'var(--shadow-sm)', marginBottom: 'var(--space-8)' }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-ui)', marginBottom: 'var(--space-5)' }}>Einträge nach Kategorie</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {byCategory.map((cat) => {
              const color = cat.color ?? 'var(--color-primary)'
              return (
                <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Link to={`/${cat.slug}`} style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)', fontFamily: 'var(--font-ui)', textDecoration: 'none', minWidth: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat.label}</Link>
                  <Bar value={cat.count} max={maxCat} color={color} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-ui)', minWidth: 28, textAlign: 'right' }}>{cat.count}</span>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      {/* Top tags */}
      {topTags.length > 0 ? (
        <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-ui)', marginBottom: 'var(--space-4)' }}>Top-Tags</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {topTags.map(([tag, count]) => (
              <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--color-accent-light)', color: 'var(--color-accent)', fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-ui)' }}>
                #{tag}
                <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: 'var(--color-accent)', color: 'white', borderRadius: 'var(--radius-full)', padding: '0 5px', minWidth: 16, textAlign: 'center' }}>{count}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
