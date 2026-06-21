import type { DashboardContainer, SidebarLibraryItem } from '../data/mockWorld'
import { supabase } from './supabase'

export type UniverseSettings = {
  library_items: SidebarLibraryItem[]
  dashboard_containers: DashboardContainer[]
  entity_order: Record<string, string[]>
  entity_pins: string[]
  category_banners: Record<string, string>
}

export type LibraryItemsMutation =
  | { type: 'upsert'; item: SidebarLibraryItem }
  | { type: 'remove'; itemId: string }
  | { type: 'reorder'; orderedIds: string[] }
  | { type: 'replace'; items: SidebarLibraryItem[] }

async function mutateUniverseSettingsFieldInSupabase<T>(
  userId: string,
  universeId: string,
  field: keyof Pick<UniverseSettings, 'dashboard_containers' | 'entity_order' | 'entity_pins' | 'category_banners'>,
  value: T,
  label: string,
): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data: current, error: readError } = await supabase
      .from('universe_settings')
      .select(`${field}, updated_at`)
      .eq('user_id', userId)
      .eq('universe_id', universeId)
      .maybeSingle()

    if (readError) throw new Error(`${label} konnten nicht geladen werden: ${readError.message}`)

    const nextUpdatedAt = new Date().toISOString()

    if (!current) {
      const { data, error } = await supabase
        .from('universe_settings')
        .upsert(
          { user_id: userId, universe_id: universeId, [field]: value, updated_at: nextUpdatedAt },
          { onConflict: 'user_id,universe_id' },
        )
        .select(field)
        .single()

      if (error) throw new Error(`${label} konnten nicht gespeichert werden: ${error.message}`)
      const selectedField = data as Record<string, T> | null
      return selectedField?.[field] ?? value
    }

    const { data, error } = await supabase
      .from('universe_settings')
      .update({ [field]: value, updated_at: nextUpdatedAt })
      .eq('user_id', userId)
      .eq('universe_id', universeId)
      .eq('updated_at', current.updated_at)
      .select(field)
      .maybeSingle()

    if (error) throw new Error(`${label} konnten nicht gespeichert werden: ${error.message}`)
    if (data) {
      const selectedField = data as Record<string, T>
      return selectedField[field] ?? value
    }
  }

  throw new Error(`${label} wurden gleichzeitig in einem anderen Browser geändert. Bitte erneut versuchen.`)
}

function applyLibraryMutation(items: SidebarLibraryItem[], mutation: LibraryItemsMutation) {
  if (mutation.type === 'upsert') {
    const index = items.findIndex((item) => item.id === mutation.item.id)
    if (index === -1) return [...items, mutation.item]
    const next = [...items]
    next[index] = mutation.item
    return next
  }
  if (mutation.type === 'remove') return items.filter((item) => item.id !== mutation.itemId)
  if (mutation.type === 'reorder') {
    const byId = new Map(items.map((item) => [item.id, item]))
    const ordered = mutation.orderedIds.flatMap((id) => byId.get(id) ? [byId.get(id)!] : [])
    const orderedSet = new Set(mutation.orderedIds)
    return [...ordered, ...items.filter((item) => !orderedSet.has(item.id))]
  }
  return mutation.items
}

export async function mutateLibraryItemsInSupabase(
  userId: string,
  universeId: string,
  mutation: LibraryItemsMutation,
): Promise<SidebarLibraryItem[]> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data: current, error: readError } = await supabase
      .from('universe_settings')
      .select('library_items, updated_at')
      .eq('user_id', userId)
      .eq('universe_id', universeId)
      .maybeSingle()
    if (readError) throw new Error(`Kategorien konnten nicht geladen werden: ${readError.message}`)

    const currentItems = (current?.library_items as SidebarLibraryItem[] | null) ?? []
    const nextItems = applyLibraryMutation(currentItems, mutation)
    const nextUpdatedAt = new Date().toISOString()

    if (!current) {
      const { data, error } = await supabase.from('universe_settings').upsert(
        { user_id: userId, universe_id: universeId, library_items: nextItems, updated_at: nextUpdatedAt },
        { onConflict: 'user_id,universe_id' },
      ).select('library_items').single()
      if (error) throw new Error(`Kategorien konnten nicht gespeichert werden: ${error.message}`)
      return (data.library_items as SidebarLibraryItem[]) ?? nextItems
    }

    const { data, error } = await supabase
      .from('universe_settings')
      .update({ library_items: nextItems, updated_at: nextUpdatedAt })
      .eq('user_id', userId)
      .eq('universe_id', universeId)
      .eq('updated_at', current.updated_at)
      .select('library_items')
      .maybeSingle()
    if (error) throw new Error(`Kategorien konnten nicht gespeichert werden: ${error.message}`)
    if (data) return (data.library_items as SidebarLibraryItem[]) ?? nextItems
  }
  throw new Error('Die Kategorien wurden gleichzeitig in einem anderen Browser geändert. Bitte erneut versuchen.')
}

export async function loadUniverseSettingsFromSupabase(
  userId: string,
  universeId: string,
): Promise<UniverseSettings | null> {
  const { data, error } = await supabase
    .from('universe_settings')
    .select('library_items, dashboard_containers, entity_order, entity_pins, category_banners')
    .eq('user_id', userId)
    .eq('universe_id', universeId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return {
    library_items: (data.library_items as SidebarLibraryItem[]) ?? [],
    dashboard_containers: (data.dashboard_containers as DashboardContainer[]) ?? [],
    entity_order: (data.entity_order as Record<string, string[]>) ?? {},
    entity_pins: (data.entity_pins as string[]) ?? [],
    category_banners: (data.category_banners as Record<string, string>) ?? {},
  }
}

export async function syncLibraryItemsToSupabase(
  userId: string,
  universeId: string,
  items: SidebarLibraryItem[],
): Promise<void> {
  await mutateLibraryItemsInSupabase(userId, universeId, { type: 'replace', items })
}

export async function syncDashboardContainersToSupabase(
  userId: string,
  universeId: string,
  containers: DashboardContainer[],
): Promise<void> {
  await mutateUniverseSettingsFieldInSupabase(userId, universeId, 'dashboard_containers', containers, 'Container')
}

export async function syncEntityOrderToSupabase(
  userId: string,
  universeId: string,
  entityOrder: Record<string, string[]>,
): Promise<void> {
  await mutateUniverseSettingsFieldInSupabase(userId, universeId, 'entity_order', entityOrder, 'Reihenfolgen')
}

export async function syncEntityPinsToSupabase(
  userId: string,
  universeId: string,
  pins: string[],
): Promise<void> {
  await mutateUniverseSettingsFieldInSupabase(userId, universeId, 'entity_pins', pins, 'Pins')
}

export async function mutateDashboardContainersInSupabase(
  userId: string,
  universeId: string,
  containers: DashboardContainer[],
): Promise<DashboardContainer[]> {
  return mutateUniverseSettingsFieldInSupabase(userId, universeId, 'dashboard_containers', containers, 'Container')
}

export async function mutateEntityOrderInSupabase(
  userId: string,
  universeId: string,
  entityOrder: Record<string, string[]>,
): Promise<Record<string, string[]>> {
  return mutateUniverseSettingsFieldInSupabase(userId, universeId, 'entity_order', entityOrder, 'Reihenfolgen')
}

export async function mutateEntityPinsInSupabase(
  userId: string,
  universeId: string,
  pins: string[],
): Promise<string[]> {
  return mutateUniverseSettingsFieldInSupabase(userId, universeId, 'entity_pins', pins, 'Pins')
}

export async function mutateCategoryBannersInSupabase(
  userId: string,
  universeId: string,
  banners: Record<string, string>,
): Promise<Record<string, string>> {
  return mutateUniverseSettingsFieldInSupabase(userId, universeId, 'category_banners', banners, 'Kategorie-Banner')
}
