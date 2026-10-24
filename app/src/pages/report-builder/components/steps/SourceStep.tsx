import { useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import type { Option } from '@/types/option'
import { getRepositoriesQueryOptions } from '@/api/folders/queries'
import {
  generateReportPrompt,
  runSavedReport,
  type ReportAiSpec,
} from '@/api/v6/reportAiBuilder'
import {
  createPublishedWorkflowBrowsePayload,
  mapPublishedBrowseResponseToOptions,
  workflowsApiV6,
} from '@/api/v6/workflows'
import { getWorkflowListQueryOptions } from '@/api/workflow/queries'
import Button from '@/components/base/button/Button'
import InputSelect from '@/components/base/inputs/InputSelect'
import showToast from '@/components/base/toast/showToast'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import useReportSourceFields from '../../hooks/useReportSourceFields'
import useReportBuilderDraftStore from '../../stores/useReportBuilderDraftStore'
import type { PreviewColumn } from '../../utils/previewSampleData'
import type { ReportSourceType } from '../../types'
import { createDefaultFieldSetting } from '../../types'
import FieldsPreviewTable from './FieldsPreviewTable'

const EMPTY_AI_DRAFT = {
  aiPrompt: '',
  aiReportId: null as string | null,
  aiReportPrompt: '',
  aiReportSpec: null as ReportAiSpec | null,
  aiReportType: '',
  aiRun: null,
  aiSessionId: '',
  aiSuggestion: null,
  aiTitle: '',
  aiWarnings: [] as string[],
  showAiBuilder: false,
}

const columnsFromSpec = (spec?: ReportAiSpec | null): PreviewColumn[] => {
  const selected =
    spec?.columns?.length
      ? spec.columns
      : [
          ...(spec?.defaultColumns ?? []),
          ...(spec?.userdefinedColumns ?? []),
          ...(spec?.agentColumns ?? []),
        ].filter((column) => column.selected !== false)
  return selected.map((column) => ({
    id: column.key,
    label: column.label || column.key,
    sampleType: 'text' as const,
  }))
}

const PROMPT_EXAMPLES_WORKFLOW = [
  {
    query: 'Show active requests and current approval stage',
    title: 'Active requests & stages',
  },
  {
    query: 'Identify requests with SLA bottlenecks and overdue status',
    title: 'SLA overdue & bottlenecks',
  },
]

const PROMPT_EXAMPLES_FOLDER = [
  {
    query: 'List documents grouped by folder and version',
    title: 'Documents by folder',
  },
  {
    query: 'Show documents uploaded recently with file sizes',
    title: 'Recent uploads & sizes',
  },
]

interface Props {
  onPlanGenerated?: (generated: boolean) => void
  onProceedManual?: () => void
}

const SourceStep = ({ onPlanGenerated, onProceedManual }: Props) => {
  const { t } = useLingui()
  const draft = useReportBuilderDraftStore((state) => state.draft)
  const setDraft = useReportBuilderDraftStore((state) => state.setDraft)

  const [selectedSourceType, setSelectedSourceType] =
    useState<ReportSourceType>(draft.sourceType || 'Workflow')
  const [isThinking, setIsThinking] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const isEditing = Boolean(draft.editingReportId)

  // Persistent AI view states bound to draft store so they persist across navigation
  const showAiBuilder = Boolean(draft.showAiBuilder)
  const prompt = draft.aiPrompt ?? ''

  const setShowAiBuilder = (val: boolean) => setDraft({ showAiBuilder: val })
  const setPrompt = (val: string) => setDraft({ aiPrompt: val })

  const sourceTypeOptions: Option[] = useMemo(
    () => [
      { id: 'Workflow', name: t`Workflow` },
      { id: 'Folder', name: t`Folder` },
    ],
    [t],
  )

  // Fetch Workflows
  const workflowBrowsePayload = useMemo(
    () => createPublishedWorkflowBrowsePayload({ filterBy: [] }),
    [],
  )
  const workflowsQuery = useQuery({
    ...getWorkflowListQueryOptions(workflowBrowsePayload),
    enabled: selectedSourceType === 'Workflow',
  })
  const workflowOptions: Option[] = useMemo(() => {
    return mapPublishedBrowseResponseToOptions(workflowsQuery.data ?? null).map(
      (w) => ({
        id: String(w.id),
        name: w.name || String(w.id),
      }),
    )
  }, [workflowsQuery.data])

  // Fetch Folders
  const foldersQuery = useQuery({
    ...getRepositoriesQueryOptions(),
    enabled: selectedSourceType === 'Folder',
  })
  const folderOptions: Option[] = useMemo(() => {
    return (foldersQuery.data ?? []).map((f: any) => ({
      id: String(f.id),
      name: String(f.name),
    }))
  }, [foldersQuery.data])

  // Fetch schema fields for selected source
  const { fields: sourceFields, isLoading: isFieldsLoading } =
    useReportSourceFields(draft.sourceFormId, draft.sourceType, draft.sourceId)

  const handleSelectSourceType = (type: ReportSourceType) => {
    setSelectedSourceType(type)
    setDraft({
      ...EMPTY_AI_DRAFT,
      customFields: [],
      domain: '',
      fields: [],
      fieldSettings: {},
      filters: [],
      sourceFormId: '',
      sourceId: '',
      sourceType: type,
    })
    onPlanGenerated?.(false)
  }

  const handleSelectWorkflow = async (option: Option | null) => {
    if (!option) {
      setDraft({
        ...EMPTY_AI_DRAFT,
        customFields: [],
        domain: '',
        fields: [],
        fieldSettings: {},
        filters: [],
        sourceFormId: '',
        sourceId: '',
      })
      onPlanGenerated?.(false)
      return
    }

    const workflowId = String(option.id)
    const workflowName = String(option.name)

    let wFormId = ''
    try {
      const res = await workflowsApiV6.getWorkflowById(workflowId)
      if (res.data) {
        const wf = res.data
        wFormId = String(
          wf.formId ??
            wf.wFormId ??
            wf.settings?.general?.initiateUsing?.formId ??
            '',
        )
      }
    } catch (e) {
      console.error('Failed to load workflow form id:', e)
    }

    setDraft({
      ...EMPTY_AI_DRAFT,
      customFields: [],
      domain: workflowName,
      fields: [],
      fieldSettings: {},
      filters: [],
      sourceFormId: wFormId,
      sourceId: workflowId,
      sourceType: 'Workflow',
    })
    onPlanGenerated?.(false)
  }

  const handleSelectFolder = (option: Option | null) => {
    if (!option) {
      setDraft({
        ...EMPTY_AI_DRAFT,
        customFields: [],
        domain: '',
        fields: [],
        fieldSettings: {},
        filters: [],
        sourceFormId: '',
        sourceId: '',
      })
      onPlanGenerated?.(false)
      return
    }

    const folderId = String(option.id)
    const folderName = String(option.name)

    setDraft({
      ...EMPTY_AI_DRAFT,
      customFields: [],
      domain: folderName,
      fields: [],
      fieldSettings: {},
      filters: [],
      sourceFormId: '',
      sourceId: folderId,
      sourceType: 'Folder',
    })
    onPlanGenerated?.(false)
  }

  const isSourceReady = Boolean(draft.sourceId && draft.domain)
  const reportType =
    draft.sourceType === 'Folder' ? 'specific_repository' : 'specific_workflow'
  const specColumns = columnsFromSpec(draft.aiReportSpec)
  const runColumns =
    draft.aiRun?.columns?.map((column) => ({
      id: column.key,
      label: column.label || column.key,
      sampleType: 'text' as const,
    })) ?? specColumns
  const runRows = (draft.aiRun?.rows ?? []).map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key, String(value ?? '')]),
    ),
  )

  const runPrompt = async (value: string) => {
    const text = value.trim()
    if (!text || isThinking) return
    setPrompt(text)
    setIsThinking(true)
    const sessionId =
      draft.aiSessionId ||
      `report-${crypto.randomUUID().replaceAll('-', '')}`
    try {
      const generated = await generateReportPrompt({
        description: text,
        id: draft.aiReportId,
        name: text.length > 80 ? `${text.slice(0, 77)}...` : text,
        reportType,
        repositoryName:
          reportType === 'specific_repository' ? draft.domain : null,
        sessionId,
        workflowName:
          reportType === 'specific_workflow' ? draft.domain : null,
      })
      const spec = generated.reportSpec ?? null
      const fieldIds = columnsFromSpec(spec).map((column) => column.id)
      const fieldSettings = Object.fromEntries(
        fieldIds.map((id) => {
          const fromSpec = spec?.columns?.find((column) => column.key === id)
          const field = sourceFields.find((item) => item.id === id)
          return [
            id,
            createDefaultFieldSetting(fromSpec?.label || field?.label || id),
          ]
        }),
      )
      setDraft({
        aiPrompt: text,
        aiReportId: generated.id,
        aiReportPrompt: generated.reportPrompt,
        aiReportSpec: spec,
        aiReportType: generated.reportType || reportType,
        aiRun: null,
        aiSessionId: generated.sessionId || sessionId,
        aiSuggestion: {
          fieldIds,
          name: generated.title || text,
          summary: generated.title || text,
        },
        aiTitle: generated.title || text,
        aiWarnings: generated.warnings ?? [],
        description: text,
        fields: fieldIds,
        fieldSettings,
        name: generated.title || draft.domain,
        showAiBuilder: true,
      })
      onPlanGenerated?.(true)
    } catch (error) {
      showToast({
        message:
          error instanceof Error
            ? error.message
            : t`Failed to generate report prompt`,
        variant: 'error',
      })
    } finally {
      setIsThinking(false)
    }
  }

  const runGeneratedReport = async () => {
    if (!draft.aiReportId || isRunning) return
    setIsRunning(true)
    try {
      const result = await runSavedReport(draft.aiReportId, {
        page: 1,
        pageSize: 25,
        reportPrompt: draft.aiReportPrompt,
        reportSpec: draft.aiReportSpec,
      })
      setDraft({ aiRun: result, aiWarnings: result.warnings ?? [] })
    } catch (error) {
      showToast({
        message:
          error instanceof Error ? error.message : t`Failed to run report`,
        variant: 'error',
      })
    } finally {
      setIsRunning(false)
    }
  }

  const promptExamples =
    draft.sourceType === 'Folder'
      ? PROMPT_EXAMPLES_FOLDER
      : PROMPT_EXAMPLES_WORKFLOW

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h3 className='mb-1 text-15 font-semibold text-gray-13'>{t`Select Data Source`}</h3>
        <p className='text-13 text-gray-10'>
          {t`Choose whether to build your report from a Workflow process or a Folder.`}
        </p>
      </div>

      {/* Two dropdowns: Select Source Type and Select Workflow / Folder */}
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
        <InputSelect
          label={t`Select Source`}
          options={sourceTypeOptions}
          placeholder={t`Choose source type...`}
          required
          value={
            sourceTypeOptions.find((o) => o.id === selectedSourceType) || null
          }
          onChange={(opt) =>
            handleSelectSourceType((opt?.id as ReportSourceType) || 'Workflow')
          }
        />

        {selectedSourceType === 'Workflow' && (
          <InputSelect
            disabled={workflowsQuery.isLoading}
            label={t`Select Workflow`}
            options={workflowOptions}
            required
            description={
              workflowsQuery.isLoading ? t`Loading workflows...` : undefined
            }
            error={
              workflowsQuery.isError
                ? t`Couldn't load workflows. Try again.`
                : undefined
            }
            placeholder={
              workflowsQuery.isLoading
                ? t`Loading workflows...`
                : t`Choose a workflow to report on...`
            }
            value={
              draft.sourceId
                ? workflowOptions.find((o) => o.id === draft.sourceId) ||
                  (draft.domain
                    ? { id: draft.sourceId, name: draft.domain }
                    : null)
                : null
            }
            onChange={handleSelectWorkflow}
          />
        )}

        {selectedSourceType === 'Folder' && (
          <InputSelect
            disabled={foldersQuery.isLoading}
            label={t`Select Folder`}
            options={folderOptions}
            required
            description={
              foldersQuery.isLoading ? t`Loading folders...` : undefined
            }
            error={
              foldersQuery.isError
                ? t`Couldn't load folders. Try again.`
                : undefined
            }
            placeholder={
              foldersQuery.isLoading
                ? t`Loading folders...`
                : t`Choose a folder to report on...`
            }
            value={
              draft.sourceId
                ? folderOptions.find((o) => o.id === draft.sourceId) ||
                  (draft.domain
                    ? { id: draft.sourceId, name: draft.domain }
                    : null)
                : null
            }
            onChange={handleSelectFolder}
          />
        )}
      </div>



      {/* Animated AI Section when Source is Ready (creation mode only) */}
      {!isEditing && (
        <AnimatePresence mode='wait'>
          {isSourceReady && !showAiBuilder && (
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className='flex flex-col gap-3 rounded-xl border border-primary-4 bg-primary-1/30 p-5 shadow-sm'
              exit={{ opacity: 0, scale: 0.98, y: -8 }}
              initial={{ opacity: 0, scale: 0.98, y: 16 }}
              key='mode-choice'
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className='text-13 font-medium text-gray-12'>
                {t`How would you like to build your report for "${draft.domain}"?`}
              </p>
              <div className='flex flex-wrap items-center gap-3 pt-1'>
                <Button
                  color='primary'
                  label={t`Build with AI`}
                  size='md'
                  variant='solid'
                  leftSection={
                    <AiBrandIcon className='size-4' variant='outline-white' />
                  }
                  onClick={() => setShowAiBuilder(true)}
                />
                {onProceedManual && (
                  <Button
                    color='gray'
                    icon='lucide:arrow-right'
                    label={t`Build Manually`}
                    size='md'
                    variant='outline'
                    onClick={onProceedManual}
                  />
                )}
              </div>
            </motion.div>
          )}

          {isSourceReady && showAiBuilder && (
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className='flex flex-col gap-5 rounded-2xl border border-primary-4/50 bg-surface p-6 shadow-sm'
              exit={{ opacity: 0, scale: 0.98, y: -8 }}
              initial={{ opacity: 0, scale: 0.98, y: 16 }}
              key='ai-builder'
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Header with Title and Switch Action */}
              <div className='flex items-center justify-between gap-3'>
                <div className='flex items-center gap-3'>
                  <AiBrandIcon className='size-7 shrink-0' variant='outline-purple' />
                  <div>
                    <h3 className='text-16 font-semibold text-gray-13'>
                      {t`Build with AI`}
                    </h3>
                    <p className='text-13 text-gray-10'>
                      {t`Describe what you want to report on for`}{' '}
                      <span className='font-semibold text-gray-12'>
                        {draft.domain}
                      </span>{' '}
                      <span className='rounded bg-gray-2 px-1.5 py-0.5 text-11 text-gray-11'>
                        {draft.sourceType}
                      </span>
                    </p>
                  </div>
                </div>

                {onProceedManual && (
                  <Button
                    color='gray'
                    icon='lucide:arrow-right'
                    label={t`Build Manually`}
                    size='sm'
                    variant='ghost'
                    onClick={onProceedManual}
                  />
                )}
              </div>

              {/* Clean prompt input box */}
              <div className='relative rounded-xl border border-gray-4 bg-gray-1/30 transition-all focus-within:border-primary-8 focus-within:ring-2 focus-within:ring-primary-3/30'>
                <textarea
                  className='min-h-[100px] w-full resize-none bg-transparent p-4 text-14 text-gray-13 outline-none placeholder:text-gray-8'
                  placeholder={t`Describe what insights or columns you want, e.g. Show active requests and current approval stage...`}
                  value={prompt}
                  autoFocus
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault()
                      void runPrompt(prompt)
                    }
                  }}
                />

                <div className='flex items-center justify-between rounded-b-xl border-t border-gray-3 bg-surface px-3.5 py-2.5'>
                  <span className='text-12 text-gray-9'>
                    {isFieldsLoading
                      ? t`Loading schema fields...`
                      : t`${sourceFields.length} schema fields available`}
                  </span>

                  <Button
                    color='primary'
                    disabled={!prompt.trim() || isThinking}
                    label={isThinking ? t`Thinking...` : t`Generate Report`}
                    loading={isThinking}
                    size='sm'
                    variant='solid'
                    leftSection={
                      <AiBrandIcon className='size-4' variant='outline-white' />
                    }
                    onClick={() => void runPrompt(prompt)}
                  />
                </div>
              </div>

              {/* Minimal Quick Ideas Chips with hover animations */}
              <div className='flex flex-wrap items-center gap-2'>
                <span className='text-12 font-medium text-gray-9'>{t`Quick ideas:`}</span>
                {promptExamples.map((example) => (
                  <button
                    className='inline-flex items-center gap-1.5 rounded-full border border-gray-3 bg-gray-1/50 px-3 py-1 text-12 text-gray-11 transition-all duration-200 hover:scale-[1.02] hover:border-primary-6 hover:bg-primary-1/30 hover:text-primary-11 active:scale-95'
                    key={example.title}
                    type='button'
                    onClick={() => void runPrompt(example.query)}
                  >
                    <AiBrandIcon className='size-3 shrink-0' variant='outline-purple' />
                    <span>{example.title}</span>
                  </button>
                ))}
              </div>

              <AnimatePresence>
                {draft.aiReportId && (
                  <motion.div
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className='flex flex-col gap-4 rounded-xl border border-primary-5 bg-primary-1/40 p-4.5 duration-300'
                    exit={{ opacity: 0, scale: 0.98, y: -6 }}
                    initial={{ opacity: 0, scale: 0.98, y: 12 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className='flex items-center justify-between gap-3'>
                      <div className='flex items-center gap-2'>
                        <AiBrandIcon className='size-4' variant='outline-purple' />
                        <p className='text-14 font-semibold text-gray-13'>
                          {draft.aiTitle || t`Generated report`}
                        </p>
                      </div>
                      <Button
                        color='primary'
                        disabled={isRunning || !draft.aiReportPrompt}
                        label={isRunning ? t`Running...` : t`Run report`}
                        loading={isRunning}
                        size='sm'
                        variant='solid'
                        onClick={() => void runGeneratedReport()}
                      />
                    </div>

                    {draft.aiWarnings && draft.aiWarnings.length > 0 && (
                      <p className='text-12 text-orange-11'>
                        {draft.aiWarnings[0]}
                      </p>
                    )}

                    <div className='flex flex-wrap gap-1.5'>
                      {specColumns.map((column) => (
                        <span
                          className='rounded-full border border-gray-3 bg-surface px-2.5 py-1 text-11 text-gray-11'
                          key={column.id}
                        >
                          {column.label}
                        </span>
                      ))}
                    </div>

                    <textarea
                      className='min-h-[120px] w-full resize-y rounded-lg border border-gray-3 bg-surface p-3 font-mono text-12 text-gray-12 outline-none focus:border-primary-8'
                      value={draft.aiReportPrompt ?? ''}
                      onChange={(event) =>
                        setDraft({ aiReportPrompt: event.target.value })
                      }
                    />

                    <div className='flex flex-col gap-1.5'>
                      <span className='text-12 font-medium text-gray-10'>
                        {draft.aiRun
                          ? t`Report data`
                          : t`Generate, then run to load rows`}
                      </span>
                      <div className='overflow-hidden rounded-lg border border-gray-3 bg-surface'>
                        <FieldsPreviewTable
                          columns={runColumns}
                          isLive
                          isLoading={isRunning}
                          rows={runRows}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  )
}

SourceStep.displayName = 'SourceStep'
export default SourceStep
