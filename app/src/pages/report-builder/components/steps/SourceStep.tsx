import { useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import type { Option } from '@/types/option'
import { getRepositoriesQueryOptions } from '@/api/folders/queries'
import {
  createPublishedWorkflowBrowsePayload,
  mapPublishedBrowseResponseToOptions,
  workflowsApiV6,
} from '@/api/v6/workflows'
import { getWorkflowListQueryOptions } from '@/api/workflow/queries'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import InputSelect from '@/components/base/inputs/InputSelect'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import {
  createReportAgentSessionId,
  generateReportAiPrompt,
  runReportAiReport,
} from '@/api/v6/reportAgent'
import useReportBuilderDraftStore from '../../stores/useReportBuilderDraftStore'
import type { PreviewColumn } from '../../utils/previewSampleData'
import type { ReportAgentConfig, ReportSourceType } from '../../types'
import {
  ALL_FOLDERS_SOURCE_ID,
  ALL_WORKFLOWS_SOURCE_ID,
  agentRunToReportRunResult,
  agentScopeForSource,
  buildAgentConfigFromDraft,
  draftPatchFromPromptResult,
  isAllScopeSource,
} from '../../utils/agentReport'
import FieldsPreviewTable from './FieldsPreviewTable'

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

// Descriptions the report agent has recipes for today (see agent API guide).
const PROMPT_EXAMPLES_ALL_WORKFLOWS = [
  { query: 'Aging', title: 'Aging' },
  { query: 'SLA', title: 'SLA' },
  { query: 'Total Inbox', title: 'Total inbox' },
  { query: 'Total tickets processed', title: 'Tickets processed' },
]

const PROMPT_EXAMPLES_ALL_FOLDERS = [
  { query: 'Total documents', title: 'Total documents' },
  { query: 'Document aging', title: 'Document aging' },
  { query: 'Document Retention Status', title: 'Retention status' },
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
  const [generateError, setGenerateError] = useState('')
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [previewRows, setPreviewRows] = useState<
    Record<string, string>[] | null
  >(null)
  const [agentWarnings, setAgentWarnings] = useState<string[]>([])
  const isEditing = Boolean(draft.editingReportId)

  // Persistent AI view states bound to draft store so they persist across navigation
  const showAiBuilder = Boolean(draft.showAiBuilder)
  const prompt = draft.aiPrompt ?? ''
  const suggestion = draft.aiSuggestion ?? null

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
    return [
      { id: ALL_WORKFLOWS_SOURCE_ID, name: t`All workflows` },
      ...mapPublishedBrowseResponseToOptions(workflowsQuery.data ?? null).map(
        (w) => ({
          id: String(w.id),
          name: w.name || String(w.id),
        }),
      ),
    ]
  }, [workflowsQuery.data, t])

  // Fetch Folders
  const foldersQuery = useQuery({
    ...getRepositoriesQueryOptions(),
    enabled: selectedSourceType === 'Folder',
  })
  const folderOptions: Option[] = useMemo(() => {
    return [
      { id: ALL_FOLDERS_SOURCE_ID, name: t`All folders` },
      ...(foldersQuery.data ?? []).map((f: any) => ({
        id: String(f.id),
        name: String(f.name),
      })),
    ]
  }, [foldersQuery.data, t])

  const isAllScope = isAllScopeSource(draft.sourceId)

  const handleSelectSourceType = (type: ReportSourceType) => {
    setSelectedSourceType(type)
    setDraft({
      aiPrompt: '',
      agent: null,
      aiSuggestion: null,
      customFields: [],
      domain: '',
      fields: [],
      fieldSettings: {},
      filters: [],
      showAiBuilder: false,
      sourceFormId: '',
      sourceId: '',
      sourceType: type,
    })
    onPlanGenerated?.(false)
  }

  const handleSelectWorkflow = async (option: Option | null) => {
    if (!option) {
      setDraft({
        aiPrompt: '',
        agent: null,
        aiSuggestion: null,
        customFields: [],
        domain: '',
        fields: [],
        fieldSettings: {},
        filters: [],
        showAiBuilder: false,
        sourceFormId: '',
        sourceId: '',
      })
      onPlanGenerated?.(false)
      return
    }

    const workflowId = String(option.id)
    const workflowName = String(option.name)

    let wFormId = ''
    if (workflowId !== ALL_WORKFLOWS_SOURCE_ID) {
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
    }

    setDraft({
      aiPrompt: '',
      agent: null,
      aiSuggestion: null,
      customFields: [],
      domain: workflowName,
      fields: [],
      fieldSettings: {},
      filters: [],
      showAiBuilder: false,
      sourceFormId: wFormId,
      sourceId: workflowId,
      sourceType: 'Workflow',
    })
    onPlanGenerated?.(false)
  }

  const handleSelectFolder = (option: Option | null) => {
    if (!option) {
      setDraft({
        aiPrompt: '',
        agent: null,
        aiSuggestion: null,
        customFields: [],
        domain: '',
        fields: [],
        fieldSettings: {},
        filters: [],
        showAiBuilder: false,
        sourceFormId: '',
        sourceId: '',
      })
      onPlanGenerated?.(false)
      return
    }

    const folderId = String(option.id)
    const folderName = String(option.name)

    setDraft({
      aiPrompt: '',
      agent: null,
      aiSuggestion: null,
      customFields: [],
      domain: folderName,
      fields: [],
      fieldSettings: {},
      filters: [],
      showAiBuilder: false,
      sourceFormId: '',
      sourceId: folderId,
      sourceType: 'Folder',
    })
    onPlanGenerated?.(false)
  }

  const isSourceReady = Boolean(draft.sourceId && draft.domain)

  const runPreview = async (agent: ReportAgentConfig) => {
    setPreviewError('')
    setPreviewRows(null)
    setIsPreviewing(true)
    const { data, error } = await runReportAiReport(agent.id, {
      page: 1,
      pageSize: 25,
      reportPrompt: agent.reportPrompt,
      reportSpec: agent.reportSpec,
    })
    setIsPreviewing(false)
    if (error || !data) {
      setPreviewError(error || t`Failed to run the report`)
      return
    }
    setPreviewRows(
      agentRunToReportRunResult(data, {
        domain: draft.domain,
        name: draft.name,
        reportId: null,
      }).rows,
    )
    setAgentWarnings((prev) => [
      ...new Set([...prev, ...(data.warnings ?? [])]),
    ])
  }

  const runPrompt = async (value: string) => {
    const text = value.trim()
    if (!text || isThinking) return
    setPrompt(text)
    setIsThinking(true)
    setGenerateError('')
    setPreviewError('')
    setPreviewRows(null)
    setAgentWarnings([])

    const scope = agentScopeForSource(
      draft.sourceType,
      draft.sourceId,
      draft.domain,
    )
    // Keep one session across generate → run for the whole wizard session.
    const sessionId = draft.agent?.sessionId || createReportAgentSessionId()
    // Generate saves the report; regenerating sends its id so the saved
    // report is overwritten instead of piling up copies in the library.
    const { data, error } = await generateReportAiPrompt({
      description: text,
      id: draft.agent?.id || null,
      repositoryName: scope.repositoryName,
      reportType: scope.reportType,
      sessionId,
      workflowName: scope.workflowName,
    })
    setIsThinking(false)

    if (error || !data) {
      setGenerateError(error || t`Failed to generate the report`)
      onPlanGenerated?.(false)
      return
    }

    const patch = draftPatchFromPromptResult(data, { ...scope, sessionId })
    setDraft({
      ...patch,
      aiPrompt: text,
      aiSuggestion: {
        fieldIds: patch.fields,
        name: patch.name,
        summary: patch.description,
      },
      name: patch.name || draft.domain,
      showAiBuilder: true,
    })
    setAgentWarnings(data.warnings ?? data.reportSpec.warnings ?? [])
    onPlanGenerated?.(true)
    void runPreview(buildAgentConfigFromDraft(patch.agent, patch))
  }

  const promptExamples = isAllScope
    ? draft.sourceType === 'Folder'
      ? PROMPT_EXAMPLES_ALL_FOLDERS
      : PROMPT_EXAMPLES_ALL_WORKFLOWS
    : draft.sourceType === 'Folder'
      ? PROMPT_EXAMPLES_FOLDER
      : PROMPT_EXAMPLES_WORKFLOW

  // Preview rows aren't persisted with the draft; re-run when coming back here.
  useEffect(() => {
    if (suggestion && draft.agent && !isEditing)
      void runPreview(buildAgentConfigFromDraft(draft.agent, draft))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const previewColumns: PreviewColumn[] = useMemo(() => {
    if (!suggestion) return []
    return draft.fields.map((id) => ({
      id,
      label: draft.fieldSettings[id]?.label || id,
      sampleType: 'text',
    }))
  }, [suggestion, draft.fields, draft.fieldSettings])

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
                {onProceedManual && !isAllScope && (
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
                  <AiBrandIcon
                    className='size-7 shrink-0'
                    variant='outline-purple'
                  />
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

                {onProceedManual && !isAllScope && (
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
                    {t`The report agent picks columns, filters and grouping for you.`}
                  </span>

                  <Button
                    color='primary'
                    disabled={!prompt.trim() || isThinking}
                    label={
                      isThinking ? t`Generating prompt...` : t`Generate Report`
                    }
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

              {generateError && (
                <p className='rounded-lg border border-red-6 bg-red-2 px-3 py-2 text-13 text-red-11'>
                  {generateError}
                </p>
              )}

              {/* Minimal Quick Ideas Chips with hover animations */}
              <div className='flex flex-wrap items-center gap-2'>
                <span className='text-12 font-medium text-gray-9'>{t`Quick ideas:`}</span>
                {promptExamples.map((example) => (
                  <button
                    className='inline-flex items-center gap-1.5 rounded-full border border-gray-3 bg-gray-1/50 px-3 py-1 text-12 text-gray-11 transition-all duration-200 hover:scale-[1.02] hover:border-primary-6 hover:bg-primary-1/30 hover:text-primary-11 active:scale-95 disabled:pointer-events-none disabled:opacity-50'
                    disabled={isThinking}
                    key={example.title}
                    type='button'
                    onClick={() => void runPrompt(example.query)}
                  >
                    <AiBrandIcon
                      className='size-3 shrink-0'
                      variant='outline-purple'
                    />
                    <span>{example.title}</span>
                  </button>
                ))}
              </div>

              {/* Suggested report card with smooth entrance animation and live agent preview */}
              <AnimatePresence>
                {suggestion && (
                  <motion.div
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className='flex flex-col gap-4 rounded-xl border border-primary-5 bg-primary-1/40 p-4.5 duration-300'
                    exit={{ opacity: 0, scale: 0.98, y: -6 }}
                    initial={{ opacity: 0, scale: 0.98, y: 12 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className='flex items-center gap-2'>
                      <AiBrandIcon
                        className='size-4'
                        variant='outline-purple'
                      />
                      <p className='text-14 font-semibold text-gray-13'>
                        {suggestion.name || t`Suggested Report`}
                      </p>
                    </div>
                    {suggestion.summary && (
                      <p className='text-13 text-gray-11'>
                        {suggestion.summary}
                      </p>
                    )}

                    {/* Selected column pills */}
                    <div className='flex flex-wrap gap-1.5'>
                      {draft.fields.map((id) => (
                        <span
                          className='rounded-full border border-gray-3 bg-surface px-2.5 py-1 text-11 text-gray-11'
                          key={id}
                        >
                          {draft.fieldSettings[id]?.label || id}
                        </span>
                      ))}
                    </div>

                    {agentWarnings.length > 0 && (
                      <div className='flex flex-col gap-1 rounded-lg border border-yellow-6 bg-yellow-2 px-3 py-2'>
                        {agentWarnings.map((warning) => (
                          <p className='text-12 text-yellow-11' key={warning}>
                            {warning}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Live preview from /report-agent/run */}
                    <div className='flex flex-col gap-1.5'>
                      <div className='flex items-center justify-between gap-2'>
                        <span className='text-12 font-medium text-gray-10'>
                          {t`Preview (first rows):`}
                        </span>
                        {draft.agent && (
                          <Button
                            color='gray'
                            disabled={isPreviewing}
                            icon='lucide:refresh-cw'
                            label={t`Run again`}
                            size='xs'
                            variant='ghost'
                            onClick={() =>
                              void runPreview(
                                buildAgentConfigFromDraft(draft.agent!, draft),
                              )
                            }
                          />
                        )}
                      </div>
                      {previewError ? (
                        <p className='rounded-lg border border-red-6 bg-red-2 px-3 py-2 text-12 text-red-11'>
                          {previewError}
                        </p>
                      ) : (
                        <div className='overflow-hidden rounded-lg border border-gray-3 bg-surface'>
                          <FieldsPreviewTable
                            columns={previewColumns}
                            isLoading={isPreviewing}
                            rows={previewRows ?? []}
                            isLive
                          />
                        </div>
                      )}
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
