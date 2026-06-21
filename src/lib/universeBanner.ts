import { supabase } from './supabase'
import { compressIfNeeded } from './imageUtils'

const CACHE_KEY = 'worldify-universe-banners'
export const UNIVERSE_BANNER_EVENT = 'worldify:universe-banner-changed'

function readCache(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') } catch { return {} }
}

function writeCache(data: Record<string, string>) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(data))
}

function notifyBannerChange(universeId: string, url: string | null) {
  window.dispatchEvent(new CustomEvent(UNIVERSE_BANNER_EVENT, { detail: { universeId, url } }))
}

function storagePathFromPublicUrl(url: string | null): string | null {
  if (!url) return null
  const marker = '/storage/v1/object/public/worldify-images/'
  const markerIndex = url.indexOf(marker)
  if (markerIndex === -1) return null
  return decodeURIComponent(url.slice(markerIndex + marker.length).split('?')[0])
}

export function getUniverseBanner(universeId: string): string | null {
  return readCache()[universeId] ?? null
}

export function cacheUniverseBanner(universeId: string, url: string | null) {
  const cache = readCache()
  if (url) cache[universeId] = url
  else delete cache[universeId]
  writeCache(cache)
  notifyBannerChange(universeId, url)
}

// Supabase is authoritative. Missing/null remote values remove stale browser cache entries.
export function loadUniverseBannersFromDB(rows: Array<{ id: string; banner_url?: string | null }>) {
  const nextCache: Record<string, string> = {}
  for (const row of rows) {
    if (row.banner_url) nextCache[row.id] = row.banner_url
  }
  writeCache(nextCache)
}

export async function refreshUniverseBannerFromDB(universeId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('universes')
    .select('banner_url')
    .eq('id', universeId)
    .maybeSingle()

  if (error) throw new Error(`Banner konnte nicht geladen werden: ${error.message}`)
  const url = (data?.banner_url as string | null | undefined) ?? null
  cacheUniverseBanner(universeId, url)
  return url
}

export async function uploadUniverseBanner(userId: string, universeId: string, file: File): Promise<string> {
  const compressed = await compressIfNeeded(file)
  const previousUrl = getUniverseBanner(universeId)
  // A versioned object path creates a new public URL and avoids stale browser/CDN responses.
  const path = `${userId}/banners/universe-${universeId}-${Date.now()}`
  const { error: uploadError } = await supabase.storage
    .from('worldify-images')
    .upload(path, compressed, { contentType: compressed.type, cacheControl: '31536000' })

  if (uploadError) throw new Error(`Banner-Upload fehlgeschlagen: ${uploadError.message}`)

  const { data: publicUrlData } = supabase.storage.from('worldify-images').getPublicUrl(path)
  const url = publicUrlData.publicUrl
  const { data: updatedUniverse, error: updateError } = await supabase
    .from('universes')
    .update({ banner_url: url })
    .eq('id', universeId)
    .eq('user_id', userId)
    .select('banner_url')
    .single()

  if (updateError || updatedUniverse?.banner_url !== url) {
    await supabase.storage.from('worldify-images').remove([path])
    throw new Error(`Banner konnte nicht synchronisiert werden: ${updateError?.message ?? 'Datenbankwert wurde nicht bestätigt.'}`)
  }

  cacheUniverseBanner(universeId, url)

  const previousPath = storagePathFromPublicUrl(previousUrl)
  if (previousPath && previousPath !== path) {
    const { error: cleanupError } = await supabase.storage.from('worldify-images').remove([previousPath])
    if (cleanupError) console.warn('Altes Universe-Banner konnte nicht entfernt werden:', cleanupError.message)
  }

  return url
}

export async function removeUniverseBanner(userId: string, universeId: string): Promise<void> {
  const currentUrl = getUniverseBanner(universeId)
  const { data: updatedUniverse, error: updateError } = await supabase
    .from('universes')
    .update({ banner_url: null })
    .eq('id', universeId)
    .eq('user_id', userId)
    .select('banner_url')
    .single()

  if (updateError || updatedUniverse?.banner_url !== null) {
    throw new Error(`Banner konnte nicht entfernt werden: ${updateError?.message ?? 'Datenbankwert wurde nicht bestätigt.'}`)
  }

  cacheUniverseBanner(universeId, null)
  const currentPath = storagePathFromPublicUrl(currentUrl)
  if (currentPath) {
    const { error: storageError } = await supabase.storage.from('worldify-images').remove([currentPath])
    if (storageError) console.warn('Universe-Banner-Datei konnte nicht entfernt werden:', storageError.message)
  }
}
