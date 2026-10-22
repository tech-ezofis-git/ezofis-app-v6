import { Icon } from '@iconify/react'
import { useLingui } from '@lingui/react/macro'
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useReducer,
  useRef,
} from 'react'
import Tooltip from '@/components/base/Tooltip'

const MAX_HISTORY = 100
/** Keystrokes in the same cell within this window form one undo step. */
const COALESCE_MS = 1000

/**
 * Undo / redo stacks of table row snapshots. Call `record` with the rows
 * *before* each change; `undo` / `redo` return the rows to apply (or null).
 */
export const useRowsHistory = <T,>(resetKey?: unknown) => {
  const pastRef = useRef<T[][]>([])
  const futureRef = useRef<T[][]>([])
  const lastEditRef = useRef<{ at: number; key: string } | null>(null)
  const [, rerender] = useReducer((count: number) => count + 1, 0)

  useEffect(() => {
    pastRef.current = []
    futureRef.current = []
    lastEditRef.current = null
    rerender()
  }, [resetKey])

  const record = useCallback((snapshot: T[], coalesceKey?: string) => {
    const now = Date.now()
    const last = lastEditRef.current
    if (
      coalesceKey &&
      last?.key === coalesceKey &&
      now - last.at < COALESCE_MS
    ) {
      last.at = now
      return
    }
    pastRef.current = [...pastRef.current, snapshot].slice(-MAX_HISTORY)
    futureRef.current = []
    lastEditRef.current = coalesceKey ? { at: now, key: coalesceKey } : null
    rerender()
  }, [])

  const undo = useCallback((current: T[]) => {
    const previous = pastRef.current[pastRef.current.length - 1]
    if (!previous) return null
    pastRef.current = pastRef.current.slice(0, -1)
    futureRef.current = [...futureRef.current, current]
    lastEditRef.current = null
    rerender()
    return previous
  }, [])

  const redo = useCallback((current: T[]) => {
    const next = futureRef.current[futureRef.current.length - 1]
    if (!next) return null
    futureRef.current = futureRef.current.slice(0, -1)
    pastRef.current = [...pastRef.current, current].slice(-MAX_HISTORY)
    lastEditRef.current = null
    rerender()
    return next
  }, [])

  return {
    canRedo: futureRef.current.length > 0,
    canUndo: pastRef.current.length > 0,
    record,
    redo,
    undo,
  }
}

/** Ctrl/Cmd+Z → undo, Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z → redo. */
export const handleHistoryShortcut = (
  event: KeyboardEvent,
  onUndo: () => void,
  onRedo: () => void,
) => {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return
  const key = event.key.toLowerCase()
  if (key === 'z' && !event.shiftKey) {
    event.preventDefault()
    onUndo()
  } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
    event.preventDefault()
    onRedo()
  }
}

const historyButtonClass =
  'inline-flex size-[30px] cursor-pointer items-center justify-center rounded-lg border border-gray-4 bg-surface text-gray-11 transition-all hover:bg-gray-2 hover:text-gray-12 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface'

/** Undo / Redo buttons for a table toolbar. */
export const TableHistoryButtons = ({
  canRedo,
  canUndo,
  onRedo,
  onUndo,
}: {
  canRedo: boolean
  canUndo: boolean
  onRedo: () => void
  onUndo: () => void
}) => {
  const { t } = useLingui()
  return (
    <div className='flex items-center gap-1'>
      <Tooltip content={t`Undo (Ctrl+Z)`}>
        <button
          aria-label={t`Undo`}
          className={historyButtonClass}
          disabled={!canUndo}
          type='button'
          onClick={onUndo}
        >
          <Icon className='h-4 w-4' icon='tabler:arrow-back-up' />
        </button>
      </Tooltip>
      <Tooltip content={t`Redo (Ctrl+Y)`}>
        <button
          aria-label={t`Redo`}
          className={historyButtonClass}
          disabled={!canRedo}
          type='button'
          onClick={onRedo}
        >
          <Icon className='h-4 w-4' icon='tabler:arrow-forward-up' />
        </button>
      </Tooltip>
    </div>
  )
}
