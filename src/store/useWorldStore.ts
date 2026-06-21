import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import {
  defaultDashboardContainers,
  demoEntities,
  demoUniverses,
  defaultLibraryItems,
  type DashboardContainer,
  mapEntityRow,
  mapUniverseRow,
  type DatabaseEntityRow,
  type DatabaseUniverseRow,
  type Entity,
  type EntityStatus,
  type EntityType,
  type CategoryField,
  type SidebarLibraryItem,
  type Universe,
} from '../data/mockWorld'
import {
  getDashboardContainersForScope,
  cacheDashboardContainersForScope,
} from '../lib/dashboardContainers'
import {
  cacheEntityOrderForScope,
  restoreEntityOrderFromRemote,
} from '../lib/entityOrder'
import { getPinnedForUniverse, setPinnedForUniverse, togglePin } from '../lib/entityPins'
import { logActivity } from '../lib/activityLog'
import { moveToTrash, restoreFromTrash, syncTrashFromSupabase } from '../lib/entityTrash'
import {
  cacheLibraryItemsForScope,
  getLibraryItemsForScope,
} from '../lib/libraryItems'
import {
  deleteEntityFieldValues,
  removeEntityReferencesFromFieldValues,
  saveEntityFieldValues,
} from '../lib/entityFieldValues'
import {
  removeCategoryAssignmentsBySlug,
  removeEntityCategorySlug,
  setEntityCategorySlug,
} from '../lib/entityCategoryAssignments'
import { removeEntityLinksForEntity, loadEntityLinksFromRemote } from '../lib/entityLinks'
import { getUniverseMeta, loadUniverseIconsFromDB } from '../lib/universeMeta'
import { supabase } from '../lib/supabase'
import {
  loadUniverseSettingsFromSupabase,
  mutateDashboardContainersInSupabase,
  mutateEntityOrderInSupabase,
  mutateEntityPinsInSupabase,
  mutateLibraryItemsInSupabase,
  type LibraryItemsMutation,
} from '../lib/supabaseSettings'
import { loadEntityMediaFromDB } from '../lib/entityMedia'
import { loadUniverseBannersFromDB } from '../lib/universeBanner'
import { loadCategoryBannersFromDB } from '../lib/categoryBanner'

type DraftEntity = {
  name: string
  type: EntityType
  shortDescription: string
  content: string
  tags: string[]
  status: EntityStatus
  timelineDate?: string
}

function normalizeLabel(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

async function persistLibraryMutation(
  userId: string,
  universeId: string,
  mutation: LibraryItemsMutation,
  previousItems?: SidebarLibraryItem[],
) {
  try {
    const confirmedItems = await mutateLibraryItemsInSupabase(userId, universeId, mutation)
    cacheLibraryItemsForScope(userId, universeId, confirmedItems)
    const state = useWorldStore.getState()
    if (state.user?.id === userId && state.activeUniverseId === universeId) {
      useWorldStore.setState({ libraryItems: confirmedItems })
    }
  } catch (error) {
    if (previousItems) {
      cacheLibraryItemsForScope(userId, universeId, previousItems)
      const state = useWorldStore.getState()
      if (state.user?.id === userId && state.activeUniverseId === universeId) {
        useWorldStore.setState({ libraryItems: previousItems })
      }
    }
    useWorldStore.getState().showToast(error instanceof Error ? error.message : 'Kategorien konnten nicht synchronisiert werden')
  }
}

async function persistDashboardContainers(
  userId: string,
  universeId: string,
  nextContainers: DashboardContainer[],
  previousContainers: DashboardContainer[],
) {
  cacheDashboardContainersForScope(userId, universeId, nextContainers)
  try {
    const confirmedContainers = await mutateDashboardContainersInSupabase(userId, universeId, nextContainers)
    cacheDashboardContainersForScope(userId, universeId, confirmedContainers)
    const state = useWorldStore.getState()
    if (state.user?.id === userId && state.activeUniverseId === universeId) {
      useWorldStore.setState({ dashboardContainers: confirmedContainers })
    }
  } catch (error) {
    cacheDashboardContainersForScope(userId, universeId, previousContainers)
    const state = useWorldStore.getState()
    if (state.user?.id === userId && state.activeUniverseId === universeId) {
      useWorldStore.setState({ dashboardContainers: previousContainers })
    }
    useWorldStore.getState().showToast(error instanceof Error ? error.message : 'Container konnten nicht synchronisiert werden')
  }
}

async function persistEntityOrder(
  userId: string,
  universeId: string,
  categoryKey: string,
  orderedIds: string[],
  previousEntities: Entity[],
) {
  cacheEntityOrderForScope(userId, universeId, categoryKey, orderedIds)
  try {
    const storage = JSON.parse(localStorage.getItem('worldify-entity-order') ?? '{}') as Record<string, string[]>
    const prefix = `${userId}:${universeId}:`
    const fullOrder = Object.fromEntries(
      Object.entries(storage)
        .filter(([scopeKey]) => scopeKey.startsWith(prefix))
        .map(([scopeKey, ids]) => [scopeKey.slice(prefix.length), ids]),
    )
    await mutateEntityOrderInSupabase(userId, universeId, fullOrder)
  } catch (error) {
    const previousOrderedIds = previousEntities
      .filter((entity) => entity.universeId === universeId)
      .map((entity) => entity.id)
    cacheEntityOrderForScope(userId, universeId, categoryKey, previousOrderedIds)
    const state = useWorldStore.getState()
    if (state.user?.id === userId && state.activeUniverseId === universeId) {
      useWorldStore.setState({ entities: previousEntities })
    }
    useWorldStore.getState().showToast(error instanceof Error ? error.message : 'Reihenfolge konnte nicht synchronisiert werden')
  }
}

async function persistPinnedEntities(
  userId: string,
  universeId: string,
  nextPins: string[],
  previousPins: string[],
) {
  setPinnedForUniverse(universeId, nextPins)
  try {
    const confirmedPins = await mutateEntityPinsInSupabase(userId, universeId, nextPins)
    setPinnedForUniverse(universeId, confirmedPins)
    const state = useWorldStore.getState()
    if (state.user?.id === userId && state.activeUniverseId === universeId) {
      useWorldStore.setState({ pinnedEntityIds: confirmedPins })
    }
  } catch (error) {
    setPinnedForUniverse(universeId, previousPins)
    const state = useWorldStore.getState()
    if (state.user?.id === userId && state.activeUniverseId === universeId) {
      useWorldStore.setState({ pinnedEntityIds: previousPins })
    }
    useWorldStore.getState().showToast(error instanceof Error ? error.message : 'Pins konnten nicht synchronisiert werden')
  }
}

function toSlug(value: string) {
  return normalizeLabel(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildUniqueCategorySlug(label: string, existingItems: SidebarLibraryItem[], suffix?: string) {
  const baseSlug = `custom-${toSlug(label) || 'category'}`
  const existingSlugs = new Set(
    existingItems.filter((item) => item.kind === 'category').map((item) => item.slug),
  )

  if (suffix) {
    return `${baseSlug}-${suffix}`
  }

  if (!existingSlugs.has(baseSlug)) {
    return baseSlug
  }

  let counter = 2
  let nextSlug = `${baseSlug}-${counter}`

  while (existingSlugs.has(nextSlug)) {
    counter += 1
    nextSlug = `${baseSlug}-${counter}`
  }

  return nextSlug
}

function normalizeCategoryFields(fields?: CategoryField[]) {
  if (!fields?.length) {
    return undefined
  }

  const seenNames = new Set<string>()
  const nextFields = fields
    .map((field) => ({
      ...field,
      name: normalizeLabel(field.name),
    }))
    .filter((field) => {
      if (!field.name) {
        return false
      }

      const key = field.name.toLowerCase()

      if (seenNames.has(key)) {
        return false
      }

      seenNames.add(key)
      return true
    })

  return nextFields.length > 0 ? nextFields : undefined
}

function hasCategoryLabelConflict(
  items: SidebarLibraryItem[],
  nextLabel: string,
  excludeItemId?: string,
) {
  const normalizedTarget = normalizeLabel(nextLabel).toLowerCase()

  return items.some((item) =>
    item.kind === 'category' &&
    item.id !== excludeItemId &&
    normalizeLabel(item.label).toLowerCase() === normalizedTarget,
  )
}

type WorldState = {
  isAuthenticated: boolean
  authReady: boolean
  authMode: 'login' | 'register'
  authError: string | null
  authMessage: string | null
  isAuthSubmitting: boolean
  session: Session | null
  user: User | null
  universes: Universe[]
  libraryItems: SidebarLibraryItem[]
  dashboardContainers: DashboardContainer[]
  isLoadingWorld: boolean
  worldError: string | null
  activeUniverseId: string
  entities: Entity[]
  pinnedEntityIds: string[]
  searchQuery: string
  lastBackupAt: string | null
  togglePinEntity: (entityId: string) => void
  setLastBackupAt: (timestamp: string) => void
  setAuthMode: (mode: 'login' | 'register') => void
  clearAuthFeedback: () => void
  hydrateAuth: () => Promise<void>
  applySession: (session: Session | null) => void
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loadWorldData: () => Promise<void>
  setActiveUniverse: (universeId: string) => void
  setUniversesLocal: (universes: Universe[]) => void
  setSearchQuery: (query: string) => void
  addLibraryCategory: (label: string, description: string, entityType?: EntityType, icon?: string) => void
  addCustomCategory: (config: {
    label: string
    singular?: string
    description?: string
    color?: string
    icon?: string
    iconUrl?: string
    entityType?: EntityType
    fields?: CategoryField[]
  }) => Promise<boolean>
  updateCustomCategory: (itemId: string, config: {
    label: string
    singular?: string
    description?: string
    color?: string
    icon?: string
    iconUrl?: string
    entityType?: EntityType
    fields?: CategoryField[]
  }) => Promise<boolean>
  addLibraryDivider: (label?: string) => void
  addDashboardNoteContainer: (categorySlug?: string) => void
  updateDashboardNoteContainer: (id: string, updates: { title?: string; notes?: string[] }) => void
  removeDashboardNoteContainer: (id: string) => void
  addDashboardListContainer: () => void
  moveDashboardContainer: (activeId: string, overId: string) => void
  moveCategoryEntity: (activeId: string, overId: string, categoryKey: string) => void
  removeLibraryItem: (itemId: string) => void
  reorderLibraryItems: (fromIndex: number, toIndex: number) => void
  createEntity: (draft: DraftEntity) => Entity
  updateEntityLocal: (entityId: string, draft: DraftEntity) => void
  deleteEntityLocal: (entityId: string) => void
  trashEntityLocally: (entityId: string) => Promise<boolean>
  confirmDialog: {
    open: boolean
    title: string
    description?: string
    confirmLabel?: string
    cancelLabel?: string
    confirmVariant?: 'primary' | 'danger'
    onConfirm?: () => void
    onCancel?: () => void
  } | null
  openConfirmDialog: (options: {
    title: string
    description?: string
    confirmLabel?: string
    cancelLabel?: string
    confirmVariant?: 'primary' | 'danger'
  }) => Promise<boolean>
  closeConfirmDialog: () => void
  toast: { message: string; id: number } | null
  showToast: (message: string) => void
  clearToast: () => void
}

export const useWorldStore = create<WorldState>((set, get) => ({
  isAuthenticated: false,
  authReady: false,
  authMode: 'login',
  authError: null,
  authMessage: null,
  isAuthSubmitting: false,
  session: null,
  user: null,
  universes: demoUniverses,
  libraryItems: defaultLibraryItems,
  dashboardContainers: defaultDashboardContainers,
  isLoadingWorld: false,
  worldError: null,
  activeUniverseId: demoUniverses[0].id,
  entities: demoEntities,
  pinnedEntityIds: getPinnedForUniverse(demoUniverses[0].id),
  searchQuery: '',
  lastBackupAt: localStorage.getItem('worldify_last_backup') ?? null,
  confirmDialog: null,
  togglePinEntity: (entityId) => {
    const state = get()
    const universeId = state.activeUniverseId
    const previousPins = state.pinnedEntityIds
    const next = togglePin(universeId, entityId)
    set({ pinnedEntityIds: next })
    if (state.user) {
      void persistPinnedEntities(state.user.id, universeId, next, previousPins)
    }
  },
  setLastBackupAt: (timestamp) => {
    localStorage.setItem('worldify_last_backup', timestamp)
    set({ lastBackupAt: timestamp })
  },
  setAuthMode: (mode) => set({ authMode: mode, authError: null, authMessage: null }),
  clearAuthFeedback: () => set({ authError: null, authMessage: null }),
  hydrateAuth: async () => {
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      set({
        authReady: true,
        isAuthenticated: false,
        session: null,
        user: null,
        authError: error.message,
      })
      return
    }

    get().applySession(data.session)
    set({ authReady: true })
  },
  applySession: (session) =>
    set({
      session,
      user: session?.user ?? null,
      isAuthenticated: Boolean(session),
    }),
  login: async (email, password) => {
    set({ isAuthSubmitting: true, authError: null, authMessage: null })

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      set({ isAuthSubmitting: false, authError: error.message })
      return
    }

    get().applySession(data.session)
    set({ isAuthSubmitting: false, authMessage: 'Erfolgreich eingeloggt.' })
  },
  register: async (email, password) => {
    set({ isAuthSubmitting: true, authError: null, authMessage: null })

    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      set({ isAuthSubmitting: false, authError: error.message })
      return
    }

    get().applySession(data.session)
    set({
      isAuthSubmitting: false,
      authMessage: data.session
        ? 'Account erstellt und eingeloggt.'
        : 'Account erstellt. Prufe jetzt deine E-Mails zur Bestatigung.',
    })
  },
  logout: async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      set({ authError: error.message })
      return
    }

    get().applySession(null)
    set({
      authMessage: null,
      authError: null,
      universes: demoUniverses,
      libraryItems: defaultLibraryItems,
      dashboardContainers: defaultDashboardContainers,
      entities: demoEntities,
      activeUniverseId: demoUniverses[0].id,
      pinnedEntityIds: getPinnedForUniverse(demoUniverses[0].id),
    })
  },
  loadWorldData: async () => {
    const user = get().user

    if (!user) {
      return
    }

    set({ isLoadingWorld: true, worldError: null })

    try {
    const { data: universeRows, error: universesError } = await supabase
      .from('universes')
      .select('id, name, description, created_at, updated_at, banner_url, icon_url')
      .order('created_at', { ascending: true })

    if (universesError) {
      set({
        isLoadingWorld: false,
        worldError: universesError.message,
      })
      return
    }

    const rawUniverseRows = (universeRows ?? []) as (DatabaseUniverseRow & { banner_url?: string | null; icon_url?: string | null })[]
    loadUniverseBannersFromDB(rawUniverseRows.map((r) => ({ id: r.id as string, banner_url: r.banner_url })))
    loadUniverseIconsFromDB(rawUniverseRows.map((r) => ({ id: r.id as string, icon_url: r.icon_url })))

    const mappedUniverses = rawUniverseRows.map((row) => {
      const universe = mapUniverseRow(row)
      const universeMeta = getUniverseMeta(universe.id)

      return {
        ...universe,
        iconUrl: (row.icon_url ?? universeMeta.iconUrl) || undefined,
      }
    })

    let ensuredUniverses = mappedUniverses

    if (mappedUniverses.length === 0) {
      const { data: insertedUniverse, error: insertUniverseError } = await supabase
        .from('universes')
        .insert({
          user_id: user.id,
          name: 'My Universe',
          description: 'Dein erstes Worldify-Universum.',
        })
        .select('id, name, description, created_at, updated_at')
        .single()

      if (insertUniverseError) {
        set({
          isLoadingWorld: false,
          worldError: insertUniverseError.message,
        })
        return
      }

      const createdUniverse = mapUniverseRow(insertedUniverse as DatabaseUniverseRow)

      ensuredUniverses = [
        {
          ...createdUniverse,
          iconUrl: getUniverseMeta(createdUniverse.id).iconUrl,
        },
      ]
    }

    const nextUniverseId = get().activeUniverseId && ensuredUniverses.some((universe) => universe.id === get().activeUniverseId)
      ? get().activeUniverseId
      : ensuredUniverses[0].id

    // Load settings: try Supabase first, populate localStorage cache, fall back to localStorage
    const remoteSettings = await loadUniverseSettingsFromSupabase(user.id, nextUniverseId)
    let nextLibraryItems = getLibraryItemsForScope(user.id, nextUniverseId)
    let nextDashboardContainers = getDashboardContainersForScope(user.id, nextUniverseId)

    if (remoteSettings) {
      if (remoteSettings.library_items.length > 0) {
        nextLibraryItems = remoteSettings.library_items
        cacheLibraryItemsForScope(user.id, nextUniverseId, remoteSettings.library_items)
      }
      if (remoteSettings.dashboard_containers.length > 0) {
        nextDashboardContainers = remoteSettings.dashboard_containers
        cacheDashboardContainersForScope(user.id, nextUniverseId, remoteSettings.dashboard_containers)
      }
      if (Object.keys(remoteSettings.entity_order).length > 0) {
        restoreEntityOrderFromRemote(user.id, nextUniverseId, remoteSettings.entity_order)
      }
      if (remoteSettings.entity_pins.length > 0) {
        setPinnedForUniverse(nextUniverseId, remoteSettings.entity_pins)
      }
      loadCategoryBannersFromDB(remoteSettings.category_banners)
    }

    const { data: entityRows, error: entitiesError } = await supabase
      .from('entities')
      .select('id, universe_id, type, name, short_description, content, tags, status, created_at, updated_at, timeline_date, category_slug, field_values, cover_url, avatar_url')
      .order('created_at', { ascending: false })

    if (entitiesError) {
      set({
        universes: ensuredUniverses,
        activeUniverseId: nextUniverseId,
        isLoadingWorld: false,
        worldError: entitiesError.message,
      })
      return
    }

    // Populate localStorage caches from Supabase data
    type ExtendedEntityRow = DatabaseEntityRow & {
      category_slug?: string | null
      field_values?: Record<string, string> | null
      cover_url?: string | null
      avatar_url?: string | null
    }
    const extendedRows = (entityRows ?? []) as ExtendedEntityRow[]
    for (const row of extendedRows) {
      if (row.category_slug) setEntityCategorySlug(row.id, row.category_slug)
      if (row.field_values && Object.keys(row.field_values).length > 0) {
        saveEntityFieldValues(row.id, row.field_values as Record<string, string>)
      }
    }
    loadEntityMediaFromDB(extendedRows.map((r) => ({ id: r.id as string, cover_url: r.cover_url, avatar_url: r.avatar_url })))
    try {
      await syncTrashFromSupabase(user.id)
    } catch (error) {
      get().showToast(error instanceof Error ? error.message : 'Papierkorb konnte nicht geladen werden')
    }

    // Load entity links from Supabase
    const { data: linkRows } = await supabase
      .from('entity_links')
      .select('entity_id, target_id, relation_type, created_at')

    if (linkRows && linkRows.length > 0) {
      loadEntityLinksFromRemote(
        linkRows.map((r) => ({
          entityId: r.entity_id as string,
          targetId: r.target_id as string,
          relationType: r.relation_type as string,
          createdAt: r.created_at as string,
        })),
      )
    }

    set({
      universes: ensuredUniverses,
      libraryItems: nextLibraryItems,
      dashboardContainers: nextDashboardContainers,
      entities: ((entityRows ?? []) as DatabaseEntityRow[]).map(mapEntityRow),
      activeUniverseId: nextUniverseId,
      pinnedEntityIds: getPinnedForUniverse(nextUniverseId),
      isLoadingWorld: false,
      worldError: null,
    })

    } catch (err) {
      set({ isLoadingWorld: false, worldError: err instanceof Error ? err.message : 'Unbekannter Fehler' })
    }
  },
  setActiveUniverse: (universeId) => {
    const userId = get().user?.id

    set({
      activeUniverseId: universeId,
      pinnedEntityIds: getPinnedForUniverse(universeId),
      libraryItems: userId
        ? getLibraryItemsForScope(userId, universeId)
        : defaultLibraryItems,
      dashboardContainers: userId
        ? getDashboardContainersForScope(userId, universeId)
        : defaultDashboardContainers,
    })
  },
  setUniversesLocal: (universes) => set({ universes }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  addLibraryCategory: (label, description, entityType, icon) =>
    set((state) => {
      const slug = `custom-${label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')}`
      const newCategory = {
        id: `lib-custom-${Date.now()}`,
        kind: 'category' as const,
        label,
        slug,
        description,
        ...(entityType ? { entityType } : {}),
        ...(icon ? { icon } : {}),
      }
      const nextLibraryItems = [
        ...state.libraryItems,
        newCategory,
      ]

      const newContainer = {
        id: `container-category-${Date.now()}`,
        kind: 'category' as const,
        title: label,
        description,
        categorySlug: slug,
      }

      if (state.user) {
        cacheLibraryItemsForScope(state.user.id, state.activeUniverseId, nextLibraryItems)
        void persistLibraryMutation(
          state.user.id,
          state.activeUniverseId,
          { type: 'upsert', item: newCategory },
          state.libraryItems,
        )
        void persistDashboardContainers(
          state.user.id,
          state.activeUniverseId,
          [...state.dashboardContainers, newContainer],
          state.dashboardContainers,
        )
      }

      return {
        libraryItems: nextLibraryItems,
        dashboardContainers: [...state.dashboardContainers, newContainer],
      }
    }),
  addCustomCategory: async (config) => {
      const state = get()
      const id = Date.now()
      const normalizedLabel = normalizeLabel(config.label)
      if (hasCategoryLabelConflict(state.libraryItems, normalizedLabel)) {
        return false
      }
      const normalizedDescription = config.description ? normalizeLabel(config.description) : ''
      const normalizedSingular = config.singular ? normalizeLabel(config.singular) : undefined
      const normalizedFields = normalizeCategoryFields(config.fields)
      const slug = buildUniqueCategorySlug(normalizedLabel, state.libraryItems, String(id))
      const newItem = {
        id: `lib-custom-${id}`,
        kind: 'category' as const,
        label: normalizedLabel,
        slug,
        description: normalizedDescription,
        ...(normalizedSingular ? { singular: normalizedSingular } : {}),
        ...(config.icon ? { icon: config.icon } : {}),
        ...(config.iconUrl ? { iconUrl: config.iconUrl } : {}),
        ...(config.entityType ? { entityType: config.entityType } : {}),
        ...(config.color ? { color: config.color } : {}),
        ...(normalizedFields ? { fields: normalizedFields } : {}),
      }
      const nextLibraryItems = [...state.libraryItems, newItem]

      const newContainer = {
        id: `container-category-${id}`,
        kind: 'category' as const,
        title: normalizedLabel,
        description: normalizedDescription,
        categorySlug: slug,
      }

      let confirmedLibraryItems: SidebarLibraryItem[] = nextLibraryItems
      if (state.user) {
        try {
          confirmedLibraryItems = await mutateLibraryItemsInSupabase(
            state.user.id,
            state.activeUniverseId,
            { type: 'upsert', item: newItem },
          )
          cacheLibraryItemsForScope(state.user.id, state.activeUniverseId, confirmedLibraryItems)
        } catch (error) {
          get().showToast(error instanceof Error ? error.message : 'Kategorie konnte nicht synchronisiert werden')
          return false
        }
        void persistDashboardContainers(
          state.user.id,
          state.activeUniverseId,
          [...state.dashboardContainers, newContainer],
          state.dashboardContainers,
        )
      }

      set({
        libraryItems: confirmedLibraryItems,
        dashboardContainers: [...state.dashboardContainers, newContainer],
      })
      return true
    },
  updateCustomCategory: async (itemId, config) => {
      const state = get()
      const currentItem = state.libraryItems.find(
        (item) => item.kind === 'category' && item.id === itemId,
      )

      if (!currentItem || currentItem.kind !== 'category') {
        return false
      }

      const normalizedLabel = normalizeLabel(config.label)
      if (hasCategoryLabelConflict(state.libraryItems, normalizedLabel, itemId)) {
        return false
      }
      const normalizedDescription = config.description ? normalizeLabel(config.description) : ''
      const normalizedSingular = config.singular ? normalizeLabel(config.singular) : undefined
      const normalizedFields = normalizeCategoryFields(config.fields)

      const nextLibraryItems = state.libraryItems.map((item) =>
        item.kind === 'category' && item.id === itemId
          ? {
              ...item,
              label: normalizedLabel,
              description: normalizedDescription,
              singular: normalizedSingular,
              icon: config.icon || undefined,
              iconUrl: config.iconUrl || undefined,
              entityType: config.entityType,
              color: config.color || undefined,
              fields: normalizedFields,
            }
          : item,
      )

      const nextDashboardContainers = state.dashboardContainers.map((container) =>
        container.kind === 'category' && container.categorySlug === currentItem.slug
          ? {
              ...container,
              title: normalizedLabel,
              description: normalizedDescription,
            }
          : container,
      )

      const updatedItem = nextLibraryItems.find((item) => item.id === itemId)
      let confirmedLibraryItems: SidebarLibraryItem[] = nextLibraryItems
      if (state.user) {
        if (!updatedItem) return false
        try {
          confirmedLibraryItems = await mutateLibraryItemsInSupabase(
            state.user.id,
            state.activeUniverseId,
            { type: 'upsert', item: updatedItem },
          )
          cacheLibraryItemsForScope(state.user.id, state.activeUniverseId, confirmedLibraryItems)
        } catch (error) {
          get().showToast(error instanceof Error ? error.message : 'Kategorie konnte nicht synchronisiert werden')
          return false
        }
        void persistDashboardContainers(
          state.user.id,
          state.activeUniverseId,
          nextDashboardContainers,
          state.dashboardContainers,
        )
      }

      set({
        libraryItems: confirmedLibraryItems,
        dashboardContainers: nextDashboardContainers,
      })
      return true
    },
  addLibraryDivider: (label) =>
    set((state) => {
      const divider = { id: `lib-divider-${Date.now()}`, kind: 'divider' as const, label: label ?? '' }
      const nextLibraryItems = [
        ...state.libraryItems,
        divider,
      ]
      if (state.user) {
        cacheLibraryItemsForScope(state.user.id, state.activeUniverseId, nextLibraryItems)
        void persistLibraryMutation(
          state.user.id,
          state.activeUniverseId,
          { type: 'upsert', item: divider },
          state.libraryItems,
        )
      }
      return { libraryItems: nextLibraryItems }
    }),
  addDashboardNoteContainer: (categorySlug?: string) =>
    set((state) => {
      const nextDashboardContainers = [
        {
          id: `container-note-${Date.now()}`,
          kind: 'note' as const,
          title: 'Neue Notiz',
          notes: ['Kurze Idee festhalten...'],
          ...(categorySlug ? { categorySlug } : {}),
        },
        ...state.dashboardContainers,
      ]

      if (state.user) {
        void persistDashboardContainers(
          state.user.id,
          state.activeUniverseId,
          nextDashboardContainers,
          state.dashboardContainers,
        )
      }

      return { dashboardContainers: nextDashboardContainers }
    }),
  updateDashboardNoteContainer: (id, updates) =>
    set((state) => {
      const nextDashboardContainers = state.dashboardContainers.map((container) =>
        container.id === id && container.kind === 'note'
          ? { ...container, ...updates }
          : container,
      )
      if (state.user) {
        void persistDashboardContainers(
          state.user.id,
          state.activeUniverseId,
          nextDashboardContainers,
          state.dashboardContainers,
        )
      }
      return { dashboardContainers: nextDashboardContainers }
    }),
  removeDashboardNoteContainer: (id) =>
    set((state) => {
      const nextDashboardContainers = state.dashboardContainers.filter((container) => container.id !== id)
      if (state.user) {
        void persistDashboardContainers(
          state.user.id,
          state.activeUniverseId,
          nextDashboardContainers,
          state.dashboardContainers,
        )
      }
      return { dashboardContainers: nextDashboardContainers }
    }),
  addDashboardListContainer: () =>
    set((state) => {
      const nextDashboardContainers = [
        ...state.dashboardContainers,
        {
          id: `container-list-${Date.now()}`,
          kind: 'list' as const,
          title: 'Neue Liste',
          items: [
            { id: `list-item-${Date.now()}-1`, label: 'Erster Punkt', done: false },
            { id: `list-item-${Date.now()}-2`, label: 'Zweiter Punkt', done: false },
          ],
        },
      ]

      if (state.user) {
        void persistDashboardContainers(
          state.user.id,
          state.activeUniverseId,
          nextDashboardContainers,
          state.dashboardContainers,
        )
      }

      return { dashboardContainers: nextDashboardContainers }
    }),
  moveDashboardContainer: (activeId, overId) =>
    set((state) => {
      const activeIndex = state.dashboardContainers.findIndex((item) => item.id === activeId)
      const overIndex = state.dashboardContainers.findIndex((item) => item.id === overId)

      if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
        return {}
      }

      const nextDashboardContainers = [...state.dashboardContainers]
      const [movedItem] = nextDashboardContainers.splice(activeIndex, 1)
      nextDashboardContainers.splice(overIndex, 0, movedItem)

      if (state.user) {
        void persistDashboardContainers(
          state.user.id,
          state.activeUniverseId,
          nextDashboardContainers,
          state.dashboardContainers,
        )
      }

      return { dashboardContainers: nextDashboardContainers }
    }),
  moveCategoryEntity: (activeId, overId, categoryKey) =>
    set((state) => {
      const currentEntities = [...state.entities]
      const activeIndex = currentEntities.findIndex((item) => item.id === activeId)
      const overIndex = currentEntities.findIndex((item) => item.id === overId)

      if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
        return {}
      }

      const [movedItem] = currentEntities.splice(activeIndex, 1)
      currentEntities.splice(overIndex, 0, movedItem)

      if (state.user) {
        const orderedIds = currentEntities
          .filter((entity) => entity.universeId === state.activeUniverseId)
          .map((entity) => entity.id)

        void persistEntityOrder(state.user.id, state.activeUniverseId, categoryKey, orderedIds, state.entities)
      }

      return { entities: currentEntities }
    }),
  reorderLibraryItems: (fromIndex, toIndex) =>
    set((state) => {
      if (fromIndex === toIndex) return {}
      const nextItems = [...state.libraryItems]
      const [moved] = nextItems.splice(fromIndex, 1)
      nextItems.splice(toIndex, 0, moved)
      if (state.user) {
        cacheLibraryItemsForScope(state.user.id, state.activeUniverseId, nextItems)
        void persistLibraryMutation(
          state.user.id,
          state.activeUniverseId,
          { type: 'reorder', orderedIds: nextItems.map((item) => item.id) },
          state.libraryItems,
        )
      }
      return { libraryItems: nextItems }
    }),
  removeLibraryItem: (itemId) =>
    set((state) => {
      const nextLibraryItems = state.libraryItems.filter((item) => item.id !== itemId)
      const removedItem = state.libraryItems.find((item) => item.id === itemId)
      const nextDashboardContainers = state.dashboardContainers.filter((item) =>
        item.kind === 'category' && removedItem?.kind === 'category'
          ? item.categorySlug !== removedItem.slug
          : true,
      )

      if (state.user) {
        cacheLibraryItemsForScope(state.user.id, state.activeUniverseId, nextLibraryItems)
        void persistLibraryMutation(state.user.id, state.activeUniverseId, { type: 'remove', itemId }, state.libraryItems)
        void persistDashboardContainers(
          state.user.id,
          state.activeUniverseId,
          nextDashboardContainers,
          state.dashboardContainers,
        )
      }

      if (removedItem?.kind === 'category') {
        removeCategoryAssignmentsBySlug(removedItem.slug)
      }

      return {
        libraryItems: nextLibraryItems,
        dashboardContainers: nextDashboardContainers,
      }
    }),
  createEntity: (draft) => {
    const state = get()
    const today = new Date().toISOString().slice(0, 10)
    const entity: Entity = {
      id: `entity-${Date.now()}`,
      universeId: state.activeUniverseId,
      type: draft.type,
      name: draft.name,
      shortDescription: draft.shortDescription,
      content: draft.content,
      tags: draft.tags,
      status: draft.status,
      createdAt: today,
      updatedAt: today,
      timelineDate: draft.timelineDate,
    }

    set((current) => ({ entities: [entity, ...current.entities] }))
    logActivity({ entityId: entity.id, entityName: entity.name, entityType: entity.type, action: 'created', universeId: state.activeUniverseId })
    return entity
  },
  updateEntityLocal: (entityId, draft) =>
    set((state) => ({
      entities: state.entities.map((entity) =>
        entity.id === entityId
          ? {
              ...entity,
              name: draft.name,
              type: draft.type,
              shortDescription: draft.shortDescription,
              content: draft.content,
              tags: draft.tags,
              status: draft.status,
              timelineDate: draft.timelineDate,
              updatedAt: new Date().toISOString().slice(0, 10),
            }
          : entity,
      ),
    })),
  deleteEntityLocal: (entityId) => {
    removeEntityCategorySlug(entityId)
    deleteEntityFieldValues(entityId)
    removeEntityReferencesFromFieldValues(entityId)
    removeEntityLinksForEntity(entityId)
    set((state) => ({
      entities: state.entities.filter((entity) => entity.id !== entityId),
    }))
  },
  trashEntityLocally: async (entityId) => {
    const state = get()
    const entity = state.entities.find((e) => e.id === entityId)
    if (!entity) {
      return false
    }

    if (import.meta.env.VITE_E2E_MODE === 'true') {
      await moveToTrash(entity)
      removeEntityCategorySlug(entityId)
      deleteEntityFieldValues(entityId)
      removeEntityReferencesFromFieldValues(entityId)
      removeEntityLinksForEntity(entityId)
      set((s) => ({ entities: s.entities.filter((e) => e.id !== entityId) }))
      return true
    }

    try {
      await moveToTrash(entity, state.user?.id)
      const { error } = await supabase.from('entities').delete().eq('id', entityId)
      if (error) {
        throw error
      }
      logActivity({ entityId: entity.id, entityName: entity.name, entityType: entity.type, action: 'deleted', universeId: state.activeUniverseId })
    } catch (error) {
      try {
        await restoreFromTrash(entity.id, state.user?.id)
      } catch {
        // Best effort rollback of trash state; user still gets the original error.
      }
      get().showToast(error instanceof Error ? error.message : 'Papierkorb konnte nicht synchronisiert werden')
      return false
    }

    removeEntityCategorySlug(entityId)
    deleteEntityFieldValues(entityId)
    removeEntityReferencesFromFieldValues(entityId)
    removeEntityLinksForEntity(entityId)
    set((s) => ({ entities: s.entities.filter((e) => e.id !== entityId) }))
    return true
  },
  openConfirmDialog: (options) =>
    new Promise<boolean>((resolve) => {
      const close = () => set({ confirmDialog: null })
      set({
        confirmDialog: {
          open: true,
          ...options,
          onConfirm: () => {
            close()
            resolve(true)
          },
          onCancel: () => {
            close()
            resolve(false)
          },
        },
      })
    }),
  closeConfirmDialog: () => set({ confirmDialog: null }),
  toast: null,
  showToast: (message) => {
    const id = Date.now()
    set({ toast: { message, id } })
    setTimeout(() => set((s) => s.toast?.id === id ? { toast: null } : {}), 3000)
  },
  clearToast: () => set({ toast: null }),
}))
