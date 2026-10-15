import { useLingui } from '@lingui/react/macro'
import EmptyState from '@/components/base/EmptyState'
import { AnimateFadeIn } from '@/components/common/animations'
import Section from '../../shared/components/Section'

const Overview = () => {
  const { t } = useLingui()

  return (
    <Section title=''>
      <AnimateFadeIn delay={0.1}>
        <div className='flex min-h-[380px] w-full items-center justify-center rounded-2xl border border-gray-3 bg-surface p-8 text-center sm:p-12'>
          <EmptyState
            description={t`There is no invoice data to display yet. Processed invoices and analytics will appear here.`}
            icon='lucide:bar-chart-2'
            title={t`No Data Available`}
          />
        </div>
      </AnimateFadeIn>
    </Section>
  )
}

Overview.displayName = 'Overview'
export default Overview
