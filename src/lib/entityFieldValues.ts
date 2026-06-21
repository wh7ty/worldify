const STORAGE_KEY = 'worldify-entity-field-values'

type StoredEntityFieldValues = Record<string, Record<string, string>>

function readStorage() {
  if (typeof window === 'undefined') {
    return {} as StoredEntityFieldValues
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY)

  if (!rawValue) {
    return {} as StoredEntityFieldValues
  }

  try {
    const parsedValue = JSON.parse(rawValue) as StoredEntityFieldValues
    return parsedValue ?? {}
  } catch {
    return {}
  }
}

function writeStorage(nextValue: StoredEntityFieldValues) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextValue))
}

export function getEntityFieldValues(entityId: string) {
  const storage = readStorage()
  return storage[entityId] ?? {}
}

export function saveEntityFieldValues(entityId: string, values: Record<string, string>) {
  const storage = readStorage()
  storage[entityId] = values
  writeStorage(storage)
}

export function deleteEntityFieldValues(entityId: string) {
  const storage = readStorage()

  if (!(entityId in storage)) {
    return
  }

  delete storage[entityId]
  writeStorage(storage)
}

export function removeEntityReferencesFromFieldValues(entityId: string) {
  const storage = readStorage()
  const referencePrefix = `entity:${entityId}|`
  let hasChanges = false

  for (const [storedEntityId, values] of Object.entries(storage)) {
    const nextValues = Object.fromEntries(
      Object.entries(values).map(([fieldId, fieldValue]) => {
        const nextValue = fieldValue
          .split('\n')
          .map((item) => item.trim())
          .filter((item) => item.length > 0 && !item.startsWith(referencePrefix))
          .join('\n')

        if (nextValue !== fieldValue) {
          hasChanges = true
        }

        return [fieldId, nextValue]
      }),
    )

    storage[storedEntityId] = nextValues
  }

  if (hasChanges) {
    writeStorage(storage)
  }
}
