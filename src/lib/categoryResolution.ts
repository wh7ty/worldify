import type { EntityType, SidebarLibraryItem } from '../data/mockWorld'

export function resolveCategoryForEntityType(
  libraryItems: SidebarLibraryItem[],
  entityType: EntityType,
  assignedCategorySlug?: string | null,
) {
  const assignedCategory = assignedCategorySlug
    ? libraryItems.find(
        (item) =>
          item.kind === 'category' &&
          item.slug === assignedCategorySlug,
      )
    : undefined

  if (assignedCategory?.kind === 'category') {
    return assignedCategory
  }

  return libraryItems.find(
    (item) => item.kind === 'category' && item.entityType === entityType,
  )
}
