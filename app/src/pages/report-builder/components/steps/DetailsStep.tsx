import { useLingui } from '@lingui/react/macro'
import { useMemo } from 'react'
import Icon from '@/components/base/icon/Icon'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import cn from '@/utils/cn'
import type { ReportVisibility } from '../../types'
import useReportForm from '../../hooks/useReportForm'
import useUserGroupOptions from '../../hooks/useUserGroupOptions'
import useReportBuilderDraftStore from '../../stores/useReportBuilderDraftStore'

const DetailsStep = () => {
  const { t } = useLingui()
  const { form, syncField } = useReportForm()
  const draft = useReportBuilderDraftStore((state) => state.draft)
  const setDraft = useReportBuilderDraftStore((state) => state.setDraft)

  const visibilityOptions = useMemo<
    {
      description: string
      icon: string
      title: string
      value: ReportVisibility
    }[]
  >(
    () => [
      {
        description: t`Only visible to you`,
        icon: 'lucide:lock',
        title: t`Private`,
        value: 'Private',
      },
      {
        description: t`Visible to everyone`,
        icon: 'lucide:globe',
        title: t`Public`,
        value: 'Public',
      },
      {
        description: t`Choose specific people`,
        icon: 'lucide:users',
        title: t`Selected Users`,
        value: 'Selected Users',
      },
      {
        description: t`Choose one or more groups`,
        icon: 'lucide:user-round-check',
        title: t`Selected Groups`,
        value: 'Selected Groups',
      },
    ],
    [t],
  )

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
        <label className='mb-2 block text-xs font-semibold text-[var(--gray-13)]'>
          {t`Sharing`}
        </label>
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
          {visibilityOptions.map((option) => {
            const isSelected = draft.visibility === option.value
            return (
              <button
                key={option.value}
                type='button'
                className={cn(
                  'flex w-full cursor-pointer items-start gap-3 rounded-[12px] border p-3.5 text-left transition',
                  isSelected
                    ? 'border-[var(--primary-8)] bg-[var(--primary-2)] shadow-sm ring-1 ring-[var(--primary-8)]'
                    : 'border-[var(--border-default)] bg-surface hover:border-[var(--primary-5)]',
                )}
                onClick={() =>
                  setDraft({
                    sharedGroups:
                      option.value === 'Selected Groups'
                        ? draft.sharedGroups
                        : [],
                    sharedUsers:
                      option.value === 'Selected Users'
                        ? draft.sharedUsers
                        : [],
                    visibility: option.value,
                  })
                }
              >
                <div
                  className={cn(
                    'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition',
                    isSelected
                      ? 'border-[var(--primary-9)] bg-surface'
                      : 'border-[var(--gray-7)] bg-surface',
                  )}
                >
                  {isSelected && (
                    <div className='h-2 w-2 rounded-full bg-[var(--primary-9)]' />
                  )}
                </div>

                <Icon
                  className={cn(
                    'mt-0.5 size-4 shrink-0 transition',
                    isSelected
                      ? 'text-[var(--primary-10)]'
                      : 'text-[var(--gray-11)]',
                  )}
                  name={option.icon}
                />

                <div className='min-w-0 flex-1'>
                  <div className='text-xs leading-snug font-semibold text-[var(--gray-13)]'>
                    {option.title}
                  </div>
                  <div className='mt-0.5 text-xs leading-relaxed text-[var(--gray-10)]'>
                    {option.description}
                  </div>
                </div>
              </button>
            )
          })}
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
