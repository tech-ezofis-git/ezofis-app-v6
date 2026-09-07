import { useQuery } from '@tanstack/react-query'
import { createColumnHelper, useReactTable } from '@tanstack/react-table'
import { msg } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Option } from '@/types/option'
import {
  type CreditsUsageBucket,
  type CreditsUsageTransaction,
  getCreditsUsage,
  getCreditsMaster,
} from '@/api/v6/billing'
import IconButton from '@/components/base/button/IconButton'
import TableExport from '@/components/base/data-table/actions/TableExport'
import TableSearch from '@/components/base/data-table/actions/TableSearch'
import DataTable from '@/components/base/data-table/DataTable'
import InputSelect from '@/components/base/inputs/InputSelect'
import Pagination from '@/components/base/pagination/Pagination'
import CustomFilter from '@/components/common/CustomFilter'
import cn from '@/utils/cn'
import Skeleton from '@/components/base/Skeleton'
import {
  matchesCategoryFilterValue,
  matchesDateRangeValue,
} from '@/utils/filterUtils'
import {
  settingsHeaderMeta,
  settingsTableCoreOptions,
  useSettingsTablePagination,
  useSettingsTableSearch,
} from '../../helpers/settingsDataTable'
import SettingsPageHeader from '../SettingsPageHeader'
import useSettingsTableToolbar from '../useSettingsTableToolbar'

type UsagePeriod = 'today' | 'yesterday' | 'monthly' | 'quarterly' | 'yearly'

const PERIOD_FILTER_DEFS: {
  label: ReturnType<typeof msg>
  value: UsagePeriod
}[] = [
  { label: msg`Today`, value: 'today' },
  { label: msg`Yesterday`, value: 'yesterday' },
  { label: msg`Monthly`, value: 'monthly' },
  { label: msg`Quarterly`, value: 'quarterly' },
  { label: msg`Yearly`, value: 'yearly' },
]

const MONTH_OPTION_DEFS: { id: string; name: ReturnType<typeof msg>; value: string }[] =
  [
    { id: '1', name: msg`January`, value: '1' },
    { id: '2', name: msg`February`, value: '2' },
    { id: '3', name: msg`March`, value: '3' },
    { id: '4', name: msg`April`, value: '4' },
    { id: '5', name: msg`May`, value: '5' },
    { id: '6', name: msg`June`, value: '6' },
    { id: '7', name: msg`July`, value: '7' },
    { id: '8', name: msg`August`, value: '8' },
    { id: '9', name: msg`September`, value: '9' },
    { id: '10', name: msg`October`, value: '10' },
    { id: '11', name: msg`November`, value: '11' },
    { id: '12', name: msg`December`, value: '12' },
  ]

const CHART_COLORS = [
  'var(--primary-9)',
  'var(--indigo-9)',
  'var(--violet-9)',
  'var(--pink-9)',
  'var(--secondary-9)',
  'var(--orange-9)',
]

/** Outline badge tones for activity type (white bg + colored border/text) */
const ACTIVITY_TYPE_BADGE_TONES = [
  'border-primary-9 text-primary-9',
  'border-blue-9 text-blue-9',
  'border-green-9 text-green-9',
  'border-orange-9 text-orange-9',
  'border-violet-9 text-violet-9',
  'border-cyan-9 text-cyan-9',
  'border-pink-9 text-pink-9',
  'border-red-9 text-red-9',
] as const

function getAgentBadgeTone(agent: string) {
  const key = agent.trim().toLowerCase()
  if (!key) return ACTIVITY_TYPE_BADGE_TONES[0]

  // Prefer semantic colors for common agent names
  if (key.includes('ocr') || key.includes('scan'))
    return 'border-cyan-9 text-cyan-9'
  if (key.includes('ap') || key.includes('payable') || key.includes('invoice'))
    return 'border-blue-9 text-blue-9'
  if (key.includes('summary') || key.includes('document'))
    return 'border-violet-9 text-violet-9'
  if (key.includes('valid') || key.includes('match') || key.includes('supplier'))
    return 'border-green-9 text-green-9'
  if (key.includes('duplicate') || key.includes('error') || key.includes('fail'))
    return 'border-red-9 text-red-9'
  if (key.includes('order') || key.includes('back'))
    return 'border-orange-9 text-orange-9'

  let hash = 0
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash + key.charCodeAt(i) * (i + 1)) % ACTIVITY_TYPE_BADGE_TONES.length
  }
  return ACTIVITY_TYPE_BADGE_TONES[hash]
}

const MAX_TABLE_ROWS = 200
const MAX_CHART_ITEMS = 10
const SESSION_KEY = 'ezofis_credits_state'

function getStoredState() {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

export default function Credits({ onBack }: { onBack?: () => void }) {
  const { i18n, t } = useLingui()
  const currentYear = new Date().getFullYear()
  const currentMonthIndex = new Date().getMonth()

  const MONTH_OPTIONS = useMemo<Option[]>(
    () =>
      MONTH_OPTION_DEFS.map((month) => ({
        id: month.id,
        name: i18n._(month.name),
        value: month.value,
      })),
    [i18n.locale],
  )

  const PERIOD_FILTERS = useMemo(
    () =>
      PERIOD_FILTER_DEFS.map((filter) => ({
        label: i18n._(filter.label),
        value: filter.value,
      })),
    [i18n.locale],
  )

  const storedState = useMemo(() => getStoredState(), [])

  const [period, setPeriod] = useState<UsagePeriod>(storedState?.period ?? 'monthly')
  const [month, setMonth] = useState<Option>(storedState?.month ?? (() => ({
    id: MONTH_OPTION_DEFS[currentMonthIndex]?.id ?? '1',
    name: MONTH_OPTION_DEFS[currentMonthIndex]?.id ?? '1',
    value: MONTH_OPTION_DEFS[currentMonthIndex]?.value ?? '1',
  })))
  const [year, setYear] = useState<Option>(storedState?.year ?? {
    id: String(currentYear),
    name: String(currentYear),
    value: String(currentYear),
  })

  // Keep month label in sync with locale
  useEffect(() => {
    const matched = MONTH_OPTIONS.find((option) => option.value === month.value)
    if (matched && matched.name !== month.name) {
      setMonth(matched)
    }
  }, [MONTH_OPTIONS, month.name, month.value])

  const yearOptions = useMemo<Option[]>(
    () =>
      Array.from({ length: 6 }, (_, index) => {
        const value = String(currentYear - index)
        return { id: value, name: value, value }
      }),
    [currentYear],
  )

  const {
    data: creditMaster,
    isLoading: isMasterLoading,
  } = useQuery({
    queryKey: ['settings', 'credits-master', month.value, year.value],
    queryFn: async () => {
      const response = await getCreditsMaster({
        allocationMonth: Number(month.value),
        allocationYear: Number(year.value),
      })

      if (response.error) {
        throw new Error(response.error)
      }

      return response.data
    },
  })

  const {
    data: usage,
    isFetching,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['settings', 'credits-usage', period, month.value, year.value],
    queryFn: async () => {
      const response = await getCreditsUsage({
        month: period === 'monthly' ? Number(month.value) : undefined,
        period,
        year:
          period === 'monthly' || period === 'yearly'
            ? Number(year.value)
            : undefined,
      })

      if (response.error) {
        throw new Error(response.error)
      }

      return response.data
    },
  })

  const transactions = useMemo(
    () => (usage?.transactions ?? []).slice(0, MAX_TABLE_ROWS),
    [usage?.transactions],
  )
  const [transactionFilters, setTransactionFilters] = useState<
    Record<string, string>
  >(storedState?.transactionFilters ?? {})

  useEffect(() => {
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ transactionFilters, period, month, year })
      )
    } catch {
      // ignore
    }
  }, [transactionFilters, period, month, year])

  const agentFilterOptions = useMemo(() => {
    const values = new Set<string>()
    transactions.forEach((row) => {
      if (row.agent) values.add(row.agent)
    })
    return Array.from(values)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ label: value, value }))
  }, [transactions])

  const referenceFilterOptions = useMemo(() => {
    const values = new Set<string>()
    transactions.forEach((row) => {
      if (row.fileName) values.add(row.fileName)
    })
    return Array.from(values)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ label: value, value }))
  }, [transactions])

  const subActivityFilterOptions = useMemo(() => {
    const values = new Set<string>()
    transactions.forEach((row) => {
      if (row.subActivityType) values.add(row.subActivityType)
    })
    return Array.from(values)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ label: value, value }))
  }, [transactions])

  const filteredTransactions = useMemo(() => {
    return transactions.filter((row) => {
      const agentFilter = transactionFilters.agent
      if (
        agentFilter &&
        !matchesCategoryFilterValue(row.agent, agentFilter)
      ) {
        return false
      }

      const referenceFilter = transactionFilters.fileName
      if (
        referenceFilter &&
        !matchesCategoryFilterValue(row.fileName, referenceFilter)
      ) {
        return false
      }

      const subActivityFilter = transactionFilters.subActivityType
      if (
        subActivityFilter &&
        !matchesCategoryFilterValue(row.subActivityType, subActivityFilter)
      ) {
        return false
      }

      const dateFilter = transactionFilters.createdAt
      if (
        dateFilter &&
        !matchesDateRangeValue(row.createdAt, dateFilter)
      ) {
        return false
      }

      return true
    })
  }, [transactions, transactionFilters])

  const periodSubtitle = formatPeriodSubtitle(
    period,
    month,
    year,
    usage?.periodLabel,
  )

  const consumptionByAgent = useMemo(
    () =>
      mapBucketsToChartData(usage?.overallCreditSplit ?? []).slice(
        0,
        MAX_CHART_ITEMS,
      ),
    [usage?.overallCreditSplit],
  )

  const consumptionByActivity = useMemo(
    () =>
      mapBucketsToChartData(usage?.distributionReport ?? []).slice(
        0,
        MAX_CHART_ITEMS,
      ),
    [usage?.distributionReport],
  )

  const highestConsumption = useMemo(
    () =>
      mapBucketsToChartData(usage?.highestConsumption ?? []).slice(
        0,
        MAX_CHART_ITEMS,
      ),
    [usage?.highestConsumption],
  )

  const agentCreditsSum = useMemo(
    () =>
      consumptionByAgent.length > 0
        ? consumptionByAgent.reduce((sum, item) => sum + item.credits, 0)
        : 0,
    [consumptionByAgent],
  )

  const activityCreditsSum = useMemo(
    () =>
      consumptionByActivity.length > 0
        ? consumptionByActivity.reduce((sum, item) => sum + item.credits, 0)
        : 0,
    [consumptionByActivity],
  )

  const timelineData = useMemo(
    () =>
      (usage?.timeline ?? []).slice(0, 24).map((item) => ({
        credits: item.creditsUsed,
        label: item.label,
      })),
    [usage?.timeline],
  )

  const topActivity = useMemo(
    () => findTopBucket(usage?.distributionReport ?? []),
    [usage?.distributionReport],
  )

  const peakTimeline = useMemo(() => {
    const points = usage?.timeline ?? []
    if (points.length === 0) return null

    return points.reduce((peak, item) =>
      item.creditsUsed > peak.creditsUsed ? item : peak,
    )
  }, [usage?.timeline])

  const avgCreditsPerTransaction =
    usage && usage.transactionCount > 0
      ? usage.totalCreditsConsumed / usage.transactionCount
      : 0

  const creditsUsed = creditMaster
    ? creditMaster.overallConsumedCredit
    : (usage?.totalCreditsConsumed ?? 0)

  const purchasedCredits = useMemo(() => {
    if (creditMaster) return creditMaster.initialCredit
    // Ensure purchased is always larger than consumed (at least 100, and scales up in blocks of 100)
    return Math.max(100, Math.ceil((creditsUsed * 1.3) / 100) * 100)
  }, [creditsUsed, creditMaster])

  const remainingCredits = creditMaster
    ? creditMaster.balanceCredit
    : Math.max(0, purchasedCredits - creditsUsed)

  const usagePercentage = purchasedCredits > 0
    ? Math.round((creditsUsed / purchasedCredits) * 100)
    : 0

  const isRemainingLow = remainingCredits <= purchasedCredits * 0.2

  const dailyBurnRate = useMemo(() => {
    const days = period === 'today' ? 1 : period === 'yesterday' ? 1 : period === 'monthly' ? 30 : period === 'quarterly' ? 90 : 365
    const rate = creditsUsed / Math.max(1, days)
    return rate > 0 ? Number(rate.toFixed(1)) : 3.2
  }, [creditsUsed, period])

  const projectedMonthEndUsage = useMemo(() => {
    const daysInMonth = 30
    const currentDay = new Date().getDate()
    const remainingDays = Math.max(1, daysInMonth - currentDay)
    return Math.round(creditsUsed + remainingDays * dailyBurnRate)
  }, [creditsUsed, dailyBurnRate])

  const columnHelper = useMemo(
    () => createColumnHelper<CreditsUsageTransaction>(),
    [],
  )
  const tableSearchOptions = useSettingsTableSearch(SESSION_KEY)

  const columns = useMemo(
    () => [
      columnHelper.accessor('subActivityType', {
        enableSorting: false,
        header: t`Activity`,
        meta: { ...settingsHeaderMeta.start, label: t`Activity` },
        minSize: 220,
        size: 280,
        cell: ({ getValue }) => getValue() || '—',
      }),
      columnHelper.accessor('fileName', {
        enableSorting: false,
        header: t`Document Reference`,
        meta: { ...settingsHeaderMeta.start, label: t`Document Reference` },
        minSize: 100,
        size: 130,
        maxSize: 160,
        cell: ({ row }) => {
          const tableName = row.original.fileName
          return tableName?.trim() ? tableName : '—'
        },
      }),
      columnHelper.accessor('agent', {
        enableSorting: false,
        header: t`Agent`,
        meta: { ...settingsHeaderMeta.start, label: t`Agent` },
        minSize: 110,
        size: 140,
        maxSize: 180,
        cell: ({ getValue }) => {
          const value = getValue()
          if (!value) return '—'
          return (
            <span
              className={cn(
                'inline-flex max-w-full items-center truncate rounded border bg-white px-1.5 py-0.5 text-11 font-medium',
                getAgentBadgeTone(value),
              )}
            >
              {value}
            </span>
          )
        },
      }),
      columnHelper.accessor('credit', {
        enableSorting: false,
        header: t`Credits Used`,
        meta: { ...settingsHeaderMeta.end, label: t`Credits Used` },
        minSize: 80,
        size: 90,
        maxSize: 110,
        cell: ({ getValue }) => formatNumber(Number(getValue() ?? 0)),
      }),
      columnHelper.accessor('remarks', {
        enableSorting: false,
        header: t`Description`,
        meta: { ...settingsHeaderMeta.start, label: t`Description` },
        minSize: 240,
        size: 320,
        cell: ({ getValue }) => getValue() || '—',
      }),
      columnHelper.accessor('createdAt', {
        enableSorting: false,
        header: t`Activity Date`,
        meta: { ...settingsHeaderMeta.start, label: t`Activity Date` },
        minSize: 120,
        size: 150,
        maxSize: 170,
        cell: ({ getValue }) => {
          const value = getValue()
          if (!value) return '—'

          const date = new Date(value)
          return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
        },
      }),
    ],
    [columnHelper, t],
  )

  const {
    page,
    pageSize,
    pagination,
    paginationModel,
    onPageChange,
    onPageSizeChange,
    onPaginationChange,
  } = useSettingsTablePagination()

  const transactionTable = useReactTable({
    ...settingsTableCoreOptions,
    ...tableSearchOptions,
    ...paginationModel,
    columns,
    data: filteredTransactions,
    state: {
      ...tableSearchOptions.state,
      pagination,
    },
    onPaginationChange,
  })

  const { rowSize, onRowSizeChange } = useSettingsTableToolbar({
    isReLoading: isFetching,
    table: transactionTable,
    onReload: () => void refetch(),
  })

  const hasTransactionFilters =
    Object.values(transactionFilters).some(Boolean) ||
    !!tableSearchOptions.state.globalFilter?.value

  const totalActivityCredits = consumptionByActivity.reduce(
    (sum, item) => sum + item.credits,
    0,
  )

  return (
    <div className='flex h-full min-h-0 flex-col overflow-hidden bg-[var(--surface)]'>
      <SettingsPageHeader title={t`Credit Usage`} onBack={onBack} />

      <div className='flex min-h-0 flex-1 flex-col overflow-hidden p-4'>
        <CustomFilter
          activeQuickFilters={[period]}
          customSearchComponent={<div />}
          actionButtons={[
            {
              color: 'gray',
              icon: 'lucide:rotate-cw',
              id: 'refresh',
              isIconButton: true,
              tooltip: t`Refresh credit usage`,
              variant: 'outline',
              onClick: () => void refetch(),
            },
          ]}
          activeFilters={{
            month: String(month.value || ''),
            year: String(year.value || ''),
          }}
          filters={[
            ...(period === 'monthly'
              ? [
                  {
                    id: 'month',
                    label: t`Month`,
                    options: MONTH_OPTIONS.map((o) => ({
                      label: o.name,
                      value: String(o.value || ''),
                    })),
                  },
                ]
              : []),
            ...(period === 'monthly' || period === 'yearly'
              ? [
                  {
                    id: 'year',
                    label: t`Year`,
                    options: yearOptions.map((o) => ({
                      label: o.name,
                      value: String(o.value || ''),
                    })),
                  },
                ]
              : []),
          ]}
          quickFilters={PERIOD_FILTERS.map((f) => ({
            id: f.value,
            label: f.label,
          }))}
          showReset={
            period !== 'monthly' ||
            month.value !==
              (MONTH_OPTIONS[currentMonthIndex] ?? MONTH_OPTIONS[0]).value ||
            year.value !== String(currentYear)
          }
          onFilterChange={(id, value) => {
            if (id === 'month') {
              const selected = MONTH_OPTIONS.find((o) => o.value === value)
              if (selected) setMonth(selected)
            }
            if (id === 'year') {
              const selected = yearOptions.find((o) => o.value === value)
              if (selected) setYear(selected)
            }
          }}
          onQuickFilterToggle={(id) => setPeriod(id as UsagePeriod)}
          onReset={() => {
            setPeriod('monthly')
            setMonth(MONTH_OPTIONS[currentMonthIndex] ?? MONTH_OPTIONS[0])
            setYear({
              id: String(currentYear),
              name: String(currentYear),
              value: String(currentYear),
            })
          }}
        />

        <div className='mt-4 flex-1 overflow-y-auto'>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-5'>
            {/* Card 1: Credits consumed Consolidated Card */}
            <div className='cursor-pointer rounded-xl border border-t-[3px] border-[var(--border-default)] border-t-primary-9 bg-surface p-3.5 shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 flex flex-col justify-between min-h-[120px]'>
              <div>
                <div className='text-8px font-poppins font-semibold text-gray-11 uppercase'>
                  {t`Credits consumed`}
                </div>
                <div className='mt-1 font-poppins flex items-baseline gap-1.5'>
                  {isLoading || isMasterLoading ? (
                    <Skeleton className='h-6 w-28 rounded' />
                  ) : (
                    <>
                      <span className='font-poppins text-18 font-semibold text-text-primary'>
                        {formatNumber(creditsUsed)}
                      </span>
                      <span className='text-12 text-text-muted font-normal'>
                        {t`of ${formatNumber(purchasedCredits)}`}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Progress and bottom details */}
              <div className='mt-2 flex flex-col gap-1.5'>
                {/* Thin Horizontal Progress Bar */}
                {isLoading || isMasterLoading ? (
                  <Skeleton className='h-1.5 w-full rounded-full' />
                ) : (
                  <div className='h-1.5 w-full rounded-full bg-gray-2 overflow-hidden'>
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        isRemainingLow ? 'bg-red-9' : 'bg-primary-9'
                      )}
                      style={{ width: `${Math.min(100, usagePercentage)}%` }}
                    />
                  </div>
                )}

                <div className='flex items-center justify-between text-11 text-text-secondary font-medium font-inter'>
                  {isLoading || isMasterLoading ? (
                    <>
                      <Skeleton className='h-3 w-16 rounded' />
                      <Skeleton className='h-3 w-10 rounded' />
                    </>
                  ) : (
                    <>
                      <span className={cn(isRemainingLow && 'text-red-9 font-bold')}>
                        {t`${formatNumber(remainingCredits)} remaining`}
                      </span>
                      <span>
                        {t`${usagePercentage}% used`}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Card 2: Top activity by credits */}
            <div className='cursor-pointer rounded-xl border border-t-[3px] border-[var(--border-default)] border-t-primary-9 bg-surface p-3.5 shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 flex flex-col justify-between min-h-[120px]'>
              <div>
                <div className='text-8px font-poppins font-semibold text-gray-11 uppercase'>
                  {t`Top activity by credits`}
                </div>
                <div className='mt-1 font-poppins flex items-baseline gap-1.5'>
                  {isLoading ? (
                    <Skeleton className='h-6 w-20 rounded' />
                  ) : (
                    <>
                      <span className='font-poppins text-18 font-semibold text-text-primary'>
                        {formatNumber(topActivity?.creditsUsed ?? 0)}
                      </span>
                      <span className='text-12 text-text-muted font-normal'>
                        {t`credits`}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className='mt-2 text-11 text-text-muted font-inter font-normal whitespace-nowrap overflow-hidden text-ellipsis' title={topActivity?.type}>
                {isLoading ? (
                  <Skeleton className='h-3 w-32 rounded' />
                ) : (
                  (topActivity?.type ?? t`No activity recorded`)
                )}
              </div>
            </div>

            {/* Card 3: Peak usage period */}
            <div className='cursor-pointer rounded-xl border border-t-[3px] border-[var(--border-default)] border-t-cyan-9 bg-surface p-3.5 shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 flex flex-col justify-between min-h-[120px]'>
              <div>
                <div className='text-8px font-poppins font-semibold text-gray-11 uppercase'>
                  {t`Peak usage period`}
                </div>
                <div className='mt-1 font-poppins text-18 font-semibold text-text-primary'>
                  {isLoading ? (
                    <Skeleton className='h-6 w-24 rounded' />
                  ) : (
                    (peakTimeline?.label ?? t`None`)
                  )}
                </div>
              </div>
              <div className='mt-2 text-11 text-text-muted font-inter font-normal'>
                {isLoading ? (
                  <Skeleton className='h-3 w-36 rounded' />
                ) : (
                  t`${formatNumber(peakTimeline?.creditsUsed ?? 0)} credits, highest this period`
                )}
              </div>
            </div>

            {/* Card 4: Active AI agents */}
            <div className='cursor-pointer rounded-xl border border-t-[3px] border-[var(--border-default)] border-t-primary-9 bg-surface p-3.5 shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 flex flex-col justify-between min-h-[120px]'>
              <div>
                <div className='text-8px font-poppins font-semibold text-gray-11 uppercase'>
                  {t`Active AI agents`}
                </div>
                <div className='mt-1 font-poppins text-18 font-semibold text-text-primary'>
                  {isLoading ? (
                    <Skeleton className='h-6 w-20 rounded' />
                  ) : (
                    <>
                      {consumptionByAgent.length}
                      <span className='ml-1 text-12 text-text-muted font-normal'>
                        {t`agents`}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className='mt-2 text-11 text-text-muted font-inter font-normal whitespace-nowrap overflow-hidden text-ellipsis' title={consumptionByAgent.map(c => c.name).join(', ')}>
                {isLoading ? (
                  <Skeleton className='h-3 w-32 rounded' />
                ) : (
                  (consumptionByAgent.map(c => c.name).join(', ') || t`No active agents`)
                )}
              </div>
            </div>

            {/* Card 5: Forecast EOM usage */}
            <div className='cursor-pointer rounded-xl border border-t-[3px] border-[var(--border-default)] border-t-success bg-surface p-3.5 shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 flex flex-col justify-between min-h-[120px]'>
              <div>
                <div className='text-8px font-poppins font-semibold text-gray-11 uppercase'>
                  {t`Forecast EOM usage`}
                </div>
                <div className='mt-1 font-poppins text-18 font-semibold text-text-primary'>
                  {isLoading ? (
                    <Skeleton className='h-6 w-24 rounded' />
                  ) : (
                    <>
                      {formatNumber(projectedMonthEndUsage)}
                      <span className='ml-1 text-12 text-text-muted font-normal'>
                        {t`credits`}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className='mt-2 flex flex-col gap-1'>
                {isLoading ? (
                  <>
                    <Skeleton className='h-1.5 w-full rounded-full' />
                    <Skeleton className='h-3 w-28 rounded mt-1' />
                  </>
                ) : (
                  <>
                    <div className='h-1.5 w-full rounded-full bg-gray-2 overflow-hidden'>
                      <div
                        className='h-full rounded-full bg-primary-9 transition-all duration-500'
                        style={{ width: `${Math.min(100, usagePercentage)}%` }}
                      />
                    </div>
                    <div className='text-11 text-text-muted font-inter font-normal mt-0.5'>
                      {t`${usagePercentage}% of ${formatNumber(purchasedCredits)} budget`}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Dummy Charts Row */}
          <div className='mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'>
            <DummyChartCard title={t`Daily credit usage`} subtitle={t`Last 14 days`}>
              <DailyCreditUsageChart />
            </DummyChartCard>

            <DummyChartCard title={t`Weekly credit consumption`} subtitle={t`By agent, stacked`}>
              <WeeklyCreditConsumptionChart />
            </DummyChartCard>

            <DummyChartCard title={t`Monthly credit trend`} subtitle={t`Feb – Jul 2026`}>
              <MonthlyCreditTrendChart />
            </DummyChartCard>

            <DummyChartCard title={t`Credit forecast`} subtitle={t`Actual vs projected`}>
              <CreditForecastChart />
            </DummyChartCard>
          </div>

          <div className='mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-4'>
            <ChartCard
              subtitle={t`Top agents by credit usage · ${periodSubtitle}`}
              title={t`Highest Credit Consumption`}
            >
              <HighestConsumptionPieChart
                data={highestConsumption.map((item) => ({
                  credits: item.credits,
                  name: item.name,
                }))}
              />
            </ChartCard>

            <ChartCard
              subtitle={t`Credit usage trend across the selected period`}
              title={t`Usage Timeline`}
            >
              <UsageTimelineChart data={timelineData} />
            </ChartCard>

            <DummyChartCard
              badge={t`${formatNumber(activityCreditsSum)} credits`}
              title={t`Credit distribution by activity`}
            >
              <CreditDistributionByActivityChart data={consumptionByActivity} />
            </DummyChartCard>

            <DummyChartCard
              badge={t`${formatNumber(agentCreditsSum)} credits`}
              title={t`Credits by AI agent`}
            >
              <CreditsByAiAgentChart data={consumptionByAgent} />
            </DummyChartCard>
          </div>

          <div className='mt-5 flex min-h-[320px] flex-col rounded-xl border border-[var(--border-default)] bg-surface p-4 shadow-[var(--shadow-sm)]'>
            <h4 className='mb-3 pl-0.5 font-poppins text-14 font-semibold text-text-primary'>
              {t`Transaction Activity`}
            </h4>
            <CustomFilter
              activeFilters={transactionFilters}
              customSearchComponent={
                <TableSearch table={transactionTable as any} />
              }
              trailingActions={
                <TableExport table={transactionTable as any} />
              }
              actionButtons={[
                {
                  color: 'gray',
                  disabled: isLoading || isFetching,
                  icon: 'tabler:refresh',
                  id: 'refresh-transactions',
                  isIconButton: true,
                  tooltip: t`Refresh`,
                  variant: 'outline',
                  onClick: () => void refetch(),
                },
              ]}
              filters={[
                {
                  id: 'agent',
                  label: t`Agent`,
                  options: agentFilterOptions,
                },
                {
                  dataType: 'date',
                  id: 'createdAt',
                  label: t`Activity Date`,
                  options: [],
                },
              ]}
              moreFilters={[
                {
                  id: 'fileName',
                  label: t`Document Reference`,
                  options: referenceFilterOptions,
                },
                {
                  id: 'subActivityType',
                  label: t`Activity`,
                  options: subActivityFilterOptions,
                },
              ]}
              showReset={hasTransactionFilters}
              onFilterChange={(id, value) => {
                setTransactionFilters((prev) => ({ ...prev, [id]: value }))
                onPageChange(1)
              }}
              onReset={() => {
                setTransactionFilters({})
                tableSearchOptions.onGlobalFilterChange({ id: '', value: '' })
                onPageChange(1)
              }}
            />
            <div className='mt-2 min-h-0 flex-1 overflow-hidden'>
              <DataTable
                isLoading={isLoading}
                isReLoading={isFetching}
                pageSize={pageSize}
                rowSize={rowSize}
                table={transactionTable}
                hideActionBar
                hideGrouping
                stickyHeader
                onReload={() => void refetch()}
                onRowSizeChange={onRowSizeChange}
              />
            </div>
            <Pagination
              className='mt-4 shrink-0'
              itemLabel={t`Transactions`}
              page={page}
              pageSize={pageSize}
              showPageNumbers={false}
              totalItems={transactionTable.getFilteredRowModel().rows.length}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function ChartCard({
  badge,
  badgeTone = 'primary',
  children,
  subtitle,
  title,
}: {
  badge?: string
  badgeTone?: 'blue' | 'green' | 'primary'
  children: React.ReactNode
  subtitle?: string
  title: string
}) {
  const badgeToneClass =
    badgeTone === 'green'
      ? 'border-green-9 text-green-9'
      : badgeTone === 'blue'
        ? 'border-blue-9 text-blue-9'
        : 'border-primary-9 text-primary-9'

  return (
    <div className='flex flex-col rounded-xl border border-[var(--border-default)] bg-surface p-5 shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]'>
      <div className='flex items-start justify-between gap-2'>
        <div className='min-w-0'>
          <div className='pl-0.5 font-poppins text-14 font-semibold text-text-primary capitalize'>
            {title}
          </div>
          {subtitle ? (
            <div className='mt-1 pl-0.5 text-12 font-medium text-text-secondary'>
              {subtitle}
            </div>
          ) : null}
        </div>
        {badge ? (
          <span
            className={cn(
              'inline-flex shrink-0 items-center rounded border bg-white px-1.5 py-0.5 text-11 font-medium whitespace-nowrap',
              badgeToneClass,
            )}
          >
            {badge}
          </span>
        ) : null}
      </div>
      <div className='mt-6 flex flex-1 flex-col'>{children}</div>
    </div>
  )
}

function DistributionDonutChart({
  data,
}: {
  centerLabel?: string
  centerValue?: string
  data: { color: string; credits: number; name: string }[]
}) {
  const { t } = useLingui()
  const total = data.reduce((sum, item) => sum + item.credits, 0)

  if (data.length === 0) {
    return (
      <div className='flex h-[180px] items-center justify-center text-13 text-gray-10'>
        {t`No distribution data for this period.`}
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-2.5 pt-1'>
      {data.map((entry, index) => {
        const percentage =
          total > 0 ? Math.round((entry.credits / total) * 100) : 0

        return (
          <div
            className='group flex cursor-pointer flex-col gap-1.5 rounded-lg p-1.5 transition-all hover:bg-gray-1 active:scale-95'
            key={index}
            title={t`${formatNumber(entry.credits)} credits (${percentage}%)`}
          >
            <div className='flex items-center justify-between text-[11px] font-medium lowercase'>
              <div className='flex min-w-0 items-center gap-2'>
                <div
                  className='size-2.5 shrink-0 rounded-md transition-transform group-hover:scale-110'
                  style={{ backgroundColor: entry.color }}
                />
                <span className='truncate font-semibold text-gray-10 transition-colors group-hover:text-gray-13'>
                  {entry.name}
                </span>
              </div>
              <div className='ml-2 flex shrink-0 items-center gap-1.5'>
                <span className='font-bold text-gray-13'>
                  {formatNumber(entry.credits)}
                </span>
                <span className='text-[9px] font-normal text-gray-10'>
                  ({percentage}%)
                </span>
              </div>
            </div>
            <div className='h-1.5 w-full overflow-hidden rounded-full bg-gray-2'>
              <div
                className='h-full rounded-full transition-all duration-500'
                style={{
                  backgroundColor: entry.color,
                  width: `${percentage}%`,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function FilterPill({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type='button'
      className={cn(
        'rounded-full border px-3 py-1 text-12 font-medium transition-all active:scale-95',
        active
          ? 'border-primary-9 bg-primary-9 text-white shadow-sm'
          : 'border-gray-3 bg-white text-gray-11 shadow-sm hover:bg-gray-1',
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function findTopBucket(buckets: CreditsUsageBucket[]) {
  if (buckets.length === 0) return null

  return buckets.reduce((top, item) =>
    item.creditsUsed > top.creditsUsed ? item : top,
  )
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(
    value,
  )
}

function formatPeriodSubtitle(
  period: UsagePeriod,
  month: Option,
  year: Option,
  periodLabel?: string,
) {
  if (periodLabel) {
    return periodLabel.toLowerCase()
  }

  if (period === 'monthly') {
    return `${month.name.toLowerCase()} ${year.name}`
  }

  if (period === 'yearly') {
    return `calendar year ${year.name}`
  }

  return period.replaceAll('_', ' ')
}

const PIE_COLORS = [
  'var(--blue-9)',   // Blue (33%)
  'var(--cyan-9)',   // Cyan/Teal (25%)
  'var(--yellow-9)', // Yellow/Gold (25%)
  'var(--orange-9)', // Coral/Orange (17%)
]

const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180))
  const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180))

  return (
    <text
      x={x}
      y={y}
      fill='white'
      textAnchor='middle'
      dominantBaseline='central'
      fontSize={12}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

function HighestConsumptionPieChart({
  data,
}: {
  data: { credits: number; name: string }[]
}) {
  const { t } = useLingui()
  const chartData =
    data.length > 0
      ? data.map((item, index) => ({
          ...item,
          color: PIE_COLORS[index % PIE_COLORS.length],
        }))
      : []

  const total = chartData.reduce((sum, item) => sum + item.credits, 0)

  if (chartData.length === 0) {
    return (
      <div className='flex h-[200px] items-center justify-center text-13 text-gray-10'>
        {t`No consumption data for this period.`}
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-2'>
      <div className='h-[160px] w-full'>
        <ResponsiveContainer width='100%' height='100%'>
          <PieChart>
            <Pie
              data={chartData}
              dataKey='credits'
              nameKey='name'
              cx='50%'
              cy='50%'
              outerRadius={75}
              labelLine={false}
              label={renderCustomizedLabel}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                border: 'none',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                fontSize: '11px',
              }}
              formatter={(val: any) => [t`${formatNumber(val)} credits`, t`Usage`]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Descriptions below */}
      <div className='mt-2 grid grid-cols-2 gap-x-4 gap-y-2 pl-1'>
        {chartData.map((item, index) => {
          const pct = total > 0 ? ((item.credits / total) * 100).toFixed(0) : '0'
          return (
            <div key={index} className='flex items-center justify-between text-[11px] font-medium'>
              <div className='flex items-center gap-2 min-w-0'>
                <span
                  className='size-2 rounded-full shrink-0'
                  style={{ backgroundColor: item.color }}
                />
                <span
                  className='truncate text-gray-10 font-semibold'
                  title={item.name}
                >
                  {item.name}
                </span>
              </div>
              <span className='font-bold text-gray-13 ml-2 shrink-0'>
                {formatNumber(item.credits)} ({pct}%)
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function mapBucketsToChartData(buckets: CreditsUsageBucket[]) {
  return buckets.map((item, index) => ({
    color: CHART_COLORS[index % CHART_COLORS.length],
    credits: item.creditsUsed,
    name: item.type,
  }))
}

function MetricSummaryCard({
  isLoading,
  title,
  trend,
  trendTone = 'neutral',
  value,
}: {
  isLoading: boolean
  title: string
  trend?: string
  trendTone?: 'down' | 'neutral' | 'up'
  value: string
}) {
  const { t } = useLingui()
  const trendStyles = {
    down: 'bg-red-2 text-red-11 border border-red-3',
    neutral: 'bg-gray-2 text-text-muted border border-gray-3',
    up: 'bg-success-light text-success border border-success/20',
  }

  return (
    <div className='cursor-pointer rounded-lg border border-t-[3px] border-[var(--border-default)] border-t-primary-9 bg-surface p-4 shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5'>
      <div className='text-8px font-poppins font-semibold text-gray-11 uppercase'>
        {title}
      </div>
      <div className='mt-1.5 font-poppins text-18 font-semibold text-text-primary'>
        {isLoading ? '—' : value}
      </div>
      {trend ? (
        <div className='mt-2 flex items-center gap-1.5 text-11 font-semibold'>
          <span
            className={cn(
              'rounded px-1.5 py-0.5 text-11 font-semibold',
              trendStyles[trendTone],
            )}
          >
            {trend}
          </span>
          <span className='font-inter text-11 font-normal text-text-muted'>
            {t`vs last period`}
          </span>
        </div>
      ) : null}
    </div>
  )
}

function UsageTimelineChart({
  data,
}: {
  data: { credits: number; label: string }[]
}) {
  const { t } = useLingui()
  const chartData =
    data.length > 0
      ? data
      : [
          { label: 'Week 1', credits: 0 },
          { label: 'Week 2', credits: 0 },
          { label: 'Week 3', credits: 0 },
          { label: 'Week 4', credits: 84 },
          { label: 'Week 5', credits: 15 },
        ]

  if (chartData.length === 0) {
    return (
      <div className='flex h-[180px] items-center justify-center text-13 text-gray-10'>
        {t`No timeline data for this period.`}
      </div>
    )
  }

  return (
    <ResponsiveContainer height={180} width='100%'>
      <BarChart
        data={chartData}
        margin={{ bottom: 0, left: -20, right: 10, top: 10 }}
      >
        <defs>
          <linearGradient
            id='creditTimelineGradient'
            x1='0'
            x2='0'
            y1='0'
            y2='1'
          >
            <stop offset='0%' stopColor='var(--purple-9)' stopOpacity={0.9} />
            <stop
              offset='100%'
              stopColor='var(--purple-4)'
              stopOpacity={0.4}
            />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke='var(--gray-3)' strokeDasharray='3 3' />
        <XAxis
          axisLine={false}
          dataKey='label'
          dy={10}
          tick={{ fill: 'var(--gray-10)', fontSize: 11, fontWeight: 550 }}
          tickLine={false}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: 'var(--gray-10)', fontSize: 11, fontWeight: 550 }}
          dx={-10}
        />
        <Tooltip
          cursor={{ fill: 'var(--gray-2)', opacity: 0.15 }}
          formatter={(val: any) => [
            t`${formatNumber(val)} credits`,
            t`Credits`,
          ]}
          contentStyle={{
            border: 'none',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            fontSize: '11px',
          }}
        />
        <Bar
          barSize={16}
          dataKey='credits'
          fill='url(#creditTimelineGradient)'
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ==========================================
// Dummy Charts & Components
// ==========================================

const dailyData = [
  { day: '1', usage: 8 },
  { day: '2', usage: 11 },
  { day: '3', usage: 9 },
  { day: '4', usage: 14 },
  { day: '5', usage: 12 },
  { day: '6', usage: 7 },
  { day: '7', usage: 5 },
  { day: '8', usage: 14 },
  { day: '9', usage: 18 },
  { day: '10', usage: 14 },
  { day: '11', usage: 10 },
  { day: '12', usage: 14 },
  { day: '13', usage: 19 },
  { day: '14', usage: 14 },
]

function DailyCreditUsageChart() {
  const { t } = useLingui()
  return (
    <ResponsiveContainer height={200} width='100%'>
      <LineChart
        data={dailyData}
        margin={{ bottom: 0, left: -25, right: 10, top: 10 }}
      >
        <CartesianGrid vertical={false} stroke='var(--gray-3)' strokeDasharray='3 3' />
        <XAxis
          dataKey='day'
          axisLine={false}
          tickLine={false}
          tick={{ fill: 'var(--gray-10)', fontSize: 11, fontWeight: 500 }}
          dy={10}
        />
        <YAxis
          domain={[4, 20]}
          ticks={[4, 6, 8, 10, 12, 14, 16, 18, 20]}
          axisLine={false}
          tickLine={false}
          tick={{ fill: 'var(--gray-10)', fontSize: 11, fontWeight: 500 }}
          dx={-10}
        />
        <Tooltip
          contentStyle={{
            border: 'none',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            fontSize: '11px',
          }}
          formatter={(val: any) => [t`${val} credits`, t`Usage`]}
        />
        <Line
          type='monotone'
          dataKey='usage'
          stroke='var(--purple-9)'
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

const weeklyData = [
  { week: 'Week 1', 'AP agent': 22, 'OCR agent': 8, 'Doc agent': 6 },
  { week: 'Week 2', 'AP agent': 18, 'OCR agent': 6, 'Doc agent': 5 },
  { week: 'Week 3', 'AP agent': 24, 'OCR agent': 9, 'Doc agent': 7 },
  { week: 'Week 4', 'AP agent': 51, 'OCR agent': 17, 'Doc agent': 16 },
]

function WeeklyCreditConsumptionChart() {
  const { t } = useLingui()
  return (
    <div className='flex flex-col gap-2'>
      <ResponsiveContainer height={180} width='100%'>
        <BarChart
          data={weeklyData}
          margin={{ bottom: 0, left: -25, right: 10, top: 10 }}
        >
          <CartesianGrid vertical={false} stroke='var(--gray-3)' strokeDasharray='3 3' />
          <XAxis
            dataKey='week'
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--gray-10)', fontSize: 11, fontWeight: 500 }}
            dy={10}
          />
          <YAxis
            domain={[0, 90]}
            ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--gray-10)', fontSize: 11, fontWeight: 500 }}
            dx={-10}
          />
          <Tooltip
            contentStyle={{
              border: 'none',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              fontSize: '11px',
            }}
          />
          <Bar dataKey='AP agent' stackId='a' fill='var(--purple-9)' radius={[0, 0, 0, 0]} />
          <Bar dataKey='OCR agent' stackId='a' fill='var(--cyan-9)' radius={[0, 0, 0, 0]} />
          <Bar dataKey='Doc agent' stackId='a' fill='var(--pink-9)' radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className='mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 pl-1 text-[11px] font-semibold text-gray-10'>
        <div className='flex items-center gap-1.5'>
          <div className='size-2.5 rounded-sm bg-[var(--purple-9)]' />
          <span>{t`AP agent`}</span>
        </div>
        <div className='flex items-center gap-1.5'>
          <div className='size-2.5 rounded-sm bg-[var(--cyan-9)]' />
          <span>{t`OCR agent`}</span>
        </div>
        <div className='flex items-center gap-1.5'>
          <div className='size-2.5 rounded-sm bg-[var(--pink-9)]' />
          <span>{t`Doc agent`}</span>
        </div>
      </div>
    </div>
  )
}

const monthlyData = [
  { month: 'Feb', trend: 210 },
  { month: 'Mar', trend: 240 },
  { month: 'Apr', trend: 270 },
  { month: 'May', trend: 300 },
  { month: 'Jun', trend: 325 },
  { month: 'Jul', trend: 80 },
]

function MonthlyCreditTrendChart() {
  const { t } = useLingui()
  return (
    <ResponsiveContainer height={200} width='100%'>
      <AreaChart
        data={monthlyData}
        margin={{ bottom: 0, left: -25, right: 10, top: 10 }}
      >
        <defs>
          <linearGradient id='cyanAreaGradient' x1='0' y1='0' x2='0' y2='1'>
            <stop offset='0%' stopColor='var(--cyan-9)' stopOpacity={0.2} />
            <stop offset='100%' stopColor='var(--cyan-9)' stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke='var(--gray-3)' strokeDasharray='3 3' />
        <XAxis
          dataKey='month'
          axisLine={false}
          tickLine={false}
          tick={{ fill: 'var(--gray-10)', fontSize: 11, fontWeight: 500 }}
          dy={10}
        />
        <YAxis
          domain={[50, 350]}
          ticks={[50, 100, 150, 200, 250, 300, 350]}
          axisLine={false}
          tickLine={false}
          tick={{ fill: 'var(--gray-10)', fontSize: 11, fontWeight: 500 }}
          dx={-10}
        />
        <Tooltip
          contentStyle={{
            border: 'none',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            fontSize: '11px',
          }}
          formatter={(val: any) => [t`${val} credits`, t`Trend`]}
        />
        <Area
          type='monotone'
          dataKey='trend'
          stroke='var(--cyan-9)'
          strokeWidth={2}
          fill='url(#cyanAreaGradient)'
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function DummyChartCard({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string
  subtitle?: string
  badge?: string
  children: React.ReactNode
}) {
  return (
    <div className='flex flex-col rounded-xl border border-[var(--border-default)] bg-surface p-5 shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]'>
      <div className='flex items-start justify-between gap-2'>
        <div className='min-w-0'>
          <div className='pl-0.5 font-poppins text-14 font-semibold text-text-primary'>
            {title}
          </div>
          {subtitle ? (
            <div className='mt-1 pl-0.5 text-12 font-medium text-text-secondary'>
              {subtitle}
            </div>
          ) : null}
        </div>
        {badge ? (
          <span className='inline-flex shrink-0 items-center rounded-full border border-[var(--purple-9)] bg-[var(--purple-1)] px-2.5 py-0.5 text-11 font-medium text-[var(--purple-9)] whitespace-nowrap'>
            {badge}
          </span>
        ) : null}
      </div>
      <div className='mt-6 flex flex-1 flex-col justify-end'>{children}</div>
    </div>
  )
}

const DONUT_COLORS = [
  'var(--purple-9)', // Payment terms detection
  'var(--cyan-9)',   // PO validation
  'var(--pink-9)',   // OCR from document
  'var(--orange-9)', // Document classification
  'var(--green-9)',  // Back order detection
]

function CreditDistributionByActivityChart({
  data,
}: {
  data: { name: string; credits: number; color?: string }[]
}) {
  const chartData =
    data.length > 0
      ? data.map((item, index) => ({
          ...item,
          color: item.color || DONUT_COLORS[index % DONUT_COLORS.length],
        }))
      : []

  return (
    <div className='flex flex-row items-center gap-6 h-[180px]'>
      <div className='w-[160px] h-[160px] flex-shrink-0'>
        <ResponsiveContainer width='100%' height='100%'>
          <PieChart>
            <Pie
              data={chartData}
              dataKey='credits'
              nameKey='name'
              cx='50%'
              cy='50%'
              innerRadius={50}
              outerRadius={70}
              paddingAngle={2}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                border: 'none',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                fontSize: '11px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className='flex flex-col gap-2.5 flex-1 min-w-0 pr-2'>
        {chartData.map((item, index) => (
          <div key={index} className='flex items-center justify-between text-[11px] font-medium'>
            <div className='flex items-center gap-2 min-w-0'>
              <span
                className='size-2 rounded-full shrink-0'
                style={{ backgroundColor: item.color }}
              />
              <span
                className='truncate text-gray-10 font-semibold'
                title={item.name}
              >
                {item.name}
              </span>
            </div>
            <span className='font-bold text-gray-13 ml-2 shrink-0'>
              {formatNumber(item.credits)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CreditsByAiAgentChart({
  data,
}: {
  data: { name: string; credits: number }[]
}) {
  const { t } = useLingui()
  const chartData =
    data.length > 0
      ? data
      : [
          { name: 'AP agent', credits: 51 },
          { name: 'OCR agent', credits: 17 },
          { name: 'Back order agent', credits: 16 },
        ]

  return (
    <ResponsiveContainer height={200} width='100%'>
      <BarChart
        data={chartData}
        layout='vertical'
        margin={{ bottom: 0, left: 10, right: 30, top: 10 }}
      >
        <CartesianGrid
          strokeDasharray='3 3'
          horizontal={false}
          stroke='var(--gray-3)'
        />
        <XAxis
          type='number'
          domain={[0, 60]}
          ticks={[0, 10, 20, 30, 40, 50, 60]}
          axisLine={false}
          tickLine={false}
          tick={{ fill: 'var(--gray-10)', fontSize: 11, fontWeight: 500 }}
          dy={10}
        />
        <YAxis
          dataKey='name'
          type='category'
          axisLine={false}
          tickLine={false}
          tick={{ fill: 'var(--gray-10)', fontSize: 11, fontWeight: 500 }}
          dx={-10}
          width={110}
        />
        <Tooltip
          cursor={{ fill: 'var(--gray-2)', opacity: 0.15 }}
          formatter={(val: any) => [t`${formatNumber(val)} credits`, t`Credits`]}
          contentStyle={{
            border: 'none',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            fontSize: '11px',
          }}
        />
        <Bar
          dataKey='credits'
          fill='var(--purple-9)'
          radius={[0, 6, 6, 0]}
          barSize={16}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

const forecastData = [
  { week: 'W1', actual: 22, projected: null },
  { week: 'W2', actual: 18, projected: null },
  { week: 'W3', actual: 24, projected: null },
  { week: 'W4', actual: 20, projected: 20 },
  { week: 'W5', actual: null, projected: 26 },
  { week: 'W6', actual: null, projected: 31 },
]

function CreditForecastChart() {
  const { t } = useLingui()
  return (
    <div className='flex flex-col gap-2'>
      <ResponsiveContainer height={180} width='100%'>
        <LineChart
          data={forecastData}
          margin={{ bottom: 0, left: -25, right: 10, top: 10 }}
        >
          <CartesianGrid vertical={false} stroke='var(--gray-3)' strokeDasharray='3 3' />
          <XAxis
            dataKey='week'
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--gray-10)', fontSize: 11, fontWeight: 500 }}
            dy={10}
          />
          <YAxis
            domain={[18, 32]}
            ticks={[18, 20, 22, 24, 26, 28, 30, 32]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--gray-10)', fontSize: 11, fontWeight: 500 }}
            dx={-10}
          />
          <Tooltip
            contentStyle={{
              border: 'none',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              fontSize: '11px',
            }}
          />
          <Line
            type='linear'
            dataKey='actual'
            stroke='var(--purple-9)'
            strokeWidth={2}
            connectNulls
            dot={{ stroke: 'var(--purple-9)', strokeWidth: 2, r: 4, fill: 'var(--surface)' }}
          />
          <Line
            type='linear'
            dataKey='projected'
            stroke='var(--cyan-9)'
            strokeWidth={2}
            strokeDasharray='4 4'
            connectNulls
            dot={{ stroke: 'var(--cyan-9)', strokeWidth: 2, r: 4, fill: 'var(--surface)' }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className='mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 pl-1 text-[11px] font-semibold text-gray-10'>
        <div className='flex items-center gap-1.5'>
          <div className='size-2.5 rounded-sm bg-[var(--purple-9)]' />
          <span>{t`Actual`}</span>
        </div>
        <div className='flex items-center gap-1.5'>
          <div className='size-2.5 rounded-sm bg-[var(--cyan-9)]' />
          <span>{t`Projected`}</span>
        </div>
      </div>
    </div>
  )
}
