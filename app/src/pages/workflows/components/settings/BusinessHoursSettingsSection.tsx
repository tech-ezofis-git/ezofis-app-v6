import { useMemo } from 'react'
import Icon from '@/components/base/icon/Icon'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import InputTime from '@/components/base/inputs/InputTime'
import cn from '@/utils/cn'
import {
  type BusinessHours,
  createBusinessHours,
  describeWorkingDay,
  getTimeZoneOptions,
  toTimeValue,
  validateBusinessHours,
  WORK_DAYS,
} from '../../utils/businessHours'

interface BusinessHoursSettingsSectionProps {
  value: BusinessHours | null
  /** Show validation messages (set after a failed save attempt). */
  showErrors?: boolean
  onChange: (value: BusinessHours | null) => void
}

export default function BusinessHoursSettingsSection({
  showErrors = false,
  value,
  onChange,
}: BusinessHoursSettingsSectionProps) {
  const timeZoneOptions = useMemo(() => {
    const options = getTimeZoneOptions()
    // Keep a saved zone selectable even when this browser lists it under
    // another name (e.g. Asia/Kolkata vs Asia/Calcutta).
    if (value?.timeZone && !options.some((o) => o.id === value.timeZone))
      options.unshift({
        id: value.timeZone,
        name: value.timeZone.replace(/_/g, ' '),
      })
    return options
  }, [value?.timeZone])

  const errors = useMemo(
    () => (showErrors ? validateBusinessHours(value) : {}),
    [showErrors, value],
  )

  if (!value) {
    return (
      <div className='flex items-center justify-between gap-3 rounded-xl bg-surface p-4 shadow-sm'>
        <div className='flex items-center gap-2.5'>
          <Icon
            className='h-4 w-4 stroke-[2] text-gray-11'
            name='lucide:calendar-clock'
          />
          <div className='flex flex-col space-y-1'>
            <span className='text-13 font-medium text-gray-12'>
              Business hours
            </span>
            <span className='text-11 leading-tight text-gray-9'>
              Off: SLA durations count calendar time (24/7)
            </span>
          </div>
        </div>
        <InputSwitch
          checked={false}
          onChange={(checked) => checked && onChange(createBusinessHours())}
        />
      </div>
    )
  }

  const update = (patch: Partial<BusinessHours>) =>
    onChange({ ...value, ...patch })
  const dayLength = describeWorkingDay(value)

  return (
    <div className='animate-in fade-in flex flex-col gap-3 duration-200'>
      <div className='flex items-center justify-between gap-3 rounded-xl bg-surface p-4 shadow-sm'>
        <div className='flex items-center gap-2.5'>
          <Icon
            className='h-4 w-4 stroke-[2] text-primary-9'
            name='lucide:calendar-clock'
          />
          <div className='flex flex-col space-y-1'>
            <span className='text-13 font-medium text-gray-12'>
              Business hours
            </span>
            <span className='text-11 leading-tight text-gray-9'>
              SLA deadlines count working time only
            </span>
          </div>
        </div>
        <InputSwitch
          checked
          onChange={(checked) => !checked && onChange(null)}
        />
      </div>

      <div className='flex flex-col gap-4 rounded-xl bg-surface p-4 shadow-sm'>
        <div className='flex flex-col gap-2'>
          <span className='text-13 font-medium text-gray-11'>Working days</span>
          <div className='flex flex-wrap gap-1.5'>
            {WORK_DAYS.map((day) => {
              const selected = value.workDays.includes(day.id)
              return (
                <button
                  aria-label={day.id}
                  aria-pressed={selected}
                  key={day.id}
                  type='button'
                  className={cn(
                    'min-w-12 rounded-lg border px-2.5 py-1.5 text-12 font-semibold transition-all duration-200 active:scale-[0.97]',
                    selected
                      ? 'border-primary-9 bg-primary-9 text-white shadow-sm hover:bg-primary-10'
                      : 'border-gray-4 bg-surface text-gray-11 hover:border-primary-7 hover:bg-primary-1 hover:text-primary-11',
                  )}
                  onClick={() =>
                    update({
                      workDays: selected
                        ? value.workDays.filter((d) => d !== day.id)
                        : [...value.workDays, day.id],
                    })
                  }
                >
                  {day.short}
                </button>
              )
            })}
          </div>
          {errors.workDays && (
            <span className='text-12 text-red-11'>{errors.workDays}</span>
          )}
        </div>

        <div className='grid grid-cols-2 gap-2'>
          <InputTime
            error={errors.startTime}
            format='12h'
            label='Start time'
            value={value.startTime}
            required
            onChange={(v) => update({ startTime: toTimeValue(v) || v })}
          />
          <InputTime
            error={errors.closingTime}
            format='12h'
            label='Closing time'
            value={value.closingTime}
            required
            onChange={(v) => update({ closingTime: toTimeValue(v) || v })}
          />
        </div>

        <InputSelect
          error={errors.timeZone}
          label='Work time zone'
          options={timeZoneOptions}
          placeholder='Select time zone...'
          value={timeZoneOptions.find((o) => o.id === value.timeZone) ?? null}
          required
          searchable
          description={
            dayLength
              ? `Working day: ${dayLength}. An SLA day counts as one working day.`
              : undefined
          }
          onChange={(opt) => opt && update({ timeZone: String(opt.id) })}
        />
      </div>
    </div>
  )
}
