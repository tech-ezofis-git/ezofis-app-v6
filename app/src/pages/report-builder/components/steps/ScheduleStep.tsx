import { useLingui } from '@lingui/react/macro'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import type { ReportSchedule } from '../../types'
import { MOCK_USERS } from '../../constants'
import {
  SCHEDULE_DAY_OPTIONS,
  SCHEDULE_FORMAT_OPTIONS,
  SCHEDULE_RECURRENCE_OPTIONS,
  SCHEDULE_TIMEZONE_OPTIONS,
} from '../../constants'
import useReportBuilderDraftStore from '../../stores/useReportBuilderDraftStore'

const asOption = (list: { label: string; value: string }[], value: string) =>
  list.find((o) => o.value === value)
    ? { id: value, name: list.find((o) => o.value === value)!.label }
    : null

const ScheduleStep = () => {
  const { t } = useLingui()
  const draft = useReportBuilderDraftStore((state) => state.draft)
  const setDraft = useReportBuilderDraftStore((state) => state.setDraft)

  const updateSchedule = (patch: Partial<ReportSchedule>) => {
    setDraft({ schedule: { ...draft.schedule, ...patch } })
  }

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex items-center justify-between rounded-xl border border-gray-3 p-4'>
        <div>
          <h3 className='text-15 font-semibold text-gray-13'>{t`Schedule delivery`}</h3>
          <p className='mt-1 text-13 text-gray-10'>{t`Automatically run and email this report on a recurring basis.`}</p>
        </div>
        <InputSwitch
          checked={draft.scheduled}
          onChange={(checked) => setDraft({ scheduled: checked })}
        />
      </div>

      {draft.scheduled && (
        <>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <InputSelect
              label={t`Recurrence`}
              options={SCHEDULE_RECURRENCE_OPTIONS.map((o) => ({
                id: o.value,
                name: o.label,
              }))}
              value={asOption(
                SCHEDULE_RECURRENCE_OPTIONS,
                draft.schedule.recurrence,
              )}
              onChange={(option) =>
                updateSchedule({
                  recurrence:
                    (option?.id as ReportSchedule['recurrence']) || 'Weekly',
                })
              }
            />
            {draft.schedule.recurrence !== 'Daily' && (
              <InputSelect
                label={t`Day`}
                value={asOption(SCHEDULE_DAY_OPTIONS, draft.schedule.day)}
                options={SCHEDULE_DAY_OPTIONS.map((o) => ({
                  id: o.value,
                  name: o.label,
                }))}
                onChange={(option) =>
                  updateSchedule({ day: String(option?.id || 'Monday') })
                }
              />
            )}
            <InputText
              label={t`Time`}
              type='time'
              value={draft.schedule.time}
              onChange={(value) => updateSchedule({ time: value })}
            />
            <InputSelect
              label={t`Timezone`}
              options={SCHEDULE_TIMEZONE_OPTIONS.map((o) => ({
                id: o.value,
                name: o.label,
              }))}
              value={asOption(
                SCHEDULE_TIMEZONE_OPTIONS,
                draft.schedule.timezone,
              )}
              onChange={(option) =>
                updateSchedule({ timezone: String(option?.id || 'UTC') })
              }
            />
            <InputSelect
              label={t`Format`}
              value={asOption(SCHEDULE_FORMAT_OPTIONS, draft.schedule.format)}
              options={SCHEDULE_FORMAT_OPTIONS.map((o) => ({
                id: o.value,
                name: o.label,
              }))}
              onChange={(option) =>
                updateSchedule({
                  format: (option?.id as ReportSchedule['format']) || 'PDF',
                })
              }
            />
          </div>

          <div>
            <h4 className='mb-3 text-13 font-semibold text-gray-12'>{t`Email content`}</h4>
            <div className='flex flex-col gap-4'>
              <InputSelectMultiple
                label={t`Recipients`}
                placeholder={t`Select recipients`}
                options={MOCK_USERS.map((u) => ({
                  id: u.value,
                  name: u.label,
                }))}
                value={draft.schedule.recipients.map((id) => ({
                  id,
                  name: id,
                }))}
                onChange={(values) =>
                  updateSchedule({
                    recipients: values.map((v) => String(v.id)),
                  })
                }
              />
              <InputSelectMultiple
                label={t`CC`}
                placeholder={t`Select CC recipients`}
                value={draft.schedule.cc.map((id) => ({ id, name: id }))}
                options={MOCK_USERS.map((u) => ({
                  id: u.value,
                  name: u.label,
                }))}
                onChange={(values) =>
                  updateSchedule({ cc: values.map((v) => String(v.id)) })
                }
              />
              <InputText
                label={t`Subject`}
                placeholder={t`Report subject line`}
                value={draft.schedule.subject}
                onChange={(value) => updateSchedule({ subject: value })}
              />
              <InputTextarea
                label={t`Message`}
                placeholder={t`Add a message to include in the email body`}
                rows={4}
                value={draft.schedule.message}
                onChange={(value) => updateSchedule({ message: value })}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

ScheduleStep.displayName = 'ScheduleStep'
export default ScheduleStep
