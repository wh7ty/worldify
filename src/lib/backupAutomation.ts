import { createBackupArchive } from './exportWorldData'
import type { SidebarLibraryItem, Entity } from '../data/mockWorld'
import { useWorldStore } from '../store/useWorldStore'

const DIRECTORY_DB = 'worldify-backup-dir'
const DIRECTORY_STORE = 'handles'
const DIRECTORY_KEY = 'auto-backup-directory'
const SETTINGS_KEY = 'worldify-auto-backup-settings'

export type AutoBackupSettings = {
  enabled: boolean
  intervalHours: 6 | 12 | 24
  retentionDays: 2
  slots: 4
  lastAutoBackupAt: string | null
}

const DEFAULT_SETTINGS: AutoBackupSettings = {
  enabled: false,
  intervalHours: 12,
  retentionDays: 2,
  slots: 4,
  lastAutoBackupAt: null,
}

type BrowserDirectoryHandle = FileSystemDirectoryHandle & {
  queryPermission: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>
  requestPermission: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>
}

declare global {
  interface Window {
    showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>
  }
}

function openDirectoryDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DIRECTORY_DB, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(DIRECTORY_STORE)) {
        db.createObjectStore(DIRECTORY_STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function withPermissions(handle: FileSystemDirectoryHandle): BrowserDirectoryHandle {
  return handle as unknown as BrowserDirectoryHandle
}

async function getHandleFromDb(): Promise<BrowserDirectoryHandle | null> {
  try {
    const db = await openDirectoryDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(DIRECTORY_STORE, 'readonly')
      const store = tx.objectStore(DIRECTORY_STORE)
      const request = store.get(DIRECTORY_KEY)
      request.onsuccess = () => resolve((request.result as BrowserDirectoryHandle | undefined) ?? null)
      request.onerror = () => reject(request.error)
    })
  } catch {
    return null
  }
}

async function saveHandleToDb(handle: BrowserDirectoryHandle) {
  const db = await openDirectoryDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DIRECTORY_STORE, 'readwrite')
    tx.objectStore(DIRECTORY_STORE).put(handle, DIRECTORY_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function clearHandleFromDb() {
  try {
    const db = await openDirectoryDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DIRECTORY_STORE, 'readwrite')
      tx.objectStore(DIRECTORY_STORE).delete(DIRECTORY_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // ignore
  }
}

export function supportsAutoBackupDirectory() {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function' && typeof indexedDB !== 'undefined'
}

export function loadAutoBackupSettings(): AutoBackupSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<AutoBackupSettings>
    const intervalHours = parsed.intervalHours === 6 || parsed.intervalHours === 24 ? parsed.intervalHours : 12
    return {
      enabled: Boolean(parsed.enabled),
      intervalHours,
      retentionDays: 2,
      slots: 4,
      lastAutoBackupAt: typeof parsed.lastAutoBackupAt === 'string' ? parsed.lastAutoBackupAt : null,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveAutoBackupSettings(settings: AutoBackupSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export async function chooseAutoBackupDirectory(): Promise<BrowserDirectoryHandle> {
  if (!supportsAutoBackupDirectory()) {
    throw new Error('Dieser Browser unterstützt keinen festen Backup-Ordner.')
  }

  const handle = withPermissions(await window.showDirectoryPicker!({ mode: 'readwrite' }))
  const permission = await handle.requestPermission({ mode: 'readwrite' })
  if (permission !== 'granted') {
    throw new Error('Schreibzugriff auf den Backup-Ordner wurde nicht erlaubt.')
  }
  await saveHandleToDb(handle)
  return handle
}

export async function getAutoBackupDirectory(): Promise<BrowserDirectoryHandle | null> {
  const handle = await getHandleFromDb()
  if (!handle) return null
  const permission = await handle.queryPermission({ mode: 'readwrite' })
  if (permission === 'granted') return handle
  const requested = await handle.requestPermission({ mode: 'readwrite' })
  if (requested === 'granted') return handle
  return null
}

export async function clearAutoBackupDirectory() {
  await clearHandleFromDb()
}

function sanitizeFilenamePart(value: string) {
  return value
    .trim()
    .replace(/[\/\\:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

function getSlotFileName(universeName: string, slotIndex: number) {
  const safeUniverse = sanitizeFilenamePart(universeName) || 'universe'
  return `worldify-autobackup-${safeUniverse}-slot-${slotIndex + 1}.zip`
}

export async function runAutoBackupForUniverse(params: {
  entities: Entity[]
  libraryItems: SidebarLibraryItem[]
  universeName: string
  universeId: string
  force?: boolean
}): Promise<{ saved: boolean; reason?: string; filename?: string }> {
  const settings = loadAutoBackupSettings()
  if (!settings.enabled && !params.force) return { saved: false, reason: 'disabled' }
  const handle = await getAutoBackupDirectory()
  if (!handle) return { saved: false, reason: 'no-directory' }

  const now = Date.now()
  const intervalMs = settings.intervalHours * 60 * 60 * 1000
  const lastRunMs = settings.lastAutoBackupAt ? new Date(settings.lastAutoBackupAt).getTime() : 0
  if (!params.force && lastRunMs && now - lastRunMs < intervalMs) {
    return { saved: false, reason: 'not-due' }
  }

  const slotIndex = Math.floor(now / intervalMs) % settings.slots
  const filename = getSlotFileName(params.universeName, slotIndex)
  const { blob } = await createBackupArchive(
    params.entities,
    params.libraryItems,
    params.universeName,
    params.universeId,
  )

  const fileHandle = await handle.getFileHandle(filename, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(blob)
  await writable.close()

  const nextSettings: AutoBackupSettings = {
    ...settings,
    lastAutoBackupAt: new Date(now).toISOString(),
  }
  saveAutoBackupSettings(nextSettings)
  useWorldStore.getState().setLastBackupAt(nextSettings.lastAutoBackupAt ?? new Date(now).toISOString())

  return { saved: true, filename }
}
