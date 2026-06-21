import { defaultLibraryItems, type SidebarLibraryItem } from '../data/mockWorld'
import { syncLibraryItemsToSupabase } from './supabaseSettings'

const STORAGE_KEY = 'worldify-library-items'

type StoredLibraryItems = Record<string, SidebarLibraryItem[]>

function buildScopeKey(userId: string, universeId: string) {
  return `${userId}:${universeId}`
}

function readStorage() {
  if (typeof window === 'undefined') {
    return {} as StoredLibraryItems
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY)

  if (!rawValue) {
    return {} as StoredLibraryItems
  }

  try {
    const parsedValue = JSON.parse(rawValue) as StoredLibraryItems
    return parsedValue ?? {}
  } catch {
    return {}
  }
}

function writeStorage(nextValue: StoredLibraryItems) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextValue))
}

function sanitizeLibraryItems(items: SidebarLibraryItem[]) {
  return items.filter((item) => item.kind === 'category' || item.kind === 'divider')
}

export function getLibraryItemsForScope(userId: string, universeId: string) {
  const storage = readStorage()
  const storedItems = storage[buildScopeKey(userId, universeId)]

  if (!storedItems) {
    return defaultLibraryItems
  }

  return sanitizeLibraryItems(storedItems)
}

export function saveLibraryItemsForScope(
  userId: string,
  universeId: string,
  items: SidebarLibraryItem[],
) {
  const sanitized = sanitizeLibraryItems(items)
  const storage = readStorage()
  storage[buildScopeKey(userId, universeId)] = sanitized
  writeStorage(storage)
  // Fire-and-forget sync to Supabase
  void syncLibraryItemsToSupabase(userId, universeId, sanitized)
}

export function cacheLibraryItemsForScope(
  userId: string,
  universeId: string,
  items: SidebarLibraryItem[],
) {
  const storage = readStorage()
  storage[buildScopeKey(userId, universeId)] = sanitizeLibraryItems(items)
  writeStorage(storage)
}

export function clearLibraryItemsForUser(userId: string) {
  const storage = readStorage()
  const nextStorage = Object.fromEntries(
    Object.entries(storage).filter(([scopeKey]) => !scopeKey.startsWith(`${userId}:`)),
  )

  writeStorage(nextStorage)
}
