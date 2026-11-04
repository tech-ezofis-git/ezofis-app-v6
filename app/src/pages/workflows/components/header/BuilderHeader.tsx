import { useNavigate, useParams } from '@tanstack/react-router'
import { useReactFlow } from '@xyflow/react'
import { useState } from 'react'
import connectorApi from '@/api/connector'
import emailIngestApi from '@/api/emailIngest'
import workflowsApiV6 from '@/api/v6/workflows'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import showToast from '@/components/base/toast/showToast'
import { isSubWorkflowEnabled } from '@/features/sub-workflow/featureFlag'
import { getSettingsReturnPath } from '@/pages/settings/helpers/settingsNavigation'
import useWorkflowStore from '../../stores/useWorkflowStore'
import { validateBusinessHours } from '../../utils/businessHours'
import { validateDataSync } from '../../utils/dataIntegrationMapping'
import { exportWorkflow } from '../../utils/exportWorkflow'
import { getNodeToolType, NODE_TOOL_TYPE } from '../../utils/nodeToolTypes'
import { diffSlaSettings, getWorkflowSlaError } from '../../utils/slaSettings'
import { validateWorkflowSettings } from '../../utils/validateWorkflowSettings'
import {
  CONNECTOR_ENGINE_READY,
  getConnectorSaveBlock,
  getWorkflowConnectorErrors,
  getWorkflowInitiatorErrors,
} from '../../utils/workflowConnector'

const BuilderHeader = () => {
  const navigate = useNavigate()
  const { workflowId } = useParams({ strict: false }) as any
  const { getEdges, getNodes } = useReactFlow()
  const { workflowDescription, workflowName, workflowStatus } =
    useWorkflowStore((state) => state)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async (targetStatus?: 'draft' | 'published') => {
    if (!workflowId) {
      showToast({
        message: "We couldn't save your changes. Please try again.",
        variant: 'error',
      })
      return
    }

    const state = useWorkflowStore.getState()
    const currentStatus = targetStatus || state.workflowStatus
    const validation = validateWorkflowSettings({
      folder: state.folder,
      form: state.form,
      initiateUsing: state.initiateUsing,
      status: currentStatus,
      workflowName: state.workflowName,
    })

    if (!validation.isValid) {
      state.setSettingsValidationErrors(validation.errors)
      state.openSettings()
      showToast({
        message:
          validation.firstError ||
          'Please fill in all required workflow settings.',
        toastTitle: 'Required Fields',
        variant: 'default',
      })
      return
    }

    state.setSettingsValidationErrors(null)

    // Each block's Data Integration must be complete before it is saved.
    const syncErrors = getNodes().flatMap((node) => {
      const label = String((node.data as any)?.label || 'Step')
      return validateDataSync((node.data as any)?.endSync).map(
        (message) => `${label}: ${message}`,
      )
    })
    if (syncErrors.length > 0) {
      showToast({
        message: syncErrors[0],
        toastTitle: 'Data Integration',
        variant: 'default',
      })
      return
    }

    // Business hours (workflow settings) must be a valid schedule.
    const hoursError = Object.values(
      validateBusinessHours(state.businessHours),
    )[0]
    if (hoursError) {
      state.openSettings()
      showToast({
        message: `Business Hours: ${hoursError}`,
        toastTitle: 'SLA',
        variant: 'default',
      })
      return
    }

    // Workflow and block SLAs must be complete; open where the problem is.
    const slaError = getWorkflowSlaError(getNodes() as any, state.slaSettings)
    if (slaError) {
      const target = slaError.nodeId
        ? getNodes().find((n) => n.id === slaError.nodeId)
        : null
      if (target) state.selectNode(target)
      else state.openSettings()
      useWorkflowStore.getState().setShowSlaErrors(true)
      showToast({
        message: slaError.message,
        toastTitle: 'SLA',
        variant: 'default',
      })
      return
    }

    const isPublished = String(currentStatus).toLowerCase() === 'published'

    // Published Workflow Connector / Initiator steps must point at another
    // workflow.
    if (isPublished && isSubWorkflowEnabled()) {
      const selfId = workflowId === 'new' ? state.workflowId : workflowId
      const connectorErrors = getWorkflowConnectorErrors(getNodes(), selfId)
      const initiatorErrors = getWorkflowInitiatorErrors(getNodes(), selfId)
      if (connectorErrors.length > 0 || initiatorErrors.length > 0) {
        showToast({
          message: connectorErrors[0] ?? initiatorErrors[0],
          toastTitle: connectorErrors.length
            ? 'Workflow Connector'
            : 'Workflow Initiator',
          variant: 'default',
        })
        return
      }
    }

    // The engine can't run WORKFLOW_CONNECTOR blocks yet, so don't send them
    // (applies to drafts too).
    const connectorBlock = getConnectorSaveBlock(
      getNodes(),
      CONNECTOR_ENGINE_READY,
    )
    if (connectorBlock) {
      showToast({
        message: connectorBlock,
        toastTitle: 'Workflow Connector',
        variant: 'error',
      })
      return
    }

    state.setWorkflowStatus(isPublished ? 'published' : 'draft')

    setIsSaving(true)
    try {
      const exportedJson = exportWorkflow(getNodes(), getEdges())

      if (!exportedJson.settings) (exportedJson as any).settings = {}
      if (!exportedJson.settings.publish)
        (exportedJson.settings as any).publish = {}
      exportedJson.settings.publish.publishOption = isPublished
        ? 'PUBLISHED'
        : 'DRAFT'

      const payload = {
        description: workflowDescription || '',
        name: workflowName,
        status: isPublished ? 'PUBLISHED' : 'DRAFT',
        workflowJson: exportedJson,
      }

      console.log(
        '📌 [Workflow Builder] Saving Workflow JSON Payload:',
        JSON.stringify(payload, null, 2),
      )
      console.log(
        '📌 [Workflow Builder] Raw Workflow JSON object:',
        exportedJson,
      )

      let response
      if (workflowId === 'new') {
        response = await workflowsApiV6.createWorkflow(payload)
      } else {
        response = await workflowsApiV6.updateWorkflow(
          String(workflowId),
          payload,
        )
      }

      const { data, error } = response

      if (error) {
        // The V6 API returns `{ error }` (e.g. SLA validation messages).
        const errorText =
          typeof error === 'object' && error !== null
            ? String((error as any).error ?? JSON.stringify(error))
            : error
        showToast({
          message: `Failed to ${isPublished ? 'publish' : 'save'} workflow: ${errorText}`,
          variant: 'error',
        })
      } else {
        useWorkflowStore
          .getState()
          .setWorkflowStatus(isPublished ? 'published' : 'draft')
        showToast({
          message: isPublished
            ? 'Workflow published successfully'
            : 'Workflow saved successfully',
          variant: 'success',
        })
        const newId = data?.id || (typeof data === 'string' ? data : null)
        const finalWorkflowId = String(newId || workflowId)

        // Re-read the saved workflow and confirm every SLA came back as sent.
        if (finalWorkflowId && finalWorkflowId !== 'new') {
          void workflowsApiV6
            .getWorkflowById(finalWorkflowId)
            .then(({ data: saved }) => {
              const raw = (saved as any)?.workflowJson
              if (!raw) return
              const savedJson = typeof raw === 'string' ? JSON.parse(raw) : raw
              const mismatched = diffSlaSettings(exportedJson, savedJson)
              if (mismatched.length > 0) {
                console.warn('SLA settings not persisted as sent:', mismatched)
                showToast({
                  message:
                    'The workflow saved, but some SLA settings did not persist. Reopen the workflow to check them.',
                  toastTitle: 'SLA',
                  variant: 'error',
                })
              }
            })
            .catch((err) => console.warn('SLA verification failed:', err))
        }

        // Automatically link Gmail email-ingest mailbox if workflow contains a Gmail trigger node
        if (finalWorkflowId && finalWorkflowId !== 'new') {
          const gmailNode = getNodes().find(
            (n) =>
              getNodeToolType(n.data) === NODE_TOOL_TYPE.GMAIL &&
              Boolean(n.data?.connectorId || n.data?.connection),
          )
          if (gmailNode) {
            const connectorId = String(
              gmailNode.data?.connectorId || gmailNode.data?.connection,
            )
            void connectorApi.enableGmailPush(connectorId).catch(console.error)
            void emailIngestApi
              .syncMailboxForWorkflow({
                connectorId,
                isEnabled: true,
                masterSource: 'InternalForm',
                pollIntervalMinutes: 0,
                workflowId: finalWorkflowId,
              })
              .catch((err) =>
                console.warn('Failed to sync email-ingest mailbox:', err),
              )
          }
        }

        if (workflowId === 'new' && newId) {
          navigate({
            params: { workflowId: String(newId) },
            to: '/workflow-builder/$workflowId',
          })
        }
      }
    } catch (error: any) {
      console.error('Save failed:', error)
      showToast({
        message: `Failed to save workflow: ${error.message || error}`,
        variant: 'error',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const isPublished = String(workflowStatus).toLowerCase() === 'published'

  return (
    <header className='flex h-16 items-center justify-between border-b border-gray-3 bg-surface px-4'>
      <div className='flex items-center gap-4'>
        <IconButton
          color='gray'
          icon='lucide:chevron-left'
          variant='ghost'
          onClick={() =>
            navigate({
              to:
                getSettingsReturnPath('workflow-configuration') ?? '/workflows',
            })
          }
        />
        <div className='flex flex-col'>
          <div className='flex items-center gap-2'>
            <h1 className='text-15/5 font-semibold text-gray-13'>
              {workflowName}
            </h1>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                workflowStatus === 'draft'
                  ? 'bg-gray-3 text-gray-11'
                  : 'bg-success-subtle text-success-main'
              }`}
            >
              {workflowStatus}
            </span>
          </div>
          <span className='text-xs text-gray-10'>
            {workflowDescription || 'No description'}
          </span>
        </div>
      </div>

      <div className='flex items-center gap-2'>
        <IconButton
          color='gray'
          icon='lucide:settings'
          variant='ghost'
          onClick={() => useWorkflowStore.getState().openSettings()}
        />
        <Button
          color='gray'
          disabled={isPublished}
          icon='lucide:play'
          label='Test Run'
          variant='outline'
          onClick={() => useWorkflowStore.getState().startTestRun()}
        />
        <Button
          className='cursor-pointer font-medium'
          disabled={isSaving}
          icon='lucide:save'
          label='Save'
          loading={isSaving}
          onClick={() => handleSave()}
        />
      </div>
    </header>
  )
}

BuilderHeader.displayName = 'BuilderHeader'
export default BuilderHeader
