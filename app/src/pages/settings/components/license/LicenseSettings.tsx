import { useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { getLicenseSummary } from '@/api/v6/license'
import Button from '@/components/base/button/Button'
import showToast from '@/components/base/toast/showToast'
import AnimateSlideUp from '@/components/common/animations/AnimateSlideUp'
import useRequestDemoStore from '@/layouts/app/stores/useRequestDemoStore'
import { licenseSummaryFallback } from '../../data/licenseMockData'
import useSettingsTopbarAction from '../../hooks/useSettingsTopbarAction'
import SettingsPageHeader from '../SettingsPageHeader'
import LicenseRecentResources from './LicenseRecentResources'
import LicenseStatsRow from './LicenseStatsRow'
import LicenseTrialBanner from './LicenseTrialBanner'
import LicenseUpgradeScreen from './LicenseUpgradeScreen'

type Screen = 'overview' | 'upgrade'

export default function LicenseSettings({ onBack }: { onBack?: () => void }) {
  const { t } = useLingui()
  const [screen, setScreen] = useState<Screen>('overview')

  const { data: summary } = useQuery({
    queryKey: ['settings', 'license-summary'],
    queryFn: async () => {
      const response = await getLicenseSummary()
      return response.data ?? licenseSummaryFallback
    },
  })

  const resolvedSummary = summary ?? licenseSummaryFallback
  const isTrial = resolvedSummary.planType === 'trial'

  const topbarAction = useMemo(
    () =>
      isTrial && screen === 'overview'
        ? {
            color: 'primary' as const,
            icon: 'lucide:arrow-up',
            label: t`Upgrade to Production`,
            onClick: () => setScreen('upgrade'),
          }
        : null,
    [isTrial, screen, t],
  )
  useSettingsTopbarAction(topbarAction)

  const openDemoForm = useRequestDemoStore((s) => s.openDemoForm)

  const handleTalkToSales = () => {
    openDemoForm({
      category: 'support',
      focusDescription: true,
      priority: 'high',
    })
  }

  const handleUpgraded = () => {
    setScreen('overview')
    showToast({
      message: t`Your workspace is now on Production.`,
      variant: 'success',
    })
  }

  if (screen === 'upgrade') {
    return (
      <LicenseUpgradeScreen
        summary={resolvedSummary}
        onBack={() => setScreen('overview')}
        onUpgraded={handleUpgraded}
      />
    )
  }

  return (
    <div className='flex h-full min-h-0 flex-col overflow-hidden bg-surface'>
      <SettingsPageHeader
        description={t`View trial usage summary and upgrade to production.`}
        title={t`License & Subscription`}
        onBack={onBack}
      />

      <div className='ez-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain'>
        <div className='flex flex-col gap-4 p-4'>
          <AnimateSlideUp>
            <LicenseTrialBanner summary={resolvedSummary} />
          </AnimateSlideUp>

          <AnimateSlideUp delay={0.08}>
            <LicenseStatsRow summary={resolvedSummary} />
          </AnimateSlideUp>

          {isTrial ? (
            <AnimateSlideUp
              className='flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-3 bg-gradient-to-r from-primary-11 via-primary-9 to-secondary-9 p-5 shadow-[var(--shadow-md)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]'
              delay={0.16}
            >
              <div>
                <span className='inline-flex items-center rounded-full border border-white/30 bg-white/15 px-2.5 py-1 text-[10px] font-bold tracking-wide text-white uppercase'>
                  {t`Zero-Downtime Transition`}
                </span>
                <div className='mt-2 text-15 font-semibold text-white'>
                  {t`Ready to go live? Upgrade to Production.`}
                </div>
                <div className='mt-1 max-w-[46ch] text-[12.5px] text-white/90'>
                  {t`Choose how your trial workflows, folders, users, and requests carry over — keep everything, keep configurations only, or start clean.`}
                </div>
              </div>
              <div className='flex flex-wrap items-center gap-2'>
                <Button
                  className='border-white/40 bg-white/15 text-white hover:bg-white/25'
                  icon='lucide:headset'
                  label={t`Talk to Sales`}
                  size='md'
                  variant='outline'
                  onClick={handleTalkToSales}
                />
                <Button
                  className='bg-white text-primary-11 hover:bg-white/90'
                  icon='lucide:arrow-up'
                  label={t`Upgrade to Production`}
                  size='md'
                  variant='solid'
                  onClick={() => setScreen('upgrade')}
                />
              </div>
            </AnimateSlideUp>
          ) : null}

          <AnimateSlideUp delay={0.24}>
            <LicenseRecentResources summary={resolvedSummary} />
          </AnimateSlideUp>
        </div>
      </div>
    </div>
  )
}
