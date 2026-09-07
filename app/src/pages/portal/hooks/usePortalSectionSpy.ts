import { useEffect, useRef } from 'react'

const SPY_OFFSET = 72
const CLICK_LOCK_MS = 700

const findSection = (root: ParentNode | null, id: string) => {
  const scope = root || document
  const target =
    scope.querySelector(`#${CSS.escape(id)}`) ||
    scope.querySelector(`[data-portal-section="${CSS.escape(id)}"]`)
  return target instanceof HTMLElement ? target : null
}

export const usePortalSectionSpy = (
  root: HTMLElement | null,
  sectionIds: string[],
  onActiveChange: (id: string) => void,
) => {
  const lockUntilRef = useRef(0)
  const idsRef = useRef(sectionIds)
  const onActiveChangeRef = useRef(onActiveChange)
  const rootRef = useRef(root)
  idsRef.current = sectionIds
  onActiveChangeRef.current = onActiveChange
  rootRef.current = root

  const lockSpy = () => {
    lockUntilRef.current = Date.now() + CLICK_LOCK_MS
  }

  const scrollToSection = (id: string) => {
    lockSpy()
    onActiveChangeRef.current(id)
    const container = rootRef.current
    const target = findSection(container, id)
    if (!target) return

    if (container && container.scrollHeight > container.clientHeight + 2) {
      const nextTop =
        container.scrollTop +
        target.getBoundingClientRect().top -
        container.getBoundingClientRect().top -
        8
      container.scrollTo({ behavior: 'smooth', top: nextTop })
      return
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const sectionKey = sectionIds.join('|')

  useEffect(() => {
    if (!root) return

    const updateActive = () => {
      const ids = idsRef.current
      if (!ids.length || Date.now() < lockUntilRef.current) return

      const marker = root.getBoundingClientRect().top + SPY_OFFSET
      let nextId = ids[0]

      ids.forEach((id) => {
        const target = findSection(root, id)
        if (!target) return
        if (target.getBoundingClientRect().top <= marker) nextId = id
      })

      if (nextId) onActiveChangeRef.current(nextId)
    }

    let frame = 0
    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        updateActive()
      })
    }

    root.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    const resize = new ResizeObserver(onScroll)
    resize.observe(root)
    updateActive()

    return () => {
      root.removeEventListener('scroll', onScroll)
      window.removeEventListener('scroll', onScroll)
      resize.disconnect()
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [root, sectionKey])

  return { lockSpy, scrollToSection }
}
