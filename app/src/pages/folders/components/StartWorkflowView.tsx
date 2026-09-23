import { useLingui } from '@lingui/react/macro'
import { useEffect, useMemo, useRef, useState } from 'react'
import fileApi from '@/api/file/file'
import type { V6WorkflowDetail } from '@/api/v6/workflows'
import workflowsApiV6 from '@/api/v6/workflows'
import authUserStore from '@/stores/authUserStore'
import ScrollArea from '@/components/base/scroll-area/ScrollArea'
import DocumentPreviewViewer from '@/components/common/document-preview/DocumentPreviewViewer'
import { importWorkflow } from '@/pages/workflows/utils/importWorkflow'
import { useWorkflowForm } from '@/pages/requests/components/workflow-request/hooks/useWorkflowForm'
import WorkflowFormRenderer from '@/pages/requests/components/workflow-request/WorkflowFormRenderer'
import type { WorkflowData } from '../types/folderTypes'
import { folderApi } from '../api/folderApi'
import {
  getFileExtension,
  resolveDocumentPreviewKind,
} from '../utils/documentDetailsUtils'
import { DynamicIcon } from './icons'
import { Button, Card, PrimaryButton } from './Ui'

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
  const [workflowError, setWorkflowError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)
  const prefilledFields = useRef<Set<string>>(new Set())
  const session = authUserStore((state) => state.session)
  const fileName = documentInfo?.fileName || 'Document'

  const formState = useWorkflowForm(workflowDetail, {
    viewerRepositoryId: repositoryId,
    viewerItemId: id,
    isRaiseTicket: true,
    fileName: fileName
  })

  const workflowNodes = useMemo(() => {
    if (!workflowDetail) return []
    if (workflowDetail.workflowJson?.nodes) return workflowDetail.workflowJson.nodes
    if (workflowDetail.flowJson?.nodes) return workflowDetail.flowJson.nodes

    let parsedWorkflowJson = workflowDetail.workflowJson
    if (typeof parsedWorkflowJson === 'string') {
      try {
        parsedWorkflowJson = JSON.parse(parsedWorkflowJson)
      } catch (e) { }
    }
    if (parsedWorkflowJson?.blocks) {
      return importWorkflow(parsedWorkflowJson).nodes.map((n: any) => ({
        id: n.id,
        data: { ...n.data, toolType: n.data.toolType || n.type }
      }))
    }

    if (workflowDetail.steps && Array.isArray(workflowDetail.steps)) {
      return workflowDetail.steps.map((step: any) => ({
        id: step.id,
        data: {
          label: step.name || 'Step',
          type: step.stepType === 0 ? 'trigger' : 'action',
          toolType: step.name === 'Manual User' ? 'manual_user' : 'other',
          icon: step.stepType === 0 ? 'lucide:play' : 'lucide:settings',
        },
      }))
    }
    return []
  }, [workflowDetail])

  useEffect(() => {
    if (!id || !repositoryId) return

    let cancelled = false
    const load = async () => {
      setLoading(true)
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
            setWorkflowError('Workflow details not found.')
          }
        } else {
          setWorkflowError('Workflow "Document Approval" not found.')
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
  }, [id, repositoryId])

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
      .catch(() => { })
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
            formState.setFieldValue(field.id, session?.email || session?.name || '')
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

  if (loading || formState.isLoadingForm) {
    return (
      <div className='p-6 text-[13px] text-gray-10'>{t`Loading workflow...`}</div>
    )
  }

  if (workflowError) {
    return <div className='p-6 text-[13px] text-red-10'>{workflowError}</div>
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

  const currentStageName = workflowNodes.length > 0 ? workflowNodes[0].data?.label : documentStatus

  const resolvedPreviewKind = resolveDocumentPreviewKind(null, fileName)
  const isPdfPreview = resolvedPreviewKind === 'pdf'
  const isImagePreview =
    resolvedPreviewKind === 'image' || resolvedPreviewKind === 'tiff'

  return (
    <div className='animate-in fade-in flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-surface-secondary text-[13px] text-gray-11 duration-300'>
      <div className='flex h-[52px] shrink-0 items-center border-b border-gray-3 bg-surface-primary px-6 gap-4'>
        <button
          className='inline-flex h-8 items-center gap-2 rounded-lg px-3 text-[13px] font-semibold text-gray-13 transition-all hover:bg-gray-4 active:scale-95'
          type='button'
          onClick={onBack}
        >
          <DynamicIcon className='h-4 w-4' name='arrowLeft' />
          {t`Back`}
        </button>

        <div className='h-5 w-px bg-gray-4' />

        <div className='flex items-center gap-3'>
          <span className='relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-red-3 text-[10px] font-bold text-red-9'>
            {fileExt}
          </span>
          <h2 className='text-[14px] font-semibold text-gray-13'>
            {fileName}
          </h2>
        </div>
      </div>

      <div className='flex min-h-0 flex-1 gap-5 overflow-hidden p-5'>
        <div className='flex flex-1 min-w-0 flex-col overflow-hidden'>
          <Card className='flex flex-1 min-h-0 flex-col overflow-hidden rounded-xl border border-gray-3 p-0 shadow-sm'>
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
                <DummyDocumentPreview
                  fileName={fileName}
                  fileType={fileExt}
                />
              )}
            </div>
          </Card>
        </div>

        <div className='flex w-[400px] xl:w-[480px] shrink-0 flex-col gap-5 overflow-hidden'>
          <ScrollArea className='flex-1 pr-3 -mr-3' height='100%'>
            <div className='space-y-5 pb-5'>
              <Card className='rounded-xl border border-gray-3 bg-surface-primary shadow-sm'>
                <div className='border-b border-gray-3 p-5'>
                  <h2 className='flex items-center gap-2 text-[15px] font-semibold text-gray-13'>
                    <DynamicIcon className='h-4 w-4 text-blue-11' name='fileText' />
                    {t`Document Details`}
                  </h2>
                </div>
                <div className='flex flex-col'>
                  {documentInfo?.infoCards?.flatMap((card: any) => card.rows || []).map((row: any, idx: number) => (
                    <div key={idx} className='flex items-center justify-between border-b border-gray-2 px-5 py-3 last:border-b-0'>
                      <span className='flex items-center gap-2 text-[12px] text-gray-9'>
                        <DynamicIcon className='h-3.5 w-3.5 text-gray-8' name='maximize' />
                        {row.label}
                      </span>
                      <span className='max-w-[200px] truncate text-[13px] font-medium text-gray-12'>
                        {row.value || '-'}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className='rounded-xl border border-gray-3 bg-surface-primary shadow-sm'>
                <div className='border-b border-gray-3 p-5'>
                  <h2 className='mb-4 flex items-center gap-2 text-[15px] font-semibold text-gray-13'>
                    <DynamicIcon
                      className='h-4 w-4 text-blue-11'
                      name='users'
                    />
                    {t`Configure Approvers`}
                  </h2>

                  <div className='flex flex-wrap items-center gap-2 rounded-xl bg-gray-2 p-3'>
                    {workflowNodes.map((node: any, idx: number) => {
                      let tone: 'blue' | 'orange' | 'green' = 'blue'
                      if (node.data?.type === 'trigger') tone = 'green'
                      else if (node.data?.toolType === 'manual_user')
                        tone = 'orange'

                      const iconName = String(
                        node.data?.icon || 'lucide:settings',
                      )
                        .replace('lucide:', '')
                        .replace(/-([a-z])/g, (_, letter) =>
                          letter.toUpperCase(),
                        )
                      return (
                        <div className='flex items-center gap-2' key={node.id}>
                          <WorkflowStep
                            icon={iconName}
                            label={node.data?.label || 'Step'}
                            tone={tone}
                          />
                          {idx < workflowNodes.length - 1 && <StepArrow />}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className='border-t border-gray-2 pt-2 pb-2 px-3'>
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

                {formState.submitError && (
                  <div className='px-5 pb-3 text-right text-[13px] font-semibold text-red-9'>
                    {formState.submitError}
                  </div>
                )}

                <div className='flex justify-end gap-3 border-t border-gray-3 bg-gray-1 p-5'>
                  <Button
                    className='h-9 px-4 text-[13px]'
                    disabled={formState.isSubmitting}
                    onClick={onBack}
                  >{t`Cancel`}</Button>

                  <PrimaryButton
                    className='h-9 px-4 text-[13px]'
                    disabled={formState.isSubmitting}
                    onClick={async () => {
                      const res = await formState.submit()
                      if (res.success) {
                        onBack()
                      }
                    }}
                  >
                    <DynamicIcon
                      className='h-4 w-4'
                      name={formState.isSubmitting ? 'loader' : 'check'}
                    />
                    {t`Launch Workflow`}
                  </PrimaryButton>
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

export function DummyDocumentPreview({
  fileName,
  fileType,
}: {
  fileName: string
  fileType: string
}) {
  const { t } = useLingui()

  return (
    <div className='flex h-full min-h-[560px] items-center justify-center bg-blue-3/30'>
      <div className='text-center'>
        <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-xl border border-gray-3 bg-surface-primary shadow-sm'>
          <DynamicIcon className='h-8 w-8 text-red-8' name='fileText' />
        </div>
        <p className='mt-4 text-[14px] font-semibold text-gray-10'>
          {fileName}
        </p>
        <p className='mt-2 text-[12px] text-gray-10'>{t`${fileType} Viewer`}</p>
      </div>
    </div>
  )
}
