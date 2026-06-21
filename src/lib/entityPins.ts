const STORAGE_KEY = 'worldify-entity-pins'

function readStorage(): Record<string, string[]> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function writeStorage(data: Record<string, string[]>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function getPinnedForUniverse(universeId: string): string[] {
  return readStorage()[universeId] ?? []
}

export function setPinnedForUniverse(universeId: string, entityIds: string[]) {
  const storage = readStorage()
  storage[universeId] = entityIds
  writeStorage(storage)
}

export function togglePin(universeId: string, entityId: string): string[] {
  const storage = readStorage()
  const current = storage[universeId] ?? []
  const next = current.includes(entityId)
    ? current.filter((id) => id !== entityId)
    : [entityId, ...current]
  storage[universeId] = next
  writeStorage(storage)
  return next
}
