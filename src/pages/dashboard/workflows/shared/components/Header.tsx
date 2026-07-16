import React from 'react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Line,
  CartesianGrid,
} from 'recharts'
import {
  // Search,
  ChevronDown,
  ChevronUp,
  // ChevronRight,
  DollarSign,
  ClipboardList,
  X,
} from 'lucide-react'
import CustomFilter from '@/components/common/CustomFilter'
import useDashboardStore from '@/pages/dashboard/stores/useDashboardStore'
import { getDashboardData } from '@/api/v6/dashboard'
import { TODAY } from '@/pages/dashboard/utils/dashboardData'
import cn from '@/utils/cn'

function fmtMoney(v: number, currency = 'USD') {
  const sym = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'INR' ? '₹' : '$'
  const abs = Math.abs(v)
  if (abs >= 1.0e6) return `${sym}${(v / 1.0e6).toFixed(2)}M`
  if (abs >= 1.0e3) return `${sym}${(v / 1.0e3).toFixed(1)}K`
  return `${sym}${v.toLocaleString()}`
}

const BulletIcon = () => (
  <svg className="h-4 w-4 text-[#00a2c7] shrink-0 mt-0.5 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="3" fill="currentColor" />
  </svg>
)

export default function DashboardCharts() {
  const {
    role, timeframe, supplierCategory, invoiceStatus, currency, searchQuery,
    drillSupplier, drillAgingBucket, drillStatus,
    setTimeframe, setSupplierCategory, setInvoiceStatus, setCurrency,
    setSearchQuery, setDrillSupplier, setDrillAgingBucket, setDrillStatus, resetFilters,
  } = useDashboardStore()

  const [expandedInvoiceId, setExpandedInvoiceId] = React.useState<string | null>(null)
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
  const [isCommandCenterExpanded, setIsCommandCenterExpanded] = React.useState(true)
  const [isTodayActionExpanded, setIsTodayActionExpanded] = React.useState(false)
  const [isProcessingExpanded, setIsProcessingExpanded] = React.useState(false)
  const [isSupplierFollowUpExpanded, setIsSupplierFollowUpExpanded] = React.useState(false)

  // Local filter states for non-store API filter fields
  const [department, setDepartment] = React.useState<string>('')
  const [requestStatus, setRequestStatus] = React.useState<string>('')
  const [poAmountTier, setPoAmountTier] = React.useState<string>('')

  // API response storage
  const [dashboardData, setDashboardData] = React.useState<any>(null)
  const [_isLoading, setIsLoading] = React.useState(false)

  // Map store timeframe key to API period key
  const periodMap: Record<string, string> = {
    today: 'today',
    week: 'week',
    month: 'thisMonth',
    lastmonth: 'lastmonth',
    quarter: 'quarter',
    fy: 'fy',
    thisMonth: 'thisMonth',
  }

  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      const payload: any = {
        period: periodMap[timeframe] || 'thisMonth',
        includeInvoiceDetails: true,
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
  }, [timeframe, supplierCategory, invoiceStatus, currency, department, requestStatus, poAmountTier])

  const filteredInvoices = React.useMemo(() => {
    let list = [...(dashboardData?.invoices || [])]
    const q = (searchQuery || '').toLowerCase().trim()
    if (q) {
      list = list.filter(inv =>
        String(inv.id || inv.invoiceId || inv.invoiceNo || '').toLowerCase().includes(q) ||
        String(inv.supplier || inv.supplierName || '').toLowerCase().includes(q) ||
        String(inv.costCenter || inv.poNumber || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [dashboardData?.invoices, searchQuery])

  const metrics = React.useMemo(() => {
    const header = dashboardData?.header || {}
    return {
      totalAP: header.totalAp || 0,
      overdueAmount: header.overdue || 0,
      openInvoices: header.openInvoices || 0,
      dpo: header.dpoDays || 0,
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
      result = result.filter(inv => inv.status !== 'Paid' && inv.status !== 'Rejected')
    } else if (drillLower.includes('paid')) {
      result = result.filter(inv => inv.status === 'Paid')
    } else if (drillLower.includes('pending')) {
      result = result.filter(inv => ['Pending', 'Approved', 'Processing'].includes(inv.status))
    } else if (drillLower.includes('due today')) {
      result = result.filter(inv => {
        if (['Paid', 'Rejected'].includes(inv.status)) return false
        const d = new Date(inv.dueDate)
        return d.getFullYear() === TODAY.getFullYear() && d.getMonth() === TODAY.getMonth() && d.getDate() === TODAY.getDate()
      })
    } else if (drillLower.includes('overdue')) {
      result = result.filter(inv => inv.status !== 'Paid' && inv.status !== 'Rejected' && new Date(inv.dueDate) < TODAY)
    }
    if (drillSupplier) result = result.filter(inv => inv.supplier === drillSupplier)
    if (drillAgingBucket) {
      result = result.filter(inv => {
        const days = Math.floor((TODAY.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24))
        if (drillAgingBucket === '0-15d') return days >= 0 && days <= 15
        if (drillAgingBucket === '16-30d') return days > 15 && days <= 30
        if (drillAgingBucket === '31-45d') return days > 30 && days <= 45
        if (drillAgingBucket === '46-60d') return days > 45 && days <= 60
        if (drillAgingBucket === '60d+') return days > 60
        return true
      })
    }
    if (drillStatus) result = result.filter(inv => inv.status === drillStatus)
    return result
  }, [activeDrill, filteredInvoices, drillSupplier, drillAgingBucket, drillStatus])

  const getStatusClass = (status: string) => {
    const s = String(status || '').toLowerCase()
    switch (s) {
      case 'approved': return 'bg-success-light text-success border border-success/20'
      case 'paid': return 'bg-primary-3 text-primary-9 border border-primary-4'
      case 'pending': return 'bg-orange-2 text-orange-11 border border-orange-3'
      case 'processing': return 'bg-cyan-2 text-cyan-11 border border-cyan-3'
      case 'rejected': return 'bg-red-2 text-red-11 border border-red-3'
      default: return 'bg-gray-2 text-gray-10 border border-gray-3'
    }
  }

  const aiInsightsList = React.useMemo(() => [
    { node: (<>Outstanding overdue balances are <span className="font-semibold text-[#1E8E6F]">down 100%</span> versus last month (<span className="font-semibold">$0</span> now outstanding past due).</>) },
    { node: (<>Just <span className="font-semibold">3 suppliers</span> account for <span className="font-semibold">19%</span> of unpaid liabilities, led by <span className="font-semibold">Harbor Point Consulting</span> at $686.5K.</>) },
    { node: (<>Average approval time increased by <span className="font-semibold text-[#B3261E]">1.2 days</span> month over month, now averaging <span className="font-semibold">6.1 days</span>.</>) },
    { node: (<><span className="font-semibold">28 invoices</span> flagged as potential duplicates — recommend review before release to avoid double payment.</>) },
    { node: (<>Payments due this week total <span className="font-semibold">$298.7K</span>, <span className="font-semibold text-[#1E8E6F]">below last week by 67%</span>.</>) },
    { node: (<>Profit margin decreased to <span className="font-semibold">12.9%</span>, pressured by higher supplier expenses.</>) },
    { node: (<><span className="font-semibold">Legal</span> has the longest approval cycle in the current view, averaging <span className="font-semibold">8.0 days</span> per invoice.</>) },
    { node: (<><span className="font-semibold">10 of 24 suppliers</span> now score above 80% on-time delivery, reflecting steadier vendor performance.</>) },
    { node: (<>Projected cash requirement for the next 4 weeks is <span className="font-semibold">$755.7K</span> — plan liquidity accordingly.</>) },
  ], [])

  const filterOptions = dashboardData?.filterOptions || {}
  const serverActiveFilters = dashboardData?.activeFilters || {}

  const filtersProp = React.useMemo(() => [
    {
      id: 'timeframe',
      label: 'Timeframe',
      options: [
        { label: 'Today', value: 'today' },
        { label: 'This Week', value: 'week' },
        { label: 'This Month', value: 'month' },
        { label: 'Last Month', value: 'lastmonth' },
        { label: 'Quarter', value: 'quarter' },
        { label: 'Financial Year', value: 'fy' }
      ]
    },
    {
      id: 'department',
      label: 'Department',
      searchable: true,
      searchPlaceholder: 'Search department...',
      options: (filterOptions.departments || []).map((dept: string) => ({
        label: dept,
        value: dept
      }))
    },
    {
      id: 'supplierCategory',
      label: 'Suppliers',
      searchable: true,
      searchPlaceholder: 'Search supplier...',
      options: (filterOptions.suppliers || []).map((sup: string) => ({
        label: sup,
        value: sup
      }))
    },
    {
      id: 'invoiceStatus',
      label: 'Statuses',
      searchable: true,
      searchPlaceholder: 'Search status...',
      options: (filterOptions.approvalStatuses || [])
        .filter((opt: any) => opt.key !== 'all')
        .map((opt: any) => ({
          label: opt.label,
          value: opt.key
        }))
    },
    {
      id: 'currency',
      label: 'Currencies',
      searchable: true,
      searchPlaceholder: 'Search currency...',
      options: (filterOptions.currencies || []).map((cur: string) => ({
        label: cur,
        value: cur
      }))
    }
  ], [filterOptions])

  const moreFiltersProp = React.useMemo(() => [
    {
      id: 'status',
      label: 'Request Status',
      icon: ClipboardList,
      options: (filterOptions.requestStatuses || [])
        .filter((opt: any) => opt.key !== 'all')
        .map((opt: any) => ({
          label: opt.label,
          value: opt.key
        }))
    },
    {
      id: 'amount',
      label: 'PO Amount',
      icon: DollarSign,
      options: (filterOptions.poAmountTiers || [])
        .filter((opt: any) => opt.key !== 'all')
        .map((opt: any) => ({
          label: opt.label,
          value: opt.key
        }))
    }
  ], [filterOptions])

  const radarData = React.useMemo(() => {
    return (dashboardData?.supplierRiskRadar?.segments || []).map((seg: any) => ({
      name: `${seg.label} Risk`,
      value: seg.percent ?? seg.amount ?? 0
    }))
  }, [dashboardData])

  const profitVsApData = React.useMemo(() => {
    return (dashboardData?.profitVsApSpending?.points || []).map((pt: any) => ({
      name: pt.label,
      AP: pt.primary,
      Profit: pt.secondary
    }))
  }, [dashboardData])

  const monthlyPaymentData = React.useMemo(() => {
    return (dashboardData?.monthlyPaymentTrend?.points || []).map((pt: any) => ({
      name: pt.label,
      value: pt.primary
    }))
  }, [dashboardData])

  const cashFlowData = React.useMemo(() => {
    return (dashboardData?.cashFlowForecast?.points || []).map((pt: any) => ({
      name: pt.label,
      value: pt.primary
    }))
  }, [dashboardData])

  const topSuppliersData = React.useMemo(() => {
    return (dashboardData?.topSuppliersByInvoice || []).map((item: any) => ({
      name: item.supplier,
      value: item.amount
    }))
  }, [dashboardData])

  const outstandingSuppliersData = React.useMemo(() => {
    return (dashboardData?.outstandingBySupplier || []).map((item: any) => ({
      name: item.supplier,
      value: item.amount
    }))
  }, [dashboardData])

  const departmentSpendData = React.useMemo(() => {
    return (dashboardData?.departmentSpend || []).map((item: any, idx: number) => {
      const color = idx < 4
        ? 'bg-primary-3 text-primary-9 border border-primary-4'
        : 'bg-gray-2 text-text-secondary border border-border-default'
      return {
        name: item.department,
        share: `${item.percent}%`,
        amt: fmtMoney(item.amount, item.currency || 'CAD'),
        color
      }
    })
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
        region: item.country || item.countryCode,
        flag: getFlag(item.countryCode),
        value: fmtMoney(item.amount, item.currency || 'CAD'),
        count: `${item.supplierCount} suppliers`,
        pct: item.percent
      }
    })
  }, [dashboardData])

  const cashRequiredData = React.useMemo(() => {
    return (dashboardData?.cashFlowForecast?.points || [])
      .slice(0, 7)
      .map((pt: any) => ({
        day: pt.label,
        Cash: pt.primary
      }))
  }, [dashboardData])

  const dueTodayValue = React.useMemo(() => {
    const kpi = (dashboardData?.kpis || []).find((k: any) => k.key === 'due_today')
    return kpi ? kpi.value : 0
  }, [dashboardData])

  const handleReset = () => {
    resetFilters()
    setDepartment('')
    setRequestStatus('')
    setPoAmountTier('')
  }

  return (
    <div className="flex flex-col gap-4 p-6">

      {/* 1. QUICK FILTERS ROW */}
      <CustomFilter
        filters={filtersProp}
        moreFilters={moreFiltersProp}
        activeFilters={{
          timeframe: serverActiveFilters.period === 'thisMonth' ? 'month' : (serverActiveFilters.period || ''),
          department: serverActiveFilters.department || '',
          supplierCategory: serverActiveFilters.supplier || '',
          invoiceStatus: serverActiveFilters.status || '',
          currency: serverActiveFilters.currency || '',
          status: serverActiveFilters.requestStatus || '',
          amount: serverActiveFilters.poAmountTier || '',
        }}
        onFilterChange={(id, value) => {
          if (id === 'timeframe') setTimeframe(value as any)
          else if (id === 'supplierCategory') setSupplierCategory(value as string)
          else if (id === 'invoiceStatus') setInvoiceStatus(value as string)
          else if (id === 'currency') setCurrency(value as string)
          else if (id === 'department') setDepartment(value as string)
          else if (id === 'status') setRequestStatus(value as string)
          else if (id === 'amount') setPoAmountTier(value as string)
        }}
        showReset={!!(timeframe !== 'month' || supplierCategory || invoiceStatus || currency || department || requestStatus || poAmountTier || searchQuery)}
        onReset={handleReset}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search invoice, supplier, PO..."
      />

      {/* 2. AP COMMAND CENTER BANNER */}
      <div
        className="relative cursor-pointer select-none transition-all duration-300 hover:shadow-sm hover:border-primary-9/40 hover:bg-primary-3/5 active:scale-[0.99] flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-lg bg-surface border border-border-default px-4 py-4 text-text-primary shadow-xs"
        onClick={() => setIsCommandCenterExpanded(!isCommandCenterExpanded)}
      >
        <div className="relative z-10">
          <h2 className="font-poppins text-14 font-semibold">AP Command Center</h2>
          <div className="font-inter text-11 text-text-muted mt-1">{dashboardData?.header?.contextLabel || 'Loading...'}</div>
        </div>
        <div className="relative z-10 flex gap-6 flex-wrap items-center">
          <div className="text-center md:text-right flex flex-col gap-0.5">
            <span className="font-poppins text-[10px] font-medium tracking-wider text-text-secondary dark:text-gray-4 uppercase">Total AP</span>
            <span className="text-15 font-semibold text-primary-9">{dashboardData?.header?.totalApDisplay || fmtMoney(metrics.totalAP || 0)}</span>
          </div>
          <div className="text-center md:text-right flex flex-col gap-0.5">
            <span className="font-poppins text-[10px] font-medium tracking-wider text-text-secondary dark:text-gray-4 uppercase">Overdue</span>
            <span className={cn("text-15 font-semibold", metrics.overdueAmount > 0 ? "text-red-9" : "text-primary-9")}>{dashboardData?.header?.overdueDisplay || fmtMoney(metrics.overdueAmount || 0)}</span>
          </div>
          <div className="text-center md:text-right flex flex-col gap-0.5">
            <span className="font-poppins text-[10px] font-medium tracking-wider text-text-secondary dark:text-gray-4 uppercase">Open Invoices</span>
            <span className="text-15 font-semibold text-primary-9">{dashboardData?.header?.openInvoices ?? metrics.openInvoices}</span>
          </div>
          <div className="text-center md:text-right flex flex-col gap-0.5">
            <span className="font-poppins text-[10px] font-medium tracking-wider text-text-secondary dark:text-gray-4 uppercase">DPO</span>
            <span className="text-15 font-semibold text-primary-9">{dashboardData?.header?.dpoDisplay || `${metrics.dpo}d`}</span>
          </div>
          <div className="p-1.5 rounded-lg text-text-secondary transition-colors z-20 ml-2">
            {isCommandCenterExpanded ? <ChevronUp className="h-5 w-5 text-primary-9" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </div>
        <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-primary-3/20 blur-xl" />
      </div>

      {/* 3. KPI STRIP */}
      {isCommandCenterExpanded && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-6 animate-in fade-in duration-300">
          {(dashboardData?.kpis || []).map((kpi: any) => {
            const config = getKpiConfig(kpi.key)
            const trendVal = kpi.changePercent !== null && kpi.changePercent !== undefined
              ? `${kpi.changePercent > 0 ? '+' : ''}${kpi.changePercent}%`
              : (kpi.trend === 'flat' ? 'Flat' : kpi.trend)

            return (
              <div key={kpi.key} className={cn("cursor-pointer rounded-lg border border-border-default bg-surface p-4 shadow-xs transition-all hover:-translate-y-0.5 border-t-3", config.color, activeDrill === kpi.label && "ring-2 ring-primary-9/40 shadow-md")} onClick={() => handleKpiClick(kpi.label)}>
                <div className="font-poppins text-8 font-semibold uppercase">{kpi.label}</div>
                <div className="font-poppins text-18 font-semibold text-text-primary mt-1.5">{kpi.displayValue}</div>
                <div className="flex items-center gap-1.5 mt-2 text-11 font-semibold">
                  <span className={cn("rounded px-1.5 py-0.5", config.isGood ? "bg-success-light text-success" : "bg-red-2 text-red-11")}>{trendVal}</span>
                  <span className="font-inter text-text-muted font-normal">vs last month</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* INLINE DRILL PANEL */}
      {isCommandCenterExpanded && activeDrill && (
        <div className="animate-in fade-in slide-in-from-top-4 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-border-default pb-3.5 mb-4">
            <div>
              <h3 className="font-poppins text-14 font-semibold text-text-primary">Invoices Drill-Down <span className="text-primary-9">· {activeDrill}</span></h3>
              <p className="font-inter text-11 text-text-muted mt-0.5">Showing records matching this metrics slice</p>
            </div>
            <button
              className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition-all hover:bg-gray-2 hover:text-text-primary active:scale-95 cursor-pointer"
              title="Close panel"
              onClick={() => setActiveDrill(null)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {drillInvoices.length > 0 ? (
            <div className="overflow-x-auto max-h-[300px] scrollbar">
              <table className="w-full text-left text-12 border-collapse">
                <thead>
                  <tr className="bg-gray-2 text-text-muted uppercase text-10 font-semibold border-b border-border-default">
                    {['Invoice', 'Supplier', 'Department', 'Amount', 'Due Date', 'Status', 'Payment Method'].map(h => <th key={h} className="p-3">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {drillInvoices.slice(0, 50).map(inv => (
                    <tr key={inv.id} className="border-b border-gray-3 hover:bg-gray-2/50">
                      <td className="p-3 font-mono font-semibold text-primary-9">{inv.id}</td>
                      <td className="p-3 font-medium text-text-primary"><span className="mr-1.5">{inv.flag}</span>{inv.supplier}</td>
                      <td className="p-3 text-text-secondary">{inv.department}</td>
                      <td className="p-3 text-right font-mono font-semibold text-text-primary">{fmtMoney(inv.amount, inv.currency)}</td>
                      <td className="p-3 text-text-secondary">{new Date(inv.dueDate).toLocaleDateString()}</td>
                      <td className="p-3"><span className={cn("px-2 py-0.5 rounded-full text-10 font-semibold", getStatusClass(inv.status))}>{inv.status}</span></td>
                      <td className="p-3 text-text-muted">{inv.paymentMethod}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {drillInvoices.length > 50 && <div className="text-center text-11 text-text-muted mt-3">Showing first 50 of {drillInvoices.length} invoices.</div>}
            </div>
          ) : (
            <div className="text-center py-6 text-text-muted text-12">No matching invoice records in this slice.</div>
          )}
        </div>
      )}

      {/* 4. TRACK CONTENTS */}
      {role === 'management' ? (

        /* ===== MANAGEMENT TRACK ===== */
        <div className="flex flex-col gap-4">

          {/* AI Insights + Supplier Radar */}
          <div className="grid grid-cols-12 gap-4">
            {isCommandCenterExpanded && (
              <div className="col-span-12 lg:col-span-8 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-poppins text-14 font-semibold text-text-primary">AI-generated insights</h3>
                    <div className="font-inter text-11 text-text-muted mt-0.5">Auto-updates with your filters — the ledger's margin notes</div>
                  </div>
                  <span className="rounded border border-border-default bg-surface px-1.5 py-0.5 text-10 font-semibold text-text-muted">LIVE</span>
                </div>
                <ul className="flex flex-col">
                  {aiInsightsList.map((insight, idx) => (
                    <li key={idx} className="flex gap-3 text-[13px] text-text-secondary border-b border-dashed border-border-default py-2.5 first:pt-0 last:border-b-0 last:pb-0">
                      <BulletIcon />
                      <div>{insight.node}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className={cn("rounded-lg border border-border-default bg-surface p-5 shadow-xs transition-all duration-300", isCommandCenterExpanded ? "col-span-12 lg:col-span-4" : "col-span-12")}>
              <h3 className="font-poppins text-14 font-semibold text-text-primary">
                {dashboardData?.supplierRiskRadar?.title || 'Supplier Risk Radar'}
              </h3>
              <div className="font-inter text-11 text-text-muted mb-4">
                {dashboardData?.supplierRiskRadar?.subtitle || 'Which vendors carry the most risk exposure?'}
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={radarData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value">
                      {radarData.map((_entry: any, idx: number) => {
                        const colors = ['#1E8E6F', '#0f7a86', '#B3261E']
                        return <Cell key={idx} fill={colors[idx % colors.length]} />
                      })}
                    </Pie>
                    <Tooltip formatter={(v: any) => [`${v}%`, 'Exposure']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-around font-inter text-11 mt-2">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-success" />Low</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-warning" />Medium</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-red-9" />High</span>
              </div>
            </div>
          </div>

          {/* Profitability Section */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-lg bg-surface border border-border-default px-4 py-4 text-text-primary shadow-xs">
              <div>
                <h3 className="font-poppins text-14 font-semibold">Profitability &amp; Cash Position</h3>
                <p className="font-inter text-11 text-text-secondary mt-0.5">Is payables growth eating margin · future liquidity needs</p>
              </div>
              <div className="flex gap-6 flex-wrap items-center">
                <div className="text-center md:text-right flex flex-col gap-0.5">
                  <span className="font-poppins text-[10px] font-medium tracking-wider text-text-secondary dark:text-gray-4 uppercase">Profit Margin</span>
                  <span className="text-15 font-semibold text-cyan-9">12.9%</span>
                </div>
                <div className="text-center md:text-right flex flex-col gap-0.5">
                  <span className="font-poppins text-[10px] font-medium tracking-wider text-text-secondary dark:text-gray-4 uppercase">Next 4 Weeks</span>
                  <span className="text-15 font-semibold text-primary-9">$3.85M</span>
                </div>
                <div className="text-center md:text-right flex flex-col gap-0.5">
                  <span className="font-poppins text-[10px] font-medium tracking-wider text-text-secondary dark:text-gray-4 uppercase">Peak Week</span>
                  <span className="text-15 font-semibold text-primary-9">Week 3</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 lg:col-span-6 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
                <h3 className="font-poppins text-14 font-semibold text-text-primary">
                  {dashboardData?.profitVsApSpending?.title || 'Profit vs AP spending'}
                </h3>
                <div className="font-inter text-11 text-text-muted mb-4">
                  {dashboardData?.profitVsApSpending?.subtitle || 'Dual axis spending trend comparison'}
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={profitVsApData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11 }} label={{ value: 'AP Amount', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} label={{ value: 'Profit %', angle: 90, position: 'insideRight', style: { fontSize: 10 } }} />
                      <Tooltip formatter={(v: any, name?: string) => name === 'Profit' ? [`${v}%`, name] : [fmtMoney(v), name || '']} />
                      <Bar yAxisId="left" dataKey="AP" fill="#8300e6" radius={[4, 4, 0, 0]} barSize={20} />
                      <Line yAxisId="right" type="monotone" dataKey="Profit" stroke="#19c1d4" strokeWidth={2.5} dot={{ r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="col-span-12 lg:col-span-6 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
                <h3 className="font-poppins text-14 font-semibold text-text-primary">
                  {dashboardData?.monthlyPaymentTrend?.title || 'Monthly payment trend'}
                </h3>
                <div className="font-inter text-11 text-text-muted mb-4">
                  {dashboardData?.monthlyPaymentTrend?.subtitle || 'Cash leaving the building, month by month'}
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyPaymentData}>
                      <defs><linearGradient id="paymentGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8300e6" stopOpacity={0.3} /><stop offset="95%" stopColor="#8300e6" stopOpacity={0.0} /></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: any) => [fmtMoney(v)]} />
                      <Area type="monotone" dataKey="value" stroke="#8300e6" strokeWidth={2} fillOpacity={1} fill="url(#paymentGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="col-span-12 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
                <h3 className="font-poppins text-14 font-semibold text-text-primary">
                  {dashboardData?.cashFlowForecast?.title || 'Cash out forecast'}
                </h3>
                <div className="font-inter text-11 text-text-muted mb-4">
                  {dashboardData?.cashFlowForecast?.subtitle || 'Liquidity projection and cash needs over next 10 weeks'}
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cashFlowData}>
                      <defs><linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#5c21e6" stopOpacity={0.25} /><stop offset="95%" stopColor="#5c21e6" stopOpacity={0.0} /></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: any) => [fmtMoney(v)]} />
                      <Area type="monotone" dataKey="value" stroke="#5c21e6" strokeWidth={2} fillOpacity={1} fill="url(#forecastGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Supplier Concentration Section */}
            <div className="flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-lg bg-surface border border-border-default px-4 py-4 text-text-primary shadow-xs">
              <div>
                <h3 className="font-poppins text-14 font-semibold">Supplier Concentration &amp; Risk</h3>
                <p className="font-inter text-11 text-text-secondary mt-0.5">Where spend concentrates · vendor risk exposure</p>
              </div>
              <div className="flex gap-6 flex-wrap items-center">
                <div className="text-center md:text-right flex flex-col gap-0.5">
                  <span className="font-poppins text-[10px] font-medium tracking-wider text-text-secondary dark:text-gray-4 uppercase">Active Suppliers</span>
                  <span className="text-15 font-semibold text-primary-9">24</span>
                </div>
                <div className="text-center md:text-right flex flex-col gap-0.5">
                  <span className="font-poppins text-[10px] font-medium tracking-wider text-text-secondary dark:text-gray-4 uppercase">High Risk</span>
                  <span className="text-15 font-semibold text-red-9">3</span>
                </div>
                <div className="text-center md:text-right flex flex-col gap-0.5">
                  <span className="font-poppins text-[10px] font-medium tracking-wider text-text-secondary dark:text-gray-4 uppercase">Top-3 Concentration</span>
                  <span className="text-15 font-semibold text-primary-9">44.0%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4">


              <div className={cn("rounded-lg border border-border-default bg-surface p-5 shadow-xs transition-all duration-300", isCommandCenterExpanded ? "col-span-12 lg:col-span-4" : "col-span-12 lg:col-span-6")}>
                <h3 className="font-poppins text-14 font-semibold text-text-primary">Top 10 suppliers by invoice value</h3>
                <div className="font-inter text-11 text-text-muted mb-4">Concentration of invoice liabilities</div>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topSuppliersData} layout="vertical" margin={{ left: -10, right: 10 }}>
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={90} />
                      <Tooltip formatter={(v: any) => [fmtMoney(v)]} />
                      <Bar dataKey="value" fill="#8300e6" radius={[0, 4, 4, 0]} barSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {isCommandCenterExpanded && (
                <div className="col-span-12 lg:col-span-4 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
                  <h3 className="font-poppins text-14 font-semibold text-text-primary">Outstanding payables by supplier</h3>
                  <div className="font-inter text-11 text-text-muted mb-4">Click a supplier's bar to drill down</div>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={outstandingSuppliersData} layout="vertical" margin={{ left: -10, right: 10 }}>
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={90} />
                        <Tooltip formatter={(v: any) => [fmtMoney(v)]} />
                        <Bar dataKey="value" fill="#5c21e6" radius={[0, 4, 4, 0]} barSize={12} onClick={(data: any) => { setDrillSupplier(data?.name ?? null); setActiveDrill('Outstanding Payables') }} className="cursor-pointer" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className={cn("rounded-lg border border-border-default bg-surface p-5 shadow-xs transition-all duration-300", isCommandCenterExpanded ? "col-span-12 lg:col-span-4" : "col-span-12 lg:col-span-6")}>
                <h3 className="font-poppins text-14 font-semibold text-text-primary">Department-wise spend</h3>
                <div className="font-inter text-11 text-text-muted mb-4">Tile size reflects share of AP expenses</div>
                <div className="grid grid-cols-2 gap-2 h-48">
                  {departmentSpendData.map((dept: any) => (
                    <div key={dept.name} className={cn("cursor-pointer rounded-lg p-2.5 flex flex-col justify-between transition-all hover:scale-[1.02]", dept.color)} onClick={() => { setSearchQuery(dept.name); setActiveDrill('Department Spend') }}>
                      <span className="font-inter text-10 font-semibold">{dept.name}</span>
                      <div className="flex justify-between items-baseline mt-1">
                        <span className="font-poppins text-14 font-semibold">{dept.amt}</span>
                        <span className="font-inter text-9 opacity-80">{dept.share}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="font-inter text-10 text-text-muted mt-3">Click on a tile to filter workflow records.</div>
              </div>

              <div className="col-span-12 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
                <h3 className="font-poppins text-14 font-semibold text-text-primary">Supplier geographic distribution</h3>
                <div className="font-inter text-11 text-text-muted mb-4">Regional volume and spend exposure analysis</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {geographyData.map((tile: any) => (
                    <div key={tile.region} className="rounded-xl border border-border-default bg-gray-2 p-3">
                      <div className="flex items-center justify-between font-inter text-12 font-semibold text-text-primary">
                        <span className="flex items-center gap-1.5"><span className="text-16">{tile.flag}</span>{tile.region}</span>
                        <span>{tile.value}</span>
                      </div>
                      <div className="h-1.5 w-full bg-border-default rounded-full overflow-hidden mt-3"><div className="h-full bg-primary-9" style={{ width: `${tile.pct}%` }} /></div>
                      <div className="flex justify-between font-inter text-10 text-text-muted mt-2"><span>{tile.count}</span><span>{tile.pct}% share</span></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Aging Section */}
            <div className="flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-lg bg-surface border border-border-default px-4 py-4 text-text-primary shadow-xs">
              <div>
                <h3 className="font-poppins text-14 font-semibold">Aging &amp; Process Oversight</h3>
                <p className="font-inter text-11 text-text-secondary mt-0.5">Portfolio-level view of overdue exposure and approval cycles</p>
              </div>
              <div className="flex gap-6 flex-wrap items-center">
                <div className="text-center md:text-right flex flex-col gap-0.5">
                  <span className="font-poppins text-[10px] font-medium tracking-wider text-text-secondary dark:text-gray-4 uppercase">90+ Days</span>
                  <span className="text-15 font-semibold text-primary-9">$1.24M</span>
                </div>
                <div className="text-center md:text-right flex flex-col gap-0.5">
                  <span className="font-poppins text-[10px] font-medium tracking-wider text-text-secondary dark:text-gray-4 uppercase">Critical Exceptions</span>
                  <span className="text-15 font-semibold text-red-9">4</span>
                </div>
                <div className="text-center md:text-right flex flex-col gap-0.5">
                  <span className="font-poppins text-[10px] font-medium tracking-wider text-text-secondary dark:text-gray-4 uppercase">Approval Rate</span>
                  <span className="text-15 font-semibold text-success">94.2%</span>
                </div>
              </div>
            </div>

            {isSupplierFollowUpExpanded && (
              <div className="grid grid-cols-12 gap-5">
                <div className="col-span-12 lg:col-span-6 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
                  <h3 className="font-poppins text-14 font-semibold text-text-primary">Invoice aging analysis</h3>
                  <div className="font-inter text-11 text-text-muted mb-4">Click a segment to drill into invoices</div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[{ name: '0–15d', value: 1842 }, { name: '16–30d', value: 1205 }, { name: '31–45d', value: 623 }, { name: '46–60d', value: 298 }, { name: '60d+', value: 134 }]} margin={{ bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: any) => [`${v} Invoices`, 'Volume']} />
                        <Bar dataKey="value" fill="#8300e6" radius={[4, 4, 0, 0]} barSize={24} onClick={(data: any) => { setDrillAgingBucket(data?.name ?? null); setActiveDrill('Aging Analysis') }} className="cursor-pointer" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="col-span-12 lg:col-span-6 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
                  <h3 className="font-poppins text-14 font-semibold text-text-primary">Approval delay heat map</h3>
                  <div className="font-inter text-11 text-text-muted mb-4">Average days to approve by department · last 8 weeks</div>
                  <div className="flex flex-col gap-2 font-inter mt-3">
                    <div className="grid grid-cols-9 gap-1 text-[10px] text-text-muted font-semibold text-center">
                      <div></div>
                      {['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'].map(w => <div key={w}>{w}</div>)}
                    </div>
                    {[
                      { dept: 'IT', cells: [2, 1, 3, 2, 4, 5, 2, 1] }, { dept: 'Finance', cells: [1, 2, 1, 1, 2, 1, 3, 1] },
                      { dept: 'Marketing', cells: [5, 4, 6, 8, 7, 5, 6, 5] }, { dept: 'Operations', cells: [3, 2, 4, 3, 3, 4, 2, 3] },
                      { dept: 'HR', cells: [4, 5, 3, 4, 5, 2, 4, 4] }, { dept: 'Legal', cells: [6, 7, 9, 8, 7, 6, 9, 8] },
                    ].map(row => (
                      <div key={row.dept} className="grid grid-cols-9 gap-1 items-center">
                        <div className="text-11 font-semibold text-text-secondary text-right pr-2">{row.dept}</div>
                        {row.cells.map((val, idx) => {
                          let color = 'bg-[#F1E1FC]'
                          if (val > 7) color = 'bg-[#643094] text-white'
                          else if (val > 4) color = 'bg-[#8300e6] text-white'
                          else if (val > 2) color = 'bg-[#EEE6FD] text-primary-9'
                          return <div key={idx} className={cn("h-8 rounded flex items-center justify-center text-11 font-semibold", color)} title={`${row.dept}: ${val} days`}>{val}d</div>
                        })}
                      </div>
                    ))}
                  </div>
                  <div className="font-inter text-10 text-text-muted mt-3">Darker cells indicate longer processing bottlenecks.</div>
                </div>
              </div>
            )}
          </div>
        </div>

      ) : (

        /* ===== AP TEAM TRACK ===== */
        <div className="flex flex-col gap-4">

          {/* AI Insights + Duplicate Watch (Conditionally visible) */}
          {isCommandCenterExpanded && (
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 lg:col-span-8 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-poppins text-14 font-semibold text-text-primary">AI-generated insights</h3>
                    <div className="font-inter text-11 text-text-muted mt-0.5">Auto-updates with your filters — the ledger's margin notes</div>
                  </div>
                  <span className="rounded border border-border-default bg-surface px-1.5 py-0.5 text-10 font-semibold text-text-muted">LIVE</span>
                </div>
                <ul className="flex flex-col">
                  {aiInsightsList.map((insight, idx) => (
                    <li key={idx} className="flex gap-3 text-[13px] text-text-secondary border-b border-dashed border-border-default py-2.5 first:pt-0 last:border-b-0 last:pb-0">
                      <BulletIcon />
                      <div>{insight.node}</div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="col-span-12 lg:col-span-4 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
                <h3 className="font-poppins text-14 font-semibold text-text-primary">Duplicate invoice watch</h3>
                <div className="font-inter text-11 text-text-muted mb-3">Double payments flagged by ledger algorithms</div>
                <div className="flex flex-col gap-2 max-h-[auto] overflow-y-auto scrollbar">
                  {[
                    { id: 'INV-20043', supplier: 'Coral Bay Marketing', amt: '₹4,984', match: '98%' },
                    { id: 'INV-20056', supplier: 'Silverline Telecom', amt: '$144,788', match: '96%' },
                    { id: 'INV-20112', supplier: 'Prism Packaging Co.', amt: '₹123,151', match: '95%' },
                    { id: 'INV-20121', supplier: 'Vertex IT Solutions', amt: '€33,194', match: '94%' },
                    { id: 'INV-20134', supplier: 'Atlas Freight Partners', amt: '€149,343', match: '92%' },
                  ].map(item => (
                    <div key={item.id} className="flex items-center justify-between text-11 border-b border-gray-3 pb-2 last:border-b-0">
                      <div><span className="font-mono font-semibold text-red-9">{item.id}</span><span className="font-inter text-text-primary font-medium ml-2">{item.supplier}</span></div>
                      <div className="text-right"><div className="font-semibold text-text-primary">{item.amt}</div><div className="font-inter text-[9px] text-red-11 font-semibold">{item.match} match</div></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Details below */}
          <div className="flex flex-col gap-4">

            {/* Today's Action Queue — conditionally shown */}

            <>
              <div
                className="cursor-pointer select-none transition-all duration-300 hover:shadow-sm hover:border-primary-9/40 hover:bg-primary-3/5 active:scale-[0.99] flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-lg bg-surface border border-border-default px-4 py-4 text-text-primary shadow-xs"
                onClick={() => setIsTodayActionExpanded(!isTodayActionExpanded)}
              >
                <div>
                  <h3 className="font-poppins text-14 font-semibold">Today's Action Queue</h3>
                  <p className="font-inter text-11 text-text-secondary mt-0.5">Prioritized invoice items requiring attention today</p>
                </div>
                <div className="flex gap-6 flex-wrap items-center">
                  <div className="text-center md:text-right flex flex-col gap-0.5">
                    <span className="font-poppins text-[10px] font-medium tracking-wider text-text-secondary dark:text-gray-4 uppercase">Due Today</span>
                    <span className="text-15 font-semibold text-cyan-9">{fmtMoney(dueTodayValue)}</span>
                  </div>
                  <div className="text-center md:text-right flex flex-col gap-0.5">
                    <span className="font-poppins text-[10px] font-medium tracking-wider text-text-secondary dark:text-gray-4 uppercase">Cash This Week</span>
                    <span className="text-15 font-semibold text-primary-9">$298.7K</span>
                  </div>
                  <div className="text-center md:text-right flex flex-col gap-0.5">
                    <span className="font-poppins text-[10px] font-medium tracking-wider text-text-secondary dark:text-gray-4 uppercase">Queue Size</span>
                    <span className="text-15 font-semibold text-primary-9">{filteredInvoices.filter(inv => (inv.status || '').toLowerCase() === 'pending').length} items</span>
                  </div>
                  <div className="p-1.5 rounded-lg text-text-secondary transition-colors z-20 ml-2">
                    {isTodayActionExpanded ? <ChevronUp className="h-5 w-5 text-primary-9" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </div>
              </div>

              {isTodayActionExpanded && (
                <div className="grid grid-cols-12 gap-4">
                  {/* AP Workbench */}
                  <div className="col-span-12 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
                    <div className="flex items-center justify-between border-b border-border-default pb-3.5 mb-4">
                      <div>
                        <h3 className="font-poppins text-14 font-semibold text-text-primary">AP workbench — prioritized queue</h3>
                        <div className="font-inter text-11 text-text-muted">Overdue and due-soonest first — process top-down</div>
                      </div>
                      <span className="rounded-full bg-primary-3 px-3 py-0.5 text-10 font-semibold text-primary-9">{filteredInvoices.slice(0, 10).length} prioritized</span>
                    </div>
                    <div className="overflow-x-auto scrollbar">
                      <table className="w-full text-left text-12 border-collapse">
                        <thead>
                          <tr className="bg-gray-2 text-text-muted uppercase text-10 font-semibold border-b border-border-default">
                            {['Priority', 'Invoice', 'Supplier', 'Department', 'Amount', 'Due Date', 'Status', 'Buyer', 'Actions'].map(h => <th key={h} className="p-3">{h}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredInvoices.slice(0, 8).map((inv, idx) => {
                            const invId = inv.id || inv.invoiceId || inv.invoiceNo || ''
                            const isExpanded = expandedInvoiceId === invId
                            const supplier = inv.supplier || inv.supplierName || ''
                            const costCenter = inv.costCenter || inv.poNumber || ''
                            const profitCenter = inv.profitCenter || ''
                            const paymentMethod = inv.paymentMethod || 'ACH'
                            const isDuplicate = inv.isDuplicate || false
                            const buyer = inv.buyer || 'Unknown'
                            const amount = inv.amount || 0
                            const currency = inv.currency || 'USD'
                            const dueDate = inv.dueDate ? new Date(inv.dueDate) : new Date()

                            return (
                              <React.Fragment key={invId}>
                                <tr className="border-b border-gray-3 hover:bg-gray-2/50">
                                  <td className="p-3"><span className={cn("inline-block h-2 w-2 rounded-full", idx === 0 ? "bg-red-9" : idx < 3 ? "bg-warning" : "bg-success")} /></td>
                                  <td className="p-3 font-mono font-semibold text-primary-9">{invId}</td>
                                  <td className="p-3 font-medium text-text-primary"><span className="mr-1.5">{inv.flag || ''}</span>{supplier}</td>
                                  <td className="p-3 text-text-secondary">{inv.department || ''}</td>
                                  <td className="p-3 text-right font-mono font-semibold text-text-primary">{fmtMoney(amount, currency)}</td>
                                  <td className="p-3 text-text-secondary">{dueDate.toLocaleDateString()}</td>
                                  <td className="p-3"><span className={cn("px-2 py-0.5 rounded-full text-10 font-semibold", getStatusClass(inv.status))}>{inv.status || 'Pending'}</span></td>
                                  <td className="p-3 text-text-muted">{buyer}</td>
                                  <td className="p-3 text-right">
                                    <div className="inline-flex items-center gap-2 justify-end">
                                      <button className="cursor-pointer rounded border border-border-default bg-surface px-2.5 py-1 text-10 font-semibold text-primary-9 transition-all hover:bg-primary-9 hover:text-white" onClick={() => { setDrillSupplier(supplier); setActiveDrill('Outstanding Payables') }}>Action</button>
                                      <button className="cursor-pointer p-1 text-text-secondary hover:bg-gray-3 rounded transition-colors" onClick={() => setExpandedInvoiceId(isExpanded ? null : invId)}>
                                        {isExpanded ? <ChevronUp className="h-4 w-4 text-primary-9" /> : <ChevronDown className="h-4 w-4" />}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                                {isExpanded && (
                                  <tr className="bg-primary-3/10 dark:bg-gray-12/30">
                                    <td colSpan={9} className="p-4 border-b border-border-default">
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-inter text-11 text-text-secondary">
                                        <div><div className="font-semibold text-text-muted">PO Reference</div><div className="font-mono mt-0.5 text-text-primary">{costCenter.replace('CC-', 'PO-')}</div></div>
                                        <div><div className="font-semibold text-text-muted">Cost Center</div><div className="mt-0.5 text-text-primary">{costCenter}</div></div>
                                        <div><div className="font-semibold text-text-muted">Profit Center</div><div className="mt-0.5 text-text-primary">{profitCenter}</div></div>
                                        <div><div className="font-semibold text-text-muted">Payment Channel</div><div className="mt-0.5 text-text-primary">{paymentMethod}</div></div>
                                      </div>
                                      <div className="mt-3 p-2.5 rounded bg-orange-2/30 border border-orange-3/30 font-inter text-11 text-orange-11">
                                        <strong>Ledger Verification Note:</strong> Invoice matched against approved master list. {isDuplicate ? 'ALERT: Potential duplicate invoice match. Review before release.' : 'Standard SLA timeline. No pricing exceptions found.'}
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
                    <div className="col-span-12 lg:col-span-5 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
                      <h3 className="font-poppins text-14 font-semibold text-text-primary">Payment calendar</h3>
                      <div className="font-inter text-11 text-text-muted mb-4">Scheduled payments calendar heatmap</div>
                      <div className="grid grid-cols-7 gap-1 text-center font-inter">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="text-10 font-semibold text-text-muted py-1">{d}</div>)}
                        {Array.from({ length: 4 }).map((_, idx) => <div key={`e-${idx}`} className="h-8" />)}
                        {Array.from({ length: 30 }).map((_, idx) => {
                          const day = idx + 1
                          const isToday = day === 8
                          const isDue = [5, 12, 18, 22, 25, 29].includes(day)
                          let cellStyle = 'bg-gray-2 text-text-secondary hover:bg-gray-3'
                          if (isToday) cellStyle = 'bg-primary-9 text-white font-semibold'
                          else if (isDue) cellStyle = 'bg-primary-3 text-primary-9 font-semibold'
                          return <div key={day} className={cn("h-8 rounded flex items-center justify-center text-11 transition-all cursor-pointer", cellStyle)} title={isToday ? 'Today' : isDue ? 'Payment due date' : ''}>{day}</div>
                        })}
                      </div>
                      <div className="flex gap-4 font-inter text-10 text-text-muted mt-4 justify-center">
                        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-primary-9" />Today</span>
                        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-primary-3" />Payment Due</span>
                      </div>
                    </div>
                  )}

                  {/* Cash Required */}
                  {isTodayActionExpanded && (
                    <div className="col-span-12 lg:col-span-7 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
                      <h3 className="font-poppins text-14 font-semibold text-text-primary">Cash required — next 7 days</h3>
                      <div className="font-inter text-11 text-text-muted mb-4">Daily cash requirements for approved invoices</div>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={cashRequiredData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} label={{ value: 'Cash required', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} />
                            <Tooltip formatter={(v: any) => [fmtMoney(Number(v || 0))]} />
                            <Bar dataKey="Cash" fill="#8300e6" radius={[4, 4, 0, 0]} barSize={20} />
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
              className="cursor-pointer select-none transition-all duration-300 hover:shadow-sm hover:border-primary-9/40 hover:bg-primary-3/5 active:scale-[0.99] flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-lg bg-surface border border-border-default px-4 py-4 text-text-primary shadow-sm"
              onClick={() => setIsProcessingExpanded(!isProcessingExpanded)}
            >
              <div>
                <h3 className="font-poppins text-14 font-semibold">Processing &amp; Bottlenecks</h3>
                <p className="font-inter text-11 text-text-secondary mt-0.5">Pipeline throughput efficiency and approval metrics</p>
              </div>
              <div className="flex gap-6 flex-wrap items-center">
                <div className="text-center md:text-right flex flex-col gap-0.5">
                  <span className="font-poppins text-[10px] font-medium tracking-wider text-text-secondary dark:text-gray-4 uppercase">Total Invoices</span>
                  <span className="text-15 font-semibold text-primary-9">266</span>
                </div>
                <div className="text-center md:text-right flex flex-col gap-0.5">
                  <span className="font-poppins text-[10px] font-medium tracking-wider text-text-secondary dark:text-gray-4 uppercase">Touchless Rate</span>
                  <span className="text-15 font-semibold text-primary-9">44.0%</span>
                </div>
                <div className="text-center md:text-right flex flex-col gap-0.5">
                  <span className="font-poppins text-[10px] font-medium tracking-wider text-text-secondary dark:text-gray-4 uppercase">Avg Approval Days</span>
                  <span className="text-15 font-semibold text-primary-9">6.1 days</span>
                </div>
                <div className="p-1.5 rounded-lg text-text-secondary transition-colors z-20 ml-2">
                  {isProcessingExpanded ? <ChevronUp className="h-5 w-5 text-primary-9" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </div>
            </div>

            {isProcessingExpanded && (
              <div className="grid grid-cols-12 gap-5">
                <div className="col-span-12 lg:col-span-4 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
                  <h3 className="font-poppins text-14 font-semibold text-text-primary">Invoice processing funnel</h3>
                  <div className="font-inter text-11 text-text-muted mb-4">Pipeline drops across lifecycle steps</div>
                  <div className="flex flex-col gap-3.5 py-4">
                    {[
                      { step: '1. Received', value: '266 inv', width: '100%', pct: '100%' },
                      { step: '2. Extracted', value: '248 inv', width: '93%', pct: '93%' },
                      { step: '3. Approved', value: '210 inv', width: '79%', pct: '79%' },
                      { step: '4. Posted', value: '142 inv', width: '53%', pct: '53%' },
                    ].map(bar => (
                      <div key={bar.step} className="flex flex-col gap-1 font-inter text-12 font-semibold">
                        <div className="flex justify-between text-text-secondary"><span>{bar.step}</span><span>{bar.value}</span></div>
                        <div className="h-8 bg-gray-2 rounded overflow-hidden relative">
                          <div className="h-full bg-gradient-to-r from-primary-9 to-primary-10 flex items-center px-3 text-white font-semibold text-11" style={{ width: bar.width }}>{bar.pct} conversion</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {isProcessingExpanded && (
                  <div className="col-span-12 lg:col-span-4 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
                    <h3 className="font-poppins text-14 font-semibold text-text-primary">Approval delay heat map</h3>
                    <div className="font-inter text-11 text-text-muted mb-4">Approver delay averages over weeks</div>
                    <div className="flex flex-col gap-2 font-inter mt-3">
                      <div className="grid grid-cols-6 gap-1 text-[10px] text-text-muted font-semibold text-center">
                        <div></div>
                        {['W1', 'W2', 'W3', 'W4', 'W5'].map(w => <div key={w}>{w}</div>)}
                      </div>
                      {[
                        { user: 'A. Chen', cells: [3, 2, 4, 3, 2] }, { user: 'M. Okafor', cells: [1, 2, 1, 2, 1] },
                        { user: 'R. Singh', cells: [5, 4, 6, 5, 4] }, { user: 'L. Novak', cells: [2, 3, 2, 4, 2] },
                        { user: 'J. Fontaine', cells: [6, 8, 7, 9, 8] },
                      ].map(row => (
                        <div key={row.user} className="grid grid-cols-6 gap-1 items-center">
                          <div className="text-11 font-semibold text-text-secondary text-right pr-2">{row.user}</div>
                          {row.cells.map((val, idx) => {
                            let color = 'bg-[#F1E1FC]'
                            if (val > 7) color = 'bg-[#643094] text-white'
                            else if (val > 4) color = 'bg-[#8300e6] text-white'
                            else if (val > 2) color = 'bg-[#EEE6FD] text-primary-9'
                            return <div key={idx} className={cn("h-8 rounded flex items-center justify-center text-11 font-semibold", color)} title={`${row.user}: ${val} days`}>{val}d</div>
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {isProcessingExpanded && (
                  <div className="col-span-12 lg:col-span-4 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
                    <h3 className="font-poppins text-14 font-semibold text-text-primary">Invoice status distribution</h3>
                    <div className="font-inter text-11 text-text-muted mb-4">Click a slice to open matching list</div>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={[{ name: 'Approved', value: 48 }, { name: 'Pending', value: 34 }, { name: 'Processing', value: 22 }, { name: 'Hold', value: 12 }]} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={2} dataKey="value">
                            {['#1E8E6F', '#5c21e6', '#19c1d4', '#847C93'].map((color, idx) => <Cell key={idx} fill={color} onClick={() => { const name = ['Approved', 'Pending', 'Processing', 'Hold'][idx]; setDrillStatus(name); setActiveDrill('Status Distribution') }} className="cursor-pointer" />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 font-inter text-10 text-text-muted mt-2">
                      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded bg-success" />Approved</span>
                      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded bg-indigo-9" />Pending</span>
                      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded bg-cyan-9" />Processing</span>
                      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded bg-gray-10" />Hold</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Supplier Follow-ups (Always visible) */}
            <div
              className="cursor-pointer select-none transition-all duration-300 hover:shadow-sm hover:border-primary-9/40 hover:bg-primary-3/5 active:scale-[0.99] flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-lg bg-surface border border-border-default px-4 py-4 text-text-primary shadow-sm"
              onClick={() => setIsSupplierFollowUpExpanded(!isSupplierFollowUpExpanded)}
            >
              <div>
                <h3 className="font-poppins text-14 font-semibold">Supplier Follow-ups</h3>
                <p className="font-inter text-11 text-text-secondary mt-0.5">Vendors needing prompt outreach or query resolution</p>
              </div>
              <div className="flex gap-6 flex-wrap items-center">
                <div className="text-center md:text-right flex flex-col gap-0.5">
                  <span className="font-poppins text-[10px] font-medium tracking-wider text-text-secondary dark:text-gray-4 uppercase">Overdue Amount</span>
                  <span className="text-15 font-semibold text-red-9">{fmtMoney(metrics.overdueAmount || 0)}</span>
                </div>
                <div className="text-center md:text-right flex flex-col gap-0.5">
                  <span className="font-poppins text-[10px] font-medium tracking-wider text-text-secondary dark:text-gray-4 uppercase">Duplicates Value</span>
                  <span className="text-15 font-semibold text-primary-9">$84.2K</span>
                </div>
                <div className="text-center md:text-right flex flex-col gap-0.5">
                  <span className="font-poppins text-[10px] font-medium tracking-wider text-text-secondary dark:text-gray-4 uppercase">Suppliers to Chase</span>
                  <span className="text-15 font-semibold text-primary-9">9 vendors</span>
                </div>
                <div className="p-1.5 rounded-lg text-text-secondary transition-colors z-20 ml-2">
                  {isSupplierFollowUpExpanded ? <ChevronUp className="h-5 w-5 text-primary-9" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-5">
              {isSupplierFollowUpExpanded && (
                <div className="col-span-12 lg:col-span-6 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
                  <h3 className="font-poppins text-14 font-semibold text-text-primary">Outstanding payables by supplier</h3>
                  <div className="font-inter text-11 text-text-muted mb-4">Click a supplier's bar to drill down</div>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[{ name: 'Meridian Steel', value: 920 }, { name: 'Vertex IT', value: 680 }, { name: 'FastShip Ltd', value: 550 }, { name: 'Solaris Energy', value: 480 }, { name: 'Nimbus Cloud', value: 390 }]} layout="vertical" margin={{ left: -10, right: 10 }}>
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={90} />
                        <Tooltip formatter={(v: any) => [`$${v}K`]} />
                        <Bar dataKey="value" fill="#8300e6" radius={[0, 4, 4, 0]} barSize={12} onClick={(data: any) => { setDrillSupplier(data?.name ?? null); setActiveDrill('Outstanding Payables') }} className="cursor-pointer" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {isSupplierFollowUpExpanded && (
                <div className={cn("rounded-lg border border-border-default bg-surface p-5 shadow-xs transition-all duration-300", "col-span-6 lg:col-span-6")}>
                  <h3 className="font-poppins text-14 font-semibold text-text-primary">Invoice aging analysis</h3>
                  <div className="font-inter text-11 text-text-muted mb-4">Click a segment to drill into aging details</div>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[{ name: '0–15d', value: 1842 }, { name: '16–30d', value: 1205 }, { name: '31–45d', value: 623 }, { name: '46–60d', value: 298 }, { name: '60d+', value: 134 }]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: any) => [`${v} Invoices`, 'Volume']} />
                        <Bar dataKey="value" fill="#5c21e6" radius={[4, 4, 0, 0]} barSize={20} onClick={(data: any) => { setDrillAgingBucket(data?.name ?? null); setActiveDrill('Aging Analysis') }} className="cursor-pointer" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              {isSupplierFollowUpExpanded && (
                <div className="col-span-12 lg:col-span-6 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
                  <h3 className="font-poppins text-14 font-semibold text-text-primary">Monthly invoice trend</h3>
                  <div className="font-inter text-11 text-text-muted mb-4">Incoming workload volumes over the last 6 months</div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[{ name: 'Jan', count: 180 }, { name: 'Feb', count: 165 }, { name: 'Mar', count: 210 }, { name: 'Apr', count: 245 }, { name: 'May', count: 280 }, { name: 'Jun', count: 266 }]}>
                        <defs><linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8300e6" stopOpacity={0.25} /><stop offset="95%" stopColor="#8300e6" stopOpacity={0.0} /></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v) => [`${v} Invoices`]} />
                        <Area type="monotone" dataKey="count" stroke="#8300e6" strokeWidth={2} fillOpacity={1} fill="url(#trendGrad)" />
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
