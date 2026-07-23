import { useQuery } from '@tanstack/react-query'
import { createColumnHelper, useReactTable } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  LabelList,
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
} from '@/api/v6/billing'
import IconButton from '@/components/base/button/IconButton'
import TableExport from '@/components/base/data-table/actions/TableExport'
import TableSearch from '@/components/base/data-table/actions/TableSearch'
import DataTable from '@/components/base/data-table/DataTable'
import InputSelect from '@/components/base/inputs/InputSelect'
import Pagination from '@/components/base/pagination/Pagination'
import CustomFilter from '@/components/common/CustomFilter'
import cn from '@/utils/cn'
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

const PERIOD_FILTERS: { label: string; value: UsagePeriod }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'Yearly', value: 'yearly' },
]

const MONTH_OPTIONS: Option[] = [
  { id: '1', name: 'January', value: '1' },
  { id: '2', name: 'February', value: '2' },
  { id: '3', name: 'March', value: '3' },
  { id: '4', name: 'April', value: '4' },
  { id: '5', name: 'May', value: '5' },
  { id: '6', name: 'June', value: '6' },
  { id: '7', name: 'July', value: '7' },
  { id: '8', name: 'August', value: '8' },
  { id: '9', name: 'September', value: '9' },
  { id: '10', name: 'October', value: '10' },
  { id: '11', name: 'November', value: '11' },
  { id: '12', name: 'December', value: '12' },
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

function getActivityTypeBadgeTone(activityType: string) {
  const key = activityType.trim().toLowerCase()
  if (!key) return ACTIVITY_TYPE_BADGE_TONES[0]

  // Prefer semantic colors for common activity names
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

export default function Credits({ onBack }: { onBack?: () => void }) {
  const currentYear = new Date().getFullYear()
  const currentMonthIndex = new Date().getMonth()
  const [period, setPeriod] = useState<UsagePeriod>('monthly')
  const [month, setMonth] = useState<Option>(
    MONTH_OPTIONS[currentMonthIndex] ?? MONTH_OPTIONS[0],
  )
  const [year, setYear] = useState<Option>({
    id: String(currentYear),
    name: String(currentYear),
    value: String(currentYear),
  })

  const yearOptions = useMemo<Option[]>(
    () =>
      Array.from({ length: 6 }, (_, index) => {
        const value = String(currentYear - index)
        return { id: value, name: value, value }
      }),
    [currentYear],
  )

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
  >({})

  const activityFilterOptions = useMemo(() => {
    const values = new Set<string>()
    transactions.forEach((row) => {
      if (row.activityType) values.add(row.activityType)
    })
    return Array.from(values)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ label: value, value }))
  }, [transactions])

  const referenceFilterOptions = useMemo(() => {
    const values = new Set<string>()
    transactions.forEach((row) => {
      if (row.identifyTable) values.add(row.identifyTable)
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
      const activityFilter = transactionFilters.activityType
      if (
        activityFilter &&
        !matchesCategoryFilterValue(row.activityType, activityFilter)
      ) {
        return false
      }

      const referenceFilter = transactionFilters.identifyTable
      if (
        referenceFilter &&
        !matchesCategoryFilterValue(row.identifyTable, referenceFilter)
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

  const columnHelper = useMemo(
    () => createColumnHelper<CreditsUsageTransaction>(),
    [],
  )
  const tableSearchOptions = useSettingsTableSearch()

  const columns = useMemo(
    () => [
      columnHelper.accessor('createdAt', {
        enableSorting: false,
        header: 'Date',
        meta: { ...settingsHeaderMeta.start, label: 'Date' },
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
      columnHelper.accessor('activityType', {
        enableSorting: false,
        header: 'Category',
        meta: { ...settingsHeaderMeta.start, label: 'Category' },
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
                getActivityTypeBadgeTone(value),
              )}
            >
              {value}
            </span>
          )
        },
      }),
      columnHelper.accessor('subActivityType', {
        enableSorting: false,
        header: 'Action',
        meta: { ...settingsHeaderMeta.start, label: 'Action' },
        minSize: 220,
        size: 280,
        cell: ({ getValue }) => getValue() || '—',
      }),
      columnHelper.accessor('credit', {
        enableSorting: false,
        header: 'Credits',
        meta: { ...settingsHeaderMeta.end, label: 'Credits' },
        minSize: 80,
        size: 90,
        maxSize: 110,
        cell: ({ getValue }) => formatNumber(Number(getValue() ?? 0)),
      }),
      columnHelper.accessor('remarks', {
        enableSorting: false,
        header: 'Remarks',
        meta: { ...settingsHeaderMeta.start, label: 'Remarks' },
        minSize: 240,
        size: 320,
        cell: ({ getValue }) => getValue() || '—',
      }),
      columnHelper.accessor('identifyTable', {
        enableSorting: false,
        header: 'Reference',
        meta: { ...settingsHeaderMeta.start, label: 'Reference' },
        minSize: 100,
        size: 130,
        maxSize: 160,
        cell: ({ row }) => {
          const tableName = row.original.identifyTable
          return tableName?.trim() ? tableName : '—'
        },
      }),
    ],
    [columnHelper],
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
    <div className='flex h-full min-h-0 flex-col bg-[var(--surface)]'>
      <SettingsPageHeader title='Credit Usage' onBack={onBack} />

      <div className='flex flex-1 flex-col overflow-hidden p-4'>
        <CustomFilter
          activeQuickFilters={[period]}
          customSearchComponent={<div />}
          actionButtons={[
            {
              color: 'gray',
              icon: 'lucide:rotate-cw',
              id: 'refresh',
              isIconButton: true,
              tooltip: 'Refresh credit usage',
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
                    label: 'Month',
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
                    label: 'Year',
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
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6 2xl:grid-cols-6'>
            <MetricSummaryCard
              isLoading={isLoading}
              title='Credits Consumed'
              value={formatNumber(usage?.totalCreditsConsumed ?? 0)}
              trend={
                usage
                  ? `${formatNumber(usage.totalCreditsConsumed)} total`
                  : undefined
              }
            />
            <MetricSummaryCard
              isLoading={isLoading}
              title='Transactions'
              trend={usage ? `${usage.transactionCount} records` : undefined}
              value={formatNumber(usage?.transactionCount ?? 0)}
            />
            <MetricSummaryCard
              isLoading={isLoading}
              title='Top Activity Credits'
              trend={topActivity ? topActivity.type.toLowerCase() : undefined}
              value={formatNumber(topActivity?.creditsUsed ?? 0)}
            />
            <MetricSummaryCard
              isLoading={isLoading}
              title='Avg Credits / Txn'
              trendTone='neutral'
              value={formatNumber(avgCreditsPerTransaction)}
            />
            <MetricSummaryCard
              isLoading={isLoading}
              title='Peak Timeline'
              value={formatNumber(peakTimeline?.creditsUsed ?? 0)}
              trend={
                peakTimeline ? peakTimeline.label.toLowerCase() : undefined
              }
            />
            <MetricSummaryCard
              isLoading={isLoading}
              title='Active Agents'
              value={formatNumber(consumptionByAgent.length)}
              trend={
                consumptionByAgent.length > 0
                  ? `${consumptionByAgent.length} agents`
                  : undefined
              }
            />
          </div>

          <div className='mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-4'>
            <ChartCard
              subtitle={`Top agents by credit usage · ${periodSubtitle}`}
              title='Highest Credit Consumption'
            >
              <HorizontalConsumptionChart
                data={highestConsumption.map((item) => ({
                  credits: item.credits,
                  name: item.name,
                }))}
              />
            </ChartCard>

            <ChartCard
              subtitle='Credit usage trend across the selected period'
              title='Usage Timeline'
            >
              <UsageTimelineChart data={timelineData} />
            </ChartCard>

            <ChartCard
              badge={`${formatNumber(totalActivityCredits)} credits`}
              badgeTone='green'
              subtitle='Credits consumed by each activity'
              title='Credit Distribution'
            >
              <DistributionDonutChart
                centerLabel='credits'
                centerValue={formatNumber(totalActivityCredits)}
                data={consumptionByActivity}
              />
            </ChartCard>

            <ChartCard
              badge={`${consumptionByAgent.length} agents`}
              badgeTone='blue'
              subtitle='Credits consumed by each agent'
              title='Overall Credit Split'
            >
              <DistributionDonutChart
                centerLabel='agents'
                centerValue={String(consumptionByAgent.length)}
                data={consumptionByAgent}
              />
            </ChartCard>
          </div>

          <div className='mt-5 flex min-h-[320px] flex-col rounded-xl border border-[var(--border-default)] bg-surface p-4 shadow-[var(--shadow-sm)]'>
            <h4 className='mb-3 pl-0.5 font-poppins text-14 font-semibold text-text-primary'>
              Transaction Activity
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
                  tooltip: 'Refresh',
                  variant: 'outline',
                  onClick: () => void refetch(),
                },
              ]}
              filters={[
                {
                  id: 'activityType',
                  label: 'Category',
                  options: activityFilterOptions,
                },
                {
                  dataType: 'date',
                  id: 'createdAt',
                  label: 'Date',
                  options: [],
                },
              ]}
              moreFilters={[
                {
                  id: 'identifyTable',
                  label: 'Reference',
                  options: referenceFilterOptions,
                },
                {
                  id: 'subActivityType',
                  label: 'Action',
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
              itemLabel='Transactions'
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
  const total = data.reduce((sum, item) => sum + item.credits, 0)

  if (data.length === 0) {
    return (
      <div className='flex h-[180px] items-center justify-center text-13 text-gray-10'>
        No distribution data for this period.
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
            title={`${formatNumber(entry.credits)} credits (${percentage}%)`}
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

function HorizontalConsumptionChart({
  data,
}: {
  data: { credits: number; name: string }[]
}) {
  const chartData = data.map((item) => ({
    ...item,
    displayValue: `${formatNumber(item.credits)} credits`,
  }))

  if (chartData.length === 0) {
    return (
      <div className='flex h-[200px] items-center justify-center text-13 text-gray-10'>
        No consumption data for this period.
      </div>
    )
  }

  return (
    <ResponsiveContainer height={200} width='100%'>
      <BarChart
        data={chartData}
        layout='vertical'
        margin={{ bottom: 0, left: -20, right: 40, top: 0 }}
      >
        <defs>
          <linearGradient
            id='creditConsumptionGradient'
            x1='0'
            x2='1'
            y1='0'
            y2='0'
          >
            <stop offset='0%' stopColor='var(--primary-6)' stopOpacity={0.7} />
            <stop
              offset='100%'
              stopColor='var(--primary-9)'
              stopOpacity={0.95}
            />
          </linearGradient>
        </defs>
        <XAxis type='number' hide />
        <YAxis
          axisLine={false}
          dataKey='name'
          tick={{ fill: 'var(--gray-10)', fontSize: 11, fontWeight: 550 }}
          tickLine={false}
          type='category'
          width={100}
        />
        <Tooltip
          cursor={{ fill: 'var(--gray-2)', opacity: 0.15 }}
          formatter={(val: any) => [`${formatNumber(val)} credits`, 'Credits']}
          contentStyle={{
            border: 'none',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            fontSize: '11px',
          }}
        />
        <Bar
          barSize={14}
          dataKey='credits'
          fill='url(#creditConsumptionGradient)'
          radius={[0, 6, 6, 0]}
        >
          <LabelList
            dataKey='displayValue'
            fill='var(--gray-11)'
            fontSize={10}
            fontWeight={650}
            offset={8}
            position='right'
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
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
            vs last period
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
  if (data.length === 0) {
    return (
      <div className='flex h-[180px] items-center justify-center text-13 text-gray-10'>
        No timeline data for this period.
      </div>
    )
  }

  return (
    <ResponsiveContainer height={180} width='100%'>
      <BarChart
        data={data}
        margin={{ bottom: 0, left: -25, right: 0, top: 20 }}
      >
        <defs>
          <linearGradient
            id='creditTimelineGradient'
            x1='0'
            x2='0'
            y1='0'
            y2='1'
          >
            <stop offset='0%' stopColor='var(--primary-9)' stopOpacity={0.9} />
            <stop
              offset='100%'
              stopColor='var(--primary-4)'
              stopOpacity={0.4}
            />
          </linearGradient>
        </defs>
        <XAxis
          axisLine={false}
          dataKey='label'
          dy={10}
          tick={{ fill: 'var(--gray-10)', fontSize: 11, fontWeight: 550 }}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: 'var(--gray-2)', opacity: 0.15 }}
          formatter={(val: any) => [`${formatNumber(val)} credits`, 'Credits']}
          contentStyle={{
            border: 'none',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            fontSize: '11px',
          }}
        />
        <Bar
          barSize={28}
          dataKey='credits'
          fill='url(#creditTimelineGradient)'
          radius={[6, 6, 0, 0]}
        >
          <LabelList
            dataKey='credits'
            position='top'
            content={(props: any) => {
              const { value, width = 0, x = 0, y = 0 } = props
              return (
                <text
                  fill='var(--gray-11)'
                  fontSize={10}
                  fontWeight={650}
                  textAnchor='middle'
                  x={x + width / 2}
                  y={y - 8}
                >
                  {formatNumber(Number(value ?? 0))}
                </text>
              )
            }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
