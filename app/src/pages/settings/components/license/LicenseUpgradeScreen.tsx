import type { ReactNode } from 'react'
import { useLingui } from '@lingui/react/macro'
import {
  ArrowLeft,
  Check,
  CircleCheck,
  FileText,
  FolderOpen,
  GitFork,
  Loader2,
  Rocket,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import { useState } from 'react'
import type { LicenseSummaryResponse } from '@/api/v6/license'
import { upgradeLicenseToProduction } from '@/api/v6/license'
import Button from '@/components/base/button/Button'
import showToast from '@/components/base/toast/showToast'
import AnimateFadeIn from '@/components/common/animations/AnimateFadeIn'
import AnimateSlideUp from '@/components/common/animations/AnimateSlideUp'
import authUserStore from '@/stores/authUserStore'
import cn from '@/utils/cn'
import {
  type MigrationOptionDef,
  type MigrationOptionId,
  migrationOptions,
} from '../../data/licenseMockData'

type Props = {
  summary: LicenseSummaryResponse
  onBack: () => void
  onUpgraded: () => void
}

type Step = 'select' | 'review' | 'processing' | 'success'

const badgeToneClass: Record<MigrationOptionDef['badgeTone'], string> = {
  danger: 'border-red-6 bg-red-3 text-red-11',
  safe: 'border-green-6 bg-green-3 text-green-11',
  warn: 'border-orange-6 bg-orange-3 text-orange-11',
}

const confirmToneClass: Record<MigrationOptionDef['badgeTone'], string> = {
  danger: 'border-red-6 bg-red-2 text-red-11',
  safe: 'border-green-6 bg-green-2 text-green-11',
  warn: 'border-orange-6 bg-orange-2 text-orange-11',
}

export default function LicenseUpgradeScreen({
  summary,
  onBack,
  onUpgraded,
}: Props) {
  const { t } = useLingui()
  const [step, setStep] = useState<Step>('select')
  const [selected, setSelected] = useState<MigrationOptionId>('full')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedOption =
    migrationOptions.find((option) => option.id === selected) ??
    migrationOptions[0]

  const stepTitle =
    step === 'select'
      ? t`Choose a migration strategy`
      : step === 'review'
        ? t`Review & confirm`
        : step === 'processing'
          ? t`Upgrading…`
          : t`Upgrade complete`

  const handleConfirm = async () => {
    setStep('processing')
    setIsSubmitting(true)

    const session = authUserStore.getState().session
    const response = await upgradeLicenseToProduction({
      confirmedBy: session?.email || 'unknown',
      migrationOption: selected,
      tenantId: summary.tenantId,
    })

    setIsSubmitting(false)

    if (response.error) {
      showToast({ message: response.error, variant: 'error' })
      setStep('review')
      return
    }

    setStep('success')
  }

  return (
    <AnimateFadeIn className='flex h-full min-h-0 flex-col overflow-hidden'>
      <div className='flex shrink-0 items-center gap-3 border-b border-gray-3 px-4 py-3'>
        <button
          className='flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-4 bg-surface px-2.5 py-1.5 text-12 font-semibold text-text-secondary transition-all duration-150 hover:border-gray-6 hover:text-text-primary active:scale-95'
          type='button'
          onClick={step === 'success' ? onUpgraded : onBack}
        >
          <ArrowLeft size={14} strokeWidth={2.2} />
          {t`License & Subscription`}
        </button>
      </div>

      <div className='ez-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain'>
        <div className='mx-auto flex max-w-[760px] flex-col gap-5 p-4 pb-8'>
          <AnimateSlideUp className='overflow-hidden rounded-2xl border border-gray-3 shadow-[var(--shadow-md)]'>
            <div className='relative bg-gradient-to-br from-primary-11 via-primary-9 to-secondary-9 px-8 py-10 text-center text-white'>
              <span className='inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3.5 py-1.5 text-11 font-bold tracking-wide uppercase'>
                <Sparkles size={13} strokeWidth={2.4} />
                {t`Production Upgrade`}
              </span>
              <h1 className='mt-4 font-poppins text-[26px] leading-tight font-bold text-balance'>
                {t`Take your workspace to Production`}
              </h1>
              <p className='mx-auto mt-2 max-w-[46ch] text-[13.5px] text-white/88'>
                {t`No data loss, no rework — just choose how your trial carries over.`}
              </p>
            </div>

            <div className='grid grid-cols-2 gap-px bg-gray-3 sm:grid-cols-4'>
              <MigrationStat
                icon={<GitFork size={16} strokeWidth={2} />}
                label={t`Workflows`}
                value={String(summary.workflowsCount)}
              />
              <MigrationStat
                icon={<FolderOpen size={16} strokeWidth={2} />}
                label={t`Folders`}
                value={String(summary.foldersCount)}
              />
              <MigrationStat
                icon={<FileText size={16} strokeWidth={2} />}
                label={t`Files`}
                value={summary.filesCount.toLocaleString()}
              />
              <MigrationStat
                icon={<Users size={16} strokeWidth={2} />}
                label={t`Users`}
                value={String(summary.usersCount)}
              />
            </div>
          </AnimateSlideUp>

          <AnimateSlideUp
            className='overflow-hidden rounded-2xl border border-gray-3 bg-surface shadow-[var(--shadow-sm)]'
            delay={0.08}
          >
            <div className='flex items-center justify-between gap-3 border-b border-gray-3 px-6 py-4'>
              <div className='text-15 font-semibold text-text-primary'>
                {stepTitle}
              </div>
              <div className='flex gap-1.5'>
                {(['select', 'review', 'success'] as const).map((s, index) => (
                  <span
                    key={s}
                    className={cn(
                      'h-1 w-6 rounded-full transition-colors duration-300',
                      stepIndex(step) >= index ? 'bg-primary-9' : 'bg-gray-4',
                    )}
                  />
                ))}
              </div>
            </div>

            <AnimatePresence initial={false} mode='wait'>
              {step === 'select' ? (
                <AnimateFadeIn key='step-select'>
                  <div className='flex flex-col gap-3 px-6 py-6'>
                    {migrationOptions.map((option, index) => (
                      <AnimateFadeIn delay={index * 0.06} key={option.id}>
                        <StrategyCard
                          isSelected={selected === option.id}
                          option={option}
                          onSelect={() => setSelected(option.id)}
                        />
                      </AnimateFadeIn>
                    ))}
                  </div>
                  <div className='flex items-center justify-between gap-3 border-t border-gray-3 px-6 py-4'>
                    <Button
                      color='gray'
                      label={t`Cancel`}
                      size='md'
                      variant='outline'
                      onClick={onBack}
                    />
                    <Button
                      color='primary'
                      label={t`Continue`}
                      size='md'
                      variant='solid'
                      onClick={() => setStep('review')}
                    />
                  </div>
                </AnimateFadeIn>
              ) : null}

              {step === 'review' ? (
                <AnimateFadeIn key='step-review'>
                  <div className='px-6 py-6'>
                    <ReviewStep option={selectedOption} />
                  </div>
                  <div className='flex items-center justify-between gap-3 border-t border-gray-3 px-6 py-4'>
                    <Button
                      color='gray'
                      label={t`Back`}
                      size='md'
                      variant='outline'
                      onClick={() => setStep('select')}
                    />
                    <Button
                      color='primary'
                      disabled={isSubmitting}
                      icon='lucide:rocket'
                      label={t`Confirm & Upgrade to Production`}
                      loading={isSubmitting}
                      size='md'
                      variant='solid'
                      onClick={handleConfirm}
                    />
                  </div>
                </AnimateFadeIn>
              ) : null}

              {step === 'processing' ? (
                <AnimateFadeIn key='step-processing'>
                  <div className='px-6 py-6'>
                    <ProcessingStep />
                  </div>
                </AnimateFadeIn>
              ) : null}

              {step === 'success' ? (
                <AnimateFadeIn key='step-success'>
                  <div className='px-6 py-6'>
                    <SuccessStep option={selectedOption} />
                  </div>
                  <div className='flex justify-end border-t border-gray-3 px-6 py-4'>
                    <Button
                      color='primary'
                      label={t`Done`}
                      size='md'
                      variant='solid'
                      onClick={onUpgraded}
                    />
                  </div>
                </AnimateFadeIn>
              ) : null}
            </AnimatePresence>
          </AnimateSlideUp>
        </div>
      </div>
    </AnimateFadeIn>
  )
}

function MigrationStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className='flex flex-col items-center gap-1.5 bg-surface px-3 py-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:bg-gray-1'>
      <span className='flex text-primary-9'>{icon}</span>
      <span className='text-15 font-semibold text-text-primary'>{value}</span>
      <span className='text-11 font-medium text-text-muted'>{label}</span>
    </div>
  )
}

function ProcessingStep() {
  const { t } = useLingui()

  return (
    <div className='flex flex-col items-center gap-4 py-10 text-center'>
      <Loader2
        className='animate-spin text-primary-9'
        size={38}
        strokeWidth={2}
      />
      <div>
        <div className='text-[14.5px] font-semibold text-text-primary'>
          {t`Upgrading your workspace…`}
        </div>
        <div className='mt-1 text-12 text-text-muted'>
          {t`This usually takes under a minute. Don't close this page.`}
        </div>
      </div>
    </div>
  )
}

function ReviewStep({ option }: { option: MigrationOptionDef }) {
  const { t } = useLingui()

  return (
    <div>
      <div className='flex items-center gap-3 rounded-xl border border-gray-3 bg-gray-1 p-4'>
        <Rocket className='shrink-0 text-primary-9' size={20} />
        <div>
          <div className='text-[13.5px] font-semibold text-text-primary'>
            {option.title}
          </div>
          <div className='mt-0.5 text-[11.5px] text-text-muted'>
            {option.description}
          </div>
        </div>
      </div>

      <div className='mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2'>
        <div>
          <div className='mb-2 flex items-center gap-1.5 text-11 font-bold tracking-wide text-green-11 uppercase'>
            <Check size={13} strokeWidth={3} />
            {t`Retained`}
          </div>
          <ul className='flex flex-col gap-1.5'>
            {option.keep.length ? (
              option.keep.map((item) => (
                <li
                  className='flex items-start gap-1.5 text-[12.5px] text-text-secondary'
                  key={item}
                >
                  <Check
                    className='mt-0.5 shrink-0 text-green-9'
                    size={13}
                    strokeWidth={3}
                  />
                  {item}
                </li>
              ))
            ) : (
              <li className='text-[12.5px] text-text-muted'>
                {t`Nothing — starting empty`}
              </li>
            )}
          </ul>
        </div>
        <div>
          <div className='mb-2 flex items-center gap-1.5 text-11 font-bold tracking-wide text-red-11 uppercase'>
            <X size={13} strokeWidth={3} />
            {t`Purged`}
          </div>
          <ul className='flex flex-col gap-1.5'>
            {option.purge.length ? (
              option.purge.map((item) => (
                <li
                  className='flex items-start gap-1.5 text-[12.5px] text-text-secondary'
                  key={item}
                >
                  <X
                    className='mt-0.5 shrink-0 text-red-9'
                    size={13}
                    strokeWidth={3}
                  />
                  {item}
                </li>
              ))
            ) : (
              <li className='text-[12.5px] text-text-muted'>
                {t`Nothing is purged`}
              </li>
            )}
          </ul>
        </div>
      </div>

      <div
        className={cn(
          'mt-4 rounded-xl border px-3.5 py-3 text-12 leading-relaxed',
          confirmToneClass[option.badgeTone],
        )}
      >
        {option.badgeTone === 'safe'
          ? t`This action carries no destructive impact — your workspace continues exactly as it is today, just marked as production.`
          : option.badgeTone === 'warn'
            ? t`This will permanently delete all trial requests, test files and mock transactions. Your designs and access setup are kept.`
            : t`This will permanently delete every trial configuration and file. This cannot be undone — production starts completely empty.`}
      </div>
    </div>
  )
}

function stepIndex(step: Step) {
  if (step === 'select') return 0
  if (step === 'review' || step === 'processing') return 1
  return 2
}

function StrategyCard({
  isSelected,
  option,
  onSelect,
}: {
  isSelected: boolean
  option: MigrationOptionDef
  onSelect: () => void
}) {
  const { t } = useLingui()

  return (
    <button
      aria-checked={isSelected}
      role='radio'
      type='button'
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-xl border-[1.5px] p-4 text-left transition-all duration-150',
        isSelected
          ? 'border-primary-9 bg-primary-2 shadow-[0_0_0_3px_var(--primary-3)]'
          : 'border-gray-3 bg-surface hover:-translate-y-0.5 hover:border-primary-7 hover:shadow-[var(--shadow-sm)]',
      )}
      onClick={onSelect}
    >
      <span
        className={cn(
          'mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-150',
          isSelected ? 'border-primary-9' : 'border-gray-7',
        )}
      >
        {isSelected ? (
          <span className='size-2.5 rounded-full bg-primary-9' />
        ) : null}
      </span>

      <div className='min-w-0 flex-1'>
        <div className='flex flex-wrap items-center gap-2'>
          <span className='text-[13.5px] font-semibold text-text-primary'>
            {option.title}
          </span>
          <span
            className={cn(
              'rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase',
              badgeToneClass[option.badgeTone],
            )}
          >
            {option.badgeLabel}
          </span>
        </div>
        <p className='mt-1.5 text-12 leading-relaxed text-text-secondary'>
          {option.description}
        </p>
        <p className='mt-1.5 text-11 text-text-muted'>
          <b className='font-semibold text-text-secondary'>{t`Ideal for:`}</b>{' '}
          {option.idealFor}
        </p>
      </div>
    </button>
  )
}

function SuccessStep({ option }: { option: MigrationOptionDef }) {
  const { t } = useLingui()
  const optionTitle = option.title

  return (
    <div className='flex flex-col items-center gap-3 py-8 text-center'>
      <span className='flex size-14 items-center justify-center rounded-full bg-green-3 text-green-9'>
        <CircleCheck size={28} strokeWidth={2} />
      </span>
      <div className='text-[16.5px] font-semibold text-text-primary'>
        {t`You're live on Production`}
      </div>
      <div className='max-w-[38ch] text-[12.5px] text-text-muted'>
        {t`Your workspace has been upgraded using the "${optionTitle}" strategy. Refresh to see your production workspace.`}
      </div>
    </div>
  )
}
