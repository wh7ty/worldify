import { compressIfNeeded } from './imageUtils'
import { mutateCategoryBannersInSupabase } from './supabaseSettings'
import { supabase } from './supabase'

const CACHE_KEY = 'worldify-category-banners'
const BUCKET = 'worldify-images'

function readCache(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') } catch { return {} }
}

function writeCache(data: Record<string, string>) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(data))
}

function storagePathFromPublicUrl(url: string | null): string | null {
  if (!url) return null
  const marker = '/storage/v1/object/public/worldify-images/'
  const markerIndex = url.indexOf(marker)
  if (markerIndex === -1) return null
  return decodeURIComponent(url.slice(markerIndex + marker.length).split('?')[0])
}

export function getCategoryBanner(categorySlug: string): string | null {
  return readCache()[categorySlug] ?? null
}

export function loadCategoryBannersFromDB(banners: Record<string, string>) {
  writeCache(banners ?? {})
}

export async function uploadCategoryBanner(
  userId: string,
  universeId: string,
  categorySlug: string,
  file: File,
): Promise<string | null> {
  const compressed = await compressIfNeeded(file)
  const previousUrl = getCategoryBanner(categorySlug)
  const path = `${userId}/banners/cat-${categorySlug}-${Date.now()}`
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressed, { contentType: compressed.type, cacheControl: '31536000' })

  if (uploadError) throw new Error(`Kategorie-Banner konnte nicht hochgeladen werden: ${uploadError.message}`)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const url = data.publicUrl
  const nextBanners = { ...readCache(), [categorySlug]: url }

  try {
    const confirmedBanners = await mutateCategoryBannersInSupabase(userId, universeId, nextBanners)
    writeCache(confirmedBanners)
  } catch (error) {
    await supabase.storage.from(BUCKET).remove([path])
    throw error
  }

  const previousPath = storagePathFromPublicUrl(previousUrl)
  if (previousPath && previousPath !== path) {
    const { error: cleanupError } = await supabase.storage.from(BUCKET).remove([previousPath])
    if (cleanupError) console.warn('Altes Kategorie-Banner konnte nicht entfernt werden:', cleanupError.message)
  }

  return url
}

export async function removeCategoryBanner(userId: string, universeId: string, categorySlug: string): Promise<void> {
  const currentUrl = getCategoryBanner(categorySlug)
  const nextBanners = { ...readCache() }
  delete nextBanners[categorySlug]

  await mutateCategoryBannersInSupabase(userId, universeId, nextBanners)
  writeCache(nextBanners)

  const currentPath = storagePathFromPublicUrl(currentUrl)
  if (currentPath) {
    const { error } = await supabase.storage.from(BUCKET).remove([currentPath])
    if (error) console.warn('Kategorie-Banner-Datei konnte nicht entfernt werden:', error.message)
  }
}
