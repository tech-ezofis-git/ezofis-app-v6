import { useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { Option } from '@/types/option'
import { getRepositoriesQueryOptions } from '@/api/folders/queries'
import {
  createPublishedWorkflowBrowsePayload,
  mapPublishedBrowseResponseToOptions,
  workflowsApiV6,
} from '@/api/v6/workflows'
import { getWorkflowListQueryOptions } from '@/api/workflow/queries'
import InputRadioCard from '@/components/base/inputs/InputRadioCard'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import type { ReportSourceType, ReportVisibility } from '../../types'
import useReportForm from '../../hooks/useReportForm'
import useUserGroupOptions from '../../hooks/useUserGroupOptions'
import useReportBuilderDraftStore from '../../stores/useReportBuilderDraftStore'

const VISIBILITY_OPTIONS: {
  description: string
  icon: string
  value: ReportVisibility
}[] = [
  {
    description: 'Only visible to you',
    icon: 'lucide:lock',
    value: 'Private',
  },
  {
    description: 'Choose specific people',
    icon: 'lucide:users',
    value: 'Selected Users',
  },
  {
    description: 'Choose one or more groups',
    icon: 'lucide:user-round-check',
    value: 'Selected Groups',
  },
]

const DetailsStep = () => {
  const { t } = useLingui()
  const { form, syncField } = useReportForm()
  const draft = useReportBuilderDraftStore((state) => state.draft)
  const setDraft = useReportBuilderDraftStore((state) => state.setDraft)

  const sourceTypeOptions: Option[] = [
    { id: 'Workflow', name: t`Workflow` },
    { id: 'Folder', name: t`Folder` },
  ]

  const workflowBrowsePayload = useMemo(
    () => createPublishedWorkflowBrowsePayload({ filterBy: [] }),
    [],
  )
  const workflowsQuery = useQuery({
    ...getWorkflowListQueryOptions(workflowBrowsePayload),
    enabled: draft.sourceType === 'Workflow',
  })

  const workflowOptions: Option[] = useMemo(() => {
    return mapPublishedBrowseResponseToOptions(workflowsQuery.data ?? null).map(
      (w) => ({
        id: String(w.id),
        name: w.name || String(w.id),
      }),
    )
  }, [workflowsQuery.data])

  const foldersQuery = useQuery({
    ...getRepositoriesQueryOptions(),
    enabled: draft.sourceType === 'Folder',
  })

  const folderOptions: Option[] = useMemo(() => {
    return (foldersQuery.data ?? []).map((f: any) => ({
      id: String(f.id),
      name: String(f.name),
    }))
  }, [foldersQuery.data])

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
      syncField('domain', '')
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
    syncField('domain', workflowName)
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
      syncField('domain', '')
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
    syncField('domain', folderName)
  }

  const {
    groupOptions,
    isGroupsError,
    isGroupsLoading,
    isUsersError,
    isUsersLoading,
    userOptions,
  } = useUserGroupOptions()

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h3 className='mb-1 text-15 font-semibold text-gray-13'>{t`Report details`}</h3>
        <p className='text-13 text-gray-10'>{t`Give your report a name, select the data source, and configure sharing permissions.`}</p>
      </div>

      <form.Field
        name='name'
        children={(field) => (
          <InputText
            error={field.state.meta.errors[0]?.message}
            label={t`Report Name`}
            placeholder={t`e.g. Outstanding Invoices`}
            value={field.state.value}
            required
            onBlur={field.handleBlur}
            onChange={(value) => {
              field.handleChange(value)
              syncField('name', value)
            }}
          />
        )}
      />

      <div>
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
          <InputSelect
            label={t`Source Type`}
            options={sourceTypeOptions}
            placeholder={t`Select a source type`}
            required
            value={
              draft.sourceType
                ? sourceTypeOptions.find((o) => o.id === draft.sourceType) ||
                  null
                : null
            }
            onChange={(option) => {
              const value = (option?.id as ReportSourceType) || ''
              setDraft({
                customFields: [],
                domain: '',
                fields: [],
                fieldSettings: {},
                filters: [],
                sourceFormId: '',
                sourceId: '',
                sourceType: value,
              })
              syncField('domain', '')
            }}
          />

          {draft.sourceType === 'Workflow' && (
            <div>
              <InputSelect
                disabled={workflowsQuery.isLoading}
                label={t`Workflow`}
                options={workflowOptions}
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
                    : t`Select a workflow`
                }
                required
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
                  <p className='mt-1.5 text-12 text-gray-9'>{t`No published workflows found.`}</p>
                )}
            </div>
          )}

          {draft.sourceType === 'Folder' && (
            <div>
              <InputSelect
                disabled={foldersQuery.isLoading}
                label={t`Folder`}
                options={folderOptions}
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
                    : t`Select a folder`
                }
                required
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
                  <p className='mt-1.5 text-12 text-gray-9'>{t`No folders found.`}</p>
                )}
            </div>
          )}
        </div>
      </div>

      <form.Field
        name='description'
        children={(field) => (
          <InputTextarea
            label={t`Description`}
            placeholder={t`What does this report show?`}
            rows={3}
            value={field.state.value || ''}
            onChange={(value) => {
              field.handleChange(value)
              syncField('description', value)
            }}
          />
        )}
      />

      <div>
        <p className='mb-2 text-13 font-medium text-gray-12'>{t`Sharing`}</p>
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
          {VISIBILITY_OPTIONS.map((option) => (
            <InputRadioCard
              checked={draft.visibility === option.value}
              description={option.description}
              icon={option.icon}
              key={option.value}
              label={option.value}
              size='sm'
              onClick={() =>
                setDraft({
                  sharedGroups:
                    option.value === 'Selected Groups' ? draft.sharedGroups : [],
                  sharedUsers:
                    option.value === 'Selected Users' ? draft.sharedUsers : [],
                  visibility: option.value,
                })
              }
            />
          ))}
        </div>
      </div>

      {draft.visibility === 'Selected Users' && (
        <div>
          <InputSelectMultiple
            description={isUsersLoading ? t`Loading users...` : undefined}
            disabled={isUsersLoading}
            label={t`Share with users`}
            options={userOptions}
            placeholder={isUsersLoading ? t`Loading users...` : t`Select users`}
            error={
              isUsersError ? t`Couldn't load users. Try again.` : undefined
            }
            value={draft.sharedUsers.map(
              (id) => userOptions.find((u) => u.id === id) || { id, name: id },
            )}
            onChange={(values) =>
              setDraft({ sharedUsers: values.map((v) => String(v.id)) })
            }
          />
          {!isUsersLoading && !isUsersError && userOptions.length === 0 && (
            <p className='mt-1.5 text-12 text-gray-9'>{t`No users found.`}</p>
          )}
        </div>
      )}

      {draft.visibility === 'Selected Groups' && (
        <div>
          <InputSelectMultiple
            description={isGroupsLoading ? t`Loading groups...` : undefined}
            disabled={isGroupsLoading}
            label={t`Share with groups`}
            options={groupOptions}
            error={
              isGroupsError ? t`Couldn't load groups. Try again.` : undefined
            }
            placeholder={
              isGroupsLoading ? t`Loading groups...` : t`Select groups`
            }
            value={draft.sharedGroups.map(
              (id) => groupOptions.find((g) => g.id === id) || { id, name: id },
            )}
            onChange={(values) =>
              setDraft({ sharedGroups: values.map((v) => String(v.id)) })
            }
          />
          {!isGroupsLoading && !isGroupsError && groupOptions.length === 0 && (
            <p className='mt-1.5 text-12 text-gray-9'>{t`No groups found.`}</p>
          )}
        </div>
      )}
    </div>
  )
}

DetailsStep.displayName = 'DetailsStep'
export default DetailsStep
