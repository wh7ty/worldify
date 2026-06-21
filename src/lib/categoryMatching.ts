import type { Entity, SidebarCategoryItem, SidebarLibraryItem } from '../data/mockWorld'
import { getEntityCategorySlug } from './entityCategoryAssignments'

export function isEntityInCategory(
  entity: Pick<Entity, 'id' | 'type' | 'universeId'>,
  category: Pick<SidebarCategoryItem, 'id' | 'slug' | 'entityType'>,
) {
  const assignedCategorySlug = getEntityCategorySlug(entity.id)

  if (assignedCategorySlug) {
    return assignedCategorySlug === category.slug
  }

  const isBuiltInCategory = category.id.startsWith('lib-')

  if (!category.entityType || !isBuiltInCategory) {
    return false
  }

  return entity.type === category.entityType
}

export function findCategoryBySlug(libraryItems: SidebarLibraryItem[], categorySlug?: string | null) {
  if (!categorySlug) {
    return undefined
  }

  return libraryItems.find((item) => item.kind === 'category' && item.slug === categorySlug)
}
