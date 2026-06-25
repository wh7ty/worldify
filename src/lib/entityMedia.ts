import { compressIfNeeded } from './imageUtils'
import { supabase } from './supabase'

const BUCKET = 'worldify-images'
const COVER_CACHE_KEY = 'worldify-entity-covers'
const AVATAR_CACHE_KEY = 'worldify-entity-avatars'

type MediaCache = Record<string, string>

function readCache(key: string): MediaCache {
  try { return JSON.parse(localStorage.getItem(key) ?? '{}') as MediaCache } catch { return {} }
}

function writeCache(key: string, value: MediaCache) {
  localStorage.setItem(key, JSON.stringify(value))
}

function getStoragePath(kind: 'cover' | 'avatar', userId: string, entityId: string) {
  return `${userId}/entities/${entityId}/${kind}-${Date.now()}`
}

function storagePathFromPublicUrl(url: string | null): string | null {
  if (!url) return null
  const marker = '/storage/v1/object/public/worldify-images/'
  const markerIndex = url.indexOf(marker)
  if (markerIndex === -1) return null
  return decodeURIComponent(url.slice(markerIndex + marker.length).split('?')[0])
}

function getMediaUrl(entityId: string, cacheKey: string): string | null {
  return readCache(cacheKey)[entityId] ?? null
}

async function uploadEntityMedia(
  kind: 'cover' | 'avatar',
  userId: string,
  entityId: string,
  file: File,
): Promise<string | null> {
  const compressed = await compressIfNeeded(file)
  const cacheKey = kind === 'cover' ? COVER_CACHE_KEY : AVATAR_CACHE_KEY
  const column = kind === 'cover' ? 'cover_url' : 'avatar_url'
  const previousUrl = getMediaUrl(entityId, cacheKey)
  const path = getStoragePath(kind, userId, entityId)
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressed, { contentType: compressed.type, cacheControl: '31536000' })

  if (uploadError) throw new Error(`${kind === 'cover' ? 'Cover' : 'Avatar'} konnte nicht hochgeladen werden: ${uploadError.message}`)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const url = data.publicUrl
  const { data: updatedEntity, error: updateError } = await supabase
    .from('entities')
    .update({ [column]: url })
    .eq('id', entityId)
    .select(column)
    .single()
  const confirmedUrl = (updatedEntity as Record<string, string | null> | null)?.[column] ?? null

  if (updateError || confirmedUrl !== url) {
    await supabase.storage.from(BUCKET).remove([path])
    throw new Error(`${kind === 'cover' ? 'Cover' : 'Avatar'} konnte nicht synchronisiert werden: ${updateError?.message ?? 'Datenbankwert wurde nicht bestätigt.'}`)
  }

  const cache = readCache(cacheKey)
  cache[entityId] = url
  writeCache(cacheKey, cache)

  const previousPath = storagePathFromPublicUrl(previousUrl)
  if (previousPath && previousPath !== path) {
    const { error: cleanupError } = await supabase.storage.from(BUCKET).remove([previousPath])
    if (cleanupError) console.warn(`Alte ${kind === 'cover' ? 'Cover' : 'Avatar'}-Datei konnte nicht entfernt werden:`, cleanupError.message)
  }

  return url
}

async function removeEntityMedia(
  kind: 'cover' | 'avatar',
  _userId: string,
  entityId: string,
): Promise<void> {
  const cacheKey = kind === 'cover' ? COVER_CACHE_KEY : AVATAR_CACHE_KEY
  const column = kind === 'cover' ? 'cover_url' : 'avatar_url'
  const currentUrl = getMediaUrl(entityId, cacheKey)
  const { data: updatedEntity, error: updateError } = await supabase
    .from('entities')
    .update({ [column]: null })
    .eq('id', entityId)
    .select(column)
    .single()
  const confirmedUrl = (updatedEntity as Record<string, string | null> | null)?.[column] ?? '__unexpected__'

  if (updateError || confirmedUrl !== null) {
    throw new Error(`${kind === 'cover' ? 'Cover' : 'Avatar'} konnte nicht entfernt werden: ${updateError?.message ?? 'Datenbankwert wurde nicht bestätigt.'}`)
  }

  const cache = readCache(cacheKey)
  delete cache[entityId]
  writeCache(cacheKey, cache)

  const currentPath = storagePathFromPublicUrl(currentUrl)
  if (currentPath) {
    const { error } = await supabase.storage.from(BUCKET).remove([currentPath])
    if (error) console.warn(`${kind === 'cover' ? 'Cover' : 'Avatar'}-Datei konnte nicht entfernt werden:`, error.message)
  }
}

export function getEntityCover(entityId: string): string | null {
  return getMediaUrl(entityId, COVER_CACHE_KEY)
}

export function getEntityAvatar(entityId: string): string | null {
  return getMediaUrl(entityId, AVATAR_CACHE_KEY)
}

export async function uploadEntityCover(userId: string, entityId: string, file: File): Promise<string | null> {
  return uploadEntityMedia('cover', userId, entityId, file)
}

export async function removeEntityCover(userId: string, entityId: string): Promise<void> {
  await removeEntityMedia('cover', userId, entityId)
}

export async function uploadEntityAvatar(userId: string, entityId: string, file: File): Promise<string | null> {
  return uploadEntityMedia('avatar', userId, entityId, file)
}

export async function removeEntityAvatar(userId: string, entityId: string): Promise<void> {
  await removeEntityMedia('avatar', userId, entityId)
}

export function loadEntityMediaFromDB(
  rows: Array<{ id: string; cover_url?: string | null; avatar_url?: string | null }>,
) {
  const nextCoverCache: MediaCache = {}
  const nextAvatarCache: MediaCache = {}
  for (const row of rows) {
    if (row.cover_url) nextCoverCache[row.id] = row.cover_url
    if (row.avatar_url) nextAvatarCache[row.id] = row.avatar_url
  }
  writeCache(COVER_CACHE_KEY, nextCoverCache)
  writeCache(AVATAR_CACHE_KEY, nextAvatarCache)
}
