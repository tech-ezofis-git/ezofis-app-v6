import { useLingui } from '@lingui/react/macro'
import Icon from '@/components/base/icon/Icon'
import InputRadioCard from '@/components/base/inputs/InputRadioCard'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import type { ReportVisibility } from '../../types'
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
        <p className='text-13 text-gray-10'>
          {t`Give your report a name, description, and configure sharing permissions.`}
        </p>
      </div>

      {/* Selected Source Summary Banner */}
      {draft.domain && (
        <div className='flex items-center gap-2.5 rounded-xl border border-gray-3 bg-gray-1/50 px-4 py-3'>
          <Icon className='size-4 text-primary-10' name='lucide:database' />
          <div className='flex flex-wrap items-center gap-2 text-13'>
            <span className='font-medium text-gray-11'>{t`Selected Source:`}</span>
            <span className='font-semibold text-gray-13'>{draft.domain}</span>
            {draft.sourceType && (
              <span className='rounded-md border border-gray-3 bg-surface px-2 py-0.5 text-11 font-medium text-gray-10'>
                {draft.sourceType}
              </span>
            )}
          </div>
        </div>
      )}

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
                    option.value === 'Selected Groups'
                      ? draft.sharedGroups
                      : [],
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
