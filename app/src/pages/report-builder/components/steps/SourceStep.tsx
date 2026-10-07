import { useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import type { Option } from '@/types/option'
import { getRepositoriesQueryOptions } from '@/api/folders/queries'
import {
  createPublishedWorkflowBrowsePayload,
  mapPublishedBrowseResponseToOptions,
  workflowsApiV6,
} from '@/api/v6/workflows'
import { getWorkflowListQueryOptions } from '@/api/workflow/queries'
import Button from '@/components/base/button/Button'
import InputSelect from '@/components/base/inputs/InputSelect'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import useReportSourceFields from '../../hooks/useReportSourceFields'
import useReportBuilderDraftStore from '../../stores/useReportBuilderDraftStore'
import type { PreviewColumn } from '../../utils/previewSampleData'
import { sampleTypeForQuestionType } from '../../utils/previewSampleData'
import type { ReportSourceType } from '../../types'
import { createDefaultFieldSetting } from '../../types'
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
      aiPrompt: '',
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
      aiPrompt: '',
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

  const runPrompt = (value: string) => {
    const text = value.trim()
    if (!text || sourceFields.length === 0) return
    setPrompt(text)
    setIsThinking(true)

    window.setTimeout(() => {
      const lower = text.toLowerCase()
      const matchingFields = sourceFields.filter((f) =>
        lower.includes((f.label || '').toLowerCase()),
      )
      const selectedFieldList =
        matchingFields.length > 0
          ? matchingFields.slice(0, 6)
          : sourceFields.slice(0, 5)

      const fieldIds = selectedFieldList.map((f) => f.id)
      const summary = `Based on "${draft.domain}" (${draft.sourceType}), I've prepared a report with ${selectedFieldList.length} relevant fields.`
      const name = text.length > 48 ? `${text.slice(0, 45)}...` : text

      // Prime the draft with fields and persist the AI plan state
      const fieldSettings = Object.fromEntries(
        fieldIds.map((id) => {
          const field = sourceFields.find((f) => f.id === id)
          return [id, createDefaultFieldSetting(field?.label || id)]
        }),
      )

      setDraft({
        aiPrompt: text,
        aiSuggestion: {
          fieldIds,
          name,
          summary,
        },
        description: summary,
        fields: fieldIds,
        fieldSettings,
        name: name || draft.domain,
        showAiBuilder: true,
      })

      setIsThinking(false)
      onPlanGenerated?.(true)
    }, 700)
  }

  const promptExamples =
    draft.sourceType === 'Folder'
      ? PROMPT_EXAMPLES_FOLDER
      : PROMPT_EXAMPLES_WORKFLOW

  const previewColumns: PreviewColumn[] = useMemo(() => {
    if (!suggestion) return []
    return suggestion.fieldIds.map((id) => {
      const field = sourceFields.find((f) => f.id === id)
      return {
        id,
        label: field?.label || id,
        sampleType: sampleTypeForQuestionType(field?.type || 'TEXT'),
      }
    })
  }, [suggestion, sourceFields])

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

      {/* Animated AI Section when Source is Ready */}
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
                    runPrompt(prompt)
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
                  disabled={!prompt.trim() || isThinking || isFieldsLoading}
                  label={isThinking ? t`Thinking...` : t`Generate Report`}
                  loading={isThinking}
                  size='sm'
                  variant='solid'
                  leftSection={
                    <AiBrandIcon className='size-4' variant='outline-white' />
                  }
                  onClick={() => runPrompt(prompt)}
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
                  onClick={() => runPrompt(example.query)}
                >
                  <AiBrandIcon className='size-3 shrink-0' variant='outline-purple' />
                  <span>{example.title}</span>
                </button>
              ))}
            </div>

            {/* Suggested report card with smooth entrance animation and live sample preview */}
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
                    <AiBrandIcon className='size-4' variant='outline-purple' />
                    <p className='text-14 font-semibold text-gray-13'>
                      {t`Suggested Report`}
                    </p>
                  </div>
                  <p className='text-13 text-gray-11'>{suggestion.summary}</p>

                  {/* Selected fields pills */}
                  <div className='flex flex-wrap gap-1.5'>
                    {suggestion.fieldIds.map((id) => {
                      const field = sourceFields.find((f) => f.id === id)
                      return (
                        <span
                          className='rounded-full border border-gray-3 bg-surface px-2.5 py-1 text-11 text-gray-11'
                          key={id}
                        >
                          {field?.label || id}
                        </span>
                      )
                    })}
                  </div>

                  {/* Live preview table with 3 data rows */}
                  <div className='flex flex-col gap-1.5'>
                    <span className='text-12 font-medium text-gray-10'>
                      {t`Live Preview (3 sample rows):`}
                    </span>
                    <div className='overflow-hidden rounded-lg border border-gray-3 bg-surface'>
                      <FieldsPreviewTable columns={previewColumns} rowCount={3} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

SourceStep.displayName = 'SourceStep'
export default SourceStep
