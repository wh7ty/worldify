import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Bug, BookOpen, Calendar, Languages, MapPin, Package, Shield, Sparkles, StickyNote, Users, RotateCcw } from 'lucide-react'
import { entityTypeMeta } from '../data/mockWorld'
import { useWorldStore } from '../store/useWorldStore'
import { supabase } from '../lib/supabase'
import { getEntityCover } from '../lib/entityMedia'
import { logActivity } from '../lib/activityLog'

const ICONS: Record<string, React.ElementType> = {
  character: Users, location: MapPin, faction: Shield, magic_system: Sparkles,
  creature: Bug, language: Languages, item: Package, story: BookOpen, event: Calendar, note: StickyNote,
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Heute'
  if (days === 1) return 'Gestern'
  if (days < 30) return `vor ${days} Tagen`
  const months = Math.floor(days / 30)
  return `vor ${months} ${months === 1 ? 'Monat' : 'Monaten'}`
}

export default function ArchivePage() {
  const entities = useWorldStore((s) => s.entities)
  const activeUniverseId = useWorldStore((s) => s.activeUniverseId)
  const updateEntityLocal = useWorldStore((s) => s.updateEntityLocal)
  const showToast = useWorldStore((s) => s.showToast)

  const archived = useMemo(
    () => entities.filter((e) => e.universeId === activeUniverseId && e.status === 'archived')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [entities, activeUniverseId],
  )

  const handleRestore = async (entityId: string, entityName: string, entityType: string) => {
    const draft = entities.find((e) => e.id === entityId)
    if (!draft) return
    updateEntityLocal(entityId, { ...draft, status: 'draft' })
    await supabase.from('entities').update({ status: 'draft' }).eq('id', entityId)
    logActivity({ entityId, entityName, entityType, action: 'restored', universeId: activeUniverseId })
    showToast(`"${entityName}" als Draft wiederhergestellt`)
  }

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-8)', paddingBottom: 'var(--space-6)', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
            Archiv
          </h1>
          <span style={{ fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-ui)', color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)', padding: '3px 10px' }}>
            {archived.length} {archived.length === 1 ? 'Eintrag' : 'Einträge'}
          </span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)' }}>
          Archivierte Einträge — nicht mehr aktiv, aber erhalten. Jederzeit als Draft wiederherstellbar.
        </p>
      </div>

      {archived.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', border: '1px dashed var(--color-border-strong)', borderRadius: 'var(--radius-xl)', backgroundColor: 'var(--color-surface)', textAlign: 'center', gap: 'var(--space-3)' }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-ui)' }}>Keine archivierten Einträge</p>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)' }}>Archivierte Entities erscheinen hier und können jederzeit wiederhergestellt werden.</p>
        </div>
      ) : (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', backgroundColor: 'var(--color-surface)' }}>
          {archived.map((entity, idx) => {
            const meta = entityTypeMeta[entity.type]
            const Icon = ICONS[entity.type] ?? StickyNote
            const cover = getEntityCover(entity.id)
            const isLast = idx === archived.length - 1
            return (
              <div key={entity.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: '10px 16px', borderBottom: isLast ? 'none' : '1px solid var(--color-border)' }}>
                <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', backgroundColor: meta.lightColor, backgroundImage: cover ? `url(${cover})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                  {!cover ? <Icon size={16} strokeWidth={1.5} color={meta.color} /> : null}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link to={`/entities/${entity.id}`} style={{ textDecoration: 'none', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-ui)' }}>{entity.name}</Link>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', marginTop: 2 }}>
                    {meta.label} · archiviert {timeAgo(entity.updatedAt)}
                    {entity.shortDescription ? ` · ${entity.shortDescription.slice(0, 60)}` : ''}
                  </div>
                </div>
                <button
                  onClick={() => void handleRestore(entity.id, entity.name, entity.type)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text)', fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-ui)', cursor: 'pointer', flexShrink: 0 }}
                >
                  <RotateCcw size={12} strokeWidth={1.5} />
                  Wiederherstellen
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
