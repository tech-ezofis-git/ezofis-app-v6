import { useLingui } from '@lingui/react/macro'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { V6WorkflowDetail } from '@/api/v6/workflows'
import fileApi from '@/api/file/file'
import workflowsApiV6 from '@/api/v6/workflows'
import Icon from '@/components/base/icon/Icon'
import ScrollArea from '@/components/base/scroll-area/ScrollArea'
import Skeleton from '@/components/base/Skeleton'
import showToast from '@/components/base/toast/showToast'
import DocumentPreviewViewer from '@/components/common/document-preview/DocumentPreviewViewer'
import { getFileIcon } from '@/pages/requests/components/request/components/sections/attachment/Attachments'
import { useWorkflowForm } from '@/pages/requests/components/workflow-request/hooks/useWorkflowForm'
import WorkflowFormRenderer from '@/pages/requests/components/workflow-request/WorkflowFormRenderer'
import { importWorkflow } from '@/pages/workflows/utils/importWorkflow'
import authUserStore from '@/stores/authUserStore'
import type { WorkflowData } from '../types/folderTypes'
import { folderApi } from '../api/folderApi'
import {
  getFileExtension,
  resolveDocumentPreviewKind,
} from '../utils/documentDetailsUtils'
import { DynamicIcon } from './icons'
import { Card, PrimaryButton } from './Ui'

export function DummyDocumentPreview({
  fileName,
  fileType,
}: {
  fileName: string
  fileType: string
}) {
  const { t } = useLingui()
  const iconName = getFileIcon(fileName)

  return (
    <div className='flex h-full min-h-[560px] items-center justify-center bg-blue-3/30'>
      <div className='text-center'>
        <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-xl border border-gray-3 bg-surface-primary shadow-sm'>
          <Icon className='h-8 w-8' name={iconName} />
        </div>
        <p className='mt-4 text-[14px] font-semibold text-gray-10'>
          {fileName}
        </p>
        <p className='mt-2 text-[12px] text-gray-10'>{t`${fileType} Viewer`}</p>
      </div>
    </div>
  )
}

export function StartWorkflowView({
  id,
  repositoryId,
  onBack,
}: {
  id: string
  repositoryId: string
  onBack: () => void
}) {
  const { t } = useLingui()
  const [documentInfo, setDocumentInfo] = useState<any>(null)
  const [workflowDetail, setWorkflowDetail] = useState<V6WorkflowDetail | null>(
    null,
  )
  const [isNotConfigured, setIsNotConfigured] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [workflowError, setWorkflowError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)
  const [isApproversOpen, setIsApproversOpen] = useState(true)
  const [isDocDetailsOpen, setIsDocDetailsOpen] = useState(true)

  const prefilledFields = useRef<Set<string>>(new Set())
  const session = authUserStore((state) => state.session)
  const fileName = documentInfo?.fileName || 'Document'
  const iconName = getFileIcon(fileName)

  const formState = useWorkflowForm(workflowDetail, {
    fileName: fileName,
    isRaiseTicket: true,
    viewerItemId: id,
    viewerRepositoryId: repositoryId,
  })

  const workflowNodes = useMemo(() => {
    if (!workflowDetail) return []
    if (workflowDetail.workflowJson?.nodes)
      return workflowDetail.workflowJson.nodes
    if (workflowDetail.flowJson?.nodes) return workflowDetail.flowJson.nodes

    let parsedWorkflowJson = workflowDetail.workflowJson
    if (typeof parsedWorkflowJson === 'string') {
      try {
        parsedWorkflowJson = JSON.parse(parsedWorkflowJson)
      } catch (e) {}
    }
    if (parsedWorkflowJson?.blocks) {
      return importWorkflow(parsedWorkflowJson).nodes.map((n: any) => ({
        data: { ...n.data, toolType: n.data.toolType || n.type },
        id: n.id,
      }))
    }

    if (workflowDetail.steps && Array.isArray(workflowDetail.steps)) {
      return workflowDetail.steps.map((step: any) => ({
        data: {
          icon: step.stepType === 0 ? 'lucide:play' : 'lucide:settings',
          label: step.name || 'Step',
          toolType: step.name === 'Manual User' ? 'manual_user' : 'other',
          type: step.stepType === 0 ? 'trigger' : 'action',
        },
        id: step.id,
      }))
    }
    return []
  }, [workflowDetail])

  const connectionName = useMemo(() => {
    if (!workflowDetail) return ''
    let parsedWorkflowJson = workflowDetail.workflowJson
    if (typeof parsedWorkflowJson === 'string') {
      try {
        parsedWorkflowJson = JSON.parse(parsedWorkflowJson)
      } catch (e) {}
    }

    const blocks = parsedWorkflowJson?.blocks || []
    const rules = parsedWorkflowJson?.rules || []

    const startBlock = blocks.find((b: any) => b.type === 'START')

    if (startBlock) {
      // First check if there's a custom action defined in the start block's settings
      const configuredActions = startBlock.settings?.actions || []
      if (configuredActions.length > 0 && configuredActions[0].actionName) {
        return configuredActions[0].actionName
      }

      // Fallback to rules coming out of the start block
      const startRule = rules.find((r: any) => r.fromBlockId === startBlock.id)
      if (startRule && (startRule.proceedAction || startRule.action)) {
        return startRule.proceedAction || startRule.action
      }
    }

    return (
      parsedWorkflowJson?.settings?.general?.connectionName ||
      workflowDetail.name ||
      'Workflow'
    )
  }, [workflowDetail])

  useEffect(() => {
    if (!id) {
      setLoading(false)
      setIsNotConfigured(true)
      return
    }

    let cancelled = false

    if (!repositoryId) {
      const timer = setTimeout(() => {
        if (!cancelled) {
          setLoading(false)
          setIsNotConfigured(true)
        }
      }, 1500)
      return () => {
        cancelled = true
        clearTimeout(timer)
      }
    }

    const load = async () => {
      setLoading(true)
      setIsNotConfigured(false)
      setWorkflowError(null)
      try {
        const docDetail = await folderApi.getDocumentDetail(repositoryId, id)
        if (cancelled) return
        setDocumentInfo(docDetail)

        const workflows = await workflowsApiV6.getWorkflows()
        if (cancelled) return

        const wf = workflows.data?.items?.find(
          (w) => w.name === 'Document Approval',
        )
        if (wf) {
          const detail = await workflowsApiV6.getWorkflowById(wf.id)
          if (cancelled) return
          if (detail.data) {
            setWorkflowDetail(detail.data)
          } else {
            setWorkflowError(t`Workflow details could not be loaded.`)
          }
        } else {
          setIsNotConfigured(true)
        }
      } catch (err) {
        if (!cancelled) setWorkflowError(String(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id, repositoryId, reloadKey, t])

  // Optional: load inline preview image/pdf for thumbnail logic if we want to show it.
  useEffect(() => {
    if (!id || !repositoryId) return
    let cancelled = false
    fileApi
      .viewBinaryV6(repositoryId, id, 'inline')
      .then((response) => {
        if (cancelled) return
        if (response?.data instanceof Blob) {
          setPreviewBlob(response.data)
          setPreviewUrl(URL.createObjectURL(response.data))
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [id, repositoryId])

  useEffect(() => {
    if (!formState.panels?.length) return
    formState.panels.forEach((panel: any) => {
      panel.fields?.forEach((field: any) => {
        const label = field.label
        if (!prefilledFields.current.has(field.id)) {
          if (label === 'Requested By') {
            formState.setFieldValue(
              field.id,
              session?.email || session?.name || '',
            )
            prefilledFields.current.add(field.id)
          } else if (label === 'Requested Date') {
            const today = new Date().toISOString().split('T')[0]
            formState.setFieldValue(field.id, today)
            prefilledFields.current.add(field.id)
          }
        }
      })
    })
  }, [formState.panels, session])

  if (loading || (workflowDetail && formState.isLoadingForm)) {
    return <StartWorkflowSkeleton onBack={onBack} />
  }

  if (isNotConfigured) {
    return (
      <div className='animate-in fade-in flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-surface-secondary text-[13px] text-gray-11 duration-300'>
        <div className='flex h-[52px] shrink-0 items-center justify-between border-b border-gray-3 bg-surface-primary px-4'>
          <div className='flex min-w-0 items-center gap-3'>
            <button
              className='inline-flex h-8 items-center gap-2 rounded-lg px-3 text-[13px] font-semibold text-gray-13 transition-all hover:bg-gray-4 active:scale-95'
              type='button'
              onClick={onBack}
            >
              <DynamicIcon className='h-4 w-4' name='arrowLeft' />
              {t`Back`}
            </button>

            <div className='h-5 w-px shrink-0 bg-gray-4' />

            <div className='flex min-w-0 items-center gap-3'>
              <Icon className='size-5 shrink-0' name={iconName} />
              <h2 className='truncate text-[14px] font-semibold text-gray-13'>
                {fileName}
              </h2>
            </div>
          </div>
        </div>

        <div className='flex min-h-0 flex-1 items-center justify-center p-6'>
          <div className='animate-in fade-in slide-in-from-bottom-2 flex max-w-md flex-col items-center rounded-2xl border border-blue-4 bg-surface-primary p-8 text-center shadow-sm duration-300'>
            <div className='mb-4 flex size-14 items-center justify-center rounded-2xl bg-blue-2 text-blue-10 ring-8 ring-blue-1/60'>
              <Icon className='size-7 text-blue-10' name='tabler:info-circle' />
            </div>
            <h3 className='text-[16px] font-semibold text-gray-13'>
              {t`Document Approval Process Not Configured`}
            </h3>
            <p className='mt-2 text-[13px] leading-relaxed text-gray-10'>
              {t`The Document Approval workflow process is not configured yet. Please configure the workflow or contact your administrator to get started.`}
            </p>
            <div className='mt-6 flex items-center gap-3'>
              <button
                className='inline-flex h-9 items-center gap-2 rounded-lg bg-gray-3 px-4 text-[13px] font-medium text-gray-12 transition-all hover:bg-gray-4 active:scale-95'
                type='button'
                onClick={onBack}
              >
                <DynamicIcon className='h-4 w-4' name='arrowLeft' />
                {t`Back to Document`}
              </button>
              <button
                className='inline-flex h-9 items-center gap-2 rounded-lg bg-primary-9 px-4 text-[13px] font-medium text-white transition-all hover:bg-primary-10 active:scale-95'
                type='button'
                onClick={() => setReloadKey((k) => k + 1)}
              >
                <DynamicIcon className='h-4 w-4' name='refresh' />
                {t`Check Again`}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (workflowError) {
    return (
      <div className='animate-in fade-in flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-surface-secondary text-[13px] text-gray-11 duration-300'>
        <div className='flex h-[52px] shrink-0 items-center justify-between border-b border-gray-3 bg-surface-primary px-4'>
          <div className='flex min-w-0 items-center gap-3'>
            <button
              className='inline-flex h-8 items-center gap-2 rounded-lg px-3 text-[13px] font-semibold text-gray-13 transition-all hover:bg-gray-4 active:scale-95'
              type='button'
              onClick={onBack}
            >
              <DynamicIcon className='h-4 w-4' name='arrowLeft' />
              {t`Back`}
            </button>

            <div className='h-5 w-px shrink-0 bg-gray-4' />

            <div className='flex min-w-0 items-center gap-3'>
              <Icon className='size-5 shrink-0' name={iconName} />
              <h2 className='truncate text-[14px] font-semibold text-gray-13'>
                {fileName}
              </h2>
            </div>
          </div>
        </div>

        <div className='flex min-h-0 flex-1 items-center justify-center p-6'>
          <div className='animate-in fade-in slide-in-from-bottom-2 flex max-w-md flex-col items-center rounded-2xl border border-red-4 bg-surface-primary p-8 text-center shadow-sm duration-300'>
            <div className='mb-4 flex size-14 items-center justify-center rounded-2xl bg-red-2 text-red-10 ring-8 ring-red-1/60'>
              <Icon className='size-7 text-red-10' name='tabler:alert-circle' />
            </div>
            <h3 className='text-[16px] font-semibold text-gray-13'>
              {t`Failed to Load Workflow`}
            </h3>
            <p className='mt-2 text-[13px] leading-relaxed text-gray-10'>
              {workflowError}
            </p>
            <div className='mt-6 flex items-center gap-3'>
              <button
                className='inline-flex h-9 items-center gap-2 rounded-lg bg-gray-3 px-4 text-[13px] font-medium text-gray-12 transition-all hover:bg-gray-4 active:scale-95'
                type='button'
                onClick={onBack}
              >
                <DynamicIcon className='h-4 w-4' name='arrowLeft' />
                {t`Back to Document`}
              </button>
              <button
                className='inline-flex h-9 items-center gap-2 rounded-lg bg-primary-9 px-4 text-[13px] font-medium text-white transition-all hover:bg-primary-10 active:scale-95'
                type='button'
                onClick={() => setReloadKey((k) => k + 1)}
              >
                <DynamicIcon className='h-4 w-4' name='refresh' />
                {t`Try Again`}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const fileExt = (getFileExtension(fileName) || 'FILE').toUpperCase()
  const documentSupplier =
    documentInfo?.infoCards?.[0]?.rows?.find((r: any) => r.label === 'Supplier')
      ?.value || '-'
  const documentAmount =
    documentInfo?.infoCards?.[0]?.rows?.find((r: any) => r.label === 'Amount')
      ?.value || '-'
  const documentDate =
    documentInfo?.infoCards?.[0]?.rows?.find((r: any) => r.label === 'Date')
      ?.value || '-'
  const documentStatus =
    documentInfo?.infoCards?.[0]?.rows?.find(
      (r: any) => r.label === 'Status' || r.label === 'Current Stage',
    )?.value || '-'

  const currentStageName =
    workflowNodes.length > 0 ? workflowNodes[0].data?.label : documentStatus

  const resolvedPreviewKind = resolveDocumentPreviewKind(null, fileName)
  const isPdfPreview = resolvedPreviewKind === 'pdf'
  const isImagePreview =
    resolvedPreviewKind === 'image' || resolvedPreviewKind === 'tiff'

  return (
    <div className='animate-in fade-in flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-surface-secondary text-[13px] text-gray-11 duration-300'>
      <div className='flex h-[52px] shrink-0 items-center justify-between border-b border-gray-3 bg-surface-primary px-4'>
        <div className='flex min-w-0 items-center gap-3'>
          <button
            className='inline-flex h-8 items-center gap-2 rounded-lg px-3 text-[13px] font-semibold text-gray-13 transition-all hover:bg-gray-4 active:scale-95'
            type='button'
            onClick={onBack}
          >
            <DynamicIcon className='h-4 w-4' name='arrowLeft' />
            {t`Back`}
          </button>

          <div className='h-5 w-px shrink-0 bg-gray-4' />

          <div className='flex min-w-0 items-center gap-3'>
            <Icon className='size-5 shrink-0' name={iconName} />
            <h2 className='truncate text-[14px] font-semibold text-gray-13'>
              {fileName}
            </h2>
          </div>
        </div>

        <PrimaryButton
          className='h-9 shrink-0 px-4 text-[13px]'
          disabled={formState.isSubmitting}
          onClick={async () => {
            const res = await formState.submit()
            if (res.success) {
              showToast({
                message: t`Request submitted successfully`,
                variant: 'success',
              })
              onBack()
            } else {
              const errorMsg =
                res.error ||
                formState.submitError ||
                t`Please fill in required field(s)`
              const isMissingFields =
                formState.missingMandatoryFieldIds.size > 0 ||
                /required|mandatory/i.test(String(errorMsg))
              showToast({
                message: errorMsg,
                variant: isMissingFields ? 'info' : 'error',
              })
            }
          }}
        >
          <DynamicIcon
            className='h-4 w-4'
            name={formState.isSubmitting ? 'loader' : 'check'}
          />
          {connectionName}
        </PrimaryButton>
      </div>

      <div className='flex min-h-0 flex-1 gap-4 overflow-hidden p-4'>
        <div className='flex min-w-0 flex-1 flex-col overflow-hidden'>
          <Card className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-3 p-0 shadow-sm'>
            <div className='ez-detail-scroll h-full flex-1 overflow-hidden bg-gray-1'>
              {previewUrl ? (
                <div className='relative h-full min-h-full w-full'>
                  <DocumentPreviewViewer
                    className='h-full min-h-full'
                    fileBlob={previewBlob}
                    fileName={fileName}
                    fileUrl={previewUrl}
                    isImage={isImagePreview}
                    isLoading={false}
                    isPdf={isPdfPreview}
                  />
                </div>
              ) : (
                <DummyDocumentPreview fileName={fileName} fileType={fileExt} />
              )}
            </div>
          </Card>
        </div>

        <div className='flex w-[400px] shrink-0 flex-col gap-4 overflow-hidden xl:w-[460px]'>
          <ScrollArea className='flex-1 pr-3.5' height='100%' type='always'>
            <div className='space-y-4 pb-4'>
              <Card className='rounded-xl border border-gray-3 bg-surface-primary shadow-sm'>
                <button
                  className='flex w-full items-center justify-between border-b border-gray-3 px-4 py-2.5 transition-colors hover:bg-gray-2'
                  onClick={() => setIsApproversOpen(!isApproversOpen)}
                >
                  <h2 className='flex items-center gap-2 text-sm font-semibold text-gray-13'>
                    <DynamicIcon
                      className='h-4 w-4 text-blue-11'
                      name='users'
                    />
                    {formState.panels?.[0]?.title ||
                      formState.panels?.[0]?.name ||
                      t`Configure Approvers`}
                  </h2>
                  <DynamicIcon
                    className={`h-4 w-4 text-gray-10 transition-transform ${isApproversOpen ? 'rotate-180' : ''}`}
                    name='chevronDown'
                  />
                </button>

                {isApproversOpen && (
                  <div className='p-4'>
                    <WorkflowFormRenderer
                      attachments={formState.attachments}
                      disableOwnScroll={true}
                      formModel={formState.formModel}
                      hasAttemptedSubmit={formState.hasAttemptedSubmit}
                      hidePanels={true}
                      panels={formState.panels}
                      repositoryId={repositoryId}
                      missingMandatoryFieldIds={
                        formState.missingMandatoryFieldIds
                      }
                      onFieldChange={formState.setFieldValue}
                    />
                  </div>
                )}
              </Card>

              <Card className='rounded-xl border border-gray-3 bg-surface-primary shadow-sm'>
                <button
                  className='flex w-full items-center justify-between border-b border-gray-3 px-4 py-2.5 transition-colors hover:bg-gray-2'
                  onClick={() => setIsDocDetailsOpen(!isDocDetailsOpen)}
                >
                  <h2 className='flex items-center gap-2 text-sm font-semibold text-gray-13'>
                    <DynamicIcon
                      className='h-4 w-4 text-blue-11'
                      name='fileText'
                    />
                    {t`Document Details`}
                  </h2>
                  <DynamicIcon
                    className={`h-4 w-4 text-gray-10 transition-transform ${isDocDetailsOpen ? 'rotate-180' : ''}`}
                    name='chevronDown'
                  />
                </button>
                {isDocDetailsOpen && (
                  <div className='flex flex-col'>
                    {documentInfo?.infoCards
                      ?.flatMap((card: any) => card.rows || [])
                      .map((row: any, idx: number) => (
                        <div
                          className='flex items-center justify-between border-b border-gray-2 px-4 py-2.5 last:border-b-0'
                          key={idx}
                        >
                          <span className='flex items-center gap-2 text-[12px] text-gray-9'>
                            <DynamicIcon
                              className='h-3.5 w-3.5 text-gray-8'
                              name='maximize'
                            />
                            {row.label}
                          </span>
                          <span className='max-w-[200px] truncate text-[13px] font-medium text-gray-12'>
                            {row.value || '-'}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </Card>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}

function StartWorkflowSkeleton({ onBack }: { onBack?: () => void }) {
  const { t } = useLingui()
  return (
    <div className='animate-in fade-in flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-surface-secondary duration-300'>
      <div className='flex h-[52px] shrink-0 items-center justify-between border-b border-gray-3 bg-surface-primary px-4'>
        <div className='flex min-w-0 items-center gap-4'>
          {onBack ? (
            <button
              className='inline-flex h-8 items-center gap-2 rounded-lg px-3 text-[13px] font-semibold text-gray-13 transition-all hover:bg-gray-4 active:scale-95'
              type='button'
              onClick={onBack}
            >
              <DynamicIcon className='h-4 w-4' name='arrowLeft' />
              {t`Back`}
            </button>
          ) : (
            <div className='flex items-center gap-2'>
              <Skeleton className='h-4 w-4 rounded' />
              <Skeleton className='h-4 w-12 rounded' />
            </div>
          )}
          <div className='h-5 w-px shrink-0 bg-gray-4' />
          <div className='flex min-w-0 items-center gap-3'>
            <Skeleton className='h-5 w-5 shrink-0 rounded' />
            <Skeleton className='h-4 w-48 rounded' />
          </div>
        </div>
        <Skeleton className='h-9 w-36 shrink-0 rounded-lg' />
      </div>

      <div className='flex min-h-0 flex-1 gap-4 overflow-hidden p-4'>
        <div className='flex min-w-0 flex-1 flex-col overflow-hidden'>
          <Card className='flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-xl border border-gray-3 bg-surface-primary p-6 shadow-sm'>
            <div className='flex w-full max-w-sm flex-col items-center gap-4'>
              <Skeleton className='h-16 w-16 rounded-xl' />
              <Skeleton className='h-5 w-48 rounded' />
              <Skeleton className='h-4 w-32 rounded' />
            </div>
          </Card>
        </div>

        <div className='flex w-[400px] shrink-0 flex-col gap-4 overflow-hidden xl:w-[460px]'>
          <ScrollArea className='-mr-2 flex-1 pr-2' height='100%'>
            <div className='space-y-4 pb-4'>
              <Card className='space-y-4 rounded-xl border border-gray-3 bg-surface-primary p-4 shadow-sm'>
                <div className='flex items-center justify-between border-b border-gray-3 pb-3'>
                  <div className='flex items-center gap-2'>
                    <Skeleton className='h-4 w-4 rounded' />
                    <Skeleton className='h-5 w-40 rounded' />
                  </div>
                  <Skeleton className='h-4 w-4 rounded' />
                </div>
                <div className='space-y-4 pt-1'>
                  <div className='space-y-2'>
                    <Skeleton className='h-3 w-24 rounded' />
                    <Skeleton className='h-9 w-full rounded-lg' />
                  </div>
                  <div className='space-y-2'>
                    <Skeleton className='h-3 w-32 rounded' />
                    <Skeleton className='h-9 w-full rounded-lg' />
                  </div>
                  <div className='space-y-2'>
                    <Skeleton className='h-3 w-28 rounded' />
                    <Skeleton className='h-9 w-full rounded-lg' />
                  </div>
                </div>
              </Card>

              <Card className='space-y-4 rounded-xl border border-gray-3 bg-surface-primary p-4 shadow-sm'>
                <div className='flex items-center justify-between border-b border-gray-3 pb-3'>
                  <div className='flex items-center gap-2'>
                    <Skeleton className='h-4 w-4 rounded' />
                    <Skeleton className='h-5 w-36 rounded' />
                  </div>
                  <Skeleton className='h-4 w-4 rounded' />
                </div>
                <div className='space-y-3 pt-1'>
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      className='flex items-center justify-between py-1'
                      key={i}
                    >
                      <Skeleton className='h-3.5 w-28 rounded' />
                      <Skeleton className='h-3.5 w-36 rounded' />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}

function StepArrow() {
  return <DynamicIcon className='h-3.5 w-3.5 text-gray-9' name='chevronRight' />
}

function WorkflowStep({
  icon,
  label,
  tone,
}: {
  icon: string
  label: string
  tone: 'blue' | 'orange' | 'green'
}) {
  const toneClass =
    tone === 'blue'
      ? 'bg-blue-3 text-blue-11'
      : tone === 'orange'
        ? 'bg-orange-3 text-orange-11'
        : 'bg-green-3 text-green-11'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold ${toneClass}`}
    >
      <DynamicIcon className='h-3.5 w-3.5' name={icon} />
      <span className='max-w-[130px] truncate'>{label}</span>
    </span>
  )
}
