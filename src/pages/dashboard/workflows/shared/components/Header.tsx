import {
  // Search,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  // ChevronRight,
  DollarSign,
  X,
} from 'lucide-react'
import React from 'react'
import { useLingui } from '@lingui/react/macro'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getDashboardData } from '@/api/v6/dashboard'
import CustomFilter from '@/components/common/CustomFilter'
import useDashboardStore from '@/pages/dashboard/stores/useDashboardStore'
import { TODAY } from '@/pages/dashboard/utils/dashboardData'
import cn from '@/utils/cn'

function fmtMoney(v: number, currency = 'USD') {
  const sym =
    currency === 'EUR'
      ? '€'
      : currency === 'GBP'
        ? '£'
        : currency === 'INR'
          ? '₹'
          : '$'
  const abs = Math.abs(v)
  if (abs >= 1.0e6) return `${sym}${(v / 1.0e6).toFixed(2)}M`
  if (abs >= 1.0e3) return `${sym}${(v / 1.0e3).toFixed(1)}K`
  return `${sym}${v.toLocaleString()}`
}

const BulletIcon = () => (
  <svg
    className='mt-0.5 h-4 w-4 shrink-0 animate-pulse text-[#00a2c7]'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    viewBox='0 0 24 24'
  >
    <circle cx='12' cy='12' r='10' />
    <circle cx='12' cy='12' fill='currentColor' r='3' />
  </svg>
)

export default function DashboardCharts() {
  const { t } = useLingui()
  const {
    currency,
    drillAgingBucket,
    drillStatus,
    drillSupplier,
    invoiceStatus,
    resetFilters,
    role,
    searchQuery,
    supplierCategory,
    timeframe,
    setCurrency,
    setDrillAgingBucket,
    setDrillStatus,
    setDrillSupplier,
    setInvoiceStatus,
    setSearchQuery,
    setSupplierCategory,
    setTimeframe,
  } = useDashboardStore()

  const [expandedInvoiceId, setExpandedInvoiceId] = React.useState<
    string | null
  >(null)
  const getKpiConfig = (key: string) => {
    switch (key) {
      case 'total_outstanding':
        return { color: 'border-t-primary-9', isGood: false }
      case 'total_paid':
        return { color: 'border-t-success', isGood: true }
      case 'pending_payments':
        return { color: 'border-t-primary-9', isGood: true }
      case 'due_today':
        return { color: 'border-t-cyan-9', isGood: true }
      case 'overdue_amount':
        return { color: 'border-t-red-9', isGood: false }
      case 'avg_processing_time':
        return { color: 'border-t-primary-9', isGood: true }
      default:
        return { color: 'border-t-primary-9', isGood: true }
    }
  }
  const [isCommandCenterExpanded, setIsCommandCenterExpanded] =
    React.useState(true)
  const [isTodayActionExpanded, setIsTodayActionExpanded] =
    React.useState(false)
  const [isProcessingExpanded, setIsProcessingExpanded] = React.useState(false)
  const [isSupplierFollowUpExpanded, setIsSupplierFollowUpExpanded] =
    React.useState(false)
  const [isProfitabilityExpanded, setIsProfitabilityExpanded] =
    React.useState(false)
  const [isSupplierConcentrationExpanded, setIsSupplierConcentrationExpanded] =
    React.useState(false)

  // Local filter states for non-store API filter fields
  const [department, setDepartment] = React.useState<string>('')
  const [requestStatus, setRequestStatus] = React.useState<string>('')
  const [poAmountTier, setPoAmountTier] = React.useState<string>('')

  // API response storage
  const [dashboardData, setDashboardData] = React.useState<any>(null)
  const [_isLoading, setIsLoading] = React.useState(false)

  // Map store timeframe key to API period key
  const periodMap: Record<string, string> = {
    fy: 'fy',
    last_month: 'lastmonth',
    lastmonth: 'lastmonth',
    month: 'thisMonth',
    quarter: 'quarter',
    this_month: 'thisMonth',
    this_week: 'week',
    thisMonth: 'thisMonth',
    this_year: 'fy',
    today: 'today',
    week: 'week',
  }

  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      const payload: any = {
        includeInvoiceDetails: true,
      }

      if (timeframe.startsWith('custom:')) {
        const [start = '', end = ''] = timeframe
          .replace('custom:', '')
          .split('_')
        if (start) payload.fromUtc = `${start}T00:00:00.000Z`
        if (end) payload.toUtc = `${end}T23:59:59.999Z`
      } else {
        payload.period = periodMap[timeframe] || 'thisMonth'
      }

      if (supplierCategory) payload.supplier = supplierCategory
      if (currency) payload.currency = currency
      if (invoiceStatus) payload.status = invoiceStatus
      if (department) payload.department = department
      if (requestStatus) payload.requestStatus = requestStatus
      if (poAmountTier) payload.poAmountTier = poAmountTier

      const res = await getDashboardData(payload)
      if (res.data) {
        const rawData = res.data
        const data = Array.isArray(rawData) ? rawData[0] : rawData
        setDashboardData(data)
      } else {
        console.error(res.error)
      }
      setIsLoading(false)
    }
    fetchData()
  }, [
    timeframe,
    supplierCategory,
    invoiceStatus,
    currency,
    department,
    requestStatus,
    poAmountTier,
  ])

  const filteredInvoices = React.useMemo(() => {
    let list = [...(dashboardData?.invoices || [])]
    const q = (searchQuery || '').toLowerCase().trim()
    if (q) {
      list = list.filter(
        (inv) =>
          String(inv.id || inv.invoiceId || inv.invoiceNo || '')
            .toLowerCase()
            .includes(q) ||
          String(inv.supplier || inv.supplierName || '')
            .toLowerCase()
            .includes(q) ||
          String(inv.costCenter || inv.poNumber || '')
            .toLowerCase()
            .includes(q),
      )
    }
    return list
  }, [dashboardData?.invoices, searchQuery])

  const metrics = React.useMemo(() => {
    const header = dashboardData?.header || {}
    return {
      dpo: header.dpoDays || 0,
      openInvoices: header.openInvoices || 0,
      overdueAmount: header.overdue || 0,
      totalAP: header.totalAp || 0,
    }
  }, [dashboardData])

  const [activeDrill, setActiveDrill] = React.useState<string | null>(null)

  const handleKpiClick = (kpiName: string) => {
    setActiveDrill(activeDrill === kpiName ? null : kpiName)
  }

  React.useEffect(() => {
    if (!isCommandCenterExpanded && activeDrill === 'Total Outstanding') {
      setActiveDrill(null)
    }
  }, [isCommandCenterExpanded, activeDrill])

  const drillInvoices = React.useMemo(() => {
    if (!activeDrill) return []
    const drillLower = activeDrill.toLowerCase()
    let result = [...filteredInvoices]
    if (drillLower.includes('outstanding') || drillLower.includes('total ap')) {
      result = result.filter(
        (inv) => inv.status !== 'Paid' && inv.status !== 'Rejected',
      )
    } else if (drillLower.includes('paid')) {
      result = result.filter((inv) => inv.status === 'Paid')
    } else if (drillLower.includes('pending')) {
      result = result.filter((inv) =>
        ['Pending', 'Approved', 'Processing'].includes(inv.status),
      )
    } else if (drillLower.includes('due today')) {
      result = result.filter((inv) => {
        if (['Paid', 'Rejected'].includes(inv.status)) return false
        const d = new Date(inv.dueDate)
        return (
          d.getFullYear() === TODAY.getFullYear() &&
          d.getMonth() === TODAY.getMonth() &&
          d.getDate() === TODAY.getDate()
        )
      })
    } else if (drillLower.includes('overdue')) {
      result = result.filter(
        (inv) =>
          inv.status !== 'Paid' &&
          inv.status !== 'Rejected' &&
          new Date(inv.dueDate) < TODAY,
      )
    }
    if (drillSupplier)
      result = result.filter((inv) => inv.supplier === drillSupplier)
    if (drillAgingBucket) {
      result = result.filter((inv) => {
        const days = Math.floor(
          (TODAY.getTime() - new Date(inv.dueDate).getTime()) /
            (1000 * 60 * 60 * 24),
        )
        if (drillAgingBucket === '0-15d') return days >= 0 && days <= 15
        if (drillAgingBucket === '16-30d') return days > 15 && days <= 30
        if (drillAgingBucket === '31-45d') return days > 30 && days <= 45
        if (drillAgingBucket === '46-60d') return days > 45 && days <= 60
        if (drillAgingBucket === '60d+') return days > 60
        return true
      })
    }
    if (drillStatus) result = result.filter((inv) => inv.status === drillStatus)
    return result
  }, [
    activeDrill,
    filteredInvoices,
    drillSupplier,
    drillAgingBucket,
    drillStatus,
  ])

  const getStatusClass = (status: string) => {
    const s = String(status || '').toLowerCase()
    switch (s) {
      case 'approved':
        return 'bg-success-light text-success border border-success/20'
      case 'paid':
        return 'bg-primary-3 text-primary-9 border border-primary-4'
      case 'pending':
        return 'bg-orange-2 text-orange-11 border border-orange-3'
      case 'processing':
        return 'bg-cyan-2 text-cyan-11 border border-cyan-3'
      case 'rejected':
        return 'bg-red-2 text-red-11 border border-red-3'
      default:
        return 'bg-gray-2 text-gray-10 border border-gray-3'
    }
  }

  const aiInsightsList = React.useMemo(
    () => [
      {
        node: (
          <>
            Outstanding overdue balances are{' '}
            <span className='font-semibold text-[#1E8E6F]'>down 100%</span>{' '}
            versus last month (<span className='font-semibold'>$0</span> now
            outstanding past due).
          </>
        ),
      },
      {
        node: (
          <>
            Just <span className='font-semibold'>3 suppliers</span> account for{' '}
            <span className='font-semibold'>19%</span> of unpaid liabilities,
            led by{' '}
            <span className='font-semibold'>Harbor Point Consulting</span> at
            $686.5K.
          </>
        ),
      },
      {
        node: (
          <>
            Average approval time increased by{' '}
            <span className='font-semibold text-[#B3261E]'>1.2 days</span> month
            over month, now averaging{' '}
            <span className='font-semibold'>6.1 days</span>.
          </>
        ),
      },
      {
        node: (
          <>
            <span className='font-semibold'>28 invoices</span> flagged as
            potential duplicates — recommend review before release to avoid
            double payment.
          </>
        ),
      },
      {
        node: (
          <>
            Payments due this week total{' '}
            <span className='font-semibold'>$298.7K</span>,{' '}
            <span className='font-semibold text-[#1E8E6F]'>
              below last week by 67%
            </span>
            .
          </>
        ),
      },
      {
        node: (
          <>
            Profit margin decreased to{' '}
            <span className='font-semibold'>12.9%</span>, pressured by higher
            supplier expenses.
          </>
        ),
      },
      {
        node: (
          <>
            <span className='font-semibold'>Legal</span> has the longest
            approval cycle in the current view, averaging{' '}
            <span className='font-semibold'>8.0 days</span> per invoice.
          </>
        ),
      },
      {
        node: (
          <>
            <span className='font-semibold'>10 of 24 suppliers</span> now score
            above 80% on-time delivery, reflecting steadier vendor performance.
          </>
        ),
      },
      {
        node: (
          <>
            Projected cash requirement for the next 4 weeks is{' '}
            <span className='font-semibold'>$755.7K</span> — plan liquidity
            accordingly.
          </>
        ),
      },
    ],
    [],
  )

  const filterOptions = dashboardData?.filterOptions || {}
  const serverActiveFilters = dashboardData?.activeFilters || {}

  const filtersProp = React.useMemo(
    () => [
      {
        dataType: 'date',
        id: 'timeframe',
        label: t`Timeframe`,
        options: [
          { label: t`Today`, value: 'today' },
          { label: t`This week`, value: 'week' },
          { label: t`This month`, value: 'month' },
          { label: t`Last month`, value: 'lastmonth' },
          { label: t`Quarter`, value: 'quarter' },
          { label: t`Financial Year`, value: 'fy' },
          { label: t`Custom Range`, value: 'custom' },
        ],
      },
      {
        id: 'department',
        label: t`Department`,
        options: (filterOptions.departments || []).map((dept: string) => ({
          label: dept,
          value: dept,
        })),
        searchable: true,
        searchPlaceholder: t`Search department...`,
      },
      {
        id: 'supplierCategory',
        label: t`Suppliers`,
        options: (filterOptions.suppliers || []).map((sup: string) => ({
          label: sup,
          value: sup,
        })),
        searchable: true,
        searchPlaceholder: t`Search supplier...`,
      },
      {
        id: 'invoiceStatus',
        label: t`Statuses`,
        options: (filterOptions.approvalStatuses || [])
          .filter((opt: any) => opt.key !== 'all')
          .map((opt: any) => ({
            label: opt.label,
            value: opt.key,
          })),
        searchable: true,
        searchPlaceholder: t`Search status...`,
      },
      {
        id: 'currency',
        label: t`Currencies`,
        options: (filterOptions.currencies || []).map((cur: string) => ({
          label: cur,
          value: cur,
        })),
        searchable: true,
        searchPlaceholder: t`Search currency...`,
      },
    ],
    [filterOptions, t],
  )

  const moreFiltersProp = React.useMemo(
    () => [
      {
        icon: ClipboardList,
        id: 'status',
        label: t`Request Status`,
        options: (filterOptions.requestStatuses || [])
          .filter((opt: any) => opt.key !== 'all')
          .map((opt: any) => ({
            label: opt.label,
            value: opt.key,
          })),
      },
      {
        icon: DollarSign,
        id: 'amount',
        label: t`PO Amount`,
        options: (filterOptions.poAmountTiers || [])
          .filter((opt: any) => opt.key !== 'all')
          .map((opt: any) => ({
            label: opt.label,
            value: opt.key,
          })),
      },
    ],
    [filterOptions, t],
  )

  const radarData = React.useMemo(() => {
    return (dashboardData?.supplierRiskRadar?.segments || []).map(
      (seg: any) => ({
        name: `${seg.label} Risk`,
        value: seg.percent ?? seg.amount ?? 0,
      }),
    )
  }, [dashboardData])

  const profitVsApData = React.useMemo(() => {
    return (dashboardData?.profitVsApSpending?.points || []).map((pt: any) => ({
      AP: pt.primary,
      name: pt.label,
      Profit: pt.secondary,
    }))
  }, [dashboardData])

  const monthlyPaymentData = React.useMemo(() => {
    return (dashboardData?.monthlyPaymentTrend?.points || []).map(
      (pt: any) => ({
        name: pt.label,
        value: pt.primary,
      }),
    )
  }, [dashboardData])

  const cashFlowData = React.useMemo(() => {
    return (dashboardData?.cashFlowForecast?.points || []).map((pt: any) => ({
      name: pt.label,
      value: pt.primary,
    }))
  }, [dashboardData])

  const topSuppliersData = React.useMemo(() => {
    return (dashboardData?.topSuppliersByInvoice || []).map((item: any) => ({
      name: item.supplier,
      value: item.amount,
    }))
  }, [dashboardData])

  const outstandingSuppliersData = React.useMemo(() => {
    return (dashboardData?.outstandingBySupplier || []).map((item: any) => ({
      name: item.supplier,
      value: item.amount,
    }))
  }, [dashboardData])

  const departmentSpendData = React.useMemo(() => {
    return (dashboardData?.departmentSpend || []).map(
      (item: any, idx: number) => {
        const color =
          idx < 4
            ? 'bg-primary-3 text-primary-9 border border-primary-4'
            : 'bg-gray-2 text-text-secondary border border-border-default'
        return {
          amt: fmtMoney(item.amount, item.currency || 'CAD'),
          color,
          name: item.department,
          share: `${item.percent}%`,
        }
      },
    )
  }, [dashboardData])

  const geographyData = React.useMemo(() => {
    return (dashboardData?.supplierGeography || []).map((item: any) => {
      const getFlag = (code: string) => {
        const codeUpper = String(code || '').toUpperCase()
        if (codeUpper === 'US') return '🇺🇸'
        if (codeUpper === 'DE') return '🇩🇪'
        if (codeUpper === 'IN') return '🇮🇳'
        if (codeUpper === 'GB' || codeUpper === 'UK') return '🇬🇧'
        if (codeUpper === 'CA') return '🇨🇦'
        return '🏳️'
      }
      return {
        count: `${item.supplierCount} suppliers`,
        flag: getFlag(item.countryCode),
        pct: item.percent,
        region: item.country || item.countryCode,
        value: fmtMoney(item.amount, item.currency || 'CAD'),
      }
    })
  }, [dashboardData])

  const cashRequiredData = React.useMemo(() => {
    return (dashboardData?.cashFlowForecast?.points || [])
      .slice(0, 7)
      .map((pt: any) => ({
        Cash: pt.primary,
        day: pt.label,
      }))
  }, [dashboardData])

  const dueTodayValue = React.useMemo(() => {
    const kpi = (dashboardData?.kpis || []).find(
      (k: any) => k.key === 'due_today',
    )
    return kpi ? kpi.value : 0
  }, [dashboardData])

  const handleReset = () => {
    resetFilters()
    setDepartment('')
    setRequestStatus('')
    setPoAmountTier('')
  }

  return (
    <div className='flex flex-col gap-4 p-6'>
      {/* 1. QUICK FILTERS ROW */}
      <CustomFilter
        filters={filtersProp}
        moreFilters={moreFiltersProp}
        searchPlaceholder={t`Search invoice, supplier, PO...`}
        searchQuery={searchQuery}
        activeFilters={{
          amount: serverActiveFilters.poAmountTier || '',
          currency: serverActiveFilters.currency || '',
          department: serverActiveFilters.department || '',
          invoiceStatus: serverActiveFilters.status || '',
          status: serverActiveFilters.requestStatus || '',
          supplierCategory: serverActiveFilters.supplier || '',
          timeframe: timeframe || 'month',
        }}
        showReset={
          !!(
            (timeframe && timeframe !== 'month') ||
            supplierCategory ||
            invoiceStatus ||
            currency ||
            department ||
            requestStatus ||
            poAmountTier ||
            searchQuery
          )
        }
        onFilterChange={(id, value) => {
          if (id === 'timeframe') setTimeframe(value || 'month')
          else if (id === 'supplierCategory')
            setSupplierCategory(value as string)
          else if (id === 'invoiceStatus') setInvoiceStatus(value as string)
          else if (id === 'currency') setCurrency(value as string)
          else if (id === 'department') setDepartment(value as string)
          else if (id === 'status') setRequestStatus(value as string)
          else if (id === 'amount') setPoAmountTier(value as string)
        }}
        onReset={handleReset}
        onSearchChange={setSearchQuery}
      />

      {/* 2. AP COMMAND CENTER BANNER */}
      <div
        className='relative flex cursor-pointer flex-wrap items-center justify-between gap-6 overflow-hidden rounded-lg border border-border-default bg-surface px-4 py-4 text-text-primary shadow-xs transition-all duration-300 select-none hover:border-primary-9/40 hover:bg-primary-3/5 hover:shadow-sm active:scale-[0.99]'
        onClick={() => setIsCommandCenterExpanded(!isCommandCenterExpanded)}
      >
        <div className='relative z-10'>
          <h2 className='font-poppins text-14 font-semibold'>
            {t`AP Command Center`}
          </h2>
          <div className='mt-1 font-inter text-11 text-text-muted'>
            {dashboardData?.header?.contextLabel || t`Loading...`}
          </div>
        </div>
        <div className='relative z-10 flex flex-wrap items-center gap-6'>
          <div className='flex flex-col gap-0.5 text-center md:text-right'>
            <span className='font-poppins text-[10px] font-medium tracking-wider text-text-secondary uppercase dark:text-gray-4'>
              {t`Total AP`}
            </span>
            <span className='text-15 font-semibold text-primary-9'>
              {dashboardData?.header?.totalApDisplay ||
                fmtMoney(metrics.totalAP || 0)}
            </span>
          </div>
          <div className='flex flex-col gap-0.5 text-center md:text-right'>
            <span className='font-poppins text-[10px] font-medium tracking-wider text-text-secondary uppercase dark:text-gray-4'>
              {t`Overdue`}
            </span>
            <span
              className={cn(
                'text-15 font-semibold',
                metrics.overdueAmount > 0 ? 'text-red-9' : 'text-primary-9',
              )}
            >
              {dashboardData?.header?.overdueDisplay ||
                fmtMoney(metrics.overdueAmount || 0)}
            </span>
          </div>
          <div className='flex flex-col gap-0.5 text-center md:text-right'>
            <span className='font-poppins text-[10px] font-medium tracking-wider text-text-secondary uppercase dark:text-gray-4'>
              {t`Open Invoices`}
            </span>
            <span className='text-15 font-semibold text-primary-9'>
              {dashboardData?.header?.openInvoices ?? metrics.openInvoices}
            </span>
          </div>
          <div className='flex flex-col gap-0.5 text-center md:text-right'>
            <span className='font-poppins text-[10px] font-medium tracking-wider text-text-secondary uppercase dark:text-gray-4'>
              {t`DPO`}
            </span>
            <span className='text-15 font-semibold text-primary-9'>
              {dashboardData?.header?.dpoDisplay || `${metrics.dpo}d`}
            </span>
          </div>
          <div className='z-20 ml-2 rounded-lg p-1.5 text-text-secondary transition-colors'>
            {isCommandCenterExpanded ? (
              <ChevronUp className='h-5 w-5 text-primary-9' />
            ) : (
              <ChevronDown className='h-5 w-5' />
            )}
          </div>
        </div>
        <div className='absolute -top-12 -right-12 h-48 w-48 rounded-full bg-primary-3/20 blur-xl' />
      </div>

      {/* 3. KPI STRIP */}
      {isCommandCenterExpanded && (
        <div className='animate-in fade-in grid grid-cols-1 gap-4 duration-300 sm:grid-cols-2 md:grid-cols-6'>
          {(dashboardData?.kpis || []).map((kpi: any) => {
            const config = getKpiConfig(kpi.key)
            const trendVal =
              kpi.changePercent !== null && kpi.changePercent !== undefined
                ? `${kpi.changePercent > 0 ? '+' : ''}${kpi.changePercent}%`
                : kpi.trend === 'flat'
                  ? t`Flat`
                  : kpi.trend

            return (
              <div
                key={kpi.key}
                className={cn(
                  'cursor-pointer rounded-lg border border-t-3 border-border-default bg-surface p-4 shadow-xs transition-all hover:-translate-y-0.5',
                  config.color,
                  activeDrill === kpi.label &&
                    'shadow-md ring-2 ring-primary-9/40',
                )}
                onClick={() => handleKpiClick(kpi.label)}
              >
                <div className='text-8 font-poppins font-semibold uppercase'>
                  {kpi.label}
                </div>
                <div className='mt-1.5 font-poppins text-18 font-semibold text-text-primary'>
                  {kpi.displayValue}
                </div>
                <div className='mt-2 flex items-center gap-1.5 text-11 font-semibold'>
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5',
                      config.isGood
                        ? 'bg-success-light text-success'
                        : 'bg-red-2 text-red-11',
                    )}
                  >
                    {trendVal}
                  </span>
                  <span className='font-inter font-normal text-text-muted'>
                    vs last month
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* INLINE DRILL PANEL */}
      {isCommandCenterExpanded && activeDrill && (
        <div className='animate-in fade-in slide-in-from-top-4 rounded-lg border border-border-default bg-surface p-5 shadow-xs'>
          <div className='mb-4 flex items-center justify-between border-b border-border-default pb-3.5'>
            <div>
              <h3 className='font-poppins text-14 font-semibold text-text-primary'>
                Invoices Drill-Down{' '}
                <span className='text-primary-9'>· {activeDrill}</span>
              </h3>
              <p className='mt-0.5 font-inter text-11 text-text-muted'>
                Showing records matching this metrics slice
              </p>
            </div>
            <button
              className='flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-text-muted transition-all hover:bg-gray-2 hover:text-text-primary active:scale-95'
              title='Close panel'
              onClick={() => setActiveDrill(null)}
            >
              <X className='h-4 w-4' />
            </button>
          </div>
          {drillInvoices.length > 0 ? (
            <div className='scrollbar max-h-[300px] overflow-x-auto'>
              <table className='w-full border-collapse text-left text-12'>
                <thead>
                  <tr className='text-10 border-b border-border-default bg-gray-2 font-semibold text-text-muted uppercase'>
                    {[
                      'Invoice',
                      'Supplier',
                      'Department',
                      'Amount',
                      'Due Date',
                      'Status',
                      'Payment Method',
                    ].map((h) => (
                      <th className='p-3' key={h}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {drillInvoices.slice(0, 50).map((inv) => (
                    <tr
                      className='border-b border-gray-3 hover:bg-gray-2/50'
                      key={inv.id}
                    >
                      <td className='p-3 font-mono font-semibold text-primary-9'>
                        {inv.id}
                      </td>
                      <td className='p-3 font-medium text-text-primary'>
                        <span className='mr-1.5'>{inv.flag}</span>
                        {inv.supplier}
                      </td>
                      <td className='p-3 text-text-secondary'>
                        {inv.department}
                      </td>
                      <td className='p-3 text-right font-mono font-semibold text-text-primary'>
                        {fmtMoney(inv.amount, inv.currency)}
                      </td>
                      <td className='p-3 text-text-secondary'>
                        {new Date(inv.dueDate).toLocaleDateString()}
                      </td>
                      <td className='p-3'>
                        <span
                          className={cn(
                            'text-10 rounded-full px-2 py-0.5 font-semibold',
                            getStatusClass(inv.status),
                          )}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className='p-3 text-text-muted'>
                        {inv.paymentMethod}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {drillInvoices.length > 50 && (
                <div className='mt-3 text-center text-11 text-text-muted'>
                  Showing first 50 of {drillInvoices.length} invoices.
                </div>
              )}
            </div>
          ) : (
            <div className='py-6 text-center text-12 text-text-muted'>
              No matching invoice records in this slice.
            </div>
          )}
        </div>
      )}

      {/* 4. TRACK CONTENTS */}
      {role === 'management' ? (
        /* ===== MANAGEMENT TRACK ===== */
        <div className='flex flex-col gap-4'>
          {/* AI Insights + Supplier Radar */}
          {isCommandCenterExpanded && (
            <div className='grid grid-cols-12 gap-4'>
              <div className='col-span-12 rounded-lg border border-border-default bg-surface p-5 shadow-xs lg:col-span-8'>
                <div className='mb-4 flex items-center justify-between'>
                  <div>
                    <h3 className='font-poppins text-14 font-semibold text-text-primary'>
                      AI-generated insights
                    </h3>
                    <div className='mt-0.5 font-inter text-11 text-text-muted'>
                      Auto-updates with your filters — the ledger's margin notes
                    </div>
                  </div>
                  <span className='text-10 rounded border border-border-default bg-surface px-1.5 py-0.5 font-semibold text-text-muted'>
                    LIVE
                  </span>
                </div>
                <ul className='flex flex-col'>
                  {aiInsightsList.map((insight, idx) => (
                    <li
                      className='flex gap-3 border-b border-dashed border-border-default py-2.5 text-[13px] text-text-secondary first:pt-0 last:border-b-0 last:pb-0'
                      key={idx}
                    >
                      <BulletIcon />
                      <div>{insight.node}</div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className='col-span-12 rounded-lg border border-border-default bg-surface p-5 shadow-xs lg:col-span-4'>
                <h3 className='font-poppins text-14 font-semibold text-text-primary'>
                  {dashboardData?.supplierRiskRadar?.title ||
                    'Supplier Risk Radar'}
                </h3>
                <div className='mb-4 font-inter text-11 text-text-muted'>
                  {dashboardData?.supplierRiskRadar?.subtitle ||
                    'Which vendors carry the most risk exposure?'}
                </div>
                <div className='h-56'>
                  <ResponsiveContainer height='100%' width='100%'>
                    <PieChart>
                      <Pie
                        cx='50%'
                        cy='50%'
                        data={radarData}
                        dataKey='value'
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={3}
                      >
                        {radarData.map((_entry: any, idx: number) => {
                          const colors = ['#1E8E6F', '#0f7a86', '#B3261E']
                          return (
                            <Cell
                              fill={colors[idx % colors.length]}
                              key={idx}
                            />
                          )
                        })}
                      </Pie>
                      <Tooltip formatter={(v: any) => [`${v}%`, 'Exposure']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className='mt-2 flex justify-around font-inter text-11'>
                  <span className='flex items-center gap-1.5'>
                    <span className='bg-success h-2.5 w-2.5 rounded' />
                    Low
                  </span>
                  <span className='flex items-center gap-1.5'>
                    <span className='bg-warning h-2.5 w-2.5 rounded' />
                    Medium
                  </span>
                  <span className='flex items-center gap-1.5'>
                    <span className='h-2.5 w-2.5 rounded bg-red-9' />
                    High
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Profitability Section */}
          <div className='flex flex-col gap-4'>
            <div
              className='flex cursor-pointer flex-wrap items-center justify-between gap-4 overflow-hidden rounded-lg border border-border-default bg-surface px-4 py-4 text-text-primary shadow-xs transition-all duration-300 select-none hover:border-primary-9/40 hover:bg-primary-3/5 hover:shadow-sm active:scale-[0.99]'
              onClick={() =>
                setIsProfitabilityExpanded(!isProfitabilityExpanded)
              }
            >
              <div>
                <h3 className='font-poppins text-14 font-semibold'>
                  Profitability &amp; Cash Position
                </h3>
                <p className='mt-0.5 font-inter text-11 text-text-secondary'>
                  Is payables growth eating margin · future liquidity needs
                </p>
              </div>
              <div className='flex flex-wrap items-center gap-6'>
                <div className='flex flex-col gap-0.5 text-center md:text-right'>
                  <span className='font-poppins text-[10px] font-medium tracking-wider text-text-secondary uppercase dark:text-gray-4'>
                    Profit Margin
                  </span>
                  <span className='text-15 font-semibold text-cyan-9'>
                    12.9%
                  </span>
                </div>
                <div className='flex flex-col gap-0.5 text-center md:text-right'>
                  <span className='font-poppins text-[10px] font-medium tracking-wider text-text-secondary uppercase dark:text-gray-4'>
                    Next 4 Weeks
                  </span>
                  <span className='text-15 font-semibold text-primary-9'>
                    $3.85M
                  </span>
                </div>
                <div className='flex flex-col gap-0.5 text-center md:text-right'>
                  <span className='font-poppins text-[10px] font-medium tracking-wider text-text-secondary uppercase dark:text-gray-4'>
                    Peak Week
                  </span>
                  <span className='text-15 font-semibold text-primary-9'>
                    Week 3
                  </span>
                </div>
                <div className='z-20 ml-2 rounded-lg p-1.5 text-text-secondary transition-colors'>
                  {isProfitabilityExpanded ? (
                    <ChevronUp className='h-5 w-5 text-primary-9' />
                  ) : (
                    <ChevronDown className='h-5 w-5' />
                  )}
                </div>
              </div>
            </div>

            {isProfitabilityExpanded && (
              <div className='grid grid-cols-12 gap-4'>
                <div className='col-span-12 rounded-lg border border-border-default bg-surface p-5 shadow-xs lg:col-span-6'>
                  <h3 className='font-poppins text-14 font-semibold text-text-primary'>
                    {dashboardData?.profitVsApSpending?.title ||
                      'Profit vs AP spending'}
                  </h3>
                  <div className='mb-4 font-inter text-11 text-text-muted'>
                    {dashboardData?.profitVsApSpending?.subtitle ||
                      'Dual axis spending trend comparison'}
                  </div>
                  <div className='h-64'>
                    <ResponsiveContainer height='100%' width='100%'>
                      <ComposedChart data={profitVsApData}>
                        <CartesianGrid strokeDasharray='3 3' vertical={false} />
                        <XAxis dataKey='name' tick={{ fontSize: 11 }} />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          yAxisId='left'
                          label={{
                            angle: -90,
                            position: 'insideLeft',
                            style: { fontSize: 10 },
                            value: 'AP Amount',
                          }}
                        />
                        <YAxis
                          orientation='right'
                          tick={{ fontSize: 11 }}
                          yAxisId='right'
                          label={{
                            angle: 90,
                            position: 'insideRight',
                            style: { fontSize: 10 },
                            value: 'Profit %',
                          }}
                        />
                        <Tooltip
                          formatter={(v: any, name?: string) =>
                            name === 'Profit'
                              ? [`${v}%`, name]
                              : [fmtMoney(v), name || '']
                          }
                        />
                        <Bar
                          barSize={20}
                          dataKey='AP'
                          fill='#8300e6'
                          radius={[4, 4, 0, 0]}
                          yAxisId='left'
                        />
                        <Line
                          dataKey='Profit'
                          dot={{ r: 4 }}
                          stroke='#19c1d4'
                          strokeWidth={2.5}
                          type='monotone'
                          yAxisId='right'
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className='col-span-12 rounded-lg border border-border-default bg-surface p-5 shadow-xs lg:col-span-6'>
                  <h3 className='font-poppins text-14 font-semibold text-text-primary'>
                    {dashboardData?.monthlyPaymentTrend?.title ||
                      'Monthly payment trend'}
                  </h3>
                  <div className='mb-4 font-inter text-11 text-text-muted'>
                    {dashboardData?.monthlyPaymentTrend?.subtitle ||
                      'Cash leaving the building, month by month'}
                  </div>
                  <div className='h-64'>
                    <ResponsiveContainer height='100%' width='100%'>
                      <AreaChart data={monthlyPaymentData}>
                        <defs>
                          <linearGradient
                            id='paymentGrad'
                            x1='0'
                            x2='0'
                            y1='0'
                            y2='1'
                          >
                            <stop
                              offset='5%'
                              stopColor='#8300e6'
                              stopOpacity={0.3}
                            />
                            <stop
                              offset='95%'
                              stopColor='#8300e6'
                              stopOpacity={0.0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray='3 3' vertical={false} />
                        <XAxis dataKey='name' tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: any) => [fmtMoney(v)]} />
                        <Area
                          dataKey='value'
                          fill='url(#paymentGrad)'
                          fillOpacity={1}
                          stroke='#8300e6'
                          strokeWidth={2}
                          type='monotone'
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className='col-span-12 rounded-lg border border-border-default bg-surface p-5 shadow-xs'>
                  <h3 className='font-poppins text-14 font-semibold text-text-primary'>
                    {dashboardData?.cashFlowForecast?.title ||
                      'Cash out forecast'}
                  </h3>
                  <div className='mb-4 font-inter text-11 text-text-muted'>
                    {dashboardData?.cashFlowForecast?.subtitle ||
                      'Liquidity projection and cash needs over next 10 weeks'}
                  </div>
                  <div className='h-56'>
                    <ResponsiveContainer height='100%' width='100%'>
                      <AreaChart data={cashFlowData}>
                        <defs>
                          <linearGradient
                            id='forecastGrad'
                            x1='0'
                            x2='0'
                            y1='0'
                            y2='1'
                          >
                            <stop
                              offset='5%'
                              stopColor='#5c21e6'
                              stopOpacity={0.25}
                            />
                            <stop
                              offset='95%'
                              stopColor='#5c21e6'
                              stopOpacity={0.0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray='3 3' vertical={false} />
                        <XAxis dataKey='name' tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: any) => [fmtMoney(v)]} />
                        <Area
                          dataKey='value'
                          fill='url(#forecastGrad)'
                          fillOpacity={1}
                          stroke='#5c21e6'
                          strokeWidth={2}
                          type='monotone'
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Supplier Concentration Section */}
          <div className='flex flex-col gap-4'>
            <div
              className='flex cursor-pointer flex-wrap items-center justify-between gap-4 overflow-hidden rounded-lg border border-border-default bg-surface px-4 py-4 text-text-primary shadow-xs transition-all duration-300 select-none hover:border-primary-9/40 hover:bg-primary-3/5 hover:shadow-sm active:scale-[0.99]'
              onClick={() =>
                setIsSupplierConcentrationExpanded(
                  !isSupplierConcentrationExpanded,
                )
              }
            >
              <div>
                <h3 className='font-poppins text-14 font-semibold'>
                  Supplier Concentration &amp; Risk
                </h3>
                <p className='mt-0.5 font-inter text-11 text-text-secondary'>
                  Where spend concentrates · vendor risk exposure
                </p>
              </div>
              <div className='flex flex-wrap items-center gap-6'>
                <div className='flex flex-col gap-0.5 text-center md:text-right'>
                  <span className='font-poppins text-[10px] font-medium tracking-wider text-text-secondary uppercase dark:text-gray-4'>
                    Active Suppliers
                  </span>
                  <span className='text-15 font-semibold text-primary-9'>
                    24
                  </span>
                </div>
                <div className='flex flex-col gap-0.5 text-center md:text-right'>
                  <span className='font-poppins text-[10px] font-medium tracking-wider text-text-secondary uppercase dark:text-gray-4'>
                    High Risk
                  </span>
                  <span className='text-15 font-semibold text-red-9'>3</span>
                </div>
                <div className='flex flex-col gap-0.5 text-center md:text-right'>
                  <span className='font-poppins text-[10px] font-medium tracking-wider text-text-secondary uppercase dark:text-gray-4'>
                    Top-3 Concentration
                  </span>
                  <span className='text-15 font-semibold text-primary-9'>
                    44.0%
                  </span>
                </div>
                <div className='z-20 ml-2 rounded-lg p-1.5 text-text-secondary transition-colors'>
                  {isSupplierConcentrationExpanded ? (
                    <ChevronUp className='h-5 w-5 text-primary-9' />
                  ) : (
                    <ChevronDown className='h-5 w-5' />
                  )}
                </div>
              </div>
            </div>

            {isSupplierConcentrationExpanded && (
              <div className='grid grid-cols-12 gap-4'>
                <div
                  className={cn(
                    'rounded-lg border border-border-default bg-surface p-5 shadow-xs transition-all duration-300',
                    isCommandCenterExpanded
                      ? 'col-span-12 lg:col-span-4'
                      : 'col-span-12 lg:col-span-4',
                  )}
                >
                  <h3 className='font-poppins text-14 font-semibold text-text-primary'>
                    Top 10 suppliers by invoice value
                  </h3>
                  <div className='mb-4 font-inter text-11 text-text-muted'>
                    Concentration of invoice liabilities
                  </div>
                  <div className='h-60'>
                    <ResponsiveContainer height='100%' width='100%'>
                      <BarChart
                        data={topSuppliersData}
                        layout='vertical'
                        margin={{ left: -10, right: 10 }}
                      >
                        <XAxis tick={{ fontSize: 10 }} type='number' />
                        <YAxis
                          dataKey='name'
                          tick={{ fontSize: 10 }}
                          type='category'
                          width={90}
                        />
                        <Tooltip formatter={(v: any) => [fmtMoney(v)]} />
                        <Bar
                          barSize={12}
                          dataKey='value'
                          fill='#8300e6'
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {isSupplierConcentrationExpanded && (
                  <div className='col-span-12 rounded-lg border border-border-default bg-surface p-5 shadow-xs lg:col-span-4'>
                    <h3 className='font-poppins text-14 font-semibold text-text-primary'>
                      Outstanding payables by supplier
                    </h3>
                    <div className='mb-4 font-inter text-11 text-text-muted'>
                      Click a supplier's bar to drill down
                    </div>
                    <div className='h-60'>
                      <ResponsiveContainer height='100%' width='100%'>
                        <BarChart
                          data={outstandingSuppliersData}
                          layout='vertical'
                          margin={{ left: -10, right: 10 }}
                        >
                          <XAxis tick={{ fontSize: 10 }} type='number' />
                          <YAxis
                            dataKey='name'
                            tick={{ fontSize: 10 }}
                            type='category'
                            width={90}
                          />
                          <Tooltip formatter={(v: any) => [fmtMoney(v)]} />
                          <Bar
                            barSize={12}
                            className='cursor-pointer'
                            dataKey='value'
                            fill='#5c21e6'
                            radius={[0, 4, 4, 0]}
                            onClick={(data: any) => {
                              setDrillSupplier(data?.name ?? null)
                              setActiveDrill('Outstanding Payables')
                            }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <div
                  className={cn(
                    'rounded-lg border border-border-default bg-surface p-5 shadow-xs transition-all duration-300',
                    isCommandCenterExpanded
                      ? 'col-span-12 lg:col-span-4'
                      : 'col-span-12 lg:col-span-4',
                  )}
                >
                  <h3 className='font-poppins text-14 font-semibold text-text-primary'>
                    Department-wise spend
                  </h3>
                  <div className='mb-4 font-inter text-11 text-text-muted'>
                    Tile size reflects share of AP expenses
                  </div>
                  <div className='grid h-48 grid-cols-2 gap-2'>
                    {departmentSpendData.map((dept: any) => (
                      <div
                        key={dept.name}
                        className={cn(
                          'flex cursor-pointer flex-col justify-between rounded-lg p-2.5 transition-all hover:scale-[1.02]',
                          dept.color,
                        )}
                        onClick={() => {
                          setSearchQuery(dept.name)
                          setActiveDrill('Department Spend')
                        }}
                      >
                        <span className='text-10 font-inter font-semibold'>
                          {dept.name}
                        </span>
                        <div className='mt-1 flex items-baseline justify-between'>
                          <span className='font-poppins text-14 font-semibold'>
                            {dept.amt}
                          </span>
                          <span className='text-9 font-inter opacity-80'>
                            {dept.share}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className='text-10 mt-3 font-inter text-text-muted'>
                    Click on a tile to filter workflow records.
                  </div>
                </div>

                <div className='col-span-12 rounded-lg border border-border-default bg-surface p-5 shadow-xs'>
                  <h3 className='font-poppins text-14 font-semibold text-text-primary'>
                    Supplier geographic distribution
                  </h3>
                  <div className='mb-4 font-inter text-11 text-text-muted'>
                    Regional volume and spend exposure analysis
                  </div>
                  <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4'>
                    {geographyData.map((tile: any) => (
                      <div
                        className='rounded-xl border border-border-default bg-gray-2 p-3'
                        key={tile.region}
                      >
                        <div className='flex items-center justify-between font-inter text-12 font-semibold text-text-primary'>
                          <span className='flex items-center gap-1.5'>
                            <span className='text-16'>{tile.flag}</span>
                            {tile.region}
                          </span>
                          <span>{tile.value}</span>
                        </div>
                        <div className='mt-3 h-1.5 w-full overflow-hidden rounded-full bg-border-default'>
                          <div
                            className='h-full bg-primary-9'
                            style={{ width: `${tile.pct}%` }}
                          />
                        </div>
                        <div className='text-10 mt-2 flex justify-between font-inter text-text-muted'>
                          <span>{tile.count}</span>
                          <span>{tile.pct}% share</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Aging Section */}
          <div className='flex flex-col gap-4'>
            <div
              className='flex cursor-pointer flex-wrap items-center justify-between gap-4 overflow-hidden rounded-lg border border-border-default bg-surface px-4 py-4 text-text-primary shadow-xs transition-all duration-300 select-none hover:border-primary-9/40 hover:bg-primary-3/5 hover:shadow-sm active:scale-[0.99]'
              onClick={() =>
                setIsSupplierFollowUpExpanded(!isSupplierFollowUpExpanded)
              }
            >
              <div>
                <h3 className='font-poppins text-14 font-semibold'>
                  Aging &amp; Process Oversight
                </h3>
                <p className='mt-0.5 font-inter text-11 text-text-secondary'>
                  Portfolio-level view of overdue exposure and approval cycles
                </p>
              </div>
              <div className='flex flex-wrap items-center gap-6'>
                <div className='flex flex-col gap-0.5 text-center md:text-right'>
                  <span className='font-poppins text-[10px] font-medium tracking-wider text-text-secondary uppercase dark:text-gray-4'>
                    90+ Days
                  </span>
                  <span className='text-15 font-semibold text-primary-9'>
                    $1.24M
                  </span>
                </div>
                <div className='flex flex-col gap-0.5 text-center md:text-right'>
                  <span className='font-poppins text-[10px] font-medium tracking-wider text-text-secondary uppercase dark:text-gray-4'>
                    Critical Exceptions
                  </span>
                  <span className='text-15 font-semibold text-red-9'>4</span>
                </div>
                <div className='flex flex-col gap-0.5 text-center md:text-right'>
                  <span className='font-poppins text-[10px] font-medium tracking-wider text-text-secondary uppercase dark:text-gray-4'>
                    Approval Rate
                  </span>
                  <span className='text-success text-15 font-semibold'>
                    94.2%
                  </span>
                </div>
                <div className='z-20 ml-2 rounded-lg p-1.5 text-text-secondary transition-colors'>
                  {isSupplierFollowUpExpanded ? (
                    <ChevronUp className='h-5 w-5 text-primary-9' />
                  ) : (
                    <ChevronDown className='h-5 w-5' />
                  )}
                </div>
              </div>
            </div>

            {isSupplierFollowUpExpanded && (
              <div className='grid grid-cols-12 gap-5'>
                <div className='col-span-12 rounded-lg border border-border-default bg-surface p-5 shadow-xs lg:col-span-6'>
                  <h3 className='font-poppins text-14 font-semibold text-text-primary'>
                    Invoice aging analysis
                  </h3>
                  <div className='mb-4 font-inter text-11 text-text-muted'>
                    Click a segment to drill into invoices
                  </div>
                  <div className='h-64'>
                    <ResponsiveContainer height='100%' width='100%'>
                      <BarChart
                        margin={{ bottom: 10 }}
                        data={[
                          { name: '0–15d', value: 1842 },
                          { name: '16–30d', value: 1205 },
                          { name: '31–45d', value: 623 },
                          { name: '46–60d', value: 298 },
                          { name: '60d+', value: 134 },
                        ]}
                      >
                        <CartesianGrid strokeDasharray='3 3' vertical={false} />
                        <XAxis dataKey='name' tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(v: any) => [`${v} Invoices`, 'Volume']}
                        />
                        <Bar
                          barSize={24}
                          className='cursor-pointer'
                          dataKey='value'
                          fill='#8300e6'
                          radius={[4, 4, 0, 0]}
                          onClick={(data: any) => {
                            setDrillAgingBucket(data?.name ?? null)
                            setActiveDrill('Aging Analysis')
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className='col-span-12 rounded-lg border border-border-default bg-surface p-5 shadow-xs lg:col-span-6'>
                  <h3 className='font-poppins text-14 font-semibold text-text-primary'>
                    Approval delay heat map
                  </h3>
                  <div className='mb-4 font-inter text-11 text-text-muted'>
                    Average days to approve by department · last 8 weeks
                  </div>
                  <div className='mt-3 flex flex-col gap-2 font-inter'>
                    <div className='grid grid-cols-9 gap-1 text-center text-[10px] font-semibold text-text-muted'>
                      <div></div>
                      {['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'].map(
                        (w) => (
                          <div key={w}>{w}</div>
                        ),
                      )}
                    </div>
                    {[
                      { cells: [2, 1, 3, 2, 4, 5, 2, 1], dept: 'IT' },
                      { cells: [1, 2, 1, 1, 2, 1, 3, 1], dept: 'Finance' },
                      { cells: [5, 4, 6, 8, 7, 5, 6, 5], dept: 'Marketing' },
                      { cells: [3, 2, 4, 3, 3, 4, 2, 3], dept: 'Operations' },
                      { cells: [4, 5, 3, 4, 5, 2, 4, 4], dept: 'HR' },
                      { cells: [6, 7, 9, 8, 7, 6, 9, 8], dept: 'Legal' },
                    ].map((row) => (
                      <div
                        className='grid grid-cols-9 items-center gap-1'
                        key={row.dept}
                      >
                        <div className='pr-2 text-right text-11 font-semibold text-text-secondary'>
                          {row.dept}
                        </div>
                        {row.cells.map((val, idx) => {
                          let color = 'bg-[#F1E1FC]'
                          if (val > 7) color = 'bg-[#643094] text-white'
                          else if (val > 4) color = 'bg-[#8300e6] text-white'
                          else if (val > 2)
                            color = 'bg-[#EEE6FD] text-primary-9'
                          return (
                            <div
                              key={idx}
                              title={`${row.dept}: ${val} days`}
                              className={cn(
                                'flex h-8 items-center justify-center rounded text-11 font-semibold',
                                color,
                              )}
                            >
                              {val}d
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                  <div className='text-10 mt-3 font-inter text-text-muted'>
                    Darker cells indicate longer processing bottlenecks.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ===== AP TEAM TRACK ===== */
        <div className='flex flex-col gap-4'>
          {/* AI Insights + Duplicate Watch (Conditionally visible) */}
          {isCommandCenterExpanded && (
            <div className='grid grid-cols-12 gap-4'>
              <div className='col-span-12 rounded-lg border border-border-default bg-surface p-5 shadow-xs lg:col-span-8'>
                <div className='mb-4 flex items-center justify-between'>
                  <div>
                    <h3 className='font-poppins text-14 font-semibold text-text-primary'>
                      AI-generated insights
                    </h3>
                    <div className='mt-0.5 font-inter text-11 text-text-muted'>
                      Auto-updates with your filters — the ledger's margin notes
                    </div>
                  </div>
                  <span className='text-10 rounded border border-border-default bg-surface px-1.5 py-0.5 font-semibold text-text-muted'>
                    LIVE
                  </span>
                </div>
                <ul className='flex flex-col'>
                  {aiInsightsList.map((insight, idx) => (
                    <li
                      className='flex gap-3 border-b border-dashed border-border-default py-2.5 text-[13px] text-text-secondary first:pt-0 last:border-b-0 last:pb-0'
                      key={idx}
                    >
                      <BulletIcon />
                      <div>{insight.node}</div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className='col-span-12 rounded-lg border border-border-default bg-surface p-5 shadow-xs lg:col-span-4'>
                <h3 className='font-poppins text-14 font-semibold text-text-primary'>
                  Duplicate invoice watch
                </h3>
                <div className='mb-3 font-inter text-11 text-text-muted'>
                  Double payments flagged by ledger algorithms
                </div>
                <div className='scrollbar flex max-h-[auto] flex-col gap-2 overflow-y-auto'>
                  {[
                    {
                      amt: '₹4,984',
                      id: 'INV-20043',
                      match: '98%',
                      supplier: 'Coral Bay Marketing',
                    },
                    {
                      amt: '$144,788',
                      id: 'INV-20056',
                      match: '96%',
                      supplier: 'Silverline Telecom',
                    },
                    {
                      amt: '₹123,151',
                      id: 'INV-20112',
                      match: '95%',
                      supplier: 'Prism Packaging Co.',
                    },
                    {
                      amt: '€33,194',
                      id: 'INV-20121',
                      match: '94%',
                      supplier: 'Vertex IT Solutions',
                    },
                    {
                      amt: '€149,343',
                      id: 'INV-20134',
                      match: '92%',
                      supplier: 'Atlas Freight Partners',
                    },
                  ].map((item) => (
                    <div
                      className='flex items-center justify-between border-b border-gray-3 pb-2 text-11 last:border-b-0'
                      key={item.id}
                    >
                      <div>
                        <span className='font-mono font-semibold text-red-9'>
                          {item.id}
                        </span>
                        <span className='ml-2 font-inter font-medium text-text-primary'>
                          {item.supplier}
                        </span>
                      </div>
                      <div className='text-right'>
                        <div className='font-semibold text-text-primary'>
                          {item.amt}
                        </div>
                        <div className='font-inter text-[9px] font-semibold text-red-11'>
                          {item.match} match
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Details below */}
          <div className='flex flex-col gap-4'>
            {/* Today's Action Queue — conditionally shown */}

            <>
              <div
                className='flex cursor-pointer flex-wrap items-center justify-between gap-4 overflow-hidden rounded-lg border border-border-default bg-surface px-4 py-4 text-text-primary shadow-xs transition-all duration-300 select-none hover:border-primary-9/40 hover:bg-primary-3/5 hover:shadow-sm active:scale-[0.99]'
                onClick={() => setIsTodayActionExpanded(!isTodayActionExpanded)}
              >
                <div>
                  <h3 className='font-poppins text-14 font-semibold'>
                    Today's Action Queue
                  </h3>
                  <p className='mt-0.5 font-inter text-11 text-text-secondary'>
                    Prioritized invoice items requiring attention today
                  </p>
                </div>
                <div className='flex flex-wrap items-center gap-6'>
                  <div className='flex flex-col gap-0.5 text-center md:text-right'>
                    <span className='font-poppins text-[10px] font-medium tracking-wider text-text-secondary uppercase dark:text-gray-4'>
                      Due Today
                    </span>
                    <span className='text-15 font-semibold text-cyan-9'>
                      {fmtMoney(dueTodayValue)}
                    </span>
                  </div>
                  <div className='flex flex-col gap-0.5 text-center md:text-right'>
                    <span className='font-poppins text-[10px] font-medium tracking-wider text-text-secondary uppercase dark:text-gray-4'>
                      Cash This Week
                    </span>
                    <span className='text-15 font-semibold text-primary-9'>
                      $298.7K
                    </span>
                  </div>
                  <div className='flex flex-col gap-0.5 text-center md:text-right'>
                    <span className='font-poppins text-[10px] font-medium tracking-wider text-text-secondary uppercase dark:text-gray-4'>
                      Queue Size
                    </span>
                    <span className='text-15 font-semibold text-primary-9'>
                      {
                        filteredInvoices.filter(
                          (inv) =>
                            (inv.status || '').toLowerCase() === 'pending',
                        ).length
                      }{' '}
                      items
                    </span>
                  </div>
                  <div className='z-20 ml-2 rounded-lg p-1.5 text-text-secondary transition-colors'>
                    {isTodayActionExpanded ? (
                      <ChevronUp className='h-5 w-5 text-primary-9' />
                    ) : (
                      <ChevronDown className='h-5 w-5' />
                    )}
                  </div>
                </div>
              </div>

              {isTodayActionExpanded && (
                <div className='grid grid-cols-12 gap-4'>
                  {/* AP Workbench */}
                  <div className='col-span-12 rounded-lg border border-border-default bg-surface p-5 shadow-xs'>
                    <div className='mb-4 flex items-center justify-between border-b border-border-default pb-3.5'>
                      <div>
                        <h3 className='font-poppins text-14 font-semibold text-text-primary'>
                          AP workbench — prioritized queue
                        </h3>
                        <div className='font-inter text-11 text-text-muted'>
                          Overdue and due-soonest first — process top-down
                        </div>
                      </div>
                      <span className='text-10 rounded-full bg-primary-3 px-3 py-0.5 font-semibold text-primary-9'>
                        {filteredInvoices.slice(0, 10).length} prioritized
                      </span>
                    </div>
                    <div className='scrollbar overflow-x-auto'>
                      <table className='w-full border-collapse text-left text-12'>
                        <thead>
                          <tr className='text-10 border-b border-border-default bg-gray-2 font-semibold text-text-muted uppercase'>
                            {[
                              'Priority',
                              'Invoice',
                              'Supplier',
                              'Department',
                              'Amount',
                              'Due Date',
                              'Status',
                              'Buyer',
                              'Actions',
                            ].map((h) => (
                              <th className='p-3' key={h}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredInvoices.slice(0, 8).map((inv, idx) => {
                            const invId =
                              inv.id || inv.invoiceId || inv.invoiceNo || ''
                            const isExpanded = expandedInvoiceId === invId
                            const supplier =
                              inv.supplier || inv.supplierName || ''
                            const costCenter =
                              inv.costCenter || inv.poNumber || ''
                            const profitCenter = inv.profitCenter || ''
                            const paymentMethod = inv.paymentMethod || 'ACH'
                            const isDuplicate = inv.isDuplicate || false
                            const buyer = inv.buyer || 'Unknown'
                            const amount = inv.amount || 0
                            const currency = inv.currency || 'USD'
                            const dueDate = inv.dueDate
                              ? new Date(inv.dueDate)
                              : new Date()

                            return (
                              <React.Fragment key={invId}>
                                <tr className='border-b border-gray-3 hover:bg-gray-2/50'>
                                  <td className='p-3'>
                                    <span
                                      className={cn(
                                        'inline-block h-2 w-2 rounded-full',
                                        idx === 0
                                          ? 'bg-red-9'
                                          : idx < 3
                                            ? 'bg-warning'
                                            : 'bg-success',
                                      )}
                                    />
                                  </td>
                                  <td className='p-3 font-mono font-semibold text-primary-9'>
                                    {invId}
                                  </td>
                                  <td className='p-3 font-medium text-text-primary'>
                                    <span className='mr-1.5'>
                                      {inv.flag || ''}
                                    </span>
                                    {supplier}
                                  </td>
                                  <td className='p-3 text-text-secondary'>
                                    {inv.department || ''}
                                  </td>
                                  <td className='p-3 text-right font-mono font-semibold text-text-primary'>
                                    {fmtMoney(amount, currency)}
                                  </td>
                                  <td className='p-3 text-text-secondary'>
                                    {dueDate.toLocaleDateString()}
                                  </td>
                                  <td className='p-3'>
                                    <span
                                      className={cn(
                                        'text-10 rounded-full px-2 py-0.5 font-semibold',
                                        getStatusClass(inv.status),
                                      )}
                                    >
                                      {inv.status || 'Pending'}
                                    </span>
                                  </td>
                                  <td className='p-3 text-text-muted'>
                                    {buyer}
                                  </td>
                                  <td className='p-3 text-right'>
                                    <div className='inline-flex items-center justify-end gap-2'>
                                      <button
                                        className='text-10 cursor-pointer rounded border border-border-default bg-surface px-2.5 py-1 font-semibold text-primary-9 transition-all hover:bg-primary-9 hover:text-white'
                                        onClick={() => {
                                          setDrillSupplier(supplier)
                                          setActiveDrill('Outstanding Payables')
                                        }}
                                      >
                                        Action
                                      </button>
                                      <button
                                        className='cursor-pointer rounded p-1 text-text-secondary transition-colors hover:bg-gray-3'
                                        onClick={() =>
                                          setExpandedInvoiceId(
                                            isExpanded ? null : invId,
                                          )
                                        }
                                      >
                                        {isExpanded ? (
                                          <ChevronUp className='h-4 w-4 text-primary-9' />
                                        ) : (
                                          <ChevronDown className='h-4 w-4' />
                                        )}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                                {isExpanded && (
                                  <tr className='bg-primary-3/10 dark:bg-gray-12/30'>
                                    <td
                                      className='border-b border-border-default p-4'
                                      colSpan={9}
                                    >
                                      <div className='grid grid-cols-2 gap-4 font-inter text-11 text-text-secondary md:grid-cols-4'>
                                        <div>
                                          <div className='font-semibold text-text-muted'>
                                            PO Reference
                                          </div>
                                          <div className='mt-0.5 font-mono text-text-primary'>
                                            {costCenter.replace('CC-', 'PO-')}
                                          </div>
                                        </div>
                                        <div>
                                          <div className='font-semibold text-text-muted'>
                                            Cost Center
                                          </div>
                                          <div className='mt-0.5 text-text-primary'>
                                            {costCenter}
                                          </div>
                                        </div>
                                        <div>
                                          <div className='font-semibold text-text-muted'>
                                            Profit Center
                                          </div>
                                          <div className='mt-0.5 text-text-primary'>
                                            {profitCenter}
                                          </div>
                                        </div>
                                        <div>
                                          <div className='font-semibold text-text-muted'>
                                            Payment Channel
                                          </div>
                                          <div className='mt-0.5 text-text-primary'>
                                            {paymentMethod}
                                          </div>
                                        </div>
                                      </div>
                                      <div className='mt-3 rounded border border-orange-3/30 bg-orange-2/30 p-2.5 font-inter text-11 text-orange-11'>
                                        <strong>
                                          Ledger Verification Note:
                                        </strong>{' '}
                                        Invoice matched against approved master
                                        list.{' '}
                                        {isDuplicate
                                          ? 'ALERT: Potential duplicate invoice match. Review before release.'
                                          : 'Standard SLA timeline. No pricing exceptions found.'}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Payment Calendar */}
                  {isTodayActionExpanded && (
                    <div className='col-span-12 rounded-lg border border-border-default bg-surface p-5 shadow-xs lg:col-span-5'>
                      <h3 className='font-poppins text-14 font-semibold text-text-primary'>
                        Payment calendar
                      </h3>
                      <div className='mb-4 font-inter text-11 text-text-muted'>
                        Scheduled payments calendar heatmap
                      </div>
                      <div className='grid grid-cols-7 gap-1 text-center font-inter'>
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                          <div
                            className='text-10 py-1 font-semibold text-text-muted'
                            key={i}
                          >
                            {d}
                          </div>
                        ))}
                        {Array.from({ length: 4 }).map((_, idx) => (
                          <div className='h-8' key={`e-${idx}`} />
                        ))}
                        {Array.from({ length: 30 }).map((_, idx) => {
                          const day = idx + 1
                          const isToday = day === 8
                          const isDue = [5, 12, 18, 22, 25, 29].includes(day)
                          let cellStyle =
                            'bg-gray-2 text-text-secondary hover:bg-gray-3'
                          if (isToday)
                            cellStyle = 'bg-primary-9 text-white font-semibold'
                          else if (isDue)
                            cellStyle =
                              'bg-primary-3 text-primary-9 font-semibold'
                          return (
                            <div
                              key={day}
                              className={cn(
                                'flex h-8 cursor-pointer items-center justify-center rounded text-11 transition-all',
                                cellStyle,
                              )}
                              title={
                                isToday
                                  ? 'Today'
                                  : isDue
                                    ? 'Payment due date'
                                    : ''
                              }
                            >
                              {day}
                            </div>
                          )
                        })}
                      </div>
                      <div className='text-10 mt-4 flex justify-center gap-4 font-inter text-text-muted'>
                        <span className='flex items-center gap-1.5'>
                          <span className='h-3 w-3 rounded bg-primary-9' />
                          Today
                        </span>
                        <span className='flex items-center gap-1.5'>
                          <span className='h-3 w-3 rounded bg-primary-3' />
                          Payment Due
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Cash Required */}
                  {isTodayActionExpanded && (
                    <div className='col-span-12 rounded-lg border border-border-default bg-surface p-5 shadow-xs lg:col-span-7'>
                      <h3 className='font-poppins text-14 font-semibold text-text-primary'>
                        Cash required — next 7 days
                      </h3>
                      <div className='mb-4 font-inter text-11 text-text-muted'>
                        Daily cash requirements for approved invoices
                      </div>
                      <div className='h-56'>
                        <ResponsiveContainer height='100%' width='100%'>
                          <BarChart data={cashRequiredData}>
                            <CartesianGrid
                              strokeDasharray='3 3'
                              vertical={false}
                            />
                            <XAxis dataKey='day' tick={{ fontSize: 11 }} />
                            <YAxis
                              tick={{ fontSize: 11 }}
                              label={{
                                angle: -90,
                                position: 'insideLeft',
                                style: { fontSize: 10 },
                                value: 'Cash required',
                              }}
                            />
                            <Tooltip
                              formatter={(v: any) => [fmtMoney(Number(v || 0))]}
                            />
                            <Bar
                              barSize={20}
                              dataKey='Cash'
                              fill='#8300e6'
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>

            {/* Processing & Bottlenecks (Always visible) */}
            <div
              className='flex cursor-pointer flex-wrap items-center justify-between gap-4 overflow-hidden rounded-lg border border-border-default bg-surface px-4 py-4 text-text-primary shadow-sm transition-all duration-300 select-none hover:border-primary-9/40 hover:bg-primary-3/5 hover:shadow-sm active:scale-[0.99]'
              onClick={() => setIsProcessingExpanded(!isProcessingExpanded)}
            >
              <div>
                <h3 className='font-poppins text-14 font-semibold'>
                  Processing &amp; Bottlenecks
                </h3>
                <p className='mt-0.5 font-inter text-11 text-text-secondary'>
                  Pipeline throughput efficiency and approval metrics
                </p>
              </div>
              <div className='flex flex-wrap items-center gap-6'>
                <div className='flex flex-col gap-0.5 text-center md:text-right'>
                  <span className='font-poppins text-[10px] font-medium tracking-wider text-text-secondary uppercase dark:text-gray-4'>
                    Total Invoices
                  </span>
                  <span className='text-15 font-semibold text-primary-9'>
                    266
                  </span>
                </div>
                <div className='flex flex-col gap-0.5 text-center md:text-right'>
                  <span className='font-poppins text-[10px] font-medium tracking-wider text-text-secondary uppercase dark:text-gray-4'>
                    Touchless Rate
                  </span>
                  <span className='text-15 font-semibold text-primary-9'>
                    44.0%
                  </span>
                </div>
                <div className='flex flex-col gap-0.5 text-center md:text-right'>
                  <span className='font-poppins text-[10px] font-medium tracking-wider text-text-secondary uppercase dark:text-gray-4'>
                    Avg Approval Days
                  </span>
                  <span className='text-15 font-semibold text-primary-9'>
                    6.1 days
                  </span>
                </div>
                <div className='z-20 ml-2 rounded-lg p-1.5 text-text-secondary transition-colors'>
                  {isProcessingExpanded ? (
                    <ChevronUp className='h-5 w-5 text-primary-9' />
                  ) : (
                    <ChevronDown className='h-5 w-5' />
                  )}
                </div>
              </div>
            </div>

            {isProcessingExpanded && (
              <div className='grid grid-cols-12 gap-5'>
                <div className='col-span-12 rounded-lg border border-border-default bg-surface p-5 shadow-xs lg:col-span-4'>
                  <h3 className='font-poppins text-14 font-semibold text-text-primary'>
                    Invoice processing funnel
                  </h3>
                  <div className='mb-4 font-inter text-11 text-text-muted'>
                    Pipeline drops across lifecycle steps
                  </div>
                  <div className='flex flex-col gap-3.5 py-4'>
                    {[
                      {
                        pct: '100%',
                        step: '1. Received',
                        value: '266 inv',
                        width: '100%',
                      },
                      {
                        pct: '93%',
                        step: '2. Extracted',
                        value: '248 inv',
                        width: '93%',
                      },
                      {
                        pct: '79%',
                        step: '3. Approved',
                        value: '210 inv',
                        width: '79%',
                      },
                      {
                        pct: '53%',
                        step: '4. Posted',
                        value: '142 inv',
                        width: '53%',
                      },
                    ].map((bar) => (
                      <div
                        className='flex flex-col gap-1 font-inter text-12 font-semibold'
                        key={bar.step}
                      >
                        <div className='flex justify-between text-text-secondary'>
                          <span>{bar.step}</span>
                          <span>{bar.value}</span>
                        </div>
                        <div className='relative h-8 overflow-hidden rounded bg-gray-2'>
                          <div
                            className='flex h-full items-center bg-gradient-to-r from-primary-9 to-primary-10 px-3 text-11 font-semibold text-white'
                            style={{ width: bar.width }}
                          >
                            {bar.pct} conversion
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {isProcessingExpanded && (
                  <div className='col-span-12 rounded-lg border border-border-default bg-surface p-5 shadow-xs lg:col-span-4'>
                    <h3 className='font-poppins text-14 font-semibold text-text-primary'>
                      Approval delay heat map
                    </h3>
                    <div className='mb-4 font-inter text-11 text-text-muted'>
                      Approver delay averages over weeks
                    </div>
                    <div className='mt-3 flex flex-col gap-2 font-inter'>
                      <div className='grid grid-cols-6 gap-1 text-center text-[10px] font-semibold text-text-muted'>
                        <div></div>
                        {['W1', 'W2', 'W3', 'W4', 'W5'].map((w) => (
                          <div key={w}>{w}</div>
                        ))}
                      </div>
                      {[
                        { cells: [3, 2, 4, 3, 2], user: 'A. Chen' },
                        { cells: [1, 2, 1, 2, 1], user: 'M. Okafor' },
                        { cells: [5, 4, 6, 5, 4], user: 'R. Singh' },
                        { cells: [2, 3, 2, 4, 2], user: 'L. Novak' },
                        { cells: [6, 8, 7, 9, 8], user: 'J. Fontaine' },
                      ].map((row) => (
                        <div
                          className='grid grid-cols-6 items-center gap-1'
                          key={row.user}
                        >
                          <div className='pr-2 text-right text-11 font-semibold text-text-secondary'>
                            {row.user}
                          </div>
                          {row.cells.map((val, idx) => {
                            let color = 'bg-[#F1E1FC]'
                            if (val > 7) color = 'bg-[#643094] text-white'
                            else if (val > 4) color = 'bg-[#8300e6] text-white'
                            else if (val > 2)
                              color = 'bg-[#EEE6FD] text-primary-9'
                            return (
                              <div
                                key={idx}
                                title={`${row.user}: ${val} days`}
                                className={cn(
                                  'flex h-8 items-center justify-center rounded text-11 font-semibold',
                                  color,
                                )}
                              >
                                {val}d
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {isProcessingExpanded && (
                  <div className='col-span-12 rounded-lg border border-border-default bg-surface p-5 shadow-xs lg:col-span-4'>
                    <h3 className='font-poppins text-14 font-semibold text-text-primary'>
                      Invoice status distribution
                    </h3>
                    <div className='mb-4 font-inter text-11 text-text-muted'>
                      Click a slice to open matching list
                    </div>
                    <div className='h-48'>
                      <ResponsiveContainer height='100%' width='100%'>
                        <PieChart>
                          <Pie
                            cx='50%'
                            cy='50%'
                            dataKey='value'
                            innerRadius={35}
                            outerRadius={55}
                            paddingAngle={2}
                            data={[
                              { name: 'Approved', value: 48 },
                              { name: 'Pending', value: 34 },
                              { name: 'Processing', value: 22 },
                              { name: 'Hold', value: 12 },
                            ]}
                          >
                            {['#1E8E6F', '#5c21e6', '#19c1d4', '#847C93'].map(
                              (color, idx) => (
                                <Cell
                                  className='cursor-pointer'
                                  fill={color}
                                  key={idx}
                                  onClick={() => {
                                    const name = [
                                      'Approved',
                                      'Pending',
                                      'Processing',
                                      'Hold',
                                    ][idx]
                                    setDrillStatus(name)
                                    setActiveDrill('Status Distribution')
                                  }}
                                />
                              ),
                            )}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className='text-10 mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 font-inter text-text-muted'>
                      <span className='flex items-center gap-1.5'>
                        <span className='bg-success h-2 w-2 rounded' />
                        Approved
                      </span>
                      <span className='flex items-center gap-1.5'>
                        <span className='h-2 w-2 rounded bg-indigo-9' />
                        Pending
                      </span>
                      <span className='flex items-center gap-1.5'>
                        <span className='h-2 w-2 rounded bg-cyan-9' />
                        Processing
                      </span>
                      <span className='flex items-center gap-1.5'>
                        <span className='h-2 w-2 rounded bg-gray-10' />
                        Hold
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Supplier Follow-ups (Always visible) */}
            <div
              className='flex cursor-pointer flex-wrap items-center justify-between gap-4 overflow-hidden rounded-lg border border-border-default bg-surface px-4 py-4 text-text-primary shadow-sm transition-all duration-300 select-none hover:border-primary-9/40 hover:bg-primary-3/5 hover:shadow-sm active:scale-[0.99]'
              onClick={() =>
                setIsSupplierFollowUpExpanded(!isSupplierFollowUpExpanded)
              }
            >
              <div>
                <h3 className='font-poppins text-14 font-semibold'>
                  Supplier Follow-ups
                </h3>
                <p className='mt-0.5 font-inter text-11 text-text-secondary'>
                  Vendors needing prompt outreach or query resolution
                </p>
              </div>
              <div className='flex flex-wrap items-center gap-6'>
                <div className='flex flex-col gap-0.5 text-center md:text-right'>
                  <span className='font-poppins text-[10px] font-medium tracking-wider text-text-secondary uppercase dark:text-gray-4'>
                    Overdue Amount
                  </span>
                  <span className='text-15 font-semibold text-red-9'>
                    {fmtMoney(metrics.overdueAmount || 0)}
                  </span>
                </div>
                <div className='flex flex-col gap-0.5 text-center md:text-right'>
                  <span className='font-poppins text-[10px] font-medium tracking-wider text-text-secondary uppercase dark:text-gray-4'>
                    Duplicates Value
                  </span>
                  <span className='text-15 font-semibold text-primary-9'>
                    $84.2K
                  </span>
                </div>
                <div className='flex flex-col gap-0.5 text-center md:text-right'>
                  <span className='font-poppins text-[10px] font-medium tracking-wider text-text-secondary uppercase dark:text-gray-4'>
                    Suppliers to Chase
                  </span>
                  <span className='text-15 font-semibold text-primary-9'>
                    9 vendors
                  </span>
                </div>
                <div className='z-20 ml-2 rounded-lg p-1.5 text-text-secondary transition-colors'>
                  {isSupplierFollowUpExpanded ? (
                    <ChevronUp className='h-5 w-5 text-primary-9' />
                  ) : (
                    <ChevronDown className='h-5 w-5' />
                  )}
                </div>
              </div>
            </div>

            <div className='grid grid-cols-12 gap-5'>
              {isSupplierFollowUpExpanded && (
                <div className='col-span-12 rounded-lg border border-border-default bg-surface p-5 shadow-xs lg:col-span-6'>
                  <h3 className='font-poppins text-14 font-semibold text-text-primary'>
                    Outstanding payables by supplier
                  </h3>
                  <div className='mb-4 font-inter text-11 text-text-muted'>
                    Click a supplier's bar to drill down
                  </div>
                  <div className='h-60'>
                    <ResponsiveContainer height='100%' width='100%'>
                      <BarChart
                        layout='vertical'
                        margin={{ left: -10, right: 10 }}
                        data={[
                          { name: 'Meridian Steel', value: 920 },
                          { name: 'Vertex IT', value: 680 },
                          { name: 'FastShip Ltd', value: 550 },
                          { name: 'Solaris Energy', value: 480 },
                          { name: 'Nimbus Cloud', value: 390 },
                        ]}
                      >
                        <XAxis tick={{ fontSize: 10 }} type='number' />
                        <YAxis
                          dataKey='name'
                          tick={{ fontSize: 10 }}
                          type='category'
                          width={90}
                        />
                        <Tooltip formatter={(v: any) => [`$${v}K`]} />
                        <Bar
                          barSize={12}
                          className='cursor-pointer'
                          dataKey='value'
                          fill='#8300e6'
                          radius={[0, 4, 4, 0]}
                          onClick={(data: any) => {
                            setDrillSupplier(data?.name ?? null)
                            setActiveDrill('Outstanding Payables')
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {isSupplierFollowUpExpanded && (
                <div
                  className={cn(
                    'rounded-lg border border-border-default bg-surface p-5 shadow-xs transition-all duration-300',
                    'col-span-6 lg:col-span-6',
                  )}
                >
                  <h3 className='font-poppins text-14 font-semibold text-text-primary'>
                    Invoice aging analysis
                  </h3>
                  <div className='mb-4 font-inter text-11 text-text-muted'>
                    Click a segment to drill into aging details
                  </div>
                  <div className='h-60'>
                    <ResponsiveContainer height='100%' width='100%'>
                      <BarChart
                        data={[
                          { name: '0–15d', value: 1842 },
                          { name: '16–30d', value: 1205 },
                          { name: '31–45d', value: 623 },
                          { name: '46–60d', value: 298 },
                          { name: '60d+', value: 134 },
                        ]}
                      >
                        <CartesianGrid strokeDasharray='3 3' vertical={false} />
                        <XAxis dataKey='name' tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(v: any) => [`${v} Invoices`, 'Volume']}
                        />
                        <Bar
                          barSize={20}
                          className='cursor-pointer'
                          dataKey='value'
                          fill='#5c21e6'
                          radius={[4, 4, 0, 0]}
                          onClick={(data: any) => {
                            setDrillAgingBucket(data?.name ?? null)
                            setActiveDrill('Aging Analysis')
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              {isSupplierFollowUpExpanded && (
                <div className='col-span-12 rounded-lg border border-border-default bg-surface p-5 shadow-xs lg:col-span-6'>
                  <h3 className='font-poppins text-14 font-semibold text-text-primary'>
                    Monthly invoice trend
                  </h3>
                  <div className='mb-4 font-inter text-11 text-text-muted'>
                    Incoming workload volumes over the last 6 months
                  </div>
                  <div className='h-56'>
                    <ResponsiveContainer height='100%' width='100%'>
                      <AreaChart
                        data={[
                          { count: 180, name: 'Jan' },
                          { count: 165, name: 'Feb' },
                          { count: 210, name: 'Mar' },
                          { count: 245, name: 'Apr' },
                          { count: 280, name: 'May' },
                          { count: 266, name: 'Jun' },
                        ]}
                      >
                        <defs>
                          <linearGradient
                            id='trendGrad'
                            x1='0'
                            x2='0'
                            y1='0'
                            y2='1'
                          >
                            <stop
                              offset='5%'
                              stopColor='#8300e6'
                              stopOpacity={0.25}
                            />
                            <stop
                              offset='95%'
                              stopColor='#8300e6'
                              stopOpacity={0.0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray='3 3' vertical={false} />
                        <XAxis dataKey='name' tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v) => [`${v} Invoices`]} />
                        <Area
                          dataKey='count'
                          fill='url(#trendGrad)'
                          fillOpacity={1}
                          stroke='#8300e6'
                          strokeWidth={2}
                          type='monotone'
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              {/* <div className="col-span-12 lg:col-span-6 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
                <h3 className="font-poppins text-14 font-semibold text-text-primary">Payment method distribution</h3>
                <div className="font-inter text-11 text-text-muted mb-4">Share of transactions by payment channel</div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={[{ name: 'Bank Transfer', value: 45 }, { name: 'ACH', value: 30 }, { name: 'Wire', value: 15 }, { name: 'Cheque', value: 10 }]} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                        {['#8300e6', '#5c21e6', '#19c1d4', '#847C93'].map((color, idx) => <Cell key={idx} fill={color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [`${v}%`, 'Share']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-around font-inter text-11 mt-1">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-primary-9" />Transfer</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-indigo-9" />ACH</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-cyan-9" />Wire</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-gray-10" />Cheque</span>
                </div>
              </div> */}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
