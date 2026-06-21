import { useState } from 'react'
import { Trash2, RotateCcw, Bug, BookOpen, Calendar, Languages, MapPin, Package, Shield, Sparkles, StickyNote, Users } from 'lucide-react'
import { getTrashForUniverse, restoreFromTrash, permanentDeleteFromTrash, emptyTrashForUniverse, moveToTrash, type TrashedEntity } from '../lib/entityTrash'
import { entityTypeMeta, statusMeta } from '../data/mockWorld'
import { useWorldStore } from '../store/useWorldStore'
import { supabase } from '../lib/supabase'
import { logActivity } from '../lib/activityLog'

const ICONS: Record<string, React.ElementType> = {
  character: Users, location: MapPin, faction: Shield, magic_system: Sparkles,
  creature: Bug, language: Languages, item: Package, story: BookOpen, event: Calendar, note: StickyNote,
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Heute'
  if (days === 1) return 'Gestern'
  return `vor ${days} Tagen`
}

export default function TrashPage() {
  const activeUniverseId = useWorldStore((s) => s.activeUniverseId)
  const user = useWorldStore((s) => s.user)
  const loadWorldData = useWorldStore((s) => s.loadWorldData)
  const showToast = useWorldStore((s) => s.showToast)
  const openConfirmDialog = useWorldStore((s) => s.openConfirmDialog)
  const [items, setItems] = useState<TrashedEntity[]>(() => getTrashForUniverse(activeUniverseId))
  const [restoring, setRestoring] = useState<string | null>(null)

  const refresh = () => setItems(getTrashForUniverse(activeUniverseId))

  const handleRestore = async (entityId: string) => {
    setRestoring(entityId)
    let restoredEntity: TrashedEntity | null = null
    try {
      restoredEntity = await restoreFromTrash(entityId, user?.id)
      if (!restoredEntity) {
        refresh()
        return
      }

      const { error } = await supabase.from('entities').insert({
        id: restoredEntity.id,
        universe_id: restoredEntity.universeId,
        type: restoredEntity.type,
        name: restoredEntity.name,
        short_description: restoredEntity.shortDescription,
        content: restoredEntity.content,
        tags: restoredEntity.tags,
        status: restoredEntity.status,
        timeline_date: restoredEntity.timelineDate ?? null,
      })

      if (error) {
        throw error
      }

      logActivity({ entityId: restoredEntity.id, entityName: restoredEntity.name, entityType: restoredEntity.type, action: 'restored', universeId: activeUniverseId })
      await loadWorldData()
      showToast(`"${restoredEntity.name}" wiederhergestellt`)
      refresh()
    } catch (error) {
      if (restoredEntity) {
        try {
          await moveToTrash(restoredEntity, user?.id)
        } catch {
          // Keep the original error toast below; this only best-effort restores trash state.
        }
      }
      showToast(error instanceof Error ? error.message : 'Wiederherstellung fehlgeschlagen')
      refresh()
    } finally {
      setRestoring(null)
    }
  }

  const handlePermanentDelete = async (entityId: string, name: string) => {
    const confirmed = await openConfirmDialog({
      title: `"${name}" dauerhaft löschen?`,
      description: 'Diese Aktion kann nicht rückgängig gemacht werden.',
      confirmLabel: 'Dauerhaft löschen',
      confirmVariant: 'danger',
    })
    if (!confirmed) return
    try {
      await permanentDeleteFromTrash(entityId, user?.id)
      refresh()
      showToast(`"${name}" dauerhaft gelöscht`)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Löschen fehlgeschlagen')
    }
  }

  const handleEmptyTrash = async () => {
    const confirmed = await openConfirmDialog({
      title: `Alle ${items.length} Einträge dauerhaft löschen?`,
      description: 'Diese Aktion kann nicht rückgängig gemacht werden.',
      confirmLabel: 'Papierkorb leeren',
      confirmVariant: 'danger',
    })
    if (!confirmed) return
    try {
      await emptyTrashForUniverse(activeUniverseId, user?.id)
      refresh()
      showToast('Papierkorb geleert')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Papierkorb konnte nicht geleert werden')
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-8)', paddingBottom: 'var(--space-6)', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
            Papierkorb
          </h1>
          {items.length > 0 ? (
            <button onClick={() => void handleEmptyTrash()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-error)', backgroundColor: 'transparent', color: 'var(--color-error)', fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-ui)', cursor: 'pointer' }}>
              <Trash2 size={13} strokeWidth={1.5} />
              Papierkorb leeren
            </button>
          ) : null}
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)' }}>
          Gelöschte Einträge werden 30 Tage aufbewahrt und können wiederhergestellt werden.
        </p>
      </div>

      {items.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', border: '1px dashed var(--color-border-strong)', borderRadius: 'var(--radius-xl)', backgroundColor: 'var(--color-surface)', textAlign: 'center', gap: 'var(--space-3)' }}>
          <div style={{ width: 48, height: 48, backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trash2 size={20} strokeWidth={1.5} color="var(--color-text-secondary)" />
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-ui)' }}>Papierkorb ist leer</p>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)' }}>Gelöschte Einträge erscheinen hier.</p>
        </div>
      ) : (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', backgroundColor: 'var(--color-surface)' }}>
          {items.map((entity, idx) => {
            const meta = entityTypeMeta[entity.type]
            const Icon = ICONS[entity.type] ?? StickyNote
            const sm = statusMeta[entity.status]
            const isLast = idx === items.length - 1
            return (
              <div key={entity.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: '12px 16px', borderBottom: isLast ? 'none' : '1px solid var(--color-border)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', backgroundColor: meta.lightColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} strokeWidth={1.5} color={meta.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entity.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)' }}>
                    {meta.label} · {timeAgo(entity.deletedAt)} gelöscht
                  </div>
                </div>
                <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: sm.lightColor, color: sm.color, fontSize: 11, fontWeight: 500, flexShrink: 0 }}>{sm.label}</span>
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
                  <button
                    onClick={() => void handleRestore(entity.id)}
                    disabled={restoring === entity.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text)', fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-ui)', cursor: 'pointer', opacity: restoring === entity.id ? 0.5 : 1 }}
                  >
                    <RotateCcw size={12} strokeWidth={1.5} />
                    Wiederherstellen
                  </button>
                  <button
                    onClick={() => void handlePermanentDelete(entity.id, entity.name)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
                    title="Dauerhaft löschen"
                  >
                    <Trash2 size={13} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
