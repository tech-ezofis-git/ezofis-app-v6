import { useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { Option } from '@/types/option'
import {
  getMasterFormsQueryOptions,
  getWorkflowFormsQueryOptions,
} from '@/api/form/queries'
import {
  getGroupListQueryOptions,
  getUserListQueryOptions,
} from '@/api/userQueries'
import InputRadioCard from '@/components/base/inputs/InputRadioCard'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import type { ReportVisibility } from '../../types'
import { REPORT_DOMAINS } from '../../constants'
import useReportForm from '../../hooks/useReportForm'
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
  const domainOptions = REPORT_DOMAINS.map((domain) => ({
    id: domain,
    name: domain,
  }))

  const sourceTypeOptions: Option[] = [
    { id: 'Master', name: t`Master` },
    { id: 'Workflow', name: t`Workflow` },
  ]

  const masterFormsQuery = useQuery({
    ...getMasterFormsQueryOptions(),
    enabled: draft.sourceType === 'Master',
  })
  const workflowFormsQuery = useQuery({
    ...getWorkflowFormsQueryOptions(),
    enabled: draft.sourceType === 'Workflow',
  })

  const isSourceFormsLoading =
    draft.sourceType === 'Master'
      ? masterFormsQuery.isLoading
      : draft.sourceType === 'Workflow'
        ? workflowFormsQuery.isLoading
        : false
  const isSourceFormsError =
    draft.sourceType === 'Master'
      ? masterFormsQuery.isError
      : draft.sourceType === 'Workflow'
        ? workflowFormsQuery.isError
        : false

  const sourceFormOptions: Option[] = useMemo(() => {
    const forms: Array<{ id: number | string; name: string }> =
      draft.sourceType === 'Workflow'
        ? (workflowFormsQuery.data ?? [])
        : draft.sourceType === 'Master'
          ? (masterFormsQuery.data ?? [])
          : []
    if (!Array.isArray(forms)) return []
    return forms.map((f) => ({ id: String(f.id), name: String(f.name) }))
  }, [draft.sourceType, masterFormsQuery.data, workflowFormsQuery.data])

  const {
    data: rawUsers,
    isError: isUsersError,
    isLoading: isUsersLoading,
  } = useQuery(getUserListQueryOptions())
  const {
    data: rawGroups,
    isError: isGroupsError,
    isLoading: isGroupsLoading,
  } = useQuery(getGroupListQueryOptions())

  const userOptions: Option[] = useMemo(() => {
    const users = rawUsers as any[]
    if (!Array.isArray(users)) return []
    return users.map((u: any) => {
      const name =
        u.value ||
        u.name ||
        (u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : null) ||
        u.loginName ||
        u.displayName ||
        u.email ||
        t`Unknown User`
      return { id: String(u.id ?? u.value), name: String(name) }
    })
  }, [rawUsers, t])

  const groupOptions: Option[] = useMemo(() => {
    const groups = rawGroups as any[]
    if (!Array.isArray(groups)) return []
    return groups.map((g: any) => {
      const id = g.groupId ?? g.id ?? g.value
      return {
        id: String(id),
        name: String(g.groupName || g.name || g.value || t`Group ${id}`),
      }
    })
  }, [rawGroups, t])

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h3 className='mb-1 text-15 font-semibold text-gray-13'>{t`Report details`}</h3>
        <p className='text-13 text-gray-10'>{t`Give your report a name, pick the data domain, and describe what it covers.`}</p>
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

      <form.Field
        name='domain'
        children={(field) => (
          <InputSelect
            error={field.state.meta.errors[0]?.message}
            label={t`Domain`}
            options={domainOptions}
            placeholder={t`Select a data domain`}
            required
            value={
              field.state.value
                ? { id: field.state.value, name: field.state.value }
                : null
            }
            onChange={(option) => {
              const value = option?.id ? String(option.id) : ''
              field.handleChange(value)
              syncField('domain', value)
              setDraft({ fields: [], fieldSettings: {}, filters: [] })
            }}
          />
        )}
      />

      <div>
        <p className='mb-2 text-13 font-medium text-gray-12'>{t`Source`}</p>
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
          <InputSelect
            label={t`Source Type`}
            options={sourceTypeOptions}
            placeholder={t`Select a source type`}
            value={
              draft.sourceType
                ? sourceTypeOptions.find((o) => o.id === draft.sourceType) ||
                  null
                : null
            }
            onChange={(option) => {
              const value = (option?.id as 'Master' | 'Workflow' | '') || ''
              setDraft({
                customFields: [],
                fields: [],
                fieldSettings: {},
                sourceFormId: '',
                sourceType: value,
              })
            }}
          />

          <div>
            <InputSelect
              disabled={!draft.sourceType || isSourceFormsLoading}
              label={t`Source Form`}
              options={sourceFormOptions}
              description={
                isSourceFormsLoading ? t`Loading forms...` : undefined
              }
              error={
                isSourceFormsError
                  ? t`Couldn't load forms. Try again.`
                  : undefined
              }
              placeholder={
                !draft.sourceType
                  ? t`Select a source type first`
                  : isSourceFormsLoading
                    ? t`Loading forms...`
                    : t`Select a form`
              }
              value={
                draft.sourceFormId
                  ? sourceFormOptions.find(
                      (o) => o.id === draft.sourceFormId,
                    ) || null
                  : null
              }
              onChange={(option) => {
                setDraft({
                  customFields: [],
                  fields: [],
                  fieldSettings: {},
                  sourceFormId: option?.id ? String(option.id) : '',
                })
              }}
            />
            {draft.sourceType &&
              !isSourceFormsLoading &&
              !isSourceFormsError &&
              sourceFormOptions.length === 0 && (
                <p className='mt-1.5 text-12 text-gray-9'>{t`No forms found for this source type.`}</p>
              )}
          </div>
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
              onClick={() => setDraft({ visibility: option.value })}
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
