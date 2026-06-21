import { useCallback, useEffect, useRef, useState } from 'react'

export function useBannerDrag(initialPosition: number, onSave: (pos: number) => void) {
  const [position, setPosition] = useState(initialPosition)
  const [isDragging, setIsDragging] = useState(false)
  const [isHovering, setIsHovering] = useState(false)

  const dragRef = useRef({ startY: 0, startPos: 50, height: 0 })
  const posRef = useRef(initialPosition)
  const onSaveRef = useRef(onSave)

  useEffect(() => { posRef.current = position }, [position])
  useEffect(() => { onSaveRef.current = onSave }, [onSave])

  // Sync when initialPosition changes (e.g. navigating to a different category)
  useEffect(() => {
    setPosition(initialPosition)
    posRef.current = initialPosition
  }, [initialPosition])

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLElement>) => {
    dragRef.current = {
      startY: e.clientY,
      startPos: posRef.current,
      height: e.currentTarget.getBoundingClientRect().height,
    }
    setIsDragging(true)
    e.preventDefault()
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const onMove = (e: MouseEvent) => {
      const { startY, startPos, height } = dragRef.current
      // Dragging down moves image down → reveals top (position decreases)
      const delta = ((e.clientY - startY) / height) * 100
      const newPos = Math.max(0, Math.min(100, startPos - delta))
      setPosition(newPos)
      posRef.current = newPos
    }

    const onUp = () => {
      setIsDragging(false)
      onSaveRef.current(posRef.current)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [isDragging])

  return { position, setPosition, isDragging, isHovering, setIsHovering, onMouseDown }
}
