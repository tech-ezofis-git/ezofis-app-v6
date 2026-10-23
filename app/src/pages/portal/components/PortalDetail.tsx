import { useLingui } from '@lingui/react/macro'
import { useEffect, useMemo, useRef, useState } from 'react'
import workflowsApiV6 from '@/api/v6/workflows'
import showToast from '@/components/base/toast/showToast'
import AttachmentSplitView from '@/pages/requests/components/request/components/generic-overview/AttachmentSplitView'
import Attachments from '@/pages/requests/components/request/components/sections/attachment/Attachments'
import WorkflowFormRenderer, {
  WorkflowStageBar,
} from '@/pages/requests/components/workflow-request/WorkflowFormRenderer'
import { WorkflowNameContext } from '@/pages/requests/components/workflow-request/WorkflowNameContext'
import { useAttachments } from '@/pages/requests/hooks/useAttachments'
import { useComments } from '@/pages/requests/hooks/useComments'
import { useHistory } from '@/pages/requests/hooks/useHistory'
import { computeWorkflowStages } from '@/pages/requests/utils/workflow.utils'
import type { PortalSubmission } from '../helpers/portalSubmissions'
import {
  buildDetailFormModel,
  formPanelSectionId,
  PORTAL_FORM_WRAPPER_CLASS,
  PORTAL_SECTION_ATTACHMENTS,
  PORTAL_SECTION_COMMENTS,
  PORTAL_SECTION_HISTORY,
  submissionInstanceIds,
} from '../helpers/portalDetail'
import {
  loadPortalWizard,
  type PortalWizardSource,
} from '../helpers/portalWizardLoad'
import {
  assignedUserIdsForActivity,
  getWorkflowRuleActions,
  isAssignedToUser,
} from '../helpers/portalWorkflowAccess'
import PortalActivity from './PortalActivity'
import { PortalDetailSkeleton } from './PortalLayoutSkeleton'
import PortalSubmissionDetails from './PortalSubmissionDetails'
import PortalTicketComments from './PortalTicketComments'

type PortalDetailChrome = {
  acting: boolean
  actions: { label: string; value: string }[]
  onAction: (value: string) => void
}

type PortalDetailProps = {
  submission: PortalSubmission
  userId?: string
  onChromeChange?: (chrome: PortalDetailChrome | null) => void
  onCountsChange?: (counts: { attachments: number; comments: number }) => void
  onMoved?: () => void
}

export default function PortalDetail({
  submission,
  userId,
  onChromeChange,
  onCountsChange,
  onMoved,
}: PortalDetailProps) {
  const { t } = useLingui()
  const [source, setSource] = useState<PortalWizardSource | null>(null)
  const [loading, setLoading] = useState(true)
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())
  const [formModel, setFormModel] = useState<Record<string, any>>({})
  const [openedAttachment, setOpenedAttachment] = useState<any>(null)
  const [acting, setActing] = useState(false)
  const isInbox = submission.source === 'inbox'

  const { activityId, instanceId, processId, repositoryId } = useMemo(
    () => submissionInstanceIds(submission),
    [submission],
  )

  // The request's attachments and comments, for the header counts and the
  // Comments section
  const { data: attachmentList, refetch: refetchAttachments } = useAttachments(
    submission.workflowId,
    instanceId || processId,
    true,
  )
  const {
    data: commentList,
    isLoading: commentsLoading,
    refetch: refetchComments,
  } = useComments(submission.workflowId, instanceId || processId, true)

  useEffect(() => {
    onCountsChange?.({
      attachments: attachmentList.length,
      comments: commentList.length,
    })
  }, [attachmentList.length, commentList.length, onCountsChange])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadPortalWizard(submission.workflowId, submission.workflowName)
      .then((next) => {
        if (!cancelled) setSource(next)
      })
      .catch((error) => {
        if (cancelled) return
        setSource(null)
        showToast({
          message:
            error instanceof Error
              ? error.message
              : t`Unable to load this request.`,
          variant: 'error',
        })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [submission.workflowId, submission.workflowName, t])

  const panels = useMemo(() => source?.panels || [], [source])
  const resolvedRepositoryId = source?.repositoryId || repositoryId || undefined
  const loadedFormModel = useMemo(
    () => buildDetailFormModel(submission.raw, panels),
    [panels, submission.raw],
  )

  useEffect(() => {
    setFormModel(loadedFormModel)
  }, [loadedFormModel])

  // Same stage computation the request page uses, so the bar matches it
  const { data: historyRows } = useHistory(
    submission.workflowId,
    instanceId || processId,
    true,
  )
  const isCompleted = [
    'completed',
    'approved',
    'closed',
    'paid',
    'success',
    'succeeded',
  ].includes(
    String(submission.raw?.status || submission.status || '')
      .toLowerCase()
      .trim(),
  )
  const workflowStages = useMemo(
    () =>
      computeWorkflowStages({
        currentActivityId: activityId ? String(activityId) : undefined,
        history: historyRows,
        isCompleted,
        workflow: source?.workflow,
      }),
    [activityId, historyRows, isCompleted, source?.workflow],
  )

  useEffect(() => {
    if (!panels.length) return
    setOpenIds((current) => {
      if (current.size > 0) return current
      return new Set(
        panels.map((panel, index) => formPanelSectionId(panel, index)),
      )
    })
  }, [panels])

  const toggleSection = (id: string) => {
    setOpenIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const currentActivityId = activityId
  const workflowData = source?.workflow
  const ruleActions = useMemo(
    () => getWorkflowRuleActions(workflowData, currentActivityId),
    [currentActivityId, workflowData],
  )
  const assignedUserIds = useMemo(
    () =>
      assignedUserIdsForActivity(
        workflowData,
        currentActivityId,
        submission.raw,
      ),
    [currentActivityId, submission.raw, workflowData],
  )
  const canAct =
    isInbox &&
    isAssignedToUser(assignedUserIds, userId) &&
    ruleActions.length > 0

  const allFieldIds = useMemo(() => {
    const ids: string[] = []
    panels.forEach((panel) => {
      ;(panel.fields || []).forEach((field) => {
        const id = String(field.id || '')
        if (id) ids.push(id)
      })
    })
    return ids
  }, [panels])

  const currentBlockSettings = useMemo(() => {
    const blocks = Array.isArray(workflowData?.workflowJson?.blocks)
      ? workflowData.workflowJson.blocks
      : []
    const block = blocks.find(
      (item: { id?: string }) =>
        String(item.id || '') === String(currentActivityId || ''),
    )
    return (block?.settings || {}) as Record<string, unknown>
  }, [currentActivityId, workflowData])

  const readOnlyFieldIds = useMemo(() => {
    if (!isInbox) return new Set(allFieldIds)
    const access = String(currentBlockSettings.formEditAccess || 'ALL')
    if (access === 'ALL') return undefined
    if (access === 'NONE') return new Set(allFieldIds)
    const rules = Array.isArray(currentBlockSettings.formEditControls)
      ? (currentBlockSettings.formEditControls as {
          formFields?: unknown[]
          userId?: string
        }[])
      : []
    const rule = rules.find(
      (item) => String(item.userId) === String(userId || ''),
    )
    const editable = new Set((rule?.formFields || []).map(String))
    return new Set(allFieldIds.filter((id) => !editable.has(id)))
  }, [allFieldIds, currentBlockSettings, isInbox, userId])

  const handleMoveNext = async (action: string) => {
    if (!canAct || acting) return
    if (!instanceId) {
      showToast({
        message: t`This request is missing an instance id.`,
        variant: 'error',
      })
      return
    }

    try {
      setActing(true)
      const payload = {
        activityid: currentActivityId || '',
        activityUserId: userId || submission.raw.userId || null,
        comments: '',
        formData: JSON.stringify(formModel),
        formEntryId: Number(submission.raw.formEntryId || 0),
        formId:
          submission.raw.formId ||
          workflowData?.formId ||
          workflowData?.wFormId ||
          null,
        instanceId,
        isItemTable: true,
        itemId: submission.raw.itemId || null,
        processId: processId || instanceId,
        repositoryId:
          resolvedRepositoryId || submission.raw.repositoryId || null,
        review: action,
        transactionId: submission.raw.transactionId || null,
        workflowId: submission.workflowId,
      }
      const response = await workflowsApiV6.moveNext(
        String(instanceId),
        payload,
      )
      if (response?.error) {
        showToast({
          message: `${t`Failed to proceed request:`} ${response.error}`,
          variant: 'error',
        })
        return
      }
      showToast({
        message:
          action.toLowerCase() === 'submit'
            ? t`Request ${submission.requestNo} submitted successfully`
            : t`Request ${submission.requestNo} action "${action}" completed successfully`,
        variant: 'success',
      })
      onMoved?.()
    } catch (error) {
      console.error(error)
      showToast({
        message: t`Unable to move this request.`,
        variant: 'error',
      })
    } finally {
      setActing(false)
    }
  }

  const handleMoveNextRef = useRef(handleMoveNext)
  handleMoveNextRef.current = handleMoveNext

  useEffect(() => {
    if (!canAct) {
      onChromeChange?.(null)
      return
    }
    onChromeChange?.({
      acting,
      actions: ruleActions,
      onAction: (value) => {
        void handleMoveNextRef.current(value)
      },
    })
  }, [acting, canAct, onChromeChange, ruleActions])

  useEffect(
    () => () => {
      onChromeChange?.(null)
    },
    [onChromeChange],
  )

  if (loading) {
    return <PortalDetailSkeleton />
  }

  if (openedAttachment) {
    return (
      <div className='flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-gray-1'>
        <AttachmentSplitView
          attachment={openedAttachment}
          folderFields={[]}
          repositoryId={resolvedRepositoryId}
          title={
            openedAttachment.name || openedAttachment.fileName || t`Attachment`
          }
          onClose={() => setOpenedAttachment(null)}
        />
      </div>
    )
  }

  return (
    <div className='h-full min-h-0 overflow-y-auto'>
      <div className='mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8'>
        {workflowStages.length > 0 && (
          <WorkflowStageBar
            currentActivityId={activityId ? String(activityId) : undefined}
            stages={workflowStages}
          />
        )}

        {panels.length > 0 ? (
          isInbox ? (
            <WorkflowNameContext.Provider
              value={String(
                source?.workflow?.name ||
                  source?.workflowName ||
                  submission.workflowName ||
                  '',
              )}
            >
              <div className={PORTAL_FORM_WRAPPER_CLASS}>
                <WorkflowFormRenderer
                  formModel={formModel}
                  instanceId={instanceId}
                  panels={panels}
                  readOnlyFieldIds={readOnlyFieldIds}
                  repositoryId={resolvedRepositoryId}
                  disableOwnScroll
                  getPanelValue={(panel, index) =>
                    formPanelSectionId(panel, index)
                  }
                  onFieldChange={(fieldId, value) =>
                    setFormModel((prev) => ({ ...prev, [fieldId]: value }))
                  }
                  onOpenAttachment={(att) => setOpenedAttachment(att)}
                />
              </div>
            </WorkflowNameContext.Provider>
          ) : (
            <PortalSubmissionDetails
              formModel={formModel}
              openIds={openIds}
              panels={panels}
              onToggle={toggleSection}
            />
          )
        ) : (
          <div className='rounded-xl border border-gray-4 bg-surface p-5 text-13 text-gray-10'>
            {t`No form fields found for this request.`}
          </div>
        )}

        <div
          className='scroll-mt-3 rounded-xl border border-gray-4 bg-surface p-6 shadow-sm transition-shadow sm:px-8 sm:py-7'
          id={PORTAL_SECTION_ATTACHMENTS}
        >
          <div className='mb-4 text-15 font-semibold text-gray-13'>
            {t`Attachments`}
          </div>
          <Attachments
            canUpload={isInbox}
            formModel={formModel}
            instanceId={instanceId}
            repositoryId={resolvedRepositoryId}
            selectedItem={submission.raw}
            showRelatedFinder={false}
            workflowId={submission.workflowId}
            enabled
            onAttachmentsChanged={() => void refetchAttachments()}
            onSelect={(file) => setOpenedAttachment(file)}
          />
        </div>

        {/* Same Comments card as the new submission, on the live thread */}
        <div
          className='scroll-mt-3 rounded-xl transition-shadow'
          id={PORTAL_SECTION_COMMENTS}
        >
          <PortalTicketComments
            comments={commentList}
            instanceId={instanceId || processId}
            isLoading={commentsLoading}
            refetch={refetchComments}
            workflowId={submission.workflowId}
          />
        </div>

        <div
          className='scroll-mt-3 rounded-xl border border-gray-4 bg-surface p-6 shadow-sm transition-shadow sm:px-8 sm:py-7'
          id={PORTAL_SECTION_HISTORY}
        >
          <div className='mb-4 text-15 font-semibold text-gray-13'>
            {t`Activity`}
          </div>
          <PortalActivity
            instanceId={instanceId}
            processId={processId}
            workflowId={submission.workflowId}
            enabled
          />
        </div>
      </div>
    </div>
  )
}
