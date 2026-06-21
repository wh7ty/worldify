import JSZip from 'jszip'
import { type Entity, type EntityStatus, type EntityType, type SidebarLibraryItem as SidebarItem } from '../data/mockWorld'
import { getEntityCategorySlug } from './entityCategoryAssignments'
import { findCategoryBySlug } from './categoryMatching'
import { getEntityFieldValues } from './entityFieldValues'
import { getEntityLinks } from './entityLinks'
import { getEntityAvatar, getEntityCover } from './entityMedia'
import { getEntityCoverPosition } from './bannerPosition'
import { useWorldStore } from '../store/useWorldStore'
import { getUniverseBanner } from './universeBanner'
import { getUniverseMeta } from './universeMeta'
import { getUniverseBannerPosition, getCategoryBannerPosition } from './bannerPosition'
import { getCategoryBanner } from './categoryBanner'

function getEntityOrderForUniverse(userId: string | undefined, universeId: string): Record<string, string[]> {
  if (!userId) return {}
  try {
    const raw = localStorage.getItem('worldify-entity-order')
    const storage = raw ? JSON.parse(raw) as Record<string, string[]> : {}
    const prefix = `${userId}:${universeId}:`
    return Object.fromEntries(
      Object.entries(storage)
        .filter(([key]) => key.startsWith(prefix))
        .map(([key, ids]) => [key.slice(prefix.length), ids]),
    )
  } catch {
    return {}
  }
}

export interface BackupEntity {
  id: string
  type: EntityType
  name: string
  shortDescription: string
  content: string
  tags: string[]
  status: EntityStatus
  createdAt: string
  updatedAt: string
  timelineDate?: string
  categorySlug?: string | null
  fieldValues: Record<string, string>
  coverUrl?: string | null
  avatarUrl?: string | null
  coverPosition?: number
}

export interface BackupData {
  version: '2.0'
  universe: {
    id: string
    name: string
    description?: string
    iconUrl?: string | null
    bannerUrl?: string | null
    bannerPosition?: number
  }
  exportDate: string
  settings: {
    libraryItems: SidebarItem[]
    dashboardContainers: ReturnType<typeof useWorldStore.getState>['dashboardContainers']
    entityOrder: Record<string, string[]>
    entityPins: string[]
    categoryBanners: Record<string, string>
    categoryBannerPositions: Record<string, number>
  }
  entities: BackupEntity[]
  links: Array<{
    entityId: string
    targetId: string
    relationType?: string
    createdAt: string
  }>
}

async function triggerDownload(blob: Blob, filename: string) {
  const nav = navigator as Navigator & {
    msSaveOrOpenBlob?: (blob: Blob, defaultName?: string) => boolean
  }

  if (typeof nav.msSaveOrOpenBlob === 'function') {
    nav.msSaveOrOpenBlob(blob, filename)
    return
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()

  window.setTimeout(() => {
    URL.revokeObjectURL(url)
    link.remove()
  }, 1500)
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

export async function exportWorldData(
  entities: Entity[],
  libraryItems: SidebarItem[],
  universeName: string,
  universeId: string,
) {
  const { blob, filename } = await createBackupArchive(entities, libraryItems, universeName, universeId)
  await triggerDownload(blob, filename)
  useWorldStore.getState().setLastBackupAt(new Date().toISOString())
  return filename
}

export async function createBackupArchive(
  entities: Entity[],
  libraryItems: SidebarItem[],
  universeName: string,
  universeId: string,
): Promise<{ blob: Blob; filename: string; backupData: BackupData }> {
  const zip = new JSZip()
  const now = new Date().toISOString().split('T')[0]
  const state = useWorldStore.getState()
  const universe = state.universes.find((item) => item.id === universeId)
  const exportedEntityIds = new Set(entities.map((entity) => entity.id))
  const backupEntities: BackupEntity[] = entities.map((entity) => ({
    id: entity.id,
    type: entity.type,
    name: entity.name,
    shortDescription: entity.shortDescription,
    content: entity.content,
    tags: entity.tags,
    status: entity.status,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    timelineDate: entity.timelineDate,
    categorySlug: getEntityCategorySlug(entity.id),
    fieldValues: getEntityFieldValues(entity.id),
    coverUrl: getEntityCover(entity.id),
    avatarUrl: getEntityAvatar(entity.id),
    coverPosition: getEntityCoverPosition(entity.id),
  }))
  const backupLinks = entities.flatMap((entity) =>
    getEntityLinks(entity.id)
      .filter((link) => exportedEntityIds.has(link.targetId))
      .map((link) => ({
        entityId: link.entityId,
        targetId: link.targetId,
        relationType: link.relationType,
        createdAt: link.createdAt,
      })),
  )
  const categoryItems = libraryItems.filter((item): item is Extract<SidebarItem, { kind: 'category' }> => item.kind === 'category')
  const categoryBanners = Object.fromEntries(
    categoryItems
      .map((item) => [item.slug, getCategoryBanner(item.slug)])
      .filter((entry): entry is [string, string] => Boolean(entry[1])),
  )
  const categoryBannerPositions = Object.fromEntries(
    categoryItems.map((item) => [item.slug, getCategoryBannerPosition(item.slug)]),
  )

  const backupData: BackupData = {
    version: '2.0',
    universe: {
      id: universeId,
      name: universeName,
      description: universe?.description ?? '',
      iconUrl: universe?.iconUrl ?? getUniverseMeta(universeId).iconUrl ?? null,
      bannerUrl: getUniverseBanner(universeId),
      bannerPosition: getUniverseBannerPosition(universeId),
    },
    exportDate: new Date().toISOString(),
    settings: {
      libraryItems,
      dashboardContainers: state.dashboardContainers,
      entityOrder: getEntityOrderForUniverse(state.user?.id, universeId),
      entityPins: state.activeUniverseId === universeId ? state.pinnedEntityIds : [],
      categoryBanners,
      categoryBannerPositions,
    },
    entities: backupEntities,
    links: backupLinks,
  }
  zip.file('worldify-data.json', JSON.stringify(backupData, null, 2))

  const readme = `# Worldify Backup — ${universeName}

Exportiert: ${new Date().toLocaleDateString('de-DE')}

## Inhalt

- **worldify-data.json** — Vollständiger Backup für Reimport in Worldify
- **entities/** — Markdown-Dateien pro Entity

## Enthaltene Daten

- Universe-Metadaten
- Kategorien und Felder
- Entities inkl. Tags, Timeline, Feldwerte und Kategorie-Zuordnung
- Entity-Verknüpfungen
- Banner-/Cover-/Avatar-URLs und Positionen

## Reimport

1. Öffne Worldify
2. Gehe zu Dashboard → Import
3. Lade diese ZIP-Datei hoch
`
  zip.file('README.md', readme)

  const entitiesByCategory = new Map<string, Entity[]>()
  entities.forEach((entity) => {
    const assignedCategorySlug = getEntityCategorySlug(entity.id)
    const category = assignedCategorySlug
      ? findCategoryBySlug(libraryItems, assignedCategorySlug)
      : libraryItems.find((item) => item.kind === 'category' && item.entityType === entity.type)
    const catName = category?.label || entity.type
    if (!entitiesByCategory.has(catName)) {
      entitiesByCategory.set(catName, [])
    }
    entitiesByCategory.get(catName)!.push(entity)
  })

  entitiesByCategory.forEach((catEntities, catName) => {
    catEntities.forEach((entity) => {
      const md = buildEntityMarkdown(entity)
      const safeName = entity.name.replace(/[\/\\:*?"<>|]/g, '_')
      zip.file(`entities/${catName}/${safeName}.md`, md)
    })
  })

  const blob = await zip.generateAsync({ type: 'blob' })
  const filename = `worldify-${sanitizeFilenamePart(universeName) || 'universe'}-${now}.zip`
  return { blob, filename, backupData }
}

function buildEntityMarkdown(entity: Entity): string {
  const statusLabel = entity.status === 'draft' ? 'Draft'
    : entity.status === 'active' ? 'Active'
      : entity.status === 'archived' ? 'Archived' : 'Concept'

  return `# ${entity.name}

**Type:** ${entity.type}
**Status:** ${statusLabel}
**Created:** ${new Date(entity.createdAt).toLocaleDateString('de-DE')}
**Updated:** ${new Date(entity.updatedAt).toLocaleDateString('de-DE')}

${entity.tags.length > 0 ? `**Tags:** ${entity.tags.map((t) => `\`${t}\``).join(', ')}\n\n` : ''}

## Description

${entity.shortDescription || '_(keine Beschreibung)_'}

## Content

${entity.content || '_(kein Inhalt)_'}
`
}
