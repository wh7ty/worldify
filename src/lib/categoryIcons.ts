import {
  Users, MapPin, Shield, Sparkles, Bug, Languages, Package, BookOpen,
  Calendar, StickyNote, Cog, PenSquare, Globe, Crown, Sword, Gem,
  Flame, Mountain, Castle, Scroll, Heart, Star, Skull, Leaf,
  Type, AlignLeft, Hash, UsersRound, Layers, ListChecks,
} from 'lucide-react'
import type { CategoryFieldType } from '../data/mockWorld'

export const categoryIconOptions: { name: string; icon: React.ElementType }[] = [
  { name: 'users', icon: Users },
  { name: 'map-pin', icon: MapPin },
  { name: 'shield', icon: Shield },
  { name: 'sparkles', icon: Sparkles },
  { name: 'bug', icon: Bug },
  { name: 'languages', icon: Languages },
  { name: 'package', icon: Package },
  { name: 'book-open', icon: BookOpen },
  { name: 'calendar', icon: Calendar },
  { name: 'sticky-note', icon: StickyNote },
  { name: 'cog', icon: Cog },
  { name: 'pen-square', icon: PenSquare },
  { name: 'globe', icon: Globe },
  { name: 'crown', icon: Crown },
  { name: 'sword', icon: Sword },
  { name: 'gem', icon: Gem },
  { name: 'flame', icon: Flame },
  { name: 'mountain', icon: Mountain },
  { name: 'castle', icon: Castle },
  { name: 'scroll', icon: Scroll },
  { name: 'heart', icon: Heart },
  { name: 'star', icon: Star },
  { name: 'skull', icon: Skull },
  { name: 'leaf', icon: Leaf },
  { name: 'type', icon: Type },
  { name: 'align-left', icon: AlignLeft },
  { name: 'hash', icon: Hash },
  { name: 'users-round', icon: UsersRound },
  { name: 'layers', icon: Layers },
  { name: 'list-checks', icon: ListChecks },
]

export const categoryFieldDefaultIcons: Record<CategoryFieldType, string> = {
  text: 'type',
  textarea: 'align-left',
  number: 'hash',
  participants: 'users-round',
  sections: 'layers',
  tasks: 'list-checks',
}

const iconByName = new Map(categoryIconOptions.map((o) => [o.name, o.icon]))

export function getCategoryIcon(name?: string): React.ElementType {
  return (name && iconByName.get(name)) || StickyNote
}
