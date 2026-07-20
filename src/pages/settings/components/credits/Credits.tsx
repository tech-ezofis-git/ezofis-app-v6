import { useQuery } from '@tanstack/react-query'
import { createColumnHelper, useReactTable } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  getCreditsUsage,
  type CreditsUsageBucket,
  type CreditsUsageTransaction,
} from '@/api/v6/billing'
import IconButton from '@/components/base/button/IconButton'
import DataTable from '@/components/base/data-table/DataTable'
import InputSelect from '@/components/base/inputs/InputSelect'
import type { Option } from '@/types/option'
import cn from '@/utils/cn'
import {
  settingsHeaderMeta,
  settingsTableCoreOptions,
  useSettingsTableSearch,
} from '../../helpers/settingsDataTable'
import SettingsPageHeader from '../SettingsPageHeader'
import useSettingsTableToolbar from '../useSettingsTableToolbar'

import CustomFilter from '@/components/common/CustomFilter'

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
const MAX_TABLE_ROWS = 200
const MAX_CHART_ITEMS = 10

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

function mapBucketsToChartData(buckets: CreditsUsageBucket[]) {
  return buckets.map((item, index) => ({
    color: CHART_COLORS[index % CHART_COLORS.length],
    credits: item.creditsUsed,
    name: item.type,
  }))
}

function findTopBucket(buckets: CreditsUsageBucket[]) {
  if (buckets.length === 0) return null

  return buckets.reduce((top, item) =>
    item.creditsUsed > top.creditsUsed ? item : top,
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
      className={cn(
        'rounded-full border px-3 py-1 text-12 font-medium transition-all active:scale-95',
        active
          ? 'border-primary-9 bg-primary-9 text-white shadow-sm'
          : 'border-gray-3 bg-white text-gray-11 shadow-sm hover:bg-gray-1',
      )}
      type='button'
      onClick={onClick}
    >
      {children}
    </button>
  )
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
    down: 'border-red-3 bg-red-1 text-red-9',
    neutral: 'border-gray-3 bg-gray-1 text-gray-11',
    up: 'border-green-3 bg-green-1 text-green-9',
  }

  return (
    <div className='relative overflow-hidden rounded-xl border border-gray-3 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md'>
      <div className='absolute inset-x-0 top-0 h-1 bg-primary-9' />
      <p className='text-[11px] font-semibold tracking-wide text-gray-11 uppercase'>
        {title}
      </p>
      <p className='mt-3 text-[28px] leading-none font-bold text-gray-13'>
        {isLoading ? '—' : value}
      </p>
      {trend ? (
        <div className='mt-3 flex flex-wrap items-center gap-2'>
          <span
            className={cn(
              'rounded-md border px-2 py-0.5 text-[11px] font-semibold',
              trendStyles[trendTone],
            )}
          >
            {trend}
          </span>
          <span className='text-[11px] text-gray-10 lowercase'>
            vs last period
          </span>
        </div>
      ) : null}
    </div>
  )
}

function ChartCard({
  children,
  subtitle,
  title,
}: {
  children: React.ReactNode
  subtitle?: string
  title: string
}) {
  return (
    <div className='flex flex-col rounded-xl bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md'>
      <div>
        <h4 className='pl-0.5 font-poppins text-13 leading-none font-bold text-gray-13 capitalize'>
          {title}
        </h4>
        {subtitle ? (
          <div className='mt-1 pl-0.5 text-[11px] text-gray-9 lowercase'>
            {subtitle}
          </div>
        ) : null}
      </div>
      <div className='mt-6 flex flex-1 flex-col justify-center'>{children}</div>
    </div>
  )
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
          <linearGradient id='creditConsumptionGradient' x1='0' x2='1' y1='0' y2='0'>
            <stop offset='0%' stopColor='var(--primary-6)' stopOpacity={0.7} />
            <stop offset='100%' stopColor='var(--primary-9)' stopOpacity={0.95} />
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
      <BarChart data={data} margin={{ bottom: 0, left: -25, right: 0, top: 20 }}>
        <defs>
          <linearGradient id='creditTimelineGradient' x1='0' x2='0' y1='0' y2='1'>
            <stop offset='0%' stopColor='var(--primary-9)' stopOpacity={0.9} />
            <stop offset='100%' stopColor='var(--primary-4)' stopOpacity={0.4} />
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

function DistributionDonutChart({
  centerLabel,
  centerValue,
  data,
}: {
  centerLabel: string
  centerValue: string
  data: { color: string; credits: number; name: string }[]
}) {
  const total = data.reduce((sum, item) => sum + item.credits, 0)

  if (data.length === 0) {
    return (
      <div className='flex h-[220px] items-center justify-center text-13 text-gray-10'>
        No distribution data for this period.
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex items-center justify-center'>
        <div className='relative h-[100px] w-[100px] shrink-0'>
          <ResponsiveContainer height='100%' width='100%'>
            <PieChart>
              <Pie
                cx='50%'
                cy='50%'
                data={data}
                dataKey='credits'
                innerRadius={34}
                outerRadius={48}
                paddingAngle={3}
                stroke='none'
              >
                {data.map((entry, index) => (
                  <Cell fill={entry.color} key={`cell-${index}`} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any) => [`${formatNumber(value)} credits`]}
                contentStyle={{
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  fontSize: '11px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className='pointer-events-none absolute inset-0 flex flex-col items-center justify-center'>
            <span className='font-poppins text-16 leading-none font-extrabold text-gray-13'>
              {centerValue}
            </span>
            <span className='mt-0.5 text-[8px] font-medium text-gray-10 lowercase'>
              {centerLabel}
            </span>
          </div>
        </div>
      </div>

      <div className='flex flex-col gap-2'>
        {data.map((entry, index) => {
          const percentage =
            total > 0 ? Math.round((entry.credits / total) * 100) : 0

          return (
            <div
              className='group flex cursor-pointer flex-col gap-1 rounded-lg p-1.5 transition-all hover:bg-gray-1 active:scale-95'
              key={index}
              title={`${formatNumber(entry.credits)} credits (${percentage}%)`}
            >
              <div className='flex items-center justify-between text-[11px] font-medium lowercase'>
                <div className='flex items-center gap-2'>
                  <div
                    className='size-2.5 shrink-0 rounded-md transition-transform group-hover:scale-110'
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className='font-semibold text-gray-10 transition-colors group-hover:text-gray-13'>
                    {entry.name}
                  </span>
                </div>
                <div className='flex items-center gap-1.5'>
                  <span className='font-bold text-gray-13'>
                    {formatNumber(entry.credits)}
                  </span>
                  <span className='text-[9px] font-normal text-gray-10'>
                    ({percentage}%)
                  </span>
                </div>
              </div>
              <div className='h-1 w-full overflow-hidden rounded-full bg-gray-2'>
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
    </div>
  )
}

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

  const { data: usage, isFetching, isLoading, refetch } = useQuery({
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
    queryKey: ['settings', 'credits-usage', period, month.value, year.value],
  })

  const transactions = useMemo(
    () => (usage?.transactions ?? []).slice(0, MAX_TABLE_ROWS),
    [usage?.transactions],
  )
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
        minSize: 160,
        size: 180,
        cell: ({ getValue }) => {
          const value = getValue()
          if (!value) return '—'

          const date = new Date(value)
          return Number.isNaN(date.getTime())
            ? value
            : date.toLocaleString()
        },
      }),
      columnHelper.accessor('activityType', {
        enableSorting: false,
        header: 'Activity',
        meta: { ...settingsHeaderMeta.start, label: 'Activity' },
        minSize: 180,
        size: 220,
        cell: ({ row }) => (
          <div className='min-w-0'>
            <div className='truncate font-medium text-gray-13'>
              {row.original.activityType}
            </div>
            {row.original.subActivityType ? (
              <div className='truncate text-xs text-gray-11'>
                {row.original.subActivityType}
              </div>
            ) : null}
          </div>
        ),
      }),
      columnHelper.accessor('credit', {
        enableSorting: false,
        header: 'Credits',
        meta: { ...settingsHeaderMeta.end, label: 'Credits' },
        minSize: 100,
        size: 120,
        cell: ({ getValue }) => formatNumber(Number(getValue() ?? 0)),
      }),
      columnHelper.accessor('remarks', {
        enableSorting: false,
        header: 'Remarks',
        meta: { ...settingsHeaderMeta.start, label: 'Remarks' },
        minSize: 180,
        size: 220,
        cell: ({ getValue }) => getValue() || '—',
      }),
      columnHelper.accessor('identifyTable', {
        enableSorting: false,
        header: 'Reference',
        meta: { ...settingsHeaderMeta.start, label: 'Reference' },
        minSize: 140,
        size: 160,
        cell: ({ row }) => {
          const tableName = row.original.identifyTable
          const identifyId = row.original.identifyId
          if (!tableName && identifyId == null) return '—'
          if (identifyId == null) return tableName
          return `${tableName ?? 'record'} #${identifyId}`
        },
      }),
    ],
    [columnHelper],
  )

  const transactionTable = useReactTable({
    ...settingsTableCoreOptions,
    ...tableSearchOptions,
    columns,
    data: transactions,
  })

  const { onRowSizeChange, rowSize, toolbar } = useSettingsTableToolbar({
    isReLoading: isFetching,
    table: transactionTable,
    onReload: () => void refetch(),
  })

  const totalActivityCredits = consumptionByActivity.reduce(
    (sum, item) => sum + item.credits,
    0,
  )

  return (
    <div className='flex h-full min-h-0 flex-col bg-[var(--surface)]'>
      <SettingsPageHeader
        title='Credit Usage'
      />

      <div className='flex-1 flex flex-col overflow-hidden px-6 py-4 md:px-8'>
        <CustomFilter
          filters={[
            ...(period === 'monthly' ? [{ id: 'month', label: 'Month', options: MONTH_OPTIONS.map(o => ({ label: o.name, value: String(o.value || '') })) }] : []),
            ...(period === 'monthly' || period === 'yearly' ? [{ id: 'year', label: 'Year', options: yearOptions.map(o => ({ label: o.name, value: String(o.value || '') })) }] : []),
          ]}
          activeFilters={{
            month: String(month.value || ''),
            year: String(year.value || ''),
          }}
          onFilterChange={(id, value) => {
            if (id === 'month') {
              const selected = MONTH_OPTIONS.find(o => o.value === value)
              if (selected) setMonth(selected)
            }
            if (id === 'year') {
              const selected = yearOptions.find(o => o.value === value)
              if (selected) setYear(selected)
            }
          }}
          onReset={() => {
            setPeriod('monthly')
            setMonth(MONTH_OPTIONS[currentMonthIndex] ?? MONTH_OPTIONS[0])
            setYear({
              id: String(currentYear),
              name: String(currentYear),
              value: String(currentYear),
            })
          }}
          showReset={
            period !== 'monthly' ||
            month.value !== (MONTH_OPTIONS[currentMonthIndex] ?? MONTH_OPTIONS[0]).value ||
            year.value !== String(currentYear)
          }
          quickFilters={PERIOD_FILTERS.map(f => ({ id: f.value, label: f.label }))}
          activeQuickFilters={[period]}
          onQuickFilterToggle={(id) => setPeriod(id as UsagePeriod)}
          customSearchComponent={<div />}
          onBack={onBack}
          actionButtons={[
            {
              id: 'refresh',
              icon: 'lucide:rotate-cw',
              tooltip: 'Refresh credit usage',
              onClick: () => void refetch(),
              isIconButton: true,
              color: 'gray',
              variant: 'outline',
            }
          ]}
        />

        <div className='flex-1 overflow-y-auto mt-4'>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6'>
          <MetricSummaryCard
            isLoading={isLoading}
            title='Credits Consumed'
            trend={
              usage
                ? `${formatNumber(usage.totalCreditsConsumed)} total`
                : undefined
            }
            value={formatNumber(usage?.totalCreditsConsumed ?? 0)}
          />
          <MetricSummaryCard
            isLoading={isLoading}
            title='Transactions'
            trend={
              usage ? `${usage.transactionCount} records` : undefined
            }
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
            trend={peakTimeline ? peakTimeline.label.toLowerCase() : undefined}
            value={formatNumber(peakTimeline?.creditsUsed ?? 0)}
          />
          <MetricSummaryCard
            isLoading={isLoading}
            title='Active Agents'
            trend={
              consumptionByAgent.length > 0
                ? `${consumptionByAgent.length} agents`
                : undefined
            }
            value={formatNumber(consumptionByAgent.length)}
          />
        </div>

        <div className='mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-4'>
          <ChartCard
            subtitle={`by agent · ${periodSubtitle}`}
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
            subtitle='credit trend across selected range'
            title='Usage Timeline'
          >
            <UsageTimelineChart data={timelineData} />
          </ChartCard>

          <ChartCard
            subtitle={`by activity · ${formatNumber(totalActivityCredits)} credits`}
            title='Credit Distribution'
          >
            <DistributionDonutChart
              centerLabel='credits'
              centerValue={formatNumber(totalActivityCredits)}
              data={consumptionByActivity}
            />
          </ChartCard>

          <ChartCard
            subtitle={`by agent · ${consumptionByAgent.length} agents`}
            title='Overall Credit Split'
          >
            <DistributionDonutChart
              centerLabel='agents'
              centerValue={String(consumptionByAgent.length)}
              data={consumptionByAgent}
            />
          </ChartCard>
        </div>

        <div className='mt-5 rounded-xl border border-gray-3 bg-white p-4 shadow-sm'>
          <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
            <h4 className='font-poppins text-13 font-bold text-gray-13 capitalize'>
              Transaction Activity
            </h4>
            {toolbar}
          </div>
          <DataTable
            hideActionBar
            isLoading={isLoading}
            isReLoading={isFetching}
            pageSize={10}
            rowSize={rowSize}
            stickyHeader
            table={transactionTable}
            hideGrouping
            onReload={() => void refetch()}
            onRowSizeChange={onRowSizeChange}
          />
        </div>
        </div>
      </div>
    </div>
  )
}
