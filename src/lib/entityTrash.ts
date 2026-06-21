import type { Entity } from '../data/mockWorld'
import { supabase } from './supabase'

const STORAGE_KEY = 'worldify-entity-trash'
const EXPIRY_DAYS = 30

export type TrashedEntity = Entity & { deletedAt: string }

function readTrash(): TrashedEntity[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
}

function writeTrash(entries: TrashedEntity[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

function nextTrashEntries(entity: TrashedEntity) {
  return [entity, ...readTrash().filter((entry) => entry.id !== entity.id)]
}

export function cacheTrash(entries: TrashedEntity[]) {
  writeTrash(entries)
}

export async function moveToTrash(entity: Entity, userId?: string): Promise<TrashedEntity> {
  const entry: TrashedEntity = { ...entity, deletedAt: new Date().toISOString() }
  const nextEntries = nextTrashEntries(entry)

  if (userId) {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + EXPIRY_DAYS)
    const { error } = await supabase
      .from('entity_trash')
      .upsert({
        user_id: userId,
        universe_id: entity.universeId,
        entity_id: entity.id,
        entity_data: entity,
        deleted_at: entry.deletedAt,
        expires_at: expiresAt.toISOString(),
      }, { onConflict: 'user_id,entity_id' })
      .select('entity_id')
      .single()

    if (error) throw new Error(`Papierkorb konnte nicht synchronisiert werden: ${error.message}`)
  }

  writeTrash(nextEntries)
  return entry
}

export function getTrashForUniverse(universeId: string): TrashedEntity[] {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - EXPIRY_DAYS)
  const all = readTrash()
  const active = all.filter((entry) => new Date(entry.deletedAt) > cutoff)
  if (active.length < all.length) writeTrash(active)
  return active.filter((entry) => entry.universeId === universeId)
}

export async function restoreFromTrash(entityId: string, userId?: string): Promise<TrashedEntity | null> {
  const trash = readTrash()
  const entity = trash.find((entry) => entry.id === entityId) ?? null
  if (!entity) return null

  if (userId) {
    const { error } = await supabase
      .from('entity_trash')
      .delete()
      .eq('user_id', userId)
      .eq('entity_id', entityId)
      .select('entity_id')
      .maybeSingle()

    if (error) throw new Error(`Papierkorb-Eintrag konnte nicht entfernt werden: ${error.message}`)
  }

  writeTrash(trash.filter((entry) => entry.id !== entityId))
  return entity
}

export async function permanentDeleteFromTrash(entityId: string, userId?: string): Promise<void> {
  if (userId) {
    const { error } = await supabase
      .from('entity_trash')
      .delete()
      .eq('user_id', userId)
      .eq('entity_id', entityId)
      .select('entity_id')
      .maybeSingle()

    if (error) throw new Error(`Papierkorb-Eintrag konnte nicht gelöscht werden: ${error.message}`)
  }

  writeTrash(readTrash().filter((entry) => entry.id !== entityId))
}

export async function emptyTrashForUniverse(universeId: string, userId?: string): Promise<void> {
  if (userId) {
    const { error } = await supabase
      .from('entity_trash')
      .delete()
      .eq('user_id', userId)
      .eq('universe_id', universeId)
      .select('entity_id')

    if (error) throw new Error(`Papierkorb konnte nicht geleert werden: ${error.message}`)
  }

  writeTrash(readTrash().filter((entry) => entry.universeId !== universeId))
}

export function getTrashCount(universeId: string): number {
  return getTrashForUniverse(universeId).length
}

export async function syncTrashFromSupabase(userId: string) {
  const { data, error } = await supabase
    .from('entity_trash')
    .select('entity_data, deleted_at')
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())
    .order('deleted_at', { ascending: false })

  if (error) throw new Error(`Papierkorb konnte nicht geladen werden: ${error.message}`)

  const entries: TrashedEntity[] = (data ?? []).map((row) => ({
    ...(row.entity_data as Entity),
    deletedAt: row.deleted_at as string,
  }))

  writeTrash(entries)
}
