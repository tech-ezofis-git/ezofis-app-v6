// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import PanelResizeHandle, {
  clampPanelWidth,
  PANEL_MIN_WIDTH,
} from './PanelResizeHandle'

const width = () =>
  document.documentElement.style.getPropertyValue('--workflow-panel-width')

describe('PanelResizeHandle', () => {
  beforeEach(() => {
    window.innerWidth = 1600
    render(<PanelResizeHandle />)
    fireEvent.doubleClick(screen.getByRole('separator'))
  })
  afterEach(cleanup)

  it('widens with the arrow keys, and never goes below the default', () => {
    const handle = screen.getByRole('separator')
    expect(width()).toBe(`${PANEL_MIN_WIDTH}px`)

    fireEvent.keyDown(handle, { key: 'ArrowRight' })
    expect(width()).toBe(`${PANEL_MIN_WIDTH}px`)

    fireEvent.keyDown(handle, { key: 'ArrowLeft' })
    expect(width()).toBe(`${PANEL_MIN_WIDTH + 40}px`)
    expect(localStorage.getItem('workflow-panel-width')).toBe(
      String(PANEL_MIN_WIDTH + 40),
    )
  })

  it('widens when dragged left, and saves when the drag ends', () => {
    const handle = screen.getByRole('separator')
    fireEvent(
      handle,
      Object.assign(new Event('pointerdown', { bubbles: true }), {
        clientX: 800,
      }),
    )
    fireEvent(handle, Object.assign(new Event('pointermove'), { clientX: 700 }))
    expect(width()).toBe(`${PANEL_MIN_WIDTH + 100}px`)

    fireEvent(handle, new Event('pointerup'))
    expect(localStorage.getItem('workflow-panel-width')).toBe(
      String(PANEL_MIN_WIDTH + 100),
    )
  })

  it('resets on double-click', () => {
    const handle = screen.getByRole('separator')
    fireEvent.keyDown(handle, { key: 'ArrowLeft' })
    fireEvent.doubleClick(handle)
    expect(width()).toBe(`${PANEL_MIN_WIDTH}px`)
    expect(localStorage.getItem('workflow-panel-width')).toBeNull()
  })

  it('stays between the default and 85% of the window', () => {
    expect(clampPanelWidth(100)).toBe(PANEL_MIN_WIDTH)
    expect(clampPanelWidth(5000)).toBe(1360)
  })
})
