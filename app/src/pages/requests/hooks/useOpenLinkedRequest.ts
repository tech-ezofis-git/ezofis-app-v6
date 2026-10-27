import { useLingui } from '@lingui/react/macro'
import { useCallback, useState } from 'react'
import showToast from '@/components/base/toast/showToast'
import requestStore from '../stores/useRequestStore'
import {
  findRequestRow,
  loadOverviewWorkflow,
} from '../utils/requestOverviewLoader'
import { transformProcess } from './useInboxData'

/**
 * Opens a sub-process (child) or its parent in place of the request being
 * viewed, the same way the All Workflows inbox opens a request from another
 * workflow. Back from there returns to that workflow's list.
 */
const useOpenLinkedRequest = () => {
  const { t } = useLingui()
  const [openingId, setOpeningId] = useState<string | null>(null)

  const open = useCallback(
    async (target: {
      instanceId: number | string
      workflowId: number | string
    }) => {
      const instanceId = String(target.instanceId)
      const workflowId = String(target.workflowId)
      if (openingId) return
      setOpeningId(instanceId)
      try {
        const [loaded, row] = await Promise.all([
          loadOverviewWorkflow(workflowId),
          findRequestRow(workflowId, instanceId, undefined, {
            useLocate: true,
          }),
        ])
        if (!row) throw new Error('not found')
        const item = row._actions
          ? row
          : transformProcess(row, 'Inbox', 0, 'Inbox', loaded.selectedWorkflow)
        const state = requestStore.getState()
        state.setRawWorkflowData(loaded.rawWorkflow)
        state.openRequest(item, loaded.selectedWorkflow, 'Details')
      } catch {
        showToast({
          message: t`Couldn't open this request. It may have been removed or you may not have access.`,
          variant: 'error',
        })
      } finally {
        setOpeningId(null)
      }
    },
    [openingId, t],
  )

  return { open, openingId }
}

export default useOpenLinkedRequest
