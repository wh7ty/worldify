import type { Entity } from '../data/mockWorld'

const ENTITY_REFERENCE_PREFIX = 'entity:'

export type EntityReference = {
  id: string
  label: string
}

export function encodeEntityReference(reference: EntityReference) {
  return `${ENTITY_REFERENCE_PREFIX}${reference.id}|${reference.label}`
}

export function decodeEntityReference(value: string): EntityReference | null {
  if (!value.startsWith(ENTITY_REFERENCE_PREFIX)) {
    return null
  }

  const payload = value.slice(ENTITY_REFERENCE_PREFIX.length)
  const separatorIndex = payload.indexOf('|')

  if (separatorIndex === -1) {
    return null
  }

  const id = payload.slice(0, separatorIndex).trim()
  const label = payload.slice(separatorIndex + 1).trim()

  if (!id || !label) {
    return null
  }

  return { id, label }
}

export function getEntityReferenceLabel(value: string) {
  return decodeEntityReference(value)?.label ?? value
}

export function hasEntityReference(value: string, entityId: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .some((item) => decodeEntityReference(item)?.id === entityId)
}

export function buildParticipantOptions(entities: Entity[], currentEntity: Entity) {
  return entities
    .filter((entity) => entity.universeId === currentEntity.universeId)
    .filter((entity) => entity.type === 'character')
    .filter((entity) => entity.id !== currentEntity.id)
    .map((entity) => ({
      id: entity.id,
      label: entity.name,
      encodedValue: encodeEntityReference({
        id: entity.id,
        label: entity.name,
      }),
    }))
}
