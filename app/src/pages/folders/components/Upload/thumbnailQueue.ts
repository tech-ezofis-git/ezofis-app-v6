import { type RefObject, useEffect, useState } from 'react'

/**
 * Shared render queue for PDF / Word card thumbnails. A few at a time keeps
 * the first cards fast (instead of 16 competing downloads), and priority
 * jobs (files from the current upload) jump ahead of older drafts.
 */
const THUMB_CONCURRENCY = 4

let active = 0
const priorityWaiters: Array<() => void> = []
const waiters: Array<() => void> = []

export const acquireThumbSlot = (priority = false) =>
  new Promise<void>((resolve) => {
    if (active < THUMB_CONCURRENCY) {
      active += 1
      resolve()
      return
    }
    const start = () => {
      active += 1
      resolve()
    }
    if (priority) priorityWaiters.push(start)
    else waiters.push(start)
  })

export const releaseThumbSlot = () => {
  active = Math.max(0, active - 1)
  const next = priorityWaiters.shift() || waiters.shift()
  if (next) next()
}

/** True once the element has come near the viewport (stays true). */
export const useNearViewport = (
  ref: RefObject<Element | null>,
  rootMargin = '300px',
) => {
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    if (seen) return
    const element = ref.current
    if (!element || typeof IntersectionObserver === 'undefined') {
      setSeen(true)
      return
    }
    const observer = new IntersectionObserver(
      (records) => {
        if (records.some((record) => record.isIntersecting)) {
          setSeen(true)
          observer.disconnect()
        }
      },
      { rootMargin },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, rootMargin, seen])

  return seen
}

/** Local object/data URLs render without a network round trip. */
export const isLocalFileUrl = (url?: string | null) =>
  Boolean(url && (url.startsWith('blob:') || url.startsWith('data:')))
