import { useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { getRepositorys } from '@/api/v6/folder/folder'
import { getLicenseSummary } from '@/api/v6/license'
import { getUsers } from '@/api/v6/user'
import workflowsApiV6, {
  createPublishedWorkflowBrowsePayload,
} from '@/api/v6/workflows'
import Button from '@/components/base/button/Button'
import showToast from '@/components/base/toast/showToast'
import AnimateSlideUp from '@/components/common/animations/AnimateSlideUp'
import useRequestDemoStore from '@/layouts/app/stores/useRequestDemoStore'
import {
  type LicenseResourceCategory,
  licenseSummaryFallback,
} from '../../data/licenseMockData'
import useSettingsTopbarAction from '../../hooks/useSettingsTopbarAction'
import SettingsPageHeader from '../SettingsPageHeader'
import LicenseRecentResources from './LicenseRecentResources'
import LicenseStatsRow from './LicenseStatsRow'
import LicenseTrialBanner from './LicenseTrialBanner'
import LicenseUpgradeScreen from './LicenseUpgradeScreen'

type Screen = 'overview' | 'upgrade'

const extractRepositoriesData = (raw: unknown): any[] => {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'object' && raw !== null) {
    const record = raw as Record<string, unknown>
    if (Array.isArray(record.data)) return record.data
    if (Array.isArray(record.items)) return record.items
    if (Array.isArray(record.payload)) return record.payload
    if (Array.isArray(record.value)) return record.value
  }
  return []
}

const extractWorkflowsData = (raw: unknown): any[] => {
  if (!raw) return []

  const extractFromArr = (arr: any[]): any[] => {
    const list: any[] = []
    for (const item of arr) {
      if (item && Array.isArray(item.value)) {
        list.push(...item.value)
      } else if (item && typeof item === 'object') {
        list.push(item)
      }
    }
    return list
  }

  if (Array.isArray(raw)) {
    return extractFromArr(raw)
  }

  if (typeof raw === 'object' && raw !== null) {
    const record = raw as Record<string, unknown>
    if (Array.isArray(record.data)) {
      return extractFromArr(record.data)
    }
    if (Array.isArray(record.items)) {
      return extractFromArr(record.items)
    }
    if (Array.isArray(record.workflows)) {
      return extractFromArr(record.workflows)
    }
    if (Array.isArray(record.payload)) {
      return extractFromArr(record.payload)
    }
  }

  return []
}

export default function LicenseSettings({ onBack }: { onBack?: () => void }) {
  const { t } = useLingui()
  const [screen, setScreen] = useState<Screen>('overview')
  const [selectedCategory, setSelectedCategory] =
    useState<LicenseResourceCategory>('users')

  const { data: summary } = useQuery({
    queryKey: ['settings', 'license-summary'],
    queryFn: async () => {
      const response = await getLicenseSummary()
      return response.data ?? licenseSummaryFallback
    },
  })

  const { data: usersResponse } = useQuery({
    queryKey: ['settings', 'real-users-list'],
    queryFn: async () => {
      const response = await getUsers()
      return response.data ?? []
    },
  })

  const { data: repositoriesResponse } = useQuery({
    queryKey: ['settings', 'real-repositories-list'],
    queryFn: async () => {
      const response = await getRepositorys()
      return extractRepositoriesData(response.data)
    },
  })

  const { data: workflowsResponse } = useQuery({
    queryKey: ['settings', 'real-workflows-list'],
    queryFn: async () => {
      const response = await workflowsApiV6.getAllWorkflows(
        createPublishedWorkflowBrowsePayload({ itemsPerPage: 100 }),
      )
      return extractWorkflowsData(response.data)
    },
  })

  const resolvedSummary = useMemo(() => {
    const base = summary ?? licenseSummaryFallback
    const liveUsersCount =
      usersResponse && usersResponse.length > 0
        ? usersResponse.length
        : base.usersCount

    const liveFoldersCount =
      repositoriesResponse && repositoriesResponse.length > 0
        ? repositoriesResponse.length
        : base.foldersCount

    const liveFilesCount =
      repositoriesResponse && repositoriesResponse.length > 0
        ? repositoriesResponse.reduce((acc: number, repo: any) => {
            const count = Number(
              repo.documents ??
                repo.documentsCount ??
                repo.totalCount ??
                repo.fileCount ??
                0,
            )
            return acc + (Number.isFinite(count) ? count : 0)
          }, 0)
        : base.filesCount

    const liveWorkflowsCount =
      workflowsResponse && workflowsResponse.length > 0
        ? workflowsResponse.length
        : base.workflowsCount

    return {
      ...base,
      filesCount: liveFilesCount,
      foldersCount: liveFoldersCount,
      usersCount: liveUsersCount,
      workflowsCount: liveWorkflowsCount,
    }
  }, [summary, usersResponse, repositoriesResponse, workflowsResponse])

  const isTrial =
    resolvedSummary.planType === 'trial' || !resolvedSummary.planType
  const daysRemaining = resolvedSummary.daysRemaining ?? 12

  const topbarAction = useMemo(() => {
    if (!isTrial || screen !== 'overview') return null
    const actionColor: 'red' | 'primary' =
      daysRemaining <= 7 ? 'red' : 'primary'
    return {
      color: actionColor,
      icon: 'lucide:arrow-up',
      label: t`Upgrade to Production`,
      onClick: () => setScreen('upgrade'),
    }
  }, [isTrial, screen, daysRemaining, t])
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
        <div className='flex flex-col gap-4 px-6 py-4'>
          <AnimateSlideUp>
            <LicenseTrialBanner summary={resolvedSummary} />
          </AnimateSlideUp>

          <AnimateSlideUp delay={0.08}>
            <LicenseStatsRow
              selectedCategory={selectedCategory}
              summary={resolvedSummary}
              onSelectCategory={setSelectedCategory}
            />
          </AnimateSlideUp>

          {isTrial ? (
            <AnimateSlideUp
              className='flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary-9/30 bg-gradient-to-r from-primary-11 via-primary-9 to-primary-10 p-5 shadow-[var(--shadow-md)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]'
              delay={0.16}
            >
              <div>
                <span className='inline-flex items-center rounded-full border border-white/30 bg-white/15 px-2.5 py-1 text-[10px] font-bold tracking-wide text-white uppercase'>
                  {t`Zero-Downtime Transition`}
                </span>
                <div className='mt-2 text-15 font-semibold text-white'>
                  {t`Ready to go live? Upgrade to Production.`}
                </div>
                <div className='mt-1 max-w-[48ch] text-[12.5px] leading-relaxed text-white/90'>
                  {t`Choose how your trial workflows, folders, users, and requests carry over — keep everything, keep configurations only, or start clean.`}
                </div>
              </div>
              <div className='flex flex-wrap items-center gap-2.5'>
                <Button
                  className='border-white/40 bg-white/15 text-white hover:bg-white/25'
                  icon='lucide:headset'
                  label={t`Talk to Sales`}
                  size='md'
                  variant='outline'
                  onClick={handleTalkToSales}
                />
                <Button
                  className='bg-white font-semibold text-primary-11 hover:bg-white/90'
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
            <LicenseRecentResources
              repositoriesData={repositoriesResponse}
              selectedCategory={selectedCategory}
              summary={resolvedSummary}
              usersData={usersResponse}
              workflowsData={workflowsResponse}
              onSelectCategory={setSelectedCategory}
            />
          </AnimateSlideUp>
        </div>
      </div>
    </div>
  )
}
