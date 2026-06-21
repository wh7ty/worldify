import { syncEntityOrderToSupabase } from './supabaseSettings'

const STORAGE_KEY = 'worldify-entity-order'

type StoredEntityOrder = Record<string, string[]>

function buildScopeKey(userId: string, universeId: string, categoryKey: string) {
  return `${userId}:${universeId}:${categoryKey}`
}

function readStorage() {
  if (typeof window === 'undefined') {
    return {} as StoredEntityOrder
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY)

  if (!rawValue) {
    return {} as StoredEntityOrder
  }

  try {
    const parsedValue = JSON.parse(rawValue) as StoredEntityOrder
    return parsedValue ?? {}
  } catch {
    return {}
  }
}

function writeStorage(nextValue: StoredEntityOrder) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextValue))
}

export function restoreEntityOrderFromRemote(
  userId: string,
  universeId: string,
  entityOrder: Record<string, string[]>,
) {
  const storage = readStorage()
  for (const [categoryKey, ids] of Object.entries(entityOrder)) {
    storage[buildScopeKey(userId, universeId, categoryKey)] = ids
  }
  writeStorage(storage)
}

export function getEntityOrderForScope(userId: string, universeId: string, categoryKey: string) {
  const storage = readStorage()
  return storage[buildScopeKey(userId, universeId, categoryKey)] ?? []
}

export function saveEntityOrderForScope(
  userId: string,
  universeId: string,
  categoryKey: string,
  entityIds: string[],
) {
  const storage = readStorage()
  storage[buildScopeKey(userId, universeId, categoryKey)] = entityIds
  writeStorage(storage)

  // Build the full order object for this user+universe and sync to Supabase
  const prefix = `${userId}:${universeId}:`
  const fullOrder: Record<string, string[]> = {}
  for (const [key, ids] of Object.entries(storage)) {
    if (key.startsWith(prefix)) {
      fullOrder[key.slice(prefix.length)] = ids
    }
  }
  void syncEntityOrderToSupabase(userId, universeId, fullOrder)
}

export function cacheEntityOrderForScope(
  userId: string,
  universeId: string,
  categoryKey: string,
  entityIds: string[],
) {
  const storage = readStorage()
  storage[buildScopeKey(userId, universeId, categoryKey)] = entityIds
  writeStorage(storage)
}
