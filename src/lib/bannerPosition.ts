const UNIVERSE_KEY = 'worldify-universe-banner-positions'
const CATEGORY_KEY = 'worldify-category-banner-positions'
const ENTITY_COVER_KEY = 'worldify-entity-cover-positions'

function read(key: string): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(key) ?? '{}') } catch { return {} }
}
function save(key: string, id: string, pos: number) {
  const data = read(key)
  data[id] = Math.round(pos)
  localStorage.setItem(key, JSON.stringify(data))
}

export function getUniverseBannerPosition(universeId: string): number {
  return read(UNIVERSE_KEY)[universeId] ?? 50
}
export function saveUniverseBannerPosition(universeId: string, pos: number) {
  save(UNIVERSE_KEY, universeId, pos)
}
export function getCategoryBannerPosition(slug: string): number {
  return read(CATEGORY_KEY)[slug] ?? 50
}
export function saveCategoryBannerPosition(slug: string, pos: number) {
  save(CATEGORY_KEY, slug, pos)
}
export function getEntityCoverPosition(entityId: string): number {
  return read(ENTITY_COVER_KEY)[entityId] ?? 50
}
export function saveEntityCoverPosition(entityId: string, pos: number) {
  save(ENTITY_COVER_KEY, entityId, pos)
}
