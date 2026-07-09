import {
  createColumnHelper,
  useReactTable,
} from '@tanstack/react-table'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  getCreditsUsage,
  type CreditsUsageBucket,
  type CreditsUsagePeriod,
  type CreditsUsageResponse,
  type CreditsUsageTransaction,
} from '@/api/v6/billing'
import IconButton from '@/components/base/button/IconButton'
import DataTable from '@/components/base/data-table/DataTable'
import Icon from '@/components/base/icon/Icon'
import InputSelect from '@/components/base/inputs/InputSelect'
import showToast from '@/components/base/toast/showToast'
import type { Option } from '@/types/option'
import cn from '@/utils/cn'
import {
  settingsChartPalette,
  settingsTheme,
} from '../../helpers/settingsTheme'
import {
  settingsHeaderMeta,
  settingsTableCoreOptions,
  useSettingsTableSearch,
} from '../../helpers/settingsDataTable'
import SettingsPageHeader from '../SettingsPageHeader'
import useSettingsTableToolbar from '../useSettingsTableToolbar'

type CreditsProps = {
  onBack?: () => void
}

const PERIOD_OPTIONS: Option[] = [
  { id: 'today', name: 'Today', value: 'today' },
  { id: 'yesterday', name: 'Yesterday', value: 'yesterday' },
  { id: 'monthly', name: 'Monthly', value: 'monthly' },
  { id: 'quarterly', name: 'Quarterly', value: 'quarterly' },
  { id: 'yearly', name: 'Yearly', value: 'yearly' },
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

const formatNumber = (value: number) => value.toLocaleString()

const formatCompact = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`
  return formatNumber(value)
}

const formatDateTime = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const withoutTotal = (rows: CreditsUsageBucket[]) =>
  rows.filter((row) => row.type.toLowerCase() !== 'total')

const getBucketTotal = (rows: CreditsUsageBucket[], fallback = 0) => {
  const totalRow = rows.find((row) => row.type.toLowerCase() === 'total')
  if (totalRow) return totalRow.creditsUsed
  const sum = withoutTotal(rows).reduce((acc, row) => acc + row.creditsUsed, 0)
  return sum || fallback
}

const emptyUsage = (): CreditsUsageResponse => ({
  distributionReport: [],
  highestConsumption: [],
  monthlyConsumption: null,
  overallCreditSplit: [],
  period: 'Monthly',
  periodLabel: '',
  rangeEndUtc: '',
  rangeStartUtc: '',
  timeline: [],
  totalCreditsConsumed: 0,
  transactionCount: 0,
  transactions: [],
})

const transactionColumnHelper = createColumnHelper<CreditsUsageTransaction>()

function DashboardCard({
  children,
  className,
  description,
  title,
}: {
  children: React.ReactNode
  className?: string
  description?: string
  title: string
}) {
  return (
    <section
      className={cn(
        'flex h-full min-h-[360px] flex-col rounded-[18px] border border-[var(--border-default)] bg-surface p-4 shadow-[var(--shadow-sm)]',
        className,
      )}
    >
      <div className='mb-4 shrink-0'>
        <h2 className='text-[14px] font-semibold tracking-tight text-[var(--gray-13)]'>
          {title}
        </h2>
        {description ? (
          <p className='mt-1 line-clamp-1 text-[11px] text-[var(--gray-11)]'>
            {description}
          </p>
        ) : null}
      </div>
      <div className='min-h-0 flex-1'>{children}</div>
    </section>
  )
}

function KpiCard({
  icon,
  isLoading,
  label,
  tone = 'primary',
  value,
}: {
  icon: string
  isLoading?: boolean
  label: string
  tone?: 'green' | 'orange' | 'primary' | 'red'
  value: string
}) {
  const toneClass =
    tone === 'green'
      ? 'bg-[var(--green-3)] text-[var(--green-11)]'
      : tone === 'orange'
        ? 'bg-[var(--orange-3)] text-[var(--orange-11)]'
        : tone === 'red'
          ? 'bg-[var(--red-3)] text-[var(--red-11)]'
          : 'bg-[var(--primary-3)] text-[var(--primary-11)]'

  return (
    <div className='rounded-[18px] border border-[var(--border-default)] bg-surface p-4 shadow-[var(--shadow-sm)]'>
      <div
        className={cn(
          'mb-4 flex h-9 w-9 items-center justify-center rounded-[12px]',
          toneClass,
        )}
      >
        <Icon className='size-4' name={icon} />
      </div>
      <div className='truncate text-[28px] leading-none font-semibold tracking-tight text-[var(--gray-13)]'>
        {isLoading ? '…' : value}
      </div>
      <div className='mt-2 text-[13px] font-medium text-[var(--gray-11)]'>
        {label}
      </div>
    </div>
  )
}

function HorizontalBars({
  emptyLabel,
  rows,
  totalFallback,
}: {
  emptyLabel: string
  rows: CreditsUsageBucket[]
  totalFallback: number
}) {
  const items = withoutTotal(rows).slice(0, 5)
  const total = getBucketTotal(rows, totalFallback)
  const max = Math.max(...items.map((item) => item.creditsUsed), 1)

  if (!items.length) {
    return (
      <div className='flex h-full min-h-[260px] items-center justify-center text-sm text-[var(--gray-11)]'>
        {emptyLabel}
      </div>
    )
  }

  return (
    <div className='flex h-full min-h-[260px] flex-col justify-center gap-4'>
      {items.map((item) => {
        const width = Math.max((item.creditsUsed / max) * 100, 10)
        const share =
          total > 0 ? Math.round((item.creditsUsed / total) * 100) : 0

        return (
          <div key={item.type}>
            <div className='mb-1.5 flex items-center justify-between gap-2'>
              <span
                className='min-w-0 flex-1 truncate text-[12px] font-medium text-[var(--gray-12)]'
                title={item.type}
              >
                {item.type}
              </span>
              <span className='shrink-0 text-[12px] font-semibold tabular-nums text-[var(--gray-13)]'>
                {formatCompact(item.creditsUsed)}
                <span className='ml-1 text-[10px] font-medium text-[var(--gray-10)]'>
                  ({share}%)
                </span>
              </span>
            </div>
            <div className='h-2.5 overflow-hidden rounded-full bg-[var(--gray-3)]'>
              <div
                className='h-full rounded-full transition-all'
                style={{
                  background:
                    'linear-gradient(90deg, var(--primary-9), var(--cyan-9))',
                  width: `${width}%`,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SplitLegend({
  centerLabel,
  centerValue,
  rows,
  totalFallback,
}: {
  centerLabel: string
  centerValue: string
  rows: CreditsUsageBucket[]
  totalFallback: number
}) {
  const items = withoutTotal(rows).slice(0, 5)
  const total = getBucketTotal(rows, totalFallback) || 1
  const pieData = items.map((item) => ({
    name: item.type,
    value: item.creditsUsed,
  }))

  if (!items.length) {
    return (
      <div className='flex h-full min-h-[260px] items-center justify-center text-sm text-[var(--gray-11)]'>
        No split data
      </div>
    )
  }

  return (
    <div className='flex h-full min-h-[260px] flex-col'>
      <div className='relative mx-auto h-[120px] w-[120px] shrink-0'>
        <ResponsiveContainer height='100%' width='100%'>
          <PieChart>
            <Pie
              cx='50%'
              cy='50%'
              data={pieData}
              dataKey='value'
              innerRadius={36}
              nameKey='name'
              outerRadius={52}
              paddingAngle={2}
              stroke='transparent'
            >
              {pieData.map((entry, index) => (
                <Cell
                  fill={
                    settingsChartPalette[index % settingsChartPalette.length]
                  }
                  key={entry.name}
                />
              ))}
            </Pie>
            <RechartsTooltip
              formatter={(value: any, name: any) => [
                formatNumber(Number(value || 0)),
                name,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className='pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-2 text-center'>
          <div className='text-[15px] leading-none font-semibold text-[var(--gray-13)]'>
            {centerValue}
          </div>
          <div className='mt-1 text-[10px] text-[var(--gray-11)]'>
            {centerLabel}
          </div>
        </div>
      </div>

      <div className='ez-scrollbar mt-4 max-h-[150px] space-y-2.5 overflow-y-auto pr-1'>
        {items.map((item, index) => {
          const share = Math.round((item.creditsUsed / total) * 100)
          return (
            <div key={item.type}>
              <div className='mb-1 flex items-center justify-between gap-2'>
                <div className='flex min-w-0 flex-1 items-center gap-2'>
                  <span
                    className='h-2 w-2 shrink-0 rounded-full'
                    style={{
                      backgroundColor:
                        settingsChartPalette[
                          index % settingsChartPalette.length
                        ],
                    }}
                  />
                  <span
                    className='truncate text-[11px] font-medium text-[var(--gray-12)]'
                    title={item.type}
                  >
                    {item.type}
                  </span>
                </div>
                <span className='shrink-0 text-[11px] font-semibold tabular-nums text-[var(--gray-13)]'>
                  {formatCompact(item.creditsUsed)} ({share}%)
                </span>
              </div>
              <div className='h-1.5 overflow-hidden rounded-full bg-[var(--gray-3)]'>
                <div
                  className='h-full rounded-full'
                  style={{
                    backgroundColor:
                      settingsChartPalette[index % settingsChartPalette.length],
                    width: `${Math.max(share, 4)}%`,
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

export default function Credits({ onBack }: CreditsProps) {
  const [period, setPeriod] = useState<CreditsUsagePeriod>('monthly')
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth() + 1)
  const [isLoading, setIsLoading] = useState(true)
  const [usage, setUsage] = useState<CreditsUsageResponse>(emptyUsage)

  const tableSearchOptions = useSettingsTableSearch()

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear()
    return [current, current - 1, current - 2].map((option) => ({
      id: String(option),
      name: String(option),
      value: String(option),
    }))
  }, [])

  const selectedPeriod =
    PERIOD_OPTIONS.find((option) => option.value === period) || null
  const selectedMonth =
    MONTH_OPTIONS.find((option) => option.value === String(month)) || null
  const selectedYear =
    yearOptions.find((option) => option.value === String(year)) || null

  const loadUsage = useCallback(async () => {
    setIsLoading(true)

    try {
      const response = await getCreditsUsage({
        month: period === 'monthly' ? month : undefined,
        period,
        year: period === 'monthly' ? year : undefined,
      })

      if (response.error || !response.data) {
        showToast({
          message: response.error || 'Failed to load credit usage',
          variant: 'error',
        })
        setUsage(emptyUsage())
        return
      }

      setUsage(response.data)
    } finally {
      setIsLoading(false)
    }
  }, [month, period, year])

  useEffect(() => {
    void loadUsage()
  }, [loadUsage])

  const highestRows = useMemo(
    () => withoutTotal(usage.highestConsumption),
    [usage.highestConsumption],
  )
  const distributionRows = useMemo(
    () => withoutTotal(usage.distributionReport),
    [usage.distributionReport],
  )
  const splitRows = useMemo(
    () => withoutTotal(usage.overallCreditSplit),
    [usage.overallCreditSplit],
  )

  const timelineData = useMemo(
    () =>
      usage.timeline.map((point) => ({
        creditsUsed: point.creditsUsed,
        label: point.label,
      })),
    [usage.timeline],
  )

  const avgCredits =
    usage.transactionCount > 0
      ? Math.round(usage.totalCreditsConsumed / usage.transactionCount)
      : 0

  const topCredits = highestRows[0]?.creditsUsed || 0
  const activityCount = Math.max(splitRows.length, highestRows.length)
  const peakTimeline = Math.max(
    ...usage.timeline.map((point) => point.creditsUsed),
    0,
  )

  const transactionColumns = useMemo(
    () => [
      transactionColumnHelper.accessor('activityType', {
        enableSorting: false,
        header: 'Activity',
        id: 'activityType',
        meta: { ...settingsHeaderMeta.start, label: 'Activity' },
        minSize: 180,
        size: 220,
        cell: ({ row }) => (
          <div className='min-w-0'>
            <div className='truncate text-sm font-semibold text-[var(--gray-13)]'>
              {row.original.activityType}
            </div>
            {row.original.remarks ? (
              <div className='mt-0.5 truncate text-xs text-[var(--gray-11)]'>
                {row.original.remarks}
              </div>
            ) : null}
          </div>
        ),
      }),
      transactionColumnHelper.accessor(
        (row) => row.subActivityType || '—',
        {
          enableSorting: false,
          header: 'Sub Activity',
          id: 'subActivityType',
          meta: { ...settingsHeaderMeta.start, label: 'Sub Activity' },
          minSize: 140,
          size: 180,
        },
      ),
      transactionColumnHelper.accessor(
        (row) =>
          row.identifyTable
            ? `${row.identifyTable} #${row.identifyId ?? '—'}`
            : '—',
        {
          enableSorting: false,
          header: 'Identify',
          id: 'identify',
          meta: { ...settingsHeaderMeta.start, label: 'Identify' },
          minSize: 140,
          size: 170,
        },
      ),
      transactionColumnHelper.accessor('credit', {
        enableSorting: false,
        header: 'Credits',
        id: 'credit',
        meta: { ...settingsHeaderMeta.end, label: 'Credits' },
        minSize: 100,
        size: 110,
        cell: ({ getValue }) => (
          <span className='font-semibold tabular-nums text-[var(--gray-13)]'>
            {formatNumber(getValue())}
          </span>
        ),
      }),
      transactionColumnHelper.accessor(
        (row) =>
          row.totalTokens != null ? formatNumber(row.totalTokens) : '—',
        {
          enableSorting: false,
          header: 'Tokens',
          id: 'tokens',
          meta: { ...settingsHeaderMeta.end, label: 'Tokens' },
          minSize: 100,
          size: 110,
        },
      ),
      transactionColumnHelper.accessor(
        (row) => formatDateTime(row.createdAt),
        {
          enableSorting: false,
          header: 'Created',
          id: 'createdAt',
          meta: { ...settingsHeaderMeta.start, label: 'Created' },
          minSize: 160,
          size: 180,
        },
      ),
    ],
    [],
  )

  const transactionTable = useReactTable({
    ...settingsTableCoreOptions,
    ...tableSearchOptions,
    columns: transactionColumns,
    data: usage.transactions,
    getRowId: (row) => String(row.id),
  })

  const { onRowSizeChange, rowSize, toolbar } = useSettingsTableToolbar({
    isReLoading: isLoading,
    table: transactionTable,
    onReload: () => {
      void loadUsage()
    },
  })

  return (
    <main className='min-h-full bg-[var(--gray-2)]'>
      <SettingsPageHeader
        actions={
          <div className='flex flex-wrap items-end gap-2'>
            <div className='w-[150px]'>
              <InputSelect
                className='bg-surface'
                options={PERIOD_OPTIONS}
                placeholder='Period'
                value={selectedPeriod}
                onChange={(selected) => {
                  if (!selected?.value) return
                  setPeriod(selected.value as CreditsUsagePeriod)
                }}
              />
            </div>

            {period === 'monthly' ? (
              <>
                <div className='w-[150px]'>
                  <InputSelect
                    className='bg-surface'
                    options={MONTH_OPTIONS}
                    placeholder='Month'
                    value={selectedMonth}
                    onChange={(selected) => {
                      if (!selected?.value) return
                      setMonth(Number(selected.value))
                    }}
                  />
                </div>
                <div className='w-[120px]'>
                  <InputSelect
                    className='bg-surface'
                    options={yearOptions}
                    placeholder='Year'
                    value={selectedYear}
                    onChange={(selected) => {
                      if (!selected?.value) return
                      setYear(Number(selected.value))
                    }}
                  />
                </div>
              </>
            ) : null}

            <IconButton
              ariaLabel='Refresh credits'
              color='gray'
              icon='lucide:rotate-cw'
              size='sm'
              variant='outline'
              onClick={() => {
                void loadUsage()
              }}
            />
          </div>
        }
        description='Monitor realtime credit consumption, trends, and activity across agents.'
        title='Credit Usage'
        onBack={onBack}
      />

      <div className='ez-scrollbar max-h-[calc(100vh-120px)] space-y-5 overflow-y-auto px-6 py-5 md:px-8'>
        <div className='grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6'>
          <KpiCard
            icon='lucide:coins'
            isLoading={isLoading}
            label='Credits Consumed'
            value={formatNumber(usage.totalCreditsConsumed)}
          />
          <KpiCard
            icon='lucide:check-circle-2'
            isLoading={isLoading}
            label='Transactions'
            tone='green'
            value={formatNumber(usage.transactionCount)}
          />
          <KpiCard
            icon='lucide:sparkles'
            isLoading={isLoading}
            label='Top Activity Credits'
            tone='orange'
            value={formatNumber(topCredits)}
          />
          <KpiCard
            icon='lucide:gauge'
            isLoading={isLoading}
            label='Avg Credits / Txn'
            tone='green'
            value={formatNumber(avgCredits)}
          />
          <KpiCard
            icon='lucide:layers'
            isLoading={isLoading}
            label='Active Agents'
            tone='red'
            value={formatNumber(activityCount)}
          />
          <KpiCard
            icon='lucide:trending-up'
            isLoading={isLoading}
            label='Peak Timeline'
            value={formatNumber(peakTimeline)}
          />
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'>
          <DashboardCard
            description={`by credit usage · ${usage.periodLabel || 'selected period'}`}
            title='Highest Credit Consumption'
          >
            {isLoading ? (
              <div className='flex h-full min-h-[260px] items-center justify-center text-sm text-[var(--gray-11)]'>
                Loading...
              </div>
            ) : (
              <HorizontalBars
                emptyLabel='No highest consumption data'
                rows={usage.highestConsumption}
                totalFallback={usage.totalCreditsConsumed}
              />
            )}
          </DashboardCard>

          <DashboardCard
            description='credit trend across selected range'
            title='Usage Timeline'
          >
            {isLoading ? (
              <div className='flex h-full min-h-[260px] items-center justify-center text-sm text-[var(--gray-11)]'>
                Loading...
              </div>
            ) : timelineData.length ? (
              <div className='h-full min-h-[260px]'>
                <ResponsiveContainer height='100%' width='100%'>
                  <BarChart
                    barCategoryGap='24%'
                    data={timelineData}
                    margin={{ bottom: 4, left: -8, right: 4, top: 12 }}
                  >
                    <defs>
                      <linearGradient
                        id='creditsBarGradient'
                        x1='0'
                        x2='0'
                        y1='0'
                        y2='1'
                      >
                        <stop offset='0%' stopColor='var(--primary-9)' />
                        <stop offset='100%' stopColor='var(--cyan-8)' />
                      </linearGradient>
                    </defs>
                    <XAxis
                      axisLine={false}
                      dataKey='label'
                      interval='preserveStartEnd'
                      tick={{ fill: 'var(--gray-11)', fontSize: 11 }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tick={{ fill: 'var(--gray-11)', fontSize: 11 }}
                      tickLine={false}
                      width={28}
                    />
                    <RechartsTooltip
                      cursor={{ fill: 'var(--gray-3)', opacity: 0.55 }}
                      formatter={(value: any) => [
                        formatNumber(Number(value || 0)),
                        'Credits',
                      ]}
                    />
                    <Bar
                      dataKey='creditsUsed'
                      fill='url(#creditsBarGradient)'
                      maxBarSize={36}
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className='flex h-full min-h-[260px] items-center justify-center text-sm text-[var(--gray-11)]'>
                No timeline data
              </div>
            )}
          </DashboardCard>

          <DashboardCard
            description={`${formatNumber(distributionRows.length)} sub-activities analyzed`}
            title='Credit Distribution'
          >
            {isLoading ? (
              <div className='flex h-full min-h-[260px] items-center justify-center text-sm text-[var(--gray-11)]'>
                Loading...
              </div>
            ) : (
              <SplitLegend
                centerLabel='credits'
                centerValue={formatCompact(usage.totalCreditsConsumed)}
                rows={usage.distributionReport}
                totalFallback={usage.totalCreditsConsumed}
              />
            )}
          </DashboardCard>

          <DashboardCard
            description={`by activity type · ${formatNumber(splitRows.length)} items`}
            title='Overall Credit Split'
          >
            {isLoading ? (
              <div className='flex h-full min-h-[260px] items-center justify-center text-sm text-[var(--gray-11)]'>
                Loading...
              </div>
            ) : (
              <SplitLegend
                centerLabel='agents'
                centerValue={formatNumber(activityCount)}
                rows={usage.overallCreditSplit}
                totalFallback={usage.totalCreditsConsumed}
              />
            )}
          </DashboardCard>
        </div>

        <section className='rounded-[18px] border border-[var(--border-default)] bg-surface p-5 shadow-[var(--shadow-sm)]'>
          <div className='mb-4 flex flex-wrap items-start justify-between gap-3'>
            <div>
              <h2 className='text-[15px] font-semibold tracking-tight text-[var(--gray-13)]'>
                Transaction Activity
              </h2>
              <p className='mt-1 text-[12px] text-[var(--gray-11)]'>
                {formatNumber(usage.transactionCount)} transactions in{' '}
                {usage.periodLabel || 'selected period'}
              </p>
            </div>
            {toolbar}
          </div>

          <DataTable
            emptyDescription='No credit transactions found for this period.'
            emptyIcon='lucide:receipt'
            emptyTitle='No transactions yet'
            hideActionBar
            isLoading={isLoading}
            isReLoading={isLoading}
            pageSize={Math.max(8, usage.transactions.length || 8)}
            rowSize={rowSize}
            table={transactionTable}
            tableBodyMaxHeight='calc(100vh - 420px)'
            hideGrouping
            stickyHeader
            onReload={() => {
              void loadUsage()
            }}
            onRowSizeChange={onRowSizeChange}
          />
        </section>

        {!isLoading &&
        !usage.highestConsumption.length &&
        !usage.transactions.length ? (
          <div className={cn(settingsTheme.cardMuted, 'px-6 py-10 text-center')}>
            <p className='text-sm text-[var(--gray-11)]'>
              No credit usage found for this period.
            </p>
          </div>
        ) : null}
      </div>
    </main>
  )
}
