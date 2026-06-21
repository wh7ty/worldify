import type { Entity } from '../data/mockWorld'

export type MentionSegment =
  | { kind: 'text'; text: string }
  | { kind: 'mention'; text: string; entity: Entity }

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function parseTextMentions(
  text: string,
  entities: Entity[],
  currentEntityId?: string,
): MentionSegment[] {
  if (!text) return [{ kind: 'text', text: '' }]

  // Only entities with names of at least 3 chars, excluding self
  const candidates = entities.filter(
    (e) => e.name.length >= 3 && e.id !== currentEntityId,
  )
  if (candidates.length === 0) return [{ kind: 'text', text }]

  // Sort longest first so "Peter Parker" matches before "Peter"
  const sorted = [...candidates].sort((a, b) => b.name.length - a.name.length)

  const nameToEntity: Map<string, Entity> = new Map()
  for (const e of sorted) {
    nameToEntity.set(e.name.toLowerCase(), e)
  }

  const escaped = sorted.map((e) => escapeRegex(e.name))
  // Word-boundary: not preceded/followed by word chars (incl. German umlauts)
  // Lookbehind unsupported in Safari < 16.4 — fall back to simpler pattern
  const boundary = '[\\wäöüÄÖÜß]'
  let pattern: RegExp
  try {
    pattern = new RegExp(`(?<!${boundary})(${escaped.join('|')})(?!${boundary})`, 'gi')
    // Test that the engine actually supports it
    pattern.test('')
  } catch {
    pattern = new RegExp(`(${escaped.join('|')})`, 'gi')
  }

  const segments: MentionSegment[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: 'text', text: text.slice(lastIndex, match.index) })
    }
    const matchedText = match[0]
    const entity = nameToEntity.get(matchedText.toLowerCase())
    if (entity) {
      segments.push({ kind: 'mention', text: matchedText, entity })
    } else {
      segments.push({ kind: 'text', text: matchedText })
    }
    lastIndex = match.index + matchedText.length
  }

  if (lastIndex < text.length) {
    segments.push({ kind: 'text', text: text.slice(lastIndex) })
  }

  return segments
}
