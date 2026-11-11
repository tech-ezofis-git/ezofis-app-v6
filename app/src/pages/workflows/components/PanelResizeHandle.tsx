import { type KeyboardEvent, type PointerEvent, useState } from 'react'
import cn from '@/utils/cn'

/** The panel's default width, which is also the narrowest it can go. */
export const PANEL_MIN_WIDTH = 560
const CSS_VARIABLE = '--workflow-panel-width'
const STORAGE_KEY = 'workflow-panel-width'
const KEY_STEP = 40

/** Keeps the canvas visible: matches the panel's max-w-[85vw]. */
const maxWidth = () =>
  Math.max(PANEL_MIN_WIDTH, Math.floor(window.innerWidth * 0.85))

export const clampPanelWidth = (width: number) =>
  Math.min(maxWidth(), Math.max(PANEL_MIN_WIDTH, Math.round(width)))

const readSaved = () => {
  try {
    const saved = Number(localStorage.getItem(STORAGE_KEY))
    return Number.isFinite(saved) && saved > 0 ? clampPanelWidth(saved) : null
  } catch {
    return null
  }
}

const save = (width: number) => {
  try {
    if (width === PANEL_MIN_WIDTH) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, String(width))
  } catch {
    // The width just is not remembered.
  }
}

let currentWidth = PANEL_MIN_WIDTH

const applyWidth = (width: number) => {
  currentWidth = clampPanelWidth(width)
  document.documentElement.style.setProperty(CSS_VARIABLE, `${currentWidth}px`)
  return currentWidth
}

// Every panel reads the same width, so it stays when moving between blocks.
applyWidth(readSaved() ?? PANEL_MIN_WIDTH)

/** Sits on a side panel's left edge. Drag left to widen; double-click to reset. */
export default function PanelResizeHandle() {
  const [dragging, setDragging] = useState(false)

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const handle = event.currentTarget
    const startX = event.clientX
    const startWidth =
      handle.parentElement?.getBoundingClientRect().width || currentWidth
    const pointerId = event.pointerId
    handle.setPointerCapture?.(pointerId)
    document.body.style.userSelect = 'none'
    setDragging(true)

    const onMove = (move: globalThis.PointerEvent) =>
      applyWidth(startWidth + startX - move.clientX)
    const onEnd = () => {
      handle.removeEventListener('pointermove', onMove)
      handle.removeEventListener('pointerup', onEnd)
      handle.removeEventListener('pointercancel', onEnd)
      handle.releasePointerCapture?.(pointerId)
      document.body.style.userSelect = ''
      setDragging(false)
      save(currentWidth)
    }
    handle.addEventListener('pointermove', onMove)
    handle.addEventListener('pointerup', onEnd)
    handle.addEventListener('pointercancel', onEnd)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    save(
      applyWidth(
        currentWidth + (event.key === 'ArrowLeft' ? KEY_STEP : -KEY_STEP),
      ),
    )
  }

  return (
    <div
      aria-label='Resize panel'
      aria-orientation='vertical'
      role='separator'
      tabIndex={0}
      title='Drag to widen. Double-click to reset.'
      className={cn(
        'absolute inset-y-0 -left-1 z-20 w-2 cursor-col-resize touch-none transition-colors outline-none hover:bg-primary-7 focus-visible:bg-primary-7',
        dragging && 'bg-primary-9',
      )}
      onDoubleClick={() => save(applyWidth(PANEL_MIN_WIDTH))}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
    />
  )
}
