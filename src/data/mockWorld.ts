export type EntityType =
  | 'character'
  | 'location'
  | 'faction'
  | 'magic_system'
  | 'creature'
  | 'language'
  | 'item'
  | 'story'
  | 'event'
  | 'note'

export type EntityStatus = 'draft' | 'active' | 'archived' | 'concept'

export type Universe = {
  id: string
  name: string
  description: string
  iconUrl?: string
}

export type CategoryFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'participants'
  | 'sections'
  | 'tasks'

export type CategoryField = {
  id: string
  name: string
  type: CategoryFieldType
  icon?: string
}

export type SidebarCategoryItem = {
  id: string
  kind: 'category'
  label: string
  slug: string
  description: string
  entityType?: EntityType
  icon?: string
  singular?: string
  iconUrl?: string
  color?: string
  fields?: CategoryField[]
}

export const categoryFieldTypeMeta: Record<CategoryFieldType, string> = {
  text: 'Text',
  textarea: 'Textbereich',
  number: 'Zahl',
  participants: 'Teilnehmer',
  sections: 'Abschnitte (modular)',
  tasks: 'Aufgaben',
}

export type SidebarDividerItem = {
  id: string
  kind: 'divider'
  label: string
}

export type SidebarLibraryItem = SidebarCategoryItem | SidebarDividerItem

export type DashboardCategoryContainer = {
  id: string
  kind: 'category'
  title: string
  description: string
  categorySlug: string
}

export type DashboardNoteContainer = {
  id: string
  kind: 'note'
  title: string
  notes: string[]
  categorySlug?: string
}

export type DashboardListContainer = {
  id: string
  kind: 'list'
  title: string
  items: Array<{
    id: string
    label: string
    done: boolean
  }>
}

export type DashboardContainer =
  | DashboardCategoryContainer
  | DashboardNoteContainer
  | DashboardListContainer

export type Entity = {
  id: string
  universeId: string
  type: EntityType
  name: string
  shortDescription: string
  content: string
  tags: string[]
  status: EntityStatus
  createdAt: string
  updatedAt: string
  timelineDate?: string
  coverPosition?: number
}

export type DatabaseUniverseRow = {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export type DatabaseEntityRow = {
  id: string
  universe_id: string
  type: EntityType
  name: string
  short_description: string | null
  content: string | null
  tags: string[] | null
  status: EntityStatus
  created_at: string
  updated_at: string
  timeline_date?: string | null
  cover_position?: number | null
}

export const entityTypeMeta: Record<
  EntityType,
  {
    label: string
    route: string
    color: string
    lightColor: string
  }
> = {
  character: {
    label: 'Characters',
    route: '/characters',
    color: 'var(--color-character)',
    lightColor: 'var(--color-character-light)',
  },
  location: {
    label: 'Locations',
    route: '/locations',
    color: 'var(--color-location)',
    lightColor: 'var(--color-location-light)',
  },
  faction: {
    label: 'Factions',
    route: '/factions',
    color: 'var(--color-faction)',
    lightColor: 'var(--color-faction-light)',
  },
  magic_system: {
    label: 'Magic Systems',
    route: '/magic-systems',
    color: 'var(--color-magic-system)',
    lightColor: 'var(--color-magic-system-light)',
  },
  creature: {
    label: 'Creatures',
    route: '/creatures',
    color: 'var(--color-creature)',
    lightColor: 'var(--color-creature-light)',
  },
  language: {
    label: 'Languages',
    route: '/languages',
    color: 'var(--color-language)',
    lightColor: 'var(--color-language-light)',
  },
  item: {
    label: 'Items',
    route: '/items',
    color: 'var(--color-item)',
    lightColor: 'var(--color-item-light)',
  },
  story: {
    label: 'Stories',
    route: '/stories',
    color: 'var(--color-story)',
    lightColor: 'var(--color-story-light)',
  },
  event: {
    label: 'Events',
    route: '/events',
    color: 'var(--color-event)',
    lightColor: 'var(--color-event-light)',
  },
  note: {
    label: 'Notes',
    route: '/notes',
    color: 'var(--color-note)',
    lightColor: 'var(--color-note-light)',
  },
}

export const statusMeta: Record<
  EntityStatus,
  { label: string; color: string; lightColor: string }
> = {
  draft: {
    label: 'Draft',
    color: 'var(--color-warning)',
    lightColor: 'var(--color-warning-light)',
  },
  active: {
    label: 'Active',
    color: 'var(--color-success)',
    lightColor: 'var(--color-success-light)',
  },
  archived: {
    label: 'Archived',
    color: 'var(--color-text-secondary)',
    lightColor: 'var(--color-border)',
  },
  concept: {
    label: 'Concept',
    color: 'var(--color-primary)',
    lightColor: 'var(--color-primary-light)',
  },
}

export const demoUniverses: Universe[] = [
  {
    id: 'universe-aethoria',
    name: 'Aethoria',
    description: 'Ein ruhiges High-Fantasy-Universum mit alten Waldern und zersplitterten Reichen.',
  },
  {
    id: 'universe-cindervale',
    name: 'Cindervale',
    description: 'Eine rauere Welt aus Aschekusten, Handelsstadten und alchemischen Kriegen.',
  },
]

export const demoEntities: Entity[] = [
  {
    id: 'entity-elara',
    universeId: 'universe-aethoria',
    type: 'character',
    name: 'Elara Moonwhisper',
    shortDescription: 'Waldlauferin und Grenzwachterin des Nordhains.',
    content:
      'Elara bewacht die vergessenen Pfade des Nordhains. Sie kennt alte Bundnisse, verbotene Ruinen und die stillen Zeichen der Walder.',
    tags: ['ranger', 'elf', 'hero'],
    status: 'active',
    createdAt: '2026-06-11',
    updatedAt: '2026-06-13',
  },
  {
    id: 'entity-vale',
    universeId: 'universe-aethoria',
    type: 'location',
    name: 'The Vale of Lanterns',
    shortDescription: 'Eine Talstadt, in der nachts tausende Lichter uber den Kanalen treiben.',
    content:
      'Das Tal ist Handelspunkt und Zuflucht zugleich. Viele Geschichten beginnen hier, weil Reisende aus allen Reichen eintreffen.',
    tags: ['city', 'trade', 'canals'],
    status: 'active',
    createdAt: '2026-06-10',
    updatedAt: '2026-06-13',
  },
  {
    id: 'entity-accord',
    universeId: 'universe-aethoria',
    type: 'faction',
    name: 'The Silver Accord',
    shortDescription: 'Ein Bundnis aus Hausern, Schreibern und Spahern.',
    content:
      'Der Accord halt fragile Friedensvertrage zusammen und pflegt die Archive der grossen Grenzstadte.',
    tags: ['alliance', 'politics', 'archives'],
    status: 'concept',
    createdAt: '2026-06-09',
    updatedAt: '2026-06-12',
  },
  {
    id: 'entity-lumen',
    universeId: 'universe-aethoria',
    type: 'magic_system',
    name: 'Lumen Threading',
    shortDescription: 'Magie, die uber Lichtfaden und Erinnerungen gewoben wird.',
    content:
      'Lumen Threading erlaubt es, Erinnerungen an Orte zu binden. Je alter ein Ort, desto tiefer konnen Faden verankert werden.',
    tags: ['magic', 'memory', 'ritual'],
    status: 'draft',
    createdAt: '2026-06-08',
    updatedAt: '2026-06-12',
  },
  {
    id: 'entity-emberwake',
    universeId: 'universe-cindervale',
    type: 'story',
    name: 'Emberwake',
    shortDescription: 'Eine Expedition in die verbrannten Kusten des Sudens.',
    content:
      'Die Crew verfolgt ein verlorenes Siegel durch Inseln aus schwarzem Glas und verfallene Seeheiligtumer.',
    tags: ['adventure', 'sea', 'artifact'],
    status: 'draft',
    createdAt: '2026-06-07',
    updatedAt: '2026-06-10',
  },
]

export const defaultLibraryItems: SidebarLibraryItem[] = [
  {
    id: 'lib-characters',
    kind: 'category',
    label: 'Characters',
    slug: 'characters',
    description: 'Charaktere und wichtige Figuren.',
    entityType: 'character',
  },
]

export const defaultDashboardContainers: DashboardContainer[] = [
  {
    id: 'container-characters',
    kind: 'category',
    title: 'Characters',
    description: 'Deine Hauptkategorie fur Rollen, Figuren und Archetypen.',
    categorySlug: 'characters',
  },
  {
    id: 'container-quick-notes',
    kind: 'note',
    title: 'Quick Notes',
    notes: [
      'Der Hauptcharakter hat ein verborgenes Familiengeheimnis.',
      'Die Hauptstadt braucht spater einen eigenen Distrikt-Plan.',
      'Mondmagie nur bei bestimmten Jahreszeiten verfugbar machen.',
    ],
  },
  {
    id: 'container-todo-list',
    kind: 'list',
    title: 'Worldbuilding Liste',
    items: [
      { id: 'todo-1', label: 'Charakterbogen fur Protagonist ausbauen', done: false },
      { id: 'todo-2', label: 'Fruhe Timeline der Welt definieren', done: true },
      { id: 'todo-3', label: 'Namensschema fur Nebenfiguren festlegen', done: false },
    ],
  },
]

export function mapUniverseRow(row: DatabaseUniverseRow): Universe {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
  }
}

export function mapEntityRow(row: DatabaseEntityRow): Entity {
  return {
    id: row.id,
    universeId: row.universe_id,
    type: row.type,
    name: row.name,
    shortDescription: row.short_description ?? '',
    content: row.content ?? '',
    tags: row.tags ?? [],
    status: row.status,
    createdAt: row.created_at.slice(0, 10),
    updatedAt: row.updated_at.slice(0, 10),
    timelineDate: row.timeline_date ?? undefined,
    coverPosition: row.cover_position ?? undefined,
  }
}
