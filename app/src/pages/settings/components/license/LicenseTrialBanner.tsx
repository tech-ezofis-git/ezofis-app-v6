import { useLingui } from '@lingui/react/macro'
import { KeyRound } from 'lucide-react'
import type { LicenseSummaryResponse } from '@/api/v6/license'
import cn from '@/utils/cn'

type Props = {
  summary: LicenseSummaryResponse
}

const formatDate = (iso: string) => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function LicenseTrialBanner({ summary }: Props) {
  const { t } = useLingui()
  const isTrial = summary.planType === 'trial'
  const trialDay = summary.trialDay
  const trialLengthDays = summary.trialLengthDays
  const percentUsed = Math.min(
    100,
    Math.round((trialDay / Math.max(1, trialLengthDays)) * 100),
  )
  const startDate = formatDate(summary.trialStartDate)
  const expiryDate = formatDate(summary.trialExpiryDate)

  return (
    <div
      className={cn(
        'rounded-xl border border-gray-3 p-5 shadow-[var(--shadow-sm)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]',
        isTrial
          ? 'bg-gradient-to-r from-surface via-surface to-orange-2'
          : 'bg-surface',
      )}
    >
      <div className='flex flex-wrap items-start justify-between gap-6'>
        <div className='flex items-center gap-3'>
          <span className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-9 to-secondary-9 text-white'>
            <KeyRound size={19} strokeWidth={2} />
          </span>
          <div>
            <div className='flex items-center gap-2'>
              <span className='font-poppins text-16 font-semibold text-text-primary'>
                {isTrial ? t`Trial Plan` : t`Production Plan`}
              </span>
              {isTrial ? (
                <span className='rounded-full border border-orange-6 bg-orange-3 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-orange-11 uppercase'>
                  {t`Trial`}
                </span>
              ) : (
                <span className='rounded-full border border-green-6 bg-green-3 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-green-11 uppercase'>
                  {t`Production`}
                </span>
              )}
            </div>
            <div className='mt-0.5 text-12 text-text-muted'>
              {t`Started ${startDate} · Expires ${expiryDate}`}
            </div>
          </div>
        </div>

        {isTrial ? (
          <div className='text-right'>
            <div className='font-poppins text-[26px] leading-none font-semibold text-orange-11'>
              {summary.daysRemaining}
            </div>
            <div className='mt-1 text-11 tracking-wide text-text-muted uppercase'>
              {t`days remaining in evaluation`}
            </div>
          </div>
        ) : null}
      </div>

      {isTrial ? (
        <div className='mt-5'>
          <div className='h-1.5 w-full overflow-hidden rounded-full bg-gray-2'>
            <div
              className='h-full rounded-full bg-gradient-to-r from-orange-9 to-red-9 transition-all duration-700 ease-out'
              style={{ width: `${percentUsed}%` }}
            />
          </div>
          <div className='mt-1.5 flex items-center justify-between text-11 text-text-muted'>
            <span>{t`Day ${trialDay} of ${trialLengthDays}`}</span>
            <span>
              <b className='font-semibold text-text-secondary'>
                {percentUsed}%
              </b>{' '}
              {t`of trial period used`}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
