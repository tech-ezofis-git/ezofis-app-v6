import { useEffect, useRef } from 'react'
import { create } from 'zustand'

/**
 * Unsaved-changes guard for in-app navigation (sidebar menus). A builder
 * registers how to count its unsaved changes and how to save them as a
 * draft; the sidebar asks the guard before leaving and the
 * LeaveGuardDialog lets the user save, discard or stay.
 */
export type LeaveGuard = {
  /** Forget unsaved changes (e.g. clear restored session state). */
  discard?: () => void
  /** Number of unsaved changes (0 = nothing to protect). */
  getChangeCount: () => number
  /** Save as draft; resolve false to stay on the page. */
  save: () => Promise<boolean>
}

type LeaveGuardState = {
  changeCount: number
  guard: LeaveGuard | null
  /** Navigation waiting on the user's choice. */
  pending: (() => void) | null
  cancel: () => void
  register: (guard: LeaveGuard) => () => void
  /** Run `proceed` now, or after the user confirms when there are changes. */
  requestLeave: (proceed: () => void) => void
}

const useLeaveGuardStore = create<LeaveGuardState>((set, get) => ({
  changeCount: 0,
  guard: null,
  pending: null,
  cancel: () => set({ pending: null }),
  register: (guard) => {
    set({ guard })
    return () => {
      if (get().guard === guard) set({ guard: null, pending: null })
    }
  },
  requestLeave: (proceed) => {
    const { guard } = get()
    const changeCount = guard ? guard.getChangeCount() : 0
    if (!guard || changeCount <= 0) {
      proceed()
      return
    }
    set({ changeCount, pending: proceed })
  },
}))

/** Register a leave guard while `enabled` (latest callbacks are always used). */
export const useLeaveGuard = (enabled: boolean, guard: LeaveGuard) => {
  const guardRef = useRef(guard)
  guardRef.current = guard

  useEffect(() => {
    if (!enabled) return
    return useLeaveGuardStore.getState().register({
      discard: () => guardRef.current.discard?.(),
      save: () => guardRef.current.save(),
      getChangeCount: () => guardRef.current.getChangeCount(),
    })
  }, [enabled])
}

export default useLeaveGuardStore
