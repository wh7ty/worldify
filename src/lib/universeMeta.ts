import { supabase } from './supabase'
import { compressIfNeeded } from './imageUtils'

type StoredUniverseMeta = Record<string, { iconUrl?: string }>

const STORAGE_KEY = 'worldify-universe-meta'

function readStorage() {
  if (typeof window === 'undefined') { return {} as StoredUniverseMeta }
  const rawValue = window.localStorage.getItem(STORAGE_KEY)
  if (!rawValue) { return {} as StoredUniverseMeta }
  try { return (JSON.parse(rawValue) as StoredUniverseMeta) ?? {} }
  catch { return {} }
}

function writeStorage(nextValue: StoredUniverseMeta) {
  if (typeof window === 'undefined') { return }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextValue))
}

function storagePathFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const marker = '/storage/v1/object/public/worldify-images/'
  const markerIndex = url.indexOf(marker)
  if (markerIndex === -1) return null
  return decodeURIComponent(url.slice(markerIndex + marker.length).split('?')[0])
}

export function getUniverseMeta(universeId: string) {
  return readStorage()[universeId] ?? {}
}

export function saveUniverseMeta(universeId: string, meta: { iconUrl?: string }) {
  const storage = readStorage()
  if (meta.iconUrl) storage[universeId] = meta
  else delete storage[universeId]
  writeStorage(storage)
}

// Called in loadWorldData — Supabase is authoritative and clears stale cache entries.
export function loadUniverseIconsFromDB(rows: Array<{ id: string; icon_url?: string | null }>) {
  const nextStorage: StoredUniverseMeta = {}
  for (const row of rows) {
    if (row.icon_url) {
      nextStorage[row.id] = { iconUrl: row.icon_url }
    }
  }
  writeStorage(nextStorage)
}

// Upload icon file to Supabase Storage, confirm DB persistence, then update local cache.
export async function uploadUniverseIcon(userId: string, universeId: string, file: File): Promise<string | null> {
  const compressed = await compressIfNeeded(file)
  const previousUrl = getUniverseMeta(universeId).iconUrl ?? null
  const path = `${userId}/icons/universe-${universeId}-${Date.now()}`
  const { error: uploadError } = await supabase.storage
    .from('worldify-images')
    .upload(path, compressed, { contentType: compressed.type, cacheControl: '31536000' })

  if (uploadError) {
    throw new Error(`Universe-Icon Upload fehlgeschlagen: ${uploadError.message}`)
  }

  const { data } = supabase.storage.from('worldify-images').getPublicUrl(path)
  const url = data.publicUrl
  const { data: updatedUniverse, error: updateError } = await supabase
    .from('universes')
    .update({ icon_url: url })
    .eq('id', universeId)
    .eq('user_id', userId)
    .select('icon_url')
    .single()

  if (updateError || updatedUniverse?.icon_url !== url) {
    await supabase.storage.from('worldify-images').remove([path])
    throw new Error(`Universe-Icon konnte nicht synchronisiert werden: ${updateError?.message ?? 'Datenbankwert wurde nicht bestätigt.'}`)
  }

  saveUniverseMeta(universeId, { iconUrl: url })

  const previousPath = storagePathFromPublicUrl(previousUrl)
  if (previousPath && previousPath !== path) {
    const { error: cleanupError } = await supabase.storage.from('worldify-images').remove([previousPath])
    if (cleanupError) console.warn('Altes Universe-Icon konnte nicht entfernt werden:', cleanupError.message)
  }

  return url
}
