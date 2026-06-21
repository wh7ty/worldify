import JSZip from 'jszip'
import type { EntityStatus, EntityType, SidebarLibraryItem as SidebarItem } from '../data/mockWorld'
import { supabase } from './supabase'
import type { BackupData } from './exportWorldData'
import { cacheUniverseBanner } from './universeBanner'
import { saveUniverseMeta } from './universeMeta'
import { saveUniverseBannerPosition, saveCategoryBannerPosition, saveEntityCoverPosition } from './bannerPosition'

type LegacyBackupData = {
  version?: string
  universe?: { id?: string; name?: string; description?: string }
  exportDate?: string
  entities?: Array<{
    id?: string
    type?: string
    name?: string
    shortDescription?: string
    content?: string
    tags?: string[]
    status?: string
  }>
  categories?: SidebarItem[]
}

function normalizeBackupData(raw: unknown): BackupData {
  const data = raw as Partial<BackupData> & LegacyBackupData
  const entities = Array.isArray(data.entities) ? data.entities : []
  const settings = data.settings
  const libraryItems = settings?.libraryItems ?? data.categories ?? []

  return {
    version: '2.0',
    universe: {
      id: data.universe?.id ?? '',
      name: data.universe?.name ?? 'Importiertes Universe',
      description: data.universe?.description ?? '',
      iconUrl: data.universe?.iconUrl ?? null,
      bannerUrl: data.universe?.bannerUrl ?? null,
      bannerPosition: data.universe?.bannerPosition ?? 50,
    },
    exportDate: data.exportDate ?? new Date().toISOString(),
    settings: {
      libraryItems,
      dashboardContainers: settings?.dashboardContainers ?? [],
      entityOrder: settings?.entityOrder ?? {},
      entityPins: settings?.entityPins ?? [],
      categoryBanners: settings?.categoryBanners ?? {},
      categoryBannerPositions: settings?.categoryBannerPositions ?? {},
    },
    entities: entities.map((entity) => ({
      id: entity.id ?? '',
      type: (entity.type ?? 'character') as EntityType,
      name: entity.name ?? 'Unbenannt',
      shortDescription: entity.shortDescription ?? '',
      content: entity.content ?? '',
      tags: Array.isArray(entity.tags) ? entity.tags : [],
      status: (entity.status ?? 'draft') as EntityStatus,
      createdAt: 'createdAt' in entity && typeof entity.createdAt === 'string' ? entity.createdAt : new Date().toISOString(),
      updatedAt: 'updatedAt' in entity && typeof entity.updatedAt === 'string' ? entity.updatedAt : new Date().toISOString(),
      timelineDate: 'timelineDate' in entity && typeof entity.timelineDate === 'string' ? entity.timelineDate : undefined,
      categorySlug: 'categorySlug' in entity ? entity.categorySlug ?? null : null,
      fieldValues: 'fieldValues' in entity && entity.fieldValues && typeof entity.fieldValues === 'object'
        ? entity.fieldValues as Record<string, string>
        : {},
      coverUrl: 'coverUrl' in entity ? entity.coverUrl ?? null : null,
      avatarUrl: 'avatarUrl' in entity ? entity.avatarUrl ?? null : null,
      coverPosition: 'coverPosition' in entity && typeof entity.coverPosition === 'number' ? entity.coverPosition : 50,
    })),
    links: Array.isArray(data.links)
      ? data.links.filter((link) => typeof link.entityId === 'string' && typeof link.targetId === 'string')
      : [],
  }
}

export async function importWorldData(
  file: File,
  newUniverseName: string,
  userId: string,
  onProgress?: (message: string) => void,
): Promise<{ success: boolean; message: string; importedCount: number; newUniverseId?: string }> {
  let createdUniverseId: string | null = null
  try {
    onProgress?.('Lese ZIP-Datei...')
    const zip = new JSZip()
    await zip.loadAsync(file)

    const jsonFile = zip.file('worldify-data.json')
    if (!jsonFile) {
      throw new Error('worldify-data.json nicht in ZIP gefunden')
    }

    const jsonContent = await jsonFile.async('string')
    const backupData = normalizeBackupData(JSON.parse(jsonContent) as unknown)

    if (!Array.isArray(backupData.entities) || backupData.entities.length === 0) {
      throw new Error('Keine gültigen Entities im Backup gefunden')
    }

    onProgress?.('Lege neues Universe an...')
    const { data: newUniverse, error: universeError } = await supabase
      .from('universes')
      .insert({
        user_id: userId,
        name: newUniverseName.trim(),
        description: backupData.universe.description?.trim()
          ? `${backupData.universe.description.trim()} · Importiert aus "${backupData.universe.name}" am ${new Date().toLocaleDateString('de-DE')}`
          : `Importiert aus "${backupData.universe.name}" am ${new Date().toLocaleDateString('de-DE')}`,
      })
      .select('id')
      .single()

    if (universeError || !newUniverse) {
      throw new Error(`Universe konnte nicht angelegt werden: ${universeError?.message}`)
    }

    const universeId = newUniverse.id
    createdUniverseId = universeId
    const entityIdMap = new Map<string, string>()

    onProgress?.('Importiere Kategorien und Einstellungen...')
    const translatedEntityOrder = Object.fromEntries(
      Object.entries(backupData.settings.entityOrder).map(([key, ids]) => [key, ids.filter((id) => typeof id === 'string')]),
    )
    const { error: settingsError } = await supabase
      .from('universe_settings')
      .upsert({
        user_id: userId,
        universe_id: universeId,
        library_items: backupData.settings.libraryItems,
        dashboard_containers: backupData.settings.dashboardContainers,
        entity_order: translatedEntityOrder,
        entity_pins: [],
        category_banners: backupData.settings.categoryBanners,
      }, { onConflict: 'user_id,universe_id' })

    if (settingsError) {
      throw new Error(`Einstellungen konnten nicht importiert werden: ${settingsError.message}`)
    }

    onProgress?.('Importiere Entities...')
    let importedCount = 0

    for (const entity of backupData.entities) {
      const { data: insertedEntity, error } = await supabase
        .from('entities')
        .insert({
          universe_id: universeId,
          type: entity.type,
          name: entity.name,
          short_description: entity.shortDescription || null,
          content: entity.content || null,
          tags: entity.tags ?? [],
          status: entity.status ?? 'draft',
          timeline_date: entity.timelineDate ?? null,
          category_slug: entity.categorySlug ?? null,
          field_values: entity.fieldValues ?? {},
          cover_url: entity.coverUrl ?? null,
          avatar_url: entity.avatarUrl ?? null,
          cover_position: entity.coverPosition ?? 50,
        })
        .select('id')
        .single()

      if (error || !insertedEntity) {
        throw new Error(`Entity "${entity.name}" konnte nicht importiert werden: ${error?.message ?? 'Unbekannter Fehler'}`)
      }

      entityIdMap.set(entity.id, insertedEntity.id)
      if (typeof entity.coverPosition === 'number') {
        saveEntityCoverPosition(insertedEntity.id, entity.coverPosition)
      }
      importedCount += 1
    }

    const translatedPins = backupData.settings.entityPins
      .map((id) => entityIdMap.get(id))
      .filter((id): id is string => Boolean(id))
    const translatedOrder = Object.fromEntries(
      Object.entries(backupData.settings.entityOrder).map(([key, ids]) => [
        key,
        ids
          .map((id) => entityIdMap.get(id))
          .filter((id): id is string => Boolean(id)),
      ]),
    )

    const { error: translatedSettingsError } = await supabase
      .from('universe_settings')
      .update({
        entity_order: translatedOrder,
        entity_pins: translatedPins,
      })
      .eq('user_id', userId)
      .eq('universe_id', universeId)

    if (translatedSettingsError) {
      throw new Error(`Entity-Reihenfolge/Pins konnten nicht importiert werden: ${translatedSettingsError.message}`)
    }

    if (backupData.links.length > 0) {
      onProgress?.('Importiere Verknüpfungen...')
      const linkRows = backupData.links.flatMap((link) => {
        const sourceId = entityIdMap.get(link.entityId)
        const targetId = entityIdMap.get(link.targetId)
        if (!sourceId || !targetId) return []
        return [{
          entity_id: sourceId,
          target_id: targetId,
          relation_type: link.relationType ?? 'related',
          created_at: link.createdAt,
        }]
      })

      if (linkRows.length > 0) {
        const { error: linkError } = await supabase
          .from('entity_links')
          .insert(linkRows)

        if (linkError) {
          throw new Error(`Verknüpfungen konnten nicht importiert werden: ${linkError.message}`)
        }
      }
    }

    const { error: universeMetaError } = await supabase
      .from('universes')
      .update({
        banner_url: backupData.universe.bannerUrl ?? null,
        icon_url: backupData.universe.iconUrl ?? null,
      })
      .eq('id', universeId)
      .eq('user_id', userId)

    if (universeMetaError) {
      throw new Error(`Universe-Medien konnten nicht importiert werden: ${universeMetaError.message}`)
    }

    if (backupData.universe.bannerUrl) {
      cacheUniverseBanner(universeId, backupData.universe.bannerUrl)
    }
    if (backupData.universe.iconUrl) {
      saveUniverseMeta(universeId, { iconUrl: backupData.universe.iconUrl })
    }
    if (typeof backupData.universe.bannerPosition === 'number') {
      saveUniverseBannerPosition(universeId, backupData.universe.bannerPosition)
    }
    for (const [slug, position] of Object.entries(backupData.settings.categoryBannerPositions)) {
      saveCategoryBannerPosition(slug, position)
    }

    onProgress?.(`✓ ${importedCount} Entities importiert`)
    return {
      success: true,
      message: `${importedCount} Entities, Kategorien und Verknüpfungen in "${newUniverseName}" importiert`,
      importedCount,
      newUniverseId: universeId,
    }
  } catch (error) {
    if (createdUniverseId) {
      await supabase.from('universes').delete().eq('id', createdUniverseId).eq('user_id', userId)
    }
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler'
    return {
      success: false,
      message: `Import fehlgeschlagen: ${message}`,
      importedCount: 0,
    }
  }
}
