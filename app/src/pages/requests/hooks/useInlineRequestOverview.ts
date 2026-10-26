import { useCallback, useEffect, useRef, useState } from 'react'
import requestStore from '../stores/useRequestStore'
import {
  findRequestRow,
  loadOverviewWorkflow,
} from '../utils/requestOverviewLoader'
import { transformProcess } from './useInboxData'

interface Options {
  /** Called when the overview closes itself (e.g. after an approve/reject). */
  onClosedByAction?: () => void
  /** Called when the request can't be loaded. */
  onError?: (message: string) => void
}

interface StoreSnapshot {
  rawWorkflowData: any
  selectedWorkflow: any
  selectedWorkflowId: number | string | null
}

/**
 * Opens a request's overview (`Request`) in place on a page other than
 * /requests. `Request` reads the workflow and item from the shared request
 * store, so this loads them the same way the Requests page does, and puts the
 * store's previous workflow back on close so the Requests page is unaffected.
 */
const useInlineRequestOverview = ({
  onClosedByAction,
  onError,
}: Options = {}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [loadingInstanceId, setLoadingInstanceId] = useState<string | null>(
    null,
  )
  const snapshotRef = useRef<StoreSnapshot | null>(null)
  const isRequestOpen = requestStore((state) => state.isRequestOpen)
  const item = requestStore((state) => state.selectedItem)
  const workflowId = requestStore((state) => state.selectedWorkflowId)

  const restore = useCallback(() => {
    const snapshot = snapshotRef.current
    snapshotRef.current = null
    setIsOpen(false)
    if (!snapshot) return
    requestStore.setState({
      ...snapshot,
      activeTabValue: null,
      isRequestOpen: false,
      selectedItem: null,
    })
  }, [])

  const open = useCallback(
    async (target: { instanceId: string; workflowId: string }) => {
      if (loadingInstanceId) return
      setLoadingInstanceId(target.instanceId)
      try {
        const [loaded, row] = await Promise.all([
          loadOverviewWorkflow(target.workflowId),
          findRequestRow(target.workflowId, target.instanceId, undefined, {
            useLocate: true,
          }),
        ])
        if (!row) throw new Error('Request not found')
        const overviewItem = row._actions
          ? row
          : transformProcess(row, 'Inbox', 0, 'Inbox', loaded.selectedWorkflow)

        const state = requestStore.getState()
        if (!snapshotRef.current) {
          snapshotRef.current = {
            rawWorkflowData: state.rawWorkflowData,
            selectedWorkflow: state.selectedWorkflow,
            selectedWorkflowId: state.selectedWorkflowId,
          }
        }
        state.setRawWorkflowData(loaded.rawWorkflow)
        state.openRequest(overviewItem, loaded.selectedWorkflow, 'Details')
        setIsOpen(true)
      } catch (error) {
        onError?.(
          error instanceof Error ? error.message : 'Failed to open request',
        )
      } finally {
        setLoadingInstanceId(null)
      }
    },
    [loadingInstanceId, onError],
  )

  const close = useCallback(() => {
    requestStore.getState().closeRequest()
    restore()
  }, [restore])

  // `Request` calls closeRequest() itself after actions like approve/reject.
  useEffect(() => {
    if (isOpen && !isRequestOpen) {
      restore()
      onClosedByAction?.()
    }
  }, [isOpen, isRequestOpen, restore, onClosedByAction])

  // Leaving the page with the overview open must not leave it in the store.
  useEffect(
    () => () => {
      if (snapshotRef.current) {
        requestStore.getState().closeRequest()
        requestStore.setState({ ...snapshotRef.current })
        snapshotRef.current = null
      }
    },
    [],
  )

  return {
    close,
    isOpen: isOpen && isRequestOpen && Boolean(item),
    item,
    loadingInstanceId,
    open,
    workflowId,
  }
}

export default useInlineRequestOverview
