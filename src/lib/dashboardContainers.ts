import {
  defaultDashboardContainers,
  type DashboardContainer,
} from '../data/mockWorld'
import { syncDashboardContainersToSupabase } from './supabaseSettings'

const STORAGE_KEY = 'worldify-dashboard-containers'

type StoredDashboardContainers = Record<string, DashboardContainer[]>

function buildScopeKey(userId: string, universeId: string) {
  return `${userId}:${universeId}`
}

function readStorage() {
  if (typeof window === 'undefined') {
    return {} as StoredDashboardContainers
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY)

  if (!rawValue) {
    return {} as StoredDashboardContainers
  }

  try {
    const parsedValue = JSON.parse(rawValue) as StoredDashboardContainers
    return parsedValue ?? {}
  } catch {
    return {}
  }
}

function writeStorage(nextValue: StoredDashboardContainers) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextValue))
}

export function getDashboardContainersForScope(userId: string, universeId: string) {
  const storage = readStorage()
  return storage[buildScopeKey(userId, universeId)] ?? defaultDashboardContainers
}

export function saveDashboardContainersForScope(
  userId: string,
  universeId: string,
  items: DashboardContainer[],
) {
  const storage = readStorage()
  storage[buildScopeKey(userId, universeId)] = items
  writeStorage(storage)
  // Fire-and-forget sync to Supabase
  void syncDashboardContainersToSupabase(userId, universeId, items)
}

export function cacheDashboardContainersForScope(
  userId: string,
  universeId: string,
  items: DashboardContainer[],
) {
  const storage = readStorage()
  storage[buildScopeKey(userId, universeId)] = items
  writeStorage(storage)
}
