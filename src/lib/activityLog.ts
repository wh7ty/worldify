export type ActivityEntry = {
  id: string
  entityId: string
  entityName: string
  entityType: string
  action: 'created' | 'updated' | 'deleted' | 'archived' | 'restored'
  timestamp: string
  universeId: string
}

const STORAGE_KEY = 'worldify-activity-log'
const MAX_ENTRIES = 100

function readLog(): ActivityEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function writeLog(entries: ActivityEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)))
}

export function logActivity(entry: Omit<ActivityEntry, 'id' | 'timestamp'>) {
  const log = readLog()
  log.unshift({ ...entry, id: `activity-${Date.now()}`, timestamp: new Date().toISOString() })
  writeLog(log)
}

export function getActivityForUniverse(universeId: string, limit = 30): ActivityEntry[] {
  return readLog().filter((e) => e.universeId === universeId).slice(0, limit)
}
