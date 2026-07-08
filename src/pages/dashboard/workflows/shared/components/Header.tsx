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
  Search,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Building2,
  DollarSign,
  ClipboardList,
} from 'lucide-react'
import useDashboardStore from '@/pages/dashboard/stores/useDashboardStore'
import {
  getFilteredInvoices,
  getDashboardMetrics,
  TODAY,
  suppliers,
} from '@/pages/dashboard/utils/dashboardData'
import cn from '@/utils/cn'

// Format money values (e.g. $10.79M, $642.5K, $0)
function fmtMoney(v: number, currency = 'USD') {
  const sym = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'INR' ? '₹' : '$'
  const abs = Math.abs(v)
  if (abs >= 1.0e6) {
    return `${sym}${(v / 1.0e6).toFixed(2)}M`
  } else if (abs >= 1.0e3) {
    return `${sym}${(v / 1.0e3).toFixed(1)}K`
  }
  return `${sym}${v.toLocaleString()}`
}

// Cyan target-dot list bullet icon matching screenshot
const BulletIcon = () => (
  <svg className="h-4 w-4 text-[#00a2c7] shrink-0 mt-0.5 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="3" fill="currentColor" />
  </svg>
)

export default function DashboardCharts() {
  const {
    role,
    timeframe,
    supplierCategory,
    invoiceStatus,
    currency,
    searchQuery,
    drillSupplier,
    drillAgingBucket,
    drillStatus,
    setTimeframe,
    setSupplierCategory,
    setInvoiceStatus,
    setCurrency,
    setSearchQuery,
    setDrillSupplier,
    setDrillAgingBucket,
    setDrillStatus,
    resetFilters,
  } = useDashboardStore()

  // State variables for filter card dropdown refinements
  const [activeFilterDropdown, setActiveFilterDropdown] = React.useState<'suppliers' | 'statuses' | 'currencies' | 'more' | null>(null)
  const [activeFilterGroup, setActiveFilterGroup] = React.useState<'status' | 'amount' | 'supplier'>('status')
  const [filterSearchQuery, setFilterSearchQuery] = React.useState('')
  const [expandedInvoiceId, setExpandedInvoiceId] = React.useState<string | null>(null)

  // Collapse/Expand state for targeted cards
  const [isCommandCenterExpanded, setIsCommandCenterExpanded] = React.useState(true)

  // Compute dynamic lists based on active filters
  const filteredInvoices = React.useMemo(() => {
    return getFilteredInvoices({
      timeframe,
      supplierCategory,
      invoiceStatus,
      currency,
      searchQuery,
    })
  }, [timeframe, supplierCategory, invoiceStatus, currency, searchQuery])

  const metrics = React.useMemo(() => {
    return getDashboardMetrics(filteredInvoices, timeframe)
  }, [filteredInvoices, timeframe])

  // Drill down filter (shows table inline below the KPI cards)
  const [activeDrill, setActiveDrill] = React.useState<string | null>(null)

  const handleKpiClick = (kpiName: string) => {
    if (activeDrill === kpiName) {
      setActiveDrill(null)
    } else {
      setActiveDrill(kpiName)
    }
  }

  // Reset active drill row view if outstanding payables is collapsed/hidden
  React.useEffect(() => {
    if (!isCommandCenterExpanded && activeDrill === 'Total Outstanding Payables') {
      setActiveDrill(null)
    }
  }, [isCommandCenterExpanded, activeDrill])

  // Filtered list for inline expansion table
  const drillInvoices = React.useMemo(() => {
    if (!activeDrill) return []
    const drillLower = activeDrill.toLowerCase()
    let result = [...filteredInvoices]

    if (drillLower.includes('outstanding') || drillLower.includes('total ap')) {
      result = result.filter(inv => inv.status !== 'Paid' && inv.status !== 'Rejected')
    } else if (drillLower.includes('paid')) {
      result = result.filter(inv => inv.status === 'Paid')
    } else if (drillLower.includes('pending')) {
      result = result.filter(inv => inv.status === 'Pending' || inv.status === 'Approved' || inv.status === 'Processing')
    } else if (drillLower.includes('due today')) {
      result = result.filter(inv => {
        if (inv.status === 'Paid' || inv.status === 'Rejected') return false
        const d = new Date(inv.dueDate)
        return d.getFullYear() === TODAY.getFullYear() && d.getMonth() === TODAY.getMonth() && d.getDate() === TODAY.getDate()
      })
    } else if (drillLower.includes('overdue')) {
      result = result.filter(inv => inv.status !== 'Paid' && inv.status !== 'Rejected' && inv.dueDate < TODAY)
    }

    // Secondary drills from graphs
    if (drillSupplier) {
      result = result.filter(inv => inv.supplier === drillSupplier)
    }
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
    if (drillStatus) {
      result = result.filter(inv => inv.status === drillStatus)
    }

    return result
  }, [activeDrill, filteredInvoices, drillSupplier, drillAgingBucket, drillStatus])

  // Get color for status badges
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-success-light text-success border border-success/20'
      case 'Paid':
        return 'bg-primary-3 text-primary-9 border border-primary-4'
      case 'Pending':
        return 'bg-orange-2 text-orange-11 border border-orange-3'
      case 'Processing':
        return 'bg-cyan-2 text-cyan-11 border border-cyan-3'
      case 'Rejected':
        return 'bg-red-2 text-red-11 border border-red-3'
      case 'Hold':
      default:
        return 'bg-gray-2 text-gray-10 border border-gray-3'
    }
  }

  // Pre-formatted list of AI insights with exact mockup contents, bold weights, and green/red highlights
  const aiInsightsList = React.useMemo(() => {
    return [
      {
        node: (
          <>
            Outstanding overdue balances are <span className="font-bold text-[#1E8E6F]">down 100%</span> versus last month (<span className="font-bold">$0</span> now outstanding past due).
          </>
        )
      },
      {
        node: (
          <>
            Just <span className="font-bold">3 suppliers</span> account for <span className="font-bold">19%</span> of unpaid liabilities, led by <span className="font-bold">Harbor Point Consulting</span> at $686.5K.
          </>
        )
      },
      {
        node: (
          <>
            Average approval time increased by <span className="font-bold text-[#B3261E]">1.2 days</span> month over month, now averaging <span className="font-bold">6.1 days</span>.
          </>
        )
      },
      {
        node: (
          <>
            <span className="font-bold">28 invoices</span> flagged as potential duplicates — recommend review before release to avoid double payment.
          </>
        )
      },
      {
        node: (
          <>
            Payments due this week total <span className="font-bold">$298.7K</span>, <span className="font-bold text-[#1E8E6F]">below last week by 67%</span>.
          </>
        )
      },
      {
        node: (
          <>
            Profit margin decreased to <span className="font-bold">12.9%</span>, pressured by higher supplier expenses.
          </>
        )
      },
      {
        node: (
          <>
            <span className="font-bold">Legal</span> has the longest approval cycle in the current view, averaging <span className="font-bold">8.0 days</span> per invoice.
          </>
        )
      },
      {
        node: (
          <>
            <span className="font-bold">10 of 24 suppliers</span> now score above 80% on-time delivery, reflecting steadier vendor performance.
          </>
        )
      },
      {
        node: (
          <>
            Projected cash requirement for the next 4 weeks is <span className="font-bold">$755.7K</span> — plan liquidity accordingly.
          </>
        )
      }
    ]
  }, [])

  return (
    <div className="flex flex-col gap-6 p-6">

      {/* 1. QUICK FILTERS ROW (aligned exactly with screenshot mockup) */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-border-default bg-surface p-3 shadow-xs">
        <span className="text-12 font-bold text-text-primary mr-1">Filters:</span>

        {/* Timeframe pills */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: 'Today', key: 'today' },
            { label: 'This Week', key: 'week' },
            { label: 'This Month', key: 'month' },
            { label: 'Last Month', key: 'lastmonth' },
            { label: 'Quarter', key: 'quarter' },
            { label: 'Financial Year', key: 'fy' }
          ].map(chip => (
            <button
              key={chip.key}
              className={cn(
                "cursor-pointer rounded-full border px-3.5 py-1 text-12 font-medium transition-all hover:bg-gray-3 dark:hover:bg-gray-10",
                timeframe === chip.key
                  ? "border-primary-9 bg-primary-9 text-white shadow-xs"
                  : "border-border-default bg-surface text-text-secondary"
              )}
              onClick={() => setTimeframe(chip.key as any)}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Custom select dropdown pills */}
        <div className="flex flex-wrap gap-1.5">

          {/* Suppliers Dropdown Toggle */}
          <div className="relative">
            <button
              className={cn(
                "cursor-pointer rounded-full border px-3.5 py-1 text-12 font-medium transition-all hover:bg-gray-3 dark:hover:bg-gray-10 flex items-center gap-1.5",
                supplierCategory || activeFilterDropdown === 'suppliers'
                  ? "border-primary-9 bg-primary-3/50 text-primary-9"
                  : "border-border-default bg-surface text-text-secondary"
              )}
              onClick={() => {
                setActiveFilterDropdown(activeFilterDropdown === 'suppliers' ? null : 'suppliers')
                setFilterSearchQuery('')
              }}
            >
              <span>🏢 {supplierCategory || 'Suppliers'}</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>

            {activeFilterDropdown === 'suppliers' && (
              <div className="absolute z-30 top-full left-0 mt-1.5 w-[240px] rounded-lg border border-border-default bg-surface p-3 shadow-xs animate-in fade-in slide-in-from-top-2">
                <div className="relative mb-2">
                  <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                  <input
                    className="w-full rounded-lg border border-border-default bg-gray-2 py-1 pr-3 pl-8 text-11 text-text-primary outline-none"
                    placeholder="Search supplier..."
                    type="text"
                    value={filterSearchQuery}
                    onChange={(e) => setFilterSearchQuery(e.target.value)}
                  />
                </div>
                <div className="h-px bg-border-default -mx-3 my-2" />
                <div className="flex flex-col gap-0.5 max-h-[180px] overflow-y-auto scrollbar">
                  <button
                    className={cn(
                      "w-full rounded px-2.5 py-1.5 text-12 font-medium text-left cursor-pointer transition-colors text-text-primary hover:bg-gray-2",
                      !supplierCategory && "bg-primary-3/30 text-primary-9 font-semibold"
                    )}
                    onClick={() => {
                      setSupplierCategory('')
                      setActiveFilterDropdown(null)
                    }}
                  >
                    🏢 All Suppliers
                  </button>
                  {Array.from(new Set(suppliers.map(s => s.category))).map(cat => (
                    <button
                      key={cat}
                      className={cn(
                        "w-full rounded px-2.5 py-1.5 text-12 font-medium text-left cursor-pointer transition-colors text-text-primary hover:bg-gray-2",
                        supplierCategory === cat && "bg-primary-3/30 text-primary-9 font-semibold"
                      )}
                      onClick={() => {
                        setSupplierCategory(cat)
                        setActiveFilterDropdown(null)
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Statuses Dropdown Toggle */}
          <div className="relative">
            <button
              className={cn(
                "cursor-pointer rounded-full border px-3.5 py-1 text-12 font-medium transition-all hover:bg-gray-3 dark:hover:bg-gray-10 flex items-center gap-1.5",
                invoiceStatus || activeFilterDropdown === 'statuses'
                  ? "border-primary-9 bg-primary-3/50 text-primary-9"
                  : "border-border-default bg-surface text-text-secondary"
              )}
              onClick={() => {
                setActiveFilterDropdown(activeFilterDropdown === 'statuses' ? null : 'statuses')
                setFilterSearchQuery('')
              }}
            >
              <span>📋 {invoiceStatus === 'Pending' ? 'Partially Approved' : (invoiceStatus || 'Statuses')}</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>

            {activeFilterDropdown === 'statuses' && (
              <div className="absolute z-30 top-full left-0 mt-1.5 w-[240px] rounded-lg border border-border-default bg-surface p-3 shadow-xs animate-in fade-in slide-in-from-top-2">
                <div className="relative mb-2">
                  <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                  <input
                    className="w-full rounded-lg border border-border-default bg-gray-2 py-1 pr-3 pl-8 text-11 text-text-primary outline-none"
                    placeholder="Search status..."
                    type="text"
                    value={filterSearchQuery}
                    onChange={(e) => setFilterSearchQuery(e.target.value)}
                  />
                </div>
                <div className="h-px bg-border-default -mx-3 my-2" />
                <div className="flex flex-col gap-0.5 max-h-[180px] overflow-y-auto scrollbar">
                  {[
                    { label: 'Approved', val: 'Approved' },
                    { label: 'Partially Approved', val: 'Pending' },
                    { label: 'Rejected', val: 'Rejected' },
                    { label: 'Paid', val: 'Paid' },
                    { label: 'Processing', val: 'Processing' },
                    { label: 'Hold', val: 'Hold' }
                  ].filter(item => item.label.toLowerCase().includes(filterSearchQuery.toLowerCase())).map(item => (
                    <button
                      key={item.label}
                      className={cn(
                        "w-full rounded px-2.5 py-1.5 text-12 font-medium text-left cursor-pointer transition-colors text-text-primary hover:bg-gray-2",
                        invoiceStatus === item.val && "bg-primary-3/30 text-primary-9 font-semibold"
                      )}
                      onClick={() => {
                        setInvoiceStatus(item.val)
                        setActiveFilterDropdown(null)
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Currencies Dropdown Toggle */}
          <div className="relative">
            <button
              className={cn(
                "cursor-pointer rounded-full border px-3.5 py-1 text-12 font-medium transition-all hover:bg-gray-3 dark:hover:bg-gray-10 flex items-center gap-1.5",
                currency || activeFilterDropdown === 'currencies'
                  ? "border-primary-9 bg-primary-3/50 text-primary-9"
                  : "border-border-default bg-surface text-text-secondary"
              )}
              onClick={() => {
                setActiveFilterDropdown(activeFilterDropdown === 'currencies' ? null : 'currencies')
                setFilterSearchQuery('')
              }}
            >
              <span>$ {currency || 'Currencies'}</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>

            {activeFilterDropdown === 'currencies' && (
              <div className="absolute z-30 top-full left-0 mt-1.5 w-[240px] rounded-lg border border-border-default bg-surface p-3 shadow-xs animate-in fade-in slide-in-from-top-2">
                <div className="relative mb-2">
                  <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                  <input
                    className="w-full rounded-lg border border-border-default bg-gray-2 py-1 pr-3 pl-8 text-11 text-text-primary outline-none"
                    placeholder="Search currency..."
                    type="text"
                    value={filterSearchQuery}
                    onChange={(e) => setFilterSearchQuery(e.target.value)}
                  />
                </div>
                <div className="h-px bg-border-default -mx-3 my-2" />
                <div className="flex flex-col gap-0.5 max-h-[180px] overflow-y-auto scrollbar">
                  <button
                    className={cn(
                      "w-full rounded px-2.5 py-1.5 text-12 font-medium text-left cursor-pointer transition-colors text-text-primary hover:bg-gray-2",
                      !currency && "bg-primary-3/30 text-primary-9 font-semibold"
                    )}
                    onClick={() => {
                      setCurrency('')
                      setActiveFilterDropdown(null)
                    }}
                  >
                    $ All Currencies
                  </button>
                  {['USD', 'EUR', 'INR', 'GBP'].filter(ccy => ccy.toLowerCase().includes(filterSearchQuery.toLowerCase())).map(ccy => (
                    <button
                      key={ccy}
                      className={cn(
                        "w-full rounded px-2.5 py-1.5 text-12 font-medium text-left cursor-pointer transition-colors text-text-primary hover:bg-gray-2",
                        currency === ccy && "bg-primary-3/30 text-primary-9 font-semibold"
                      )}
                      onClick={() => {
                        setCurrency(ccy)
                        setActiveFilterDropdown(null)
                      }}
                    >
                      {ccy}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* More Filters Dropdown Toggle */}
          <div className="relative">
            <button
              className={cn(
                "cursor-pointer rounded-full border px-3.5 py-1 text-12 font-medium transition-all hover:bg-gray-3 dark:hover:bg-gray-10 flex items-center gap-1.5",
                (searchQuery && !currency && !supplierCategory && searchQuery !== 'amount > 100000' && searchQuery !== 'amount < 10000') || activeFilterDropdown === 'more'
                  ? "border-primary-9 bg-primary-3/50 text-primary-9"
                  : "border-border-default bg-surface text-text-secondary"
              )}
              onClick={() => {
                setActiveFilterDropdown(activeFilterDropdown === 'more' ? null : 'more')
                setFilterSearchQuery('')
              }}
            >
              <span>⚙ More filters</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>

            {activeFilterDropdown === 'more' && (
              <div className="absolute z-30 top-full left-0 mt-1.5 flex rounded-lg border border-border-default bg-surface shadow-xs overflow-hidden animate-in fade-in slide-in-from-top-2">
                {/* Left panel: filter group options */}
                <div className="flex flex-col w-[190px] bg-primary-3/30 border-r border-border-default p-1 dark:bg-gray-12">
                  {[
                    { id: 'status', label: 'Request Status', icon: ClipboardList },
                    { id: 'amount', label: 'PO Amount', icon: DollarSign },
                    { id: 'supplier', label: 'Supplier', icon: Building2 }
                  ].map(group => {
                    const IconComp = group.icon
                    const isActive = activeFilterGroup === group.id
                    return (
                      <button
                        key={group.id}
                        className={cn(
                          "flex items-center justify-between w-full rounded-lg px-3 py-2.5 text-12 font-medium text-left transition-all cursor-pointer",
                          isActive
                            ? "bg-primary-3 text-primary-9 dark:bg-primary-9 dark:text-white"
                            : "text-text-secondary hover:bg-gray-2 dark:hover:bg-gray-10"
                        )}
                        onClick={() => {
                          setActiveFilterGroup(group.id as any)
                          setFilterSearchQuery('')
                        }}
                      >
                        <span className="flex items-center gap-2">
                          <IconComp className="h-4 w-4" />
                          <span>{group.label}</span>
                        </span>
                        <ChevronRight className="h-3 w-3 opacity-60" />
                      </button>
                    )
                  })}
                </div>

                {/* Right panel: dynamic options selector */}
                <div className="flex flex-col w-[260px] p-3 gap-2.5 bg-surface">
                  {activeFilterGroup === 'status' && (
                    <>
                      <div className="relative">
                        <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                        <input
                          className="w-full rounded-lg border border-border-default bg-gray-2 py-1 pr-3 pl-8 text-11 text-text-primary outline-none"
                          placeholder="Search status..."
                          type="text"
                          value={filterSearchQuery}
                          onChange={(e) => setFilterSearchQuery(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-0.5 mt-1 max-h-[160px] overflow-y-auto scrollbar">
                        {[
                          { label: 'Approved', val: 'Approved' },
                          { label: 'Partially Approved', val: 'Pending' },
                          { label: 'Rejected', val: 'Rejected' }
                        ].filter(item => item.label.toLowerCase().includes(filterSearchQuery.toLowerCase())).map(item => (
                          <button
                            key={item.label}
                            className={cn(
                              "w-full rounded px-2.5 py-1.5 text-12 font-medium text-left cursor-pointer transition-colors text-text-primary hover:bg-gray-2",
                              invoiceStatus === item.val
                                ? "bg-primary-3/30 text-primary-9 font-semibold"
                                : "text-text-secondary hover:bg-gray-2"
                            )}
                            onClick={() => {
                              setInvoiceStatus(item.val)
                              setActiveFilterDropdown(null)
                            }}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {activeFilterGroup === 'amount' && (
                    <>
                      <div className="text-11 font-bold text-text-muted mb-1">Filter by PO Amount</div>
                      <div className="flex flex-col gap-2">
                        <button
                          className="w-full rounded px-2.5 py-1.5 text-12 font-medium text-left hover:bg-gray-2 cursor-pointer text-text-secondary"
                          onClick={() => {
                            setSearchQuery('amount > 100000')
                            setActiveFilterDropdown(null)
                          }}
                        >
                          High Value (&gt; $100K)
                        </button>
                        <button
                          className="w-full rounded px-2.5 py-1.5 text-12 font-medium text-left hover:bg-gray-2 cursor-pointer text-text-secondary"
                          onClick={() => {
                            setSearchQuery('amount < 1000')
                            setActiveFilterDropdown(null)
                          }}
                        >
                          Low Value (&lt; $1K)
                        </button>
                      </div>
                    </>
                  )}

                  {activeFilterGroup === 'supplier' && (
                    <>
                      <div className="relative">
                        <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                        <input
                          className="w-full rounded-lg border border-border-default bg-gray-2 py-1 pr-3 pl-8 text-11 text-text-primary outline-none"
                          placeholder="Search supplier..."
                          type="text"
                          value={filterSearchQuery}
                          onChange={(e) => setFilterSearchQuery(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-0.5 mt-1 max-h-[160px] overflow-y-auto scrollbar">
                        {suppliers.map(s => s.name).filter(name => name.toLowerCase().includes(filterSearchQuery.toLowerCase())).slice(0, 5).map(supName => (
                          <button
                            key={supName}
                            className="w-full rounded px-2.5 py-1.5 text-12 font-medium text-left hover:bg-gray-2 cursor-pointer text-text-secondary"
                            onClick={() => {
                              setSearchQuery(supName)
                              setActiveFilterDropdown(null)
                            }}
                          >
                            {supName}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Reset button */}
        {(timeframe !== 'fy' || supplierCategory || invoiceStatus || currency || searchQuery) && (
          <button
            className="cursor-pointer rounded-full border border-border-default bg-gray-2 px-3.5 py-1 text-12 font-medium text-text-secondary transition-all hover:bg-gray-3"
            onClick={() => {
              resetFilters()
              setActiveFilterDropdown(null)
            }}
          >
            Reset
          </button>
        )}

        <div className="flex-1" />

        {/* Fully rounded Search Box on the right */}
        <div className="relative">
          <Search className="absolute top-1/2 left-3.5 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
          <input
            className="w-60 rounded-full border border-border-default bg-surface py-1.5 pr-4 pl-9.5 text-12 text-text-primary outline-none transition-all focus:border-primary-9 focus:ring-1 focus:ring-primary-9"
            placeholder="Search invoice, supplier, PO..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* 2. WHITE BANNER (AP Command Center) */}
      <div className="relative flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-lg bg-surface border border-border-default px-8 py-6 text-text-primary shadow-xs">
        <div className="relative z-10">
          <h2 className="font-serif text-20 font-bold tracking-wide">AP Command Center</h2>
          <div className="font-mono text-11 text-text-muted mt-1">
            Real-time · {timeframe} · {supplierCategory || 'all suppliers'} · simulated ledger
          </div>
        </div>

        <div className="relative z-10 flex gap-8 flex-wrap items-center">
          <div className="text-right">
            <div className="font-mono text-10 uppercase tracking-widest text-text-muted">Total AP</div>
            <div className="text-21 font-bold tracking-tight text-primary-9">{fmtMoney(metrics.totalAP || 0)}</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-10 uppercase tracking-widest text-text-muted">Overdue</div>
            <div className="text-21 font-bold tracking-tight text-primary-9">{fmtMoney(metrics.overdueAmount || 0)}</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-10 uppercase tracking-widest text-text-muted">Open Invoices</div>
            <div className="text-21 font-bold tracking-tight text-primary-9">{metrics.openInvoices}</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-10 uppercase tracking-widest text-text-muted">DPO</div>
            <div className="text-21 font-bold tracking-tight text-primary-9">{metrics.dpo}d</div>
          </div>

          {/* Chevron expand/collapse toggle icon on the far right */}
          <button
            className="cursor-pointer p-1.5 hover:bg-gray-2 dark:hover:bg-gray-10 rounded-lg text-text-secondary transition-colors ml-4 z-20"
            onClick={() => setIsCommandCenterExpanded(!isCommandCenterExpanded)}
            title={isCommandCenterExpanded ? "Collapse targeted cards" : "Expand targeted cards"}
          >
            {isCommandCenterExpanded ? (
              <ChevronUp className="h-5 w-5 text-primary-9" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Soft background shape */}
        <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-primary-3/20 blur-xl" />
      </div>

      {/* 3. KPI STRIP */}
      {isCommandCenterExpanded && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-6 animate-in fade-in duration-300">
          {[
            {
              name: 'Total Outstanding Payables',
              value: fmtMoney(metrics.totalAP || 0),
              trend: metrics.totalAPChange,
              color: 'border-t-primary-9',
              isGood: false
            },
            {
              name: 'Total Paid Amount',
              value: fmtMoney(metrics.totalPaid || 0),
              trend: metrics.totalPaidChange,
              color: 'border-t-success',
              isGood: true
            },
            {
              name: 'Pending Payments',
              value: fmtMoney(metrics.pendingPayments || 0),
              trend: metrics.pendingPaymentsChange,
              color: 'border-t-primary-9',
              isGood: true
            },
            {
              name: 'Due Today',
              value: fmtMoney(metrics.dueToday || 0),
              trend: metrics.dueTodayChange,
              color: 'border-t-cyan-9',
              isGood: true
            },
            {
              name: 'Overdue Amount',
              value: fmtMoney(metrics.overdueAmount || 0),
              trend: metrics.overdueChange,
              color: 'border-t-red-9',
              isGood: false
            },
            {
              name: 'Avg. Processing Time',
              value: metrics.avgProcessing,
              trend: metrics.avgProcessingChange,
              color: 'border-t-primary-9',
              isGood: true
            }
          ].map(kpi => (
            <div
              key={kpi.name}
              className={cn(
                "cursor-pointer rounded-lg border border-border-default bg-surface p-4 shadow-xs transition-all hover:-translate-y-0.5 border-t-3",
                kpi.color,
                activeDrill === kpi.name && "ring-2 ring-primary-9/40 shadow-md"
              )}
              onClick={() => handleKpiClick(kpi.name)}
            >
              <div className="text-10 font-bold uppercase tracking-wider text-text-muted">{kpi.name}</div>
              <div className="font-serif text-20 font-bold text-text-primary mt-1.5">{kpi.value}</div>
              <div className="flex items-center gap-1.5 mt-2 text-11 font-semibold">
                <span className={cn(
                  "rounded px-1.5 py-0.5",
                  kpi.isGood ? "bg-success-light text-success" : "bg-red-2 text-red-11"
                )}>
                  {kpi.trend}
                </span>
                <span className="text-text-muted font-normal">vs last month</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* INLINE EXPANSION PANEL FOR DRILLS */}
      {isCommandCenterExpanded && activeDrill && (
        <div className="animate-in fade-in slide-in-from-top-4 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-border-default pb-3.5 mb-4">
            <div>
              <h3 className="font-serif text-15 font-bold text-text-primary">
                Invoices Drill-Down <span className="text-primary-9">· {activeDrill}</span>
              </h3>
              <p className="text-11 text-text-muted mt-0.5">Showing records matching this metrics slice</p>
            </div>
            <button
              className="cursor-pointer rounded-lg border border-border-default bg-gray-2 px-2.5 py-1 text-12 font-semibold text-text-secondary transition-all hover:bg-gray-3"
              onClick={() => setActiveDrill(null)}
            >
              Close
            </button>
          </div>

          {drillInvoices.length > 0 ? (
            <div className="overflow-x-auto max-h-[300px] scrollbar">
              <table className="w-full text-left text-12 border-collapse">
                <thead>
                  <tr className="bg-gray-2 text-text-muted uppercase text-10 font-bold border-b border-border-default">
                    <th className="p-3">Invoice</th>
                    <th className="p-3">Supplier</th>
                    <th className="p-3">Department</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Payment Method</th>
                  </tr>
                </thead>
                <tbody>
                  {drillInvoices.slice(0, 50).map(inv => (
                    <tr key={inv.id} className="border-b border-gray-3 hover:bg-gray-2/50">
                      <td className="p-3 font-mono font-bold text-primary-9">{inv.id}</td>
                      <td className="p-3 font-medium text-text-primary">
                        <span className="mr-1.5">{inv.flag}</span>{inv.supplier}
                      </td>
                      <td className="p-3 text-text-secondary">{inv.department}</td>
                      <td className="p-3 text-right font-mono font-bold text-text-primary">{fmtMoney(inv.amount, inv.currency)}</td>
                      <td className="p-3 text-text-secondary">{new Date(inv.dueDate).toLocaleDateString()}</td>
                      <td className="p-3">
                        <span className={cn("px-2 py-0.5 rounded-full text-10 font-bold", getStatusClass(inv.status))}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-3 text-text-muted">{inv.paymentMethod}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {drillInvoices.length > 50 && (
                <div className="text-center text-11 text-text-muted mt-3">
                  Showing first 50 of {drillInvoices.length} invoices. Filter to narrow down.
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-text-muted text-12">No matching invoice records in this slice.</div>
          )}
        </div>
      )}

      {/* 5. TRACK CONTENTS */}
      {role === 'management' ? (

        /* ================= MANAGEMENT TRACK ================= */
        <div className="flex flex-col gap-6">

          {/* Insights (Conditionally visible) & Supplier Radar (Always visible, auto-spanning when insights collapse) */}
          <div className="grid grid-cols-12 gap-5">
            {isCommandCenterExpanded && (
              <div className="col-span-12 lg:col-span-8 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-sans text-15 font-bold text-text-primary">AI-generated insights</h3>
                    <div className="text-11 text-text-muted mt-0.5">Auto-updates with your filters — the ledger's margin notes</div>
                  </div>
                  <span className="rounded border border-border-default bg-surface px-1.5 py-0.5 text-10 font-bold text-text-muted">LIVE</span>
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

            {/* Radar / Risk Distribution */}
            <div className={cn(
              "rounded-lg border border-border-default bg-surface p-5 shadow-xs transition-all duration-300",
              isCommandCenterExpanded ? "col-span-12 lg:col-span-4" : "col-span-12"
            )}>
              <h3 className="font-serif text-14 font-bold text-text-primary">Supplier Risk Radar</h3>
              <div className="text-11 text-text-muted mb-4">Which vendors carry the most risk exposure?</div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Low Risk', value: 67, color: '#1E8E6F' },
                        { name: 'Medium Risk', value: 24, color: '#0f7a86' },
                        { name: 'High Risk', value: 9, color: '#B3261E' }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {[
                        { color: '#1E8E6F' },
                        { color: '#0f7a86' },
                        { color: '#B3261E' }
                      ].map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => [`${v}%`, 'Exposure']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-around text-11 mt-2">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-success" />Low</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-warning" />Medium</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-red-9" />High</span>
              </div>
            </div>
          </div>

          {/* Details below (Always visible) */}
          <div className="flex flex-col gap-6">
            {/* Section banner (white background refinement) */}
            <div className="flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-lg bg-surface border border-border-default px-8 py-5 text-text-primary shadow-xs">
              <div>
                <h3 className="font-serif text-16 font-bold">Profitability &amp; Cash Position</h3>
                <p className="text-11 text-text-secondary mt-0.5">Is payables growth eating margin · future liquidity needs</p>
              </div>
              <div className="flex gap-8 flex-wrap">
                <div className="text-right">
                  <div className="text-10 uppercase tracking-widest text-text-muted">Profit Margin</div>
                  <div className="text-18 font-bold text-cyan-9">12.9%</div>
                </div>
                <div className="text-right">
                  <div className="text-10 uppercase tracking-widest text-text-muted">Next 4 Weeks</div>
                  <div className="text-18 font-bold text-primary-9">$3.85M</div>
                </div>
                <div className="text-right">
                  <div className="text-10 uppercase tracking-widest text-text-muted">Peak Week</div>
                  <div className="text-18 font-bold text-primary-9">Week 3</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-5">
              {/* Profit vs AP spending */}
              <div className="col-span-12 lg:col-span-6 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
                <h3 className="font-serif text-14 font-bold text-text-primary">Profit vs AP spending</h3>
                <div className="text-11 text-text-muted mb-4">Dual axis spending trend comparison</div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={[
                        { name: 'Jan', AP: 4.2, Profit: 12.1 },
                        { name: 'Feb', AP: 3.8, Profit: 13.0 },
                        { name: 'Mar', AP: 5.1, Profit: 11.5 },
                        { name: 'Apr', AP: 4.8, Profit: 12.8 },
                        { name: 'May', AP: 5.6, Profit: 12.9 },
                        { name: 'Jun', AP: 6.2, Profit: 12.7 }
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11 }} label={{ value: 'AP ($M)', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} label={{ value: 'Profit %', angle: 90, position: 'insideRight', style: { fontSize: 10 } }} />
                      <Tooltip />
                      <Bar yAxisId="left" dataKey="AP" fill="#8300e6" radius={[4, 4, 0, 0]} barSize={20} />
                      <Line yAxisId="right" type="monotone" dataKey="Profit" stroke="#19c1d4" strokeWidth={2.5} dot={{ r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Monthly payment trend */}
              <div className="col-span-12 lg:col-span-6 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
                <h3 className="font-serif text-14 font-bold text-text-primary">Monthly payment trend</h3>
                <div className="text-11 text-text-muted mb-4">Cash leaving the building, month by month</div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={[
                        { name: 'Jan', value: 8.5 },
                        { name: 'Feb', value: 7.2 },
                        { name: 'Mar', value: 9.8 },
                        { name: 'Apr', value: 11.2 },
                        { name: 'May', value: 12.5 },
                        { name: 'Jun', value: 10.9 }
                      ]}
                    >
                      <defs>
                        <linearGradient id="paymentGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8300e6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#8300e6" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: any) => [`$${v}M`]} />
                      <Area type="monotone" dataKey="value" stroke="#8300e6" strokeWidth={2} fillOpacity={1} fill="url(#paymentGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Cash flow forecast */}
              <div className="col-span-12 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
                <h3 className="font-serif text-14 font-bold text-text-primary">Cash flow forecast</h3>
                <div className="text-11 text-text-muted mb-4">Liquidity projection and cash needs over next 10 weeks</div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={[
                        { name: 'W1', value: 3.5 },
                        { name: 'W2', value: 3.2 },
                        { name: 'W3', value: 4.8 },
                        { name: 'W4', value: 3.9 },
                        { name: 'W5', value: 2.5 },
                        { name: 'W6', value: 1.8 },
                        { name: 'W7', value: 2.2 },
                        { name: 'W8', value: 3.1 },
                        { name: 'W9', value: 2.8 },
                        { name: 'W10', value: 3.5 }
                      ]}
                    >
                      <defs>
                        <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#5c21e6" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#5c21e6" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: any) => [`$${v}M`]} />
                      <Area type="monotone" dataKey="value" stroke="#5c21e6" strokeWidth={2} fillOpacity={1} fill="url(#forecastGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Section banner (white background refinement) */}
            <div className="flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-lg bg-surface border border-border-default px-8 py-5 text-text-primary shadow-xs">
              <div>
                <h3 className="font-serif text-16 font-bold">Supplier Concentration &amp; Risk</h3>
                <p className="text-11 text-text-secondary mt-0.5">Where spend concentrates · vendor risk exposure</p>
              </div>
              <div className="flex gap-8 flex-wrap">
                <div className="text-right">
                  <div className="text-10 uppercase tracking-widest text-text-muted">Active Suppliers</div>
                  <div className="text-18 font-bold text-primary-9">24</div>
                </div>
                <div className="text-right">
                  <div className="text-10 uppercase tracking-widest text-text-muted">High Risk</div>
                  <div className="text-18 font-bold text-red-9">3</div>
                </div>
                <div className="text-right">
                  <div className="text-10 uppercase tracking-widest text-text-muted">Top-3 Concentration</div>
                  <div className="text-18 font-bold text-primary-9">44.0%</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-5">
              {/* Top 10 suppliers */}
              <div className={cn(
                "rounded-lg border border-border-default bg-surface p-5 shadow-xs transition-all duration-300",
                isCommandCenterExpanded ? "col-span-12 lg:col-span-4" : "col-span-12 lg:col-span-6"
              )}>
                <h3 className="font-serif text-14 font-bold text-text-primary">Top 10 suppliers by invoice value</h3>
                <div className="text-11 text-text-muted mb-4">Concentration of invoice liabilities</div>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Meridian Steel', value: 1.8 },
                        { name: 'Northwind Log.', value: 1.5 },
                        { name: 'Vertex IT', value: 1.2 },
                        { name: 'Blue Harbor', value: 0.9 },
                        { name: 'Solaris Energy', value: 0.8 }
                      ]}
                      layout="vertical"
                      margin={{ left: -10, right: 10 }}
                    >
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={90} />
                      <Tooltip formatter={(v: any) => [`$${v}M`]} />
                      <Bar dataKey="value" fill="#8300e6" radius={[0, 4, 4, 0]} barSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Outstanding payables (Conditionally shown) */}
              {isCommandCenterExpanded && (
                <div className="col-span-12 lg:col-span-4 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
                  <h3 className="font-serif text-14 font-bold text-text-primary">Outstanding payables by supplier</h3>
                  <div className="text-11 text-text-muted mb-4">Click a supplier's bar to drill down</div>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: 'Meridian Steel', value: 920 },
                          { name: 'Vertex IT', value: 680 },
                          { name: 'FastShip Ltd', value: 550 },
                          { name: 'Solaris Energy', value: 480 },
                          { name: 'Nimbus Cloud', value: 390 }
                        ]}
                        layout="vertical"
                        margin={{ left: -10, right: 10 }}
                      >
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={90} />
                        <Tooltip formatter={(v: any) => [`$${v}K`]} />
                        <Bar
                          dataKey="value"
                          fill="#5c21e6"
                          radius={[0, 4, 4, 0]}
                          barSize={12}
                          onClick={(data: any) => {
                            setDrillSupplier(data?.name ?? null)
                            setActiveDrill('Outstanding Payables')
                          }}
                          className="cursor-pointer"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Department-wise spend */}
              <div className={cn(
                "rounded-lg border border-border-default bg-surface p-5 shadow-xs transition-all duration-300",
                isCommandCenterExpanded ? "col-span-12 lg:col-span-4" : "col-span-12 lg:col-span-6"
              )}>
                <h3 className="font-serif text-14 font-bold text-text-primary">Department-wise spend</h3>
                <div className="text-11 text-text-muted mb-4">Tile size reflects share of AP expenses</div>

                {/* Treemap layout list representation */}
                <div className="grid grid-cols-2 gap-2 h-48">
                  {[
                    { name: 'Operations', share: '34%', amt: '$3.67M', color: 'bg-primary-3 text-primary-9 border border-primary-4' },
                    { name: 'IT Services', share: '22%', amt: '$2.37M', color: 'bg-primary-3 text-primary-9 border border-primary-4' },
                    { name: 'Marketing', share: '18%', amt: '$1.94M', color: 'bg-primary-3 text-primary-9 border border-primary-4' },
                    { name: 'HR Staffing', share: '12%', amt: '$1.29M', color: 'bg-primary-3 text-primary-9 border border-primary-4' },
                    { name: 'Finance', share: '9%', amt: '$0.97M', color: 'bg-gray-2 text-text-secondary border border-border-default' },
                    { name: 'Legal Advisors', share: '5%', amt: '$0.54M', color: 'bg-gray-2 text-text-secondary border border-border-default' }
                  ].map(dept => (
                    <div
                      key={dept.name}
                      className={cn("cursor-pointer rounded-lg p-2.5 flex flex-col justify-between transition-all hover:scale-[1.02]", dept.color)}
                      onClick={() => {
                        setSearchQuery(dept.name)
                        setActiveDrill('Department Spend')
                      }}
                    >
                      <span className="text-10 font-bold uppercase tracking-wider">{dept.name}</span>
                      <div className="flex justify-between items-baseline mt-1">
                        <span className="text-14 font-bold font-serif">{dept.amt}</span>
                        <span className="text-9 opacity-80">{dept.share}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-10 text-text-muted mt-3">Click on a tile to filter workflow records.</div>
              </div>

              {/* Region distribution */}
              <div className="col-span-12 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
                <h3 className="font-serif text-14 font-bold text-text-primary">Supplier geographic distribution</h3>
                <div className="text-11 text-text-muted mb-4">Regional volume and spend exposure analysis</div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { region: 'United States', flag: '🇺🇸', value: '$5.8M', count: '12 suppliers', pct: 54 },
                    { region: 'Germany', flag: '🇩🇪', value: '$2.1M', count: '5 suppliers', pct: 19 },
                    { region: 'India', flag: '🇮🇳', value: '$1.6M', count: '4 suppliers', pct: 15 },
                    { region: 'United Kingdom', flag: '🇬🇧', value: '$1.2M', count: '3 suppliers', pct: 12 }
                  ].map(tile => (
                    <div key={tile.region} className="rounded-xl border border-border-default bg-gray-2 p-3">
                      <div className="flex items-center justify-between text-12 font-bold text-text-primary">
                        <span className="flex items-center gap-1.5"><span className="text-16">{tile.flag}</span>{tile.region}</span>
                        <span>{tile.value}</span>
                      </div>
                      <div className="h-1.5 w-full bg-border-default rounded-full overflow-hidden mt-3">
                        <div className="h-full bg-primary-9" style={{ width: `${tile.pct}%` }} />
                      </div>
                      <div className="flex justify-between text-10 text-text-muted mt-2">
                        <span>{tile.count}</span>
                        <span>{tile.pct}% share</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Section banner (white background refinement) */}
            <div className="flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-lg bg-surface border border-border-default px-8 py-5 text-text-primary shadow-xs">
              <div>
                <h3 className="font-serif text-16 font-bold">Aging &amp; Process Oversight</h3>
                <p className="text-11 text-text-secondary mt-0.5">Portfolio-level view of overdue exposure and approval cycles</p>
              </div>
              <div className="flex gap-8 flex-wrap">
                <div className="text-right">
                  <div className="text-10 uppercase tracking-widest text-text-muted">90+ Days</div>
                  <div className="text-18 font-bold text-primary-9">$1.24M</div>
                </div>
                <div className="text-right">
                  <div className="text-10 uppercase tracking-widest text-text-muted">Critical Exceptions</div>
                  <div className="text-18 font-bold text-red-9">4</div>
                </div>
                <div className="text-right">
                  <div className="text-10 uppercase tracking-widest text-text-muted">Approval Rate</div>
                  <div className="text-18 font-bold text-success">94.2%</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-5">
              {/* Invoice aging analysis */}
              <div className="col-span-12 lg:col-span-6 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
                <h3 className="font-serif text-14 font-bold text-text-primary">Invoice aging analysis</h3>
                <div className="text-11 text-text-muted mb-4">Click a segment to drill into invoices</div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: '0–15d', value: 1842 },
                        { name: '16–30d', value: 1205 },
                        { name: '31–45d', value: 623 },
                        { name: '46–60d', value: 298 },
                        { name: '60d+', value: 134 }
                      ]}
                      margin={{ bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: any) => [`${v} Invoices`, 'Volume']} />
                      <Bar
                        dataKey="value"
                        fill="#8300e6"
                        radius={[4, 4, 0, 0]}
                        barSize={24}
                        onClick={(data: any) => {
                          setDrillAgingBucket(data?.name ?? null)
                          setActiveDrill('Aging Analysis')
                        }}
                        className="cursor-pointer"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Heat map */}
              <div className="col-span-12 lg:col-span-6 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
                <h3 className="font-serif text-14 font-bold text-text-primary">Approval delay heat map</h3>
                <div className="text-11 text-text-muted mb-4">Average days to approve by department · last 8 weeks</div>

                <div className="flex flex-col gap-2 font-sans mt-3">
                  <div className="grid grid-cols-9 gap-1 text-[10px] text-text-muted font-bold text-center">
                    <div></div>
                    {['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'].map(w => (
                      <div key={w}>{w}</div>
                    ))}
                  </div>

                  {[
                    { dept: 'IT', cells: [2, 1, 3, 2, 4, 5, 2, 1] },
                    { dept: 'Finance', cells: [1, 2, 1, 1, 2, 1, 3, 1] },
                    { dept: 'Marketing', cells: [5, 4, 6, 8, 7, 5, 6, 5] },
                    { dept: 'Operations', cells: [3, 2, 4, 3, 3, 4, 2, 3] },
                    { dept: 'HR', cells: [4, 5, 3, 4, 5, 2, 4, 4] },
                    { dept: 'Legal', cells: [6, 7, 9, 8, 7, 6, 9, 8] }
                  ].map(row => (
                    <div key={row.dept} className="grid grid-cols-9 gap-1 items-center">
                      <div className="text-11 font-semibold text-text-secondary text-right pr-2">{row.dept}</div>
                      {row.cells.map((val, idx) => {
                        let color = 'bg-[#F1E1FC]'
                        if (val > 7) color = 'bg-[#643094] text-white'
                        else if (val > 4) color = 'bg-[#8300e6] text-white'
                        else if (val > 2) color = 'bg-[#EEE6FD] text-primary-9'
                        return (
                          <div
                            key={idx}
                            className={cn("h-8 rounded flex items-center justify-center text-11 font-bold", color)}
                            title={`${row.dept} delay: ${val} days`}
                          >
                            {val}d
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
                <div className="text-10 text-text-muted mt-3">Darker cells indicate longer processing bottlenecks.</div>
              </div>
            </div>
          </div>
        </div>

      ) : (

        /* ================= AP TEAM TRACK ================= */
        <div className="flex flex-col gap-6">

          {/* Insights (Conditionally visible) & Duplicate Watch (Conditionally visible) */}
          {isCommandCenterExpanded && (
            <div className="grid grid-cols-12 gap-5">
              {/* AI-generated insights */}
              <div className="col-span-12 lg:col-span-8 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-sans text-15 font-bold text-text-primary">AI-generated insights</h3>
                    <div className="text-11 text-text-muted mt-0.5">Auto-updates with your filters — the ledger's margin notes</div>
                  </div>
                  <span className="rounded border border-border-default bg-surface px-1.5 py-0.5 text-10 font-bold text-text-muted">LIVE</span>
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

              {/* Duplicate invoice watch */}
              <div className="col-span-12 lg:col-span-4 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
                <h3 className="font-serif text-14 font-bold text-text-primary">Duplicate invoice watch</h3>
                <div className="text-11 text-text-muted mb-3">Double payments flagged by ledger algorithms</div>

                <div className="flex flex-col gap-2 max-h-[170px] overflow-y-auto scrollbar">
                  {[
                    { id: 'INV-20043', supplier: 'Coral Bay Marketing', amt: '₹4,984', match: '98%' },
                    { id: 'INV-20056', supplier: 'Silverline Telecom', amt: '$144,788', match: '96%' },
                    { id: 'INV-20112', supplier: 'Prism Packaging Co.', amt: '₹123,151', match: '95%' },
                    { id: 'INV-20121', supplier: 'Vertex IT Solutions', amt: '€33,194', match: '94%' },
                    { id: 'INV-20134', supplier: 'Atlas Freight Partners', amt: '€149,343', match: '92%' }
                  ].map(item => (
                    <div key={item.id} className="flex items-center justify-between text-11 border-b border-gray-3 pb-2 last:border-b-0">
                      <div>
                        <span className="font-mono font-bold text-red-9">{item.id}</span>
                        <span className="text-text-primary font-medium ml-2">{item.supplier}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-text-primary">{item.amt}</div>
                        <div className="text-[9px] text-red-11 font-semibold">{item.match} match</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Details below (Always visible) */}
          <div className="flex flex-col gap-6">
            {/* Section banner (white background refinement) */}
            <div className="flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-lg bg-surface border border-border-default px-8 py-5 text-text-primary shadow-xs">
              <div>
                <h3 className="font-serif text-16 font-bold">Today's Action Queue</h3>
                <p className="text-11 text-text-secondary mt-0.5">Prioritized invoice items requiring attention today</p>
              </div>
              <div className="flex gap-8 flex-wrap">
                <div className="text-right">
                  <div className="text-10 uppercase tracking-widest text-text-muted">Due Today</div>
                  <div className="text-18 font-bold text-cyan-9">{fmtMoney(metrics.dueToday || 0)}</div>
                </div>
                <div className="text-right">
                  <div className="text-10 uppercase tracking-widest text-text-muted">Cash This Week</div>
                  <div className="text-18 font-bold text-primary-9">$298.7K</div>
                </div>
                <div className="text-right">
                  <div className="text-10 uppercase tracking-widest text-text-muted">Queue Size</div>
                  <div className="text-18 font-bold text-primary-9">{filteredInvoices.filter(inv => inv.status === 'Pending').length} items</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-5">
              {/* AP Workbench prioritized queue */}
              <div className="col-span-12 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
                <div className="flex items-center justify-between border-b border-border-default pb-3.5 mb-4">
                  <div>
                    <h3 className="font-serif text-14 font-bold text-text-primary">AP workbench — prioritized queue</h3>
                    <div className="text-11 text-text-muted">Overdue and due-soonest first — process top-down</div>
                  </div>
                  <span className="rounded-full bg-primary-3 px-3 py-0.5 text-10 font-bold text-primary-9">
                    {filteredInvoices.slice(0, 10).length} prioritized
                  </span>
                </div>

                <div className="overflow-x-auto scrollbar">
                  <table className="w-full text-left text-12 border-collapse">
                    <thead>
                      <tr className="bg-gray-2 text-text-muted uppercase text-10 font-bold border-b border-border-default">
                        <th className="p-3">Priority</th>
                        <th className="p-3">Invoice</th>
                        <th className="p-3">Supplier</th>
                        <th className="p-3">Department</th>
                        <th className="p-3 text-right">Amount</th>
                        <th className="p-3">Due Date</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Buyer</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.slice(0, 8).map((inv, idx) => {
                        const isExpanded = expandedInvoiceId === inv.id
                        return (
                          <React.Fragment key={inv.id}>
                            <tr className="border-b border-gray-3 hover:bg-gray-2/50">
                              <td className="p-3">
                                <span className={cn(
                                  "inline-block h-2 w-2 rounded-full",
                                  idx === 0 ? "bg-red-9" : idx < 3 ? "bg-warning" : "bg-success"
                                )} />
                              </td>
                              <td className="p-3 font-mono font-bold text-primary-9">{inv.id}</td>
                              <td className="p-3 font-medium text-text-primary">
                                <span className="mr-1.5">{inv.flag}</span>{inv.supplier}
                              </td>
                              <td className="p-3 text-text-secondary">{inv.department}</td>
                              <td className="p-3 text-right font-mono font-bold text-text-primary">{fmtMoney(inv.amount, inv.currency)}</td>
                              <td className="p-3 text-text-secondary">{new Date(inv.dueDate).toLocaleDateString()}</td>
                              <td className="p-3">
                                <span className={cn("px-2 py-0.5 rounded-full text-10 font-bold", getStatusClass(inv.status))}>
                                  {inv.status}
                                </span>
                              </td>
                              <td className="p-3 text-text-muted">{inv.buyer}</td>
                              <td className="p-3 text-right">
                                <div className="inline-flex items-center gap-2 justify-end">
                                  <button
                                    className="cursor-pointer rounded border border-border-default bg-surface px-2.5 py-1 text-10 font-bold text-primary-9 transition-all hover:bg-primary-9 hover:text-white"
                                    onClick={() => {
                                      setDrillSupplier(inv.supplier)
                                      setActiveDrill('Outstanding Payables')
                                    }}
                                  >
                                    Action
                                  </button>
                                  <button
                                    className="cursor-pointer p-1 text-text-secondary hover:bg-gray-3 rounded transition-colors"
                                    onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                                    title={isExpanded ? "Hide details" : "Show details"}
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="h-4 w-4 text-primary-9" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Expanded sub-row details panel */}
                            {isExpanded && (
                              <tr className="bg-primary-3/10 dark:bg-gray-12/30">
                                <td colSpan={9} className="p-4 border-b border-border-default">
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-11 text-text-secondary">
                                    <div>
                                      <div className="font-bold text-text-muted">PO Reference</div>
                                      <div className="font-mono mt-0.5 text-text-primary">{inv.costCenter.replace('CC-', 'PO-')}</div>
                                    </div>
                                    <div>
                                      <div className="font-bold text-text-muted">Cost Center</div>
                                      <div className="mt-0.5 text-text-primary">{inv.costCenter}</div>
                                    </div>
                                    <div>
                                      <div className="font-bold text-text-muted">Profit Center</div>
                                      <div className="mt-0.5 text-text-primary">{inv.profitCenter}</div>
                                    </div>
                                    <div>
                                      <div className="font-bold text-text-muted">Payment Channel</div>
                                      <div className="mt-0.5 text-text-primary">{inv.paymentMethod}</div>
                                    </div>
                                  </div>
                                  <div className="mt-3 p-2.5 rounded bg-orange-2/30 border border-orange-3/30 text-11 text-orange-11">
                                    <strong>Ledger Verification Note:</strong> Invoice matched against approved master list. {inv.isDuplicate ? "ALERT: Potential duplicate invoice match. Review before release." : "Standard SLA timeline. No pricing exceptions found."}
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

              {/* Payment calendar */}
              <div className="col-span-12 lg:col-span-5 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
                <h3 className="font-serif text-14 font-bold text-text-primary">Payment calendar</h3>
                <div className="text-11 text-text-muted mb-4">Scheduled payments calendar heatmap</div>

                <div className="grid grid-cols-7 gap-1 text-center font-sans">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                    <div key={d} className="text-10 font-bold text-text-muted py-1">{d}</div>
                  ))}
                  {/* 35 calendar cells mock */}
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={`empty-${idx}`} className="h-8" />
                  ))}
                  {Array.from({ length: 30 }).map((_, idx) => {
                    const day = idx + 1
                    const isToday = day === 8
                    const isDue = [5, 12, 18, 22, 25, 29].includes(day)

                    let cellStyle = 'bg-gray-2 text-text-secondary hover:bg-gray-3'
                    if (isToday) cellStyle = 'bg-primary-9 text-white font-bold'
                    else if (isDue) cellStyle = 'bg-primary-3 text-primary-9 font-semibold'

                    return (
                      <div
                        key={day}
                        className={cn("h-8 rounded flex items-center justify-center text-11 transition-all cursor-pointer", cellStyle)}
                        title={isToday ? 'Today' : isDue ? 'Payment due date' : ''}
                      >
                        {day}
                      </div>
                    )
                  })}
                </div>
                <div className="flex gap-4 text-10 text-text-muted mt-4 justify-center">
                  <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-primary-9" />Today</span>
                  <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-primary-3" />Payment Due</span>
                </div>
              </div>

              {/* Cash required next 7 days */}
              <div className="col-span-12 lg:col-span-7 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
                <h3 className="font-serif text-14 font-bold text-text-primary">Cash required — next 7 days</h3>
                <div className="text-11 text-text-muted mb-4">Daily cash requirements for approved invoices</div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { day: 'Jul 8', Cash: 0 },
                        { day: 'Jul 9', Cash: 85 },
                        { day: 'Jul 10', Cash: 120 },
                        { day: 'Jul 11', Cash: 40 },
                        { day: 'Jul 12', Cash: 15 },
                        { day: 'Jul 13', Cash: 220 },
                        { day: 'Jul 14', Cash: 90 }
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} label={{ value: 'Cash ($K)', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} />
                      <Tooltip formatter={(v) => [`$${v}K`]} />
                      <Bar dataKey="Cash" fill="#8300e6" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Section banner (white background refinement) */}
            <div className="flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-lg bg-surface border border-border-default px-8 py-5 text-text-primary shadow-sm">
              <div>
                <h3 className="font-serif text-16 font-bold">Processing &amp; Bottlenecks</h3>
                <p className="text-11 text-text-secondary mt-0.5">Pipeline throughput efficiency and approval metrics</p>
              </div>
              <div className="flex gap-8 flex-wrap">
                <div className="text-right">
                  <div className="text-10 uppercase tracking-widest text-text-muted">Total Invoices</div>
                  <div className="text-18 font-bold text-primary-9">266</div>
                </div>
                <div className="text-right">
                  <div className="text-10 uppercase tracking-widest text-text-muted">Touchless Rate</div>
                  <div className="text-18 font-bold text-primary-9">44.0%</div>
                </div>
                <div className="text-right">
                  <div className="text-10 uppercase tracking-widest text-text-muted">Avg Approval Days</div>
                  <div className="text-18 font-bold text-primary-9">6.1 days</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-5">
              {/* Invoice processing funnel */}
              <div className="col-span-12 lg:col-span-4 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
                <h3 className="font-serif text-14 font-bold text-text-primary">Invoice processing funnel</h3>
                <div className="text-11 text-text-muted mb-4">Pipeline drops across lifecycle steps</div>

                <div className="flex flex-col gap-3.5 py-4">
                  {[
                    { step: '1. Received', value: '266 inv', width: '100%', pct: '100%' },
                    { step: '2. Extracted', value: '248 inv', width: '93%', pct: '93%' },
                    { step: '3. Approved', value: '210 inv', width: '79%', pct: '79%' },
                    { step: '4. Posted', value: '142 inv', width: '53%', pct: '53%' }
                  ].map(bar => (
                    <div key={bar.step} className="flex flex-col gap-1 text-12 font-semibold">
                      <div className="flex justify-between text-text-secondary">
                        <span>{bar.step}</span>
                        <span>{bar.value}</span>
                      </div>
                      <div className="h-8 bg-gray-2 rounded overflow-hidden relative">
                        <div
                          className="h-full bg-gradient-to-r from-primary-9 to-primary-10 flex items-center px-3 text-white font-bold text-11"
                          style={{ width: bar.width }}
                        >
                          {bar.pct} conversion
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Approval heat map */}
              <div className="col-span-12 lg:col-span-4 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
                <h3 className="font-serif text-14 font-bold text-text-primary">Approval delay heat map</h3>
                <div className="text-11 text-text-muted mb-4">Approver delay averages over weeks</div>

                <div className="flex flex-col gap-2 font-sans mt-3">
                  <div className="grid grid-cols-6 gap-1 text-[10px] text-text-muted font-bold text-center">
                    <div></div>
                    {['W1', 'W2', 'W3', 'W4', 'W5'].map(w => (
                      <div key={w}>{w}</div>
                    ))}
                  </div>

                  {[
                    { user: 'A. Chen', cells: [3, 2, 4, 3, 2] },
                    { user: 'M. Okafor', cells: [1, 2, 1, 2, 1] },
                    { user: 'R. Singh', cells: [5, 4, 6, 5, 4] },
                    { user: 'L. Novak', cells: [2, 3, 2, 4, 2] },
                    { user: 'J. Fontaine', cells: [6, 8, 7, 9, 8] }
                  ].map(row => (
                    <div key={row.user} className="grid grid-cols-6 gap-1 items-center">
                      <div className="text-11 font-semibold text-text-secondary text-right pr-2">{row.user}</div>
                      {row.cells.map((val, idx) => {
                        let color = 'bg-[#F1E1FC]'
                        if (val > 7) color = 'bg-[#643094] text-white'
                        else if (val > 4) color = 'bg-[#8300e6] text-white'
                        else if (val > 2) color = 'bg-[#EEE6FD] text-primary-9'
                        return (
                          <div
                            key={idx}
                            className={cn("h-8 rounded flex items-center justify-center text-11 font-bold", color)}
                            title={`${row.user}: ${val} days`}
                          >
                            {val}d
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Status distribution donut */}
              <div className="col-span-12 lg:col-span-4 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
                <h3 className="font-serif text-14 font-bold text-text-primary">Invoice status distribution</h3>
                <div className="text-11 text-text-muted mb-4">Click a slice to open matching list</div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Approved', value: 48, color: '#1E8E6F' },
                          { name: 'Pending', value: 34, color: '#5c21e6' },
                          { name: 'Processing', value: 22, color: '#19c1d4' },
                          { name: 'Hold', value: 12, color: '#847C93' }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {[
                          { color: '#1E8E6F' },
                          { color: '#5c21e6' },
                          { color: '#19c1d4' },
                          { color: '#847C93' }
                        ].map((entry, idx) => (
                          <Cell
                            key={`cell-${idx}`}
                            fill={entry.color}
                            onClick={() => {
                              const name = ['Approved', 'Pending', 'Processing', 'Hold'][idx]
                              setDrillStatus(name)
                              setActiveDrill('Status Distribution')
                            }}
                            className="cursor-pointer"
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-10 text-text-muted mt-2">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded bg-success" />Approved</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded bg-indigo-9" />Pending</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded bg-cyan-9" />Processing</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded bg-gray-10" />Hold</span>
                </div>
              </div>
            </div>

            {/* Section banner (white background refinement) */}
            <div className="flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-lg bg-surface border border-border-default px-8 py-5 text-text-primary shadow-sm">
              <div>
                <h3 className="font-serif text-16 font-bold">Supplier Follow-ups</h3>
                <p className="text-11 text-text-secondary mt-0.5">Vendors needing prompt outreach or query resolution</p>
              </div>
              <div className="flex gap-8 flex-wrap">
                <div className="text-right">
                  <div className="text-10 uppercase tracking-widest text-text-muted">Overdue amount</div>
                  <div className="text-18 font-bold text-red-9">{fmtMoney(metrics.overdueAmount || 0)}</div>
                </div>
                <div className="text-right">
                  <div className="text-10 uppercase tracking-widest text-text-muted">Duplicates Value</div>
                  <div className="text-18 font-bold text-primary-9">$84.2K</div>
                </div>
                <div className="text-right">
                  <div className="text-10 uppercase tracking-widest text-text-muted">Suppliers to Chase</div>
                  <div className="text-18 font-bold text-primary-9">9 vendors</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-5">
              {/* Outstanding payables (Conditionally shown) */}
              {isCommandCenterExpanded && (
                <div className="col-span-12 lg:col-span-6 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
                  <h3 className="font-serif text-14 font-bold text-text-primary">Outstanding payables by supplier</h3>
                  <div className="text-11 text-text-muted mb-4">Click a supplier's bar to drill down</div>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: 'Meridian Steel', value: 920 },
                          { name: 'Vertex IT', value: 680 },
                          { name: 'FastShip Ltd', value: 550 },
                          { name: 'Solaris Energy', value: 480 },
                          { name: 'Nimbus Cloud', value: 390 }
                        ]}
                        layout="vertical"
                        margin={{ left: -10, right: 10 }}
                      >
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={90} />
                        <Tooltip formatter={(v: any) => [`$${v}K`]} />
                        <Bar
                          dataKey="value"
                          fill="#8300e6"
                          radius={[0, 4, 4, 0]}
                          barSize={12}
                          onClick={(data: any) => {
                            setDrillSupplier(data?.name ?? null)
                            setActiveDrill('Outstanding Payables')
                          }}
                          className="cursor-pointer"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Aging analysis */}
              <div className={cn(
                "rounded-lg border border-border-default bg-surface p-5 shadow-xs transition-all duration-300",
                isCommandCenterExpanded ? "col-span-12 lg:col-span-6" : "col-span-12"
              )}>
                <h3 className="font-serif text-14 font-bold text-text-primary">Invoice aging analysis</h3>
                <div className="text-11 text-text-muted mb-4">Click a segment to drill into aging details</div>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: '0–15d', value: 1842 },
                        { name: '16–30d', value: 1205 },
                        { name: '31–45d', value: 623 },
                        { name: '46–60d', value: 298 },
                        { name: '60d+', value: 134 }
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: any) => [`${v} Invoices`, 'Volume']} />
                      <Bar
                        dataKey="value"
                        fill="#5c21e6"
                        radius={[4, 4, 0, 0]}
                        barSize={20}
                        onClick={(data: any) => {
                          setDrillAgingBucket(data?.name ?? null)
                          setActiveDrill('Aging Analysis')
                        }}
                        className="cursor-pointer"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Monthly invoice trend */}
              <div className="col-span-12 lg:col-span-6 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
                <h3 className="font-serif text-14 font-bold text-text-primary">Monthly invoice trend</h3>
                <div className="text-11 text-text-muted mb-4">Incoming workload volumes over the last 6 months</div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={[
                        { name: 'Jan', count: 180 },
                        { name: 'Feb', count: 165 },
                        { name: 'Mar', count: 210 },
                        { name: 'Apr', count: 245 },
                        { name: 'May', count: 280 },
                        { name: 'Jun', count: 266 }
                      ]}
                    >
                      <defs>
                        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8300e6" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#8300e6" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => [`${v} Invoices`]} />
                      <Area type="monotone" dataKey="count" stroke="#8300e6" strokeWidth={2} fillOpacity={1} fill="url(#trendGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Payment method distribution */}
              <div className="col-span-12 lg:col-span-6 rounded-lg border border-border-default bg-surface p-5 shadow-xs">
                <h3 className="font-serif text-14 font-bold text-text-primary">Payment method distribution</h3>
                <div className="text-11 text-text-muted mb-4">Share of transactions by payment channel</div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Bank Transfer', value: 45, color: '#8300e6' },
                          { name: 'ACH', value: 30, color: '#5c21e6' },
                          { name: 'Wire', value: 15, color: '#19c1d4' },
                          { name: 'Cheque', value: 10, color: '#847C93' }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {[
                          { color: '#8300e6' },
                          { color: '#5c21e6' },
                          { color: '#19c1d4' },
                          { color: '#847C93' }
                        ].map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => [`${v}%`, 'Share']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-around text-11 mt-1">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-primary-9" />Transfer</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-indigo-9" />ACH</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-cyan-9" />Wire</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-gray-10" />Cheque</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
