type StoredEntityLink = {
  entityId: string
  targetId: string
  createdAt: string
  relationType?: string
}

const STORAGE_KEY = 'worldify-entity-links'

function readStorage() {
  if (typeof window === 'undefined') {
    return [] as StoredEntityLink[]
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY)

  if (!rawValue) {
    return [] as StoredEntityLink[]
  }

  try {
    const parsedValue = JSON.parse(rawValue) as StoredEntityLink[]
    return Array.isArray(parsedValue) ? parsedValue : []
  } catch {
    return []
  }
}

function writeStorage(nextValue: StoredEntityLink[]) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextValue))
}

export function getEntityLinks(entityId: string) {
  return readStorage().filter((link) => link.entityId === entityId)
}

export function getIncomingEntityLinks(targetId: string) {
  return readStorage().filter((link) => link.targetId === targetId)
}

export function hasEntityLink(entityId: string, targetId: string) {
  return readStorage().some((link) => link.entityId === entityId && link.targetId === targetId)
}

export function addEntityLink(entityId: string, targetId: string, relationType?: string) {
  const links = readStorage()
  const existing = links.find((link) => link.entityId === entityId && link.targetId === targetId)

  if (existing) {
    if (relationType !== undefined) {
      existing.relationType = relationType
      writeStorage(links)
    }
    return
  }

  links.push({
    entityId,
    targetId,
    createdAt: new Date().toISOString(),
    relationType,
  })

  writeStorage(links)
}

export function removeEntityLink(entityId: string, targetId: string) {
  const links = readStorage().filter((link) => !(link.entityId === entityId && link.targetId === targetId))
  writeStorage(links)
}

export function removeEntityLinksForEntity(entityId: string) {
  const links = readStorage().filter(
    (link) => link.entityId !== entityId && link.targetId !== entityId,
  )
  writeStorage(links)
}

export function loadEntityLinksFromRemote(
  links: { entityId: string; targetId: string; relationType: string; createdAt: string }[],
) {
  writeStorage(links)
}
