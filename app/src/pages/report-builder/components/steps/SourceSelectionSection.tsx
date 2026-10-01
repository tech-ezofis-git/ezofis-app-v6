import { useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
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
import Icon from '@/components/base/icon/Icon'
import InputRadioCard from '@/components/base/inputs/InputRadioCard'
import InputSelect from '@/components/base/inputs/InputSelect'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import type { ReportSourceType } from '../../types'
import useReportBuilderDraftStore from '../../stores/useReportBuilderDraftStore'

interface Props {
  onBack: () => void
  onProceed: (mode: 'ai' | 'manual') => void
}

const SourceSelectionSection = ({ onBack, onProceed }: Props) => {
  const { t } = useLingui()
  const draft = useReportBuilderDraftStore((state) => state.draft)
  const setDraft = useReportBuilderDraftStore((state) => state.setDraft)

  const [selectedSourceType, setSelectedSourceType] =
    useState<ReportSourceType>(draft.sourceType || 'Workflow')

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

  const handleSelectSourceType = (type: ReportSourceType) => {
    setSelectedSourceType(type)
    setDraft({
      customFields: [],
      domain: '',
      fields: [],
      fieldSettings: {},
      filters: [],
      sourceFormId: '',
      sourceId: '',
      sourceType: type,
    })
  }

  const handleSelectWorkflow = async (option: Option | null) => {
    if (!option) {
      setDraft({
        customFields: [],
        domain: '',
        fields: [],
        fieldSettings: {},
        filters: [],
        sourceFormId: '',
        sourceId: '',
      })
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
      customFields: [],
      domain: workflowName,
      fields: [],
      fieldSettings: {},
      filters: [],
      sourceFormId: wFormId,
      sourceId: workflowId,
      sourceType: 'Workflow',
    })
  }

  const handleSelectFolder = (option: Option | null) => {
    if (!option) {
      setDraft({
        customFields: [],
        domain: '',
        fields: [],
        fieldSettings: {},
        filters: [],
        sourceFormId: '',
        sourceId: '',
      })
      return
    }

    const folderId = String(option.id)
    const folderName = String(option.name)

    setDraft({
      customFields: [],
      domain: folderName,
      fields: [],
      fieldSettings: {},
      filters: [],
      sourceFormId: '',
      sourceId: folderId,
      sourceType: 'Folder',
    })
  }

  const isSourceReady = Boolean(draft.sourceId && draft.domain)

  return (
    <div className='mx-auto flex w-full max-w-3xl flex-col gap-6 py-4'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-18 font-bold text-gray-13'>{t`Select Data Basis`}</h2>
          <p className='mt-1 text-13 text-gray-10'>
            {t`Choose whether to build your report from a Workflow process or a Repository Folder.`}
          </p>
        </div>
        <Button
          color='gray'
          icon='lucide:arrow-left'
          label={t`Back to Reports`}
          size='sm'
          variant='ghost'
          onClick={onBack}
        />
      </div>

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
        <InputRadioCard
          checked={selectedSourceType === 'Workflow'}
          description={t`Build report from workflow form submissions, approval stages & metrics`}
          icon='lucide:workflow'
          label={t`Workflow`}
          onClick={() => handleSelectSourceType('Workflow')}
        />
        <InputRadioCard
          checked={selectedSourceType === 'Folder'}
          description={t`Build report from repository documents, file attributes & custom metadata`}
          icon='lucide:folder'
          label={t`Folder / Repository`}
          onClick={() => handleSelectSourceType('Folder')}
        />
      </div>

      {selectedSourceType === 'Workflow' && (
        <div className='rounded-xl border border-gray-3 bg-surface p-5'>
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
          {!workflowsQuery.isLoading &&
            !workflowsQuery.isError &&
            workflowOptions.length === 0 && (
              <p className='mt-2 text-12 text-gray-9'>{t`No published workflows found.`}</p>
            )}
        </div>
      )}

      {selectedSourceType === 'Folder' && (
        <div className='rounded-xl border border-gray-3 bg-surface p-5'>
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
          {!foldersQuery.isLoading &&
            !foldersQuery.isError &&
            folderOptions.length === 0 && (
              <p className='mt-2 text-12 text-gray-9'>{t`No folders found.`}</p>
            )}
        </div>
      )}

      {/* Creation Mode Choice once source item is selected */}
      {isSourceReady ? (
        <div className='animate-in fade-in slide-in-from-top-3 flex flex-col gap-4 rounded-xl border border-primary-4 bg-primary-1/30 p-5 duration-300'>
          <div className='flex items-center gap-2 text-gray-13'>
            <Icon
              className='size-5 text-primary-10'
              name='lucide:check-circle2'
            />
            <h4 className='text-14 font-semibold'>
              {t`Selected Source:`}{' '}
              <span className='text-primary-11'>{draft.domain}</span> (
              {draft.sourceType})
            </h4>
          </div>
          <p className='text-13 text-gray-10'>
            {t`How would you like to build your report for "${draft.domain}"?`}
          </p>
          <div className='flex flex-wrap items-center gap-3 pt-1'>
            <Button
              color='primary'
              label={t`Build with AI`}
              size='md'
              leftSection={
                <AiBrandIcon className='size-4' variant='outline-white' />
              }
              onClick={() => onProceed('ai')}
            />
            <Button
              color='gray'
              icon='lucide:settings-2'
              label={t`Build Manually`}
              size='md'
              variant='outline'
              onClick={() => onProceed('manual')}
            />
          </div>
        </div>
      ) : (
        <div className='rounded-xl border border-dashed border-gray-4 py-8 text-center text-13 text-gray-10'>
          {t`Select a specific workflow or folder above to proceed with report creation.`}
        </div>
      )}
    </div>
  )
}

SourceSelectionSection.displayName = 'SourceSelectionSection'
export default SourceSelectionSection
