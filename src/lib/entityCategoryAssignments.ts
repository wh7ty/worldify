const STORAGE_KEY = 'worldify-entity-category-assignments'

type StoredEntityCategoryAssignments = Record<string, string>

function readStorage() {
  if (typeof window === 'undefined') {
    return {} as StoredEntityCategoryAssignments
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY)

  if (!rawValue) {
    return {} as StoredEntityCategoryAssignments
  }

  try {
    const parsedValue = JSON.parse(rawValue) as StoredEntityCategoryAssignments
    return parsedValue ?? {}
  } catch {
    return {} as StoredEntityCategoryAssignments
  }
}

function writeStorage(nextValue: StoredEntityCategoryAssignments) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextValue))
}

export function getEntityCategorySlug(entityId: string) {
  return readStorage()[entityId] ?? null
}

export function setEntityCategorySlug(entityId: string, categorySlug: string) {
  const storage = readStorage()
  storage[entityId] = categorySlug
  writeStorage(storage)
}

export function removeEntityCategorySlug(entityId: string) {
  const storage = readStorage()

  if (!(entityId in storage)) {
    return
  }

  delete storage[entityId]
  writeStorage(storage)
}

export function removeCategoryAssignmentsBySlug(categorySlug: string) {
  const storage = readStorage()
  const nextStorage = Object.fromEntries(
    Object.entries(storage).filter(([, storedCategorySlug]) => storedCategorySlug !== categorySlug),
  )

  writeStorage(nextStorage)
}
