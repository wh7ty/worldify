import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

export default function TagInput({
  value,
  onChange,
  suggestions,
}: {
  value: string[]
  onChange: (tags: string[]) => void
  suggestions: string[]
}) {
  const [inputValue, setInputValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = suggestions
    .filter((s) => {
      if (value.includes(s)) return false
      if (!inputValue.trim()) return true
      return s.toLowerCase().includes(inputValue.toLowerCase())
    })
    .slice(0, 8)

  const addTag = (tag: string) => {
    const trimmed = tag.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setInputValue('')
    setActiveIndex(-1)
    inputRef.current?.focus()
  }

  const removeTag = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (activeIndex >= 0 && filtered[activeIndex]) {
        addTag(filtered[activeIndex])
      } else if (inputValue.trim()) {
        addTag(inputValue)
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1))
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setActiveIndex(-1)
    }
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div
        onClick={() => inputRef.current?.focus()}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          alignItems: 'center',
          minHeight: 40,
          padding: '6px 12px',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--color-surface)',
          cursor: 'text',
          boxSizing: 'border-box',
        }}
      >
        {value.map((tag, i) => (
          <span
            key={i}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-accent-light)',
              color: 'var(--color-accent)',
              fontSize: 12,
              fontWeight: 500,
              fontFamily: 'var(--font-ui)',
              lineHeight: 1.6,
            }}
          >
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(i) }}
              style={{
                display: 'flex', alignItems: 'center',
                background: 'none', border: 'none', padding: 0,
                cursor: 'pointer', color: 'var(--color-accent)', opacity: 0.7,
              }}
            >
              <X size={11} strokeWidth={2} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => { setInputValue(e.target.value); setIsOpen(true); setActiveIndex(-1) }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? 'Tag tippen + Enter' : ''}
          style={{
            border: 'none', outline: 'none', background: 'transparent',
            fontSize: 15, fontFamily: 'var(--font-ui)', color: 'var(--color-text)',
            flexGrow: 1, minWidth: 80, padding: '2px 0',
          }}
        />
      </div>

      {isOpen && filtered.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            zIndex: 50,
            overflow: 'hidden',
          }}
        >
          {filtered.map((s, i) => (
            <div
              key={s}
              onMouseDown={(e) => { e.preventDefault(); addTag(s) }}
              onMouseEnter={() => setActiveIndex(i)}
              style={{
                padding: '8px 12px',
                fontSize: 13,
                fontFamily: 'var(--font-ui)',
                color: 'var(--color-text)',
                backgroundColor: i === activeIndex ? 'var(--color-primary-light)' : 'transparent',
                cursor: 'pointer',
                transition: 'background 80ms',
              }}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
