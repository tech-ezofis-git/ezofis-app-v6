import {
  Bot,
  Building2,
  Calendar,
  ClipboardList,
  Component,
  DollarSign,
  RefreshCcw,
  Search,
  ShieldAlert,
} from 'lucide-react'
import React from 'react'
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AnimateFadeIn, AnimateSlideUp } from '@/components/common/animations'
// import Icon from '@/components/base/icon/Icon'
// import { SCREEN_XL } from '@/constants'
// import cn from '@/utils/cn'
// // import Section from '../../shared/components/Section'
// import Section from './workflows/shared/components/Section'
// import { Trans } from '@lingui/react/macro'
// import { useViewportSize } from '@mantine/hooks'
import Overview from '../../accounts-payable/components/Overview'
// import AccountsPayable from './workflows/accounts-payable/AccountsPayable'
// import Header from './workflows/shared/components/Header'

// --- Components ---

interface FilterButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode
  label: string
  active?: boolean
}

const FilterButton = ({ active, icon, label, ...props }: FilterButtonProps) => {
  return (
    <button
      className={`hover:bg-opacity-80 flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-all active:scale-95 ${active
        ? 'border-[#4285F4] bg-[#4285F4]/10 text-[#4285F4]'
        : 'text-gray-500 hover:bg-gray-50 border-gray-3 bg-white shadow-sm'
        }`}
      {...props}
    >
      {React.cloneElement(icon as React.ReactElement<{ className?: string }>, {
        className: `h-3 w-3 ${active ? 'text-[#4285F4]' : 'text-gray-400'}`,
      })}
      {label}
    </button>
  )
}

interface FilterDropdownProps {
  icon: React.ReactNode
  label: string
  options: string[]
  selectedValue: string
  onSelect: (val: string) => void
  isOpen: boolean
  onToggle: () => void
}

const FilterDropdown = ({
  icon,
  label,
  options,
  selectedValue,
  onSelect,
  isOpen,
  onToggle,
}: FilterDropdownProps) => {
  const isActive =
    (selectedValue !== label &&
      selectedValue !== 'All Suppliers' &&
      selectedValue !== 'All Statuses' &&
      selectedValue !== 'All Currencies') ||
    (label === 'This Month' && selectedValue === 'This Month')

  return (
    <div className='relative inline-block text-left'>
      <FilterButton
        active={isActive}
        icon={icon}
        label={selectedValue}
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
      />
      {isOpen && (
        <div
          className='absolute left-0 mt-1 z-50 min-w-[130px] bg-white border border-[#7F7F7F] shadow-lg rounded-sm overflow-hidden animate-in fade-in zoom-in-95 duration-100'
          style={{ transformOrigin: 'top left' }}
        >
          {options.map((option) => {
            const isSelected = option === selectedValue
            return (
              <button
                key={option}
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect(option)
                }}
                className={`w-full text-left px-3 py-1.5 text-[12px] font-medium leading-normal transition-colors ${
                  isSelected
                    ? 'bg-[#4285F4] text-white'
                    : 'text-[#4285F4] bg-white hover:bg-slate-100'
                }`}
              >
                {option}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface MetricCardProps {
  colorTheme: 'orange' | 'green' | 'red' | 'purple'
  icon: React.ElementType
  title: string
  trend: string
  value: string
  tooltip?: string
}

export const MetricCard = ({
  colorTheme,
  icon: Icon,
  title,
  tooltip,
  trend,
  value,
}: MetricCardProps) => {
  const themeStyles = {
    green: {
      bg: 'bg-[var(--green-1)]',
      border: 'border-[var(--green-3)]',
      text: 'text-[var(--green-9)]',
    },
    orange: {
      bg: 'bg-[var(--orange-1)]',
      border: 'border-[var(--orange-3)]',
      text: 'text-[var(--orange-9)]',
    },
    purple: {
      bg: 'bg-[var(--purple-1)]',
      border: 'border-[var(--purple-3)]',
      text: 'text-[var(--purple-9)]',
    },
    red: {
      bg: 'bg-[var(--red-1)]',
      border: 'border-[var(--red-3)]',
      text: 'text-[var(--red-9)]',
    },
  }

  const styles = themeStyles[colorTheme] || themeStyles.green

  return (
    <div className='flex min-w-0 flex-1 flex-col gap-1.5 rounded-xl border border-[var(--gray-3)] bg-white p-2.5 transition-colors hover:bg-[var(--gray-1)]'>
      <div className='flex items-center justify-between'>
        <div
          className={`shrink-0 rounded p-1.5 transition-colors ${styles.bg} ${styles.text}`}
        >
          <Icon aria-hidden='true' className='h-3.5 w-3.5' />
        </div>
        <div
          className={`shrink-0 rounded-md border px-2 py-0.5 text-[9px] font-semibold ${styles.border} ${styles.bg} ${styles.text}`}
        >
          {trend}
        </div>
      </div>
      <div className='mt-0.5 flex min-w-0 flex-col gap-0.5'>
        <span className='text-[11px] leading-none font-semibold tracking-tight text-[var(--gray-11)]'>
          {title}
        </span>
        <span
          className='text-[13px] leading-tight font-semibold text-[var(--gray-13)]'
          title={tooltip || value}
        >
          {value}
        </span>
      </div>
    </div>
  )
}

const RISK_DATA = [
  { color: 'var(--green-9)', name: 'Low Risk', value: 101 },
  { color: 'var(--orange-9)', name: 'Medium Risk', value: 38 },
  { color: 'var(--red-9)', name: 'High Risk', value: 25 },
]

export const SupplierRiskCard = () => {
  const total = RISK_DATA.reduce((acc, cur) => acc + cur.value, 0)

  return (
    <div className='col-span-12 flex flex-col rounded-xl bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md lg:col-span-3'>
      <div>
        <h4 className='font-poppins text-13 font-bold text-gray-13 capitalize leading-none pl-0.5'>
          supplier risk spending
        </h4>
        <div className='mt-1 text-[11px] text-[var(--gray-9)] lowercase pl-0.5'>
          {total} active vendors analyzed
        </div>
      </div>

      <div className='mt-6 flex flex-col justify-between flex-1 gap-4'>
        {/* Chart Area */}
        <div className='flex items-center justify-center'>
          <div className='relative h-[100px] w-[100px] shrink-0'>
            <ResponsiveContainer height='100%' width='100%'>
              <PieChart>
                <Pie
                  cx='50%'
                  cy='50%'
                  data={RISK_DATA}
                  dataKey='value'
                  innerRadius={34}
                  outerRadius={48}
                  paddingAngle={3}
                  stroke='none'
                >
                  {RISK_DATA.map((entry, index) => (
                    <Cell fill={entry.color} key={`cell-${index}`} className='outline-none hover:opacity-90 transition-opacity' />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    fontSize: '11px',
                  }}
                  formatter={(value: any) => [`${value} vendors`]}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Label Overlay */}
            <div className='pointer-events-none absolute inset-0 flex flex-col items-center justify-center'>
              <span className='font-poppins text-16 font-extrabold text-gray-13 leading-none'>{total}</span>
              <span className='text-[8px] text-gray-10 lowercase font-medium mt-0.5'>vendors</span>
            </div>
          </div>
        </div>

        {/* Custom Legend with Progress bars */}
        <div className='flex flex-col gap-2'>
          {RISK_DATA.map((entry, index) => {
            const percentage = Math.round((entry.value / total) * 100)
            return (
              <div
                className='flex flex-col gap-1 p-1.5 rounded-lg hover:bg-gray-50 transition-all cursor-pointer active:scale-95 group'
                key={index}
                title={`${entry.value} vendors (${percentage}%)`}
              >
                <div className='flex items-center justify-between text-[11px] font-medium lowercase'>
                  <div className='flex items-center gap-2'>
                    <div
                      className='size-2.5 shrink-0 rounded-md transition-transform group-hover:scale-110'
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className='text-gray-10 font-semibold group-hover:text-gray-13 transition-colors'>{entry.name}</span>
                  </div>
                  <div className='flex items-center gap-1.5'>
                    <span className='text-gray-13 font-bold'>{entry.value}</span>
                    <span className='text-gray-10 text-[9px] font-normal'>({percentage}%)</span>
                  </div>
                </div>
                <div className='h-1 w-full bg-gray-100 rounded-full overflow-hidden'>
                  <div
                    className='h-full rounded-full transition-all duration-500'
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: entry.color
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const CATEGORY_DISTRIBUTION_DATA = [
  { color: 'var(--indigo-9)', name: 'Hardware', value: 13 },
  { color: 'var(--primary-9)', name: 'Software', value: 9 },
  { color: 'var(--violet-9)', name: 'Services', value: 8 },
  { color: 'var(--pink-9)', name: 'Utilities', value: 5 },
  { color: 'var(--secondary-9)', name: 'Other', value: 3 },
]

export const CategoryWiseInvoiceDistributionCard = () => {
  const total = CATEGORY_DISTRIBUTION_DATA.reduce(
    (acc, cur) => acc + cur.value,
    0,
  )

  return (
    <div className='col-span-12 flex flex-col rounded-xl bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md lg:col-span-3'>
      <div>
        <h4 className='font-poppins text-13 font-bold text-gray-13 capitalize leading-none pl-0.5'>
          invoice distribution
        </h4>
        <div className='mt-1 text-[11px] text-[var(--gray-9)] lowercase pl-0.5'>
          by spend category · {total} items
        </div>
      </div>

      <div className='mt-6 flex flex-col justify-between flex-1 gap-4'>
        {/* Chart Area */}
        <div className='flex items-center justify-center'>
          <div className='relative h-[100px] w-[100px] shrink-0'>
            <ResponsiveContainer height='100%' width='100%'>
              <PieChart>
                <Pie
                  cx='50%'
                  cy='50%'
                  data={CATEGORY_DISTRIBUTION_DATA}
                  dataKey='value'
                  innerRadius={34}
                  outerRadius={48}
                  paddingAngle={3}
                  stroke='none'
                >
                  {CATEGORY_DISTRIBUTION_DATA.map((entry, index) => (
                    <Cell fill={entry.color} key={`cell-${index}`} className='outline-none hover:opacity-90 transition-opacity' />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    fontSize: '11px',
                  }}
                  formatter={(value: any) => [`${value} invoices`]}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Label Overlay */}
            <div className='pointer-events-none absolute inset-0 flex flex-col items-center justify-center'>
              <span className='font-poppins text-16 font-extrabold text-gray-13 leading-none'>{total}</span>
              <span className='text-[8px] text-gray-10 lowercase font-medium mt-0.5'>invoices</span>
            </div>
          </div>
        </div>

        {/* Custom Legend with Progress tracks */}
        <div className='flex flex-col gap-1.5'>
          {CATEGORY_DISTRIBUTION_DATA.map((entry, index) => {
            const percentage = Math.round((entry.value / total) * 100)
            return (
              <div
                className='flex flex-col gap-1 p-1 rounded-lg hover:bg-gray-55 transition-all cursor-pointer active:scale-95 group'
                key={index}
                title={`${entry.value} invoices (${percentage}%)`}
              >
                <div className='flex items-center justify-between text-[11px] font-medium lowercase'>
                  <div className='flex items-center gap-2'>
                    <div
                      className='size-2.5 shrink-0 rounded-md transition-transform group-hover:scale-110'
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className='text-gray-10 font-semibold group-hover:text-gray-13 transition-colors'>{entry.name}</span>
                  </div>
                  <div className='flex items-center gap-1.5'>
                    <span className='text-gray-13 font-bold'>{entry.value}</span>
                    <span className='text-gray-10 text-[9px] font-normal'>({percentage}%)</span>
                  </div>
                </div>
                <div className='h-1 w-full bg-gray-100 rounded-full overflow-hidden'>
                  <div
                    className='h-full rounded-full transition-all duration-500'
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: entry.color
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const TOP_SUPPLIERS_DATA = [
  { displayValue: '$9.2m', name: 'global freight', value: 9.2 },
  { displayValue: '$7.4m', name: 'techparts ltd', value: 7.4 },
  { displayValue: '$5.9m', name: 'office hub', value: 5.9 },
  { displayValue: '$4.8m', name: 'cloudops inc', value: 4.8 },
  { displayValue: '$3.7m', name: 'logisupply', value: 3.7 },
]

export const TopSuppliersCard = () => {
  return (
    <div className='col-span-12 flex flex-col rounded-xl bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md lg:col-span-3'>
      <div>
        <h4 className='font-poppins text-13 font-bold text-gray-13 capitalize leading-none pl-0.5'>
          Top Suppliers
        </h4>
        <div className='mt-1 text-[11px] text-[var(--gray-9)] lowercase pl-0.5'>
          by invoice value · may 2026
        </div>
      </div>

      <div className='mt-6 flex-1 pr-1 flex flex-col justify-center'>
        <ResponsiveContainer height={200} width='100%'>
          <BarChart
            data={TOP_SUPPLIERS_DATA}
            layout='vertical'
            margin={{ bottom: 0, left: -20, right: 35, top: 0 }}
          >
            <defs>
              <linearGradient id='topSuppliersGradient' x1='0' x2='1' y1='0' y2='0'>
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
              contentStyle={{
                border: 'none',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                fontSize: '11px',
              }}
              formatter={(val: any) => [`$${val}M`, 'Value']}
            />
            <Bar barSize={14} dataKey='value' radius={[0, 6, 6, 0]} fill='url(#topSuppliersGradient)'>
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
      </div>
    </div>
  )
}

const TREND_DATA = [
  { day: '1', exceptions: 40, processed: 90 },
  { day: '4', exceptions: 50, processed: 140 },
  { day: '7', exceptions: 45, processed: 190 },
  { day: '10', exceptions: 55, processed: 160 },
  { day: '13', exceptions: 48, processed: 250 },
  { day: '16', exceptions: 60, processed: 210 },
  { day: '19', exceptions: 40, processed: 290 },
  { day: '22', exceptions: 75, processed: 230 },
  { day: '25', exceptions: 55, processed: 280 },
  { day: '28', exceptions: 70, processed: 330 },
  { day: '31', exceptions: 65, processed: 300 },
  { day: '32', exceptions: 80, processed: 320 },
]

const CustomDot = (props: any) => {
  const { cx, cy, index } = props
  if (index === TREND_DATA.length - 1) {
    return (
      <circle
        cx={cx}
        cy={cy}
        fill='#3B82F6'
        r={4}
        stroke='white'
        strokeWidth={2}
      />
    )
  }
  return null
}

export const InvoiceTrendCard = () => {
  return (
    <div className='col-span-12 flex flex-col rounded-xl bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md lg:col-span-6'>
      <div className='flex items-start justify-between'>
        <div>
          <h4 className='text-gray-900 text-[15px] font-bold'>
            Invoice Processing Trend
          </h4>
          <div className='text-gray-400 mt-0.5 text-[13px]'>
            Daily volume &mdash; May 2026
          </div>
        </div>
        <button className='text-blue-500 hover:text-blue-700 text-[13px] font-medium transition-colors'>
          View all &rarr;
        </button>
      </div>

      <div className='mt-6 flex-1'>
        <ResponsiveContainer height={220} width='100%'>
          <ComposedChart
            data={TREND_DATA}
            margin={{ bottom: 0, left: -20, right: 10, top: 10 }}
          >
            <defs>
              <linearGradient id='colorProcessed' x1='0' x2='0' y1='0' y2='1'>
                <stop offset='5%' stopColor='#3B82F6' stopOpacity={0.2} />
                <stop offset='95%' stopColor='#3B82F6' stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke='#E5E7EB' vertical={false} />
            <XAxis
              axisLine={false}
              dataKey='day'
              dy={10}
              tick={{ fill: '#6B7280', fontSize: 12 }}
              tickLine={false}
              ticks={['1', '13', '25', '31']}
            />
            <YAxis
              axisLine={false}
              domain={[0, 400]}
              tick={{ fill: '#6B7280', fontSize: 12 }}
              tickLine={false}
              ticks={[100, 200, 300]}
            />
            <Tooltip
              contentStyle={{
                border: 'none',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            <Area
              dataKey='processed'
              dot={<CustomDot />}
              fill='url(#colorProcessed)'
              fillOpacity={1}
              stroke='#3B82F6'
              strokeWidth={2}
              type='linear'
              activeDot={{
                fill: '#3B82F6',
                r: 6,
                stroke: 'white',
                strokeWidth: 2,
              }}
            />
            <Line
              dataKey='exceptions'
              dot={false}
              stroke='#EF4444'
              strokeDasharray='4 4'
              strokeWidth={2}
              type='linear'
              activeDot={{
                fill: '#EF4444',
                r: 6,
                stroke: 'white',
                strokeWidth: 2,
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className='mt-4 flex items-center gap-6 pl-2'>
        <div className='flex items-center gap-2'>
          <div className='h-1 w-4 rounded-full bg-[#3B82F6]' />
          <span className='text-gray-500 text-[12px] font-medium'>
            Processed
          </span>
        </div>
        <div className='flex items-center gap-2'>
          <svg height='4' width='16'>
            <line
              stroke='#EF4444'
              strokeDasharray='4 4'
              strokeWidth='2'
              x1='0'
              x2='16'
              y1='2'
              y2='2'
            />
          </svg>
          <span className='text-gray-500 text-[12px] font-medium'>
            Exceptions
          </span>
        </div>
      </div>
    </div>
  )
}

const AGING_DATA = [
  { name: '0–15d', value: 1842 },
  { name: '16–30d', value: 1205 },
  { name: '31–45d', value: 623 },
  { name: '46–60d', value: 298 },
  { name: '60d+', value: 134 },
]

export const InvoiceAgingCard = () => {
  return (
    <div className='col-span-12 flex flex-col rounded-xl bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md lg:col-span-3'>
      <div>
        <h4 className='font-poppins text-13 font-bold text-gray-13 capitalize leading-none pl-0.5'>
          Invoice Aging Analysis
        </h4>
        <div className='mt-1 text-[11px] text-[var(--gray-9)] lowercase pl-0.5'>
          days outstanding status
        </div>
      </div>
      <div className='mt-6 flex-1 flex flex-col justify-center'>
        <ResponsiveContainer height={180} width='100%'>
          <BarChart
            data={AGING_DATA}
            margin={{ bottom: 0, left: -25, right: 0, top: 20 }}
          >
            <defs>
              <linearGradient id='invoiceAgingGradient' x1='0' x2='0' y1='0' y2='1'>
                <stop offset='0%' stopColor='var(--primary-9)' stopOpacity={0.9} />
                <stop offset='100%' stopColor='var(--primary-4)' stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <XAxis
              axisLine={false}
              dataKey='name'
              dy={10}
              tick={{ fill: 'var(--gray-10)', fontSize: 11, fontWeight: 550 }}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'var(--gray-2)', opacity: 0.15 }}
              contentStyle={{
                border: 'none',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                fontSize: '11px',
              }}
              formatter={(val: any) => [`${val} Invoices`, 'Volume']}
            />
            <Bar barSize={28} dataKey='value' radius={[6, 6, 0, 0]} fill='url(#invoiceAgingGradient)'>
              <LabelList
                dataKey='value'
                position='top'
                content={(props: any) => {
                  const { value, width, x, y } = props
                  return (
                    <text
                      fill='var(--gray-11)'
                      fontSize={10}
                      fontWeight={650}
                      textAnchor='middle'
                      x={x + width / 2}
                      y={y - 8}
                    >
                      {Number(value).toLocaleString()}
                    </text>
                  )
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

const SPEND_DATA = [
  {
    color: '#10B981',
    displayValue: '$28.4M - 67%',
    name: 'Low Risk',
    percent: 67,
    value: 28.4,
  },
  {
    color: '#F59E0B',
    displayValue: '$10.1M - 24%',
    name: 'Medium Risk',
    percent: 24,
    value: 10.1,
  },
  {
    color: '#EF4444',
    displayValue: '$3.8M - 9%',
    name: 'High Risk',
    percent: 9,
    value: 3.8,
  },
]

export const RiskSpendingCard = () => {
  return (
    <div className='col-span-12 flex flex-col rounded-xl bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md lg:col-span-6'>
      <div>
        <h4 className='text-gray-900 text-[15px] font-bold'>
          Supplier Risk Spending
        </h4>
        <div className='text-gray-400 mt-0.5 text-[13px]'>
          Spend by risk category
        </div>
      </div>

      <div className='mt-6 flex flex-1 items-center gap-6'>
        <div className='flex flex-1 flex-col justify-center gap-5'>
          {SPEND_DATA.map((item, i) => (
            <div className='flex flex-col gap-1.5' key={i}>
              <div className='flex justify-between text-[12px] font-medium'>
                <span className='text-gray-500'>{item.name}</span>
                <span className='font-bold' style={{ color: item.color }}>
                  {item.displayValue}
                </span>
              </div>
              <div className='bg-gray-100 h-2 w-full overflow-hidden rounded-full'>
                <div
                  className='h-full rounded-full'
                  style={{
                    backgroundColor: item.color,
                    width: `${item.percent}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Right Donut Chart */}
        <div className='relative h-[90px] w-[90px] shrink-0'>
          <ResponsiveContainer height='100%' width='100%'>
            <PieChart>
              <Pie
                cx='50%'
                cy='50%'
                data={SPEND_DATA}
                dataKey='value'
                innerRadius={30}
                outerRadius={45}
                paddingAngle={0}
                stroke='none'
              >
                {SPEND_DATA.map((entry, index) => (
                  <Cell fill={entry.color} key={`cell-${index}`} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className='pointer-events-none absolute inset-0 flex flex-col items-center justify-center'>
            <span className='text-gray-900 text-[11px] font-bold'>$42.3M</span>
            <span className='text-gray-500 text-[9px] font-medium'>total</span>
          </div>
        </div>
      </div>
    </div>
  )
}

type ButtonSpec = { color: 'green' | 'red' | 'gray' | 'yellow'; label: string }
type ExceptionCardProps = {
  borderClass: string
  buttons: ButtonSpec[]
  desc: string
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  title: string
}

const ExceptionCard = ({
  borderClass,
  buttons,
  desc,
  icon,
  iconBg,
  iconColor,
  title,
}: ExceptionCardProps) => (
  <div
    className={`flex gap-3 rounded-xl border bg-white p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] ${borderClass}`}
  >
    <div
      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg} ${iconColor}`}
    >
      {icon}
    </div>
    <div className='flex flex-col'>
      <div className='text-gray-900 text-[13px] font-bold'>{title}</div>
      <div className='text-gray-500 mt-1 text-[11px] leading-relaxed'>
        {desc}
      </div>
      <div className='mt-3 flex gap-2'>
        {buttons.map((btn, i) => {
          let btnClass = ''
          if (btn.color === 'green')
            btnClass =
              'border-green-6 bg-green-2 text-green-11 hover:bg-green-3 hover:border-green-7'
          if (btn.color === 'red')
            btnClass =
              'border-red-6 bg-red-2 text-red-11 hover:bg-red-3 hover:border-red-7'
          if (btn.color === 'gray')
            btnClass =
              'border-transparent bg-secondary-3 text-secondary-11 hover:bg-secondary-4'
          if (btn.color === 'yellow')
            btnClass =
              'border-yellow-6 bg-yellow-2 text-yellow-11 hover:bg-yellow-3 hover:border-yellow-7'

          return (
            <button
              className={`rounded-md border px-3 py-1 text-[11px] font-semibold transition-all ${btnClass}`}
              key={i}
            >
              {btn.label}
            </button>
          )
        })}
      </div>
    </div>
  </div>
)

const PO_EXCEPTIONS = [
  {
    borderClass: 'border-gray-6 hover:border-gray-6',
    buttons: [
      { color: 'green', label: 'Approve' },
      { color: 'red', label: 'Reject' },
      { color: 'gray', label: 'View' },
    ] as ButtonSpec[],
    desc: 'PO-2033 qty mismatch: Invoice qty 120 vs PO qty 100 · Variance: +20 units · +$3,690 · +20.0% · Requires approval override',
    icon: <ClipboardList className='h-[18px] w-[18px]' strokeWidth={1.5} />,
    iconBg: 'bg-red-3',
    iconColor: 'text-red-9',
    title: 'INV-2041 — TechParts Ltd · $18,450.00 USD',
  },
  {
    borderClass: 'border-gray-6 hover:border-gray-6',
    buttons: [
      { color: 'green', label: 'Approve' },
      { color: 'red', label: 'Reject' },
      { color: 'gray', label: 'View' },
    ] as ButtonSpec[],
    desc: 'PO-1098 price mismatch: Invoice $62/unit vs PO $58/unit · Tolerance 2%, Actual 6.9% · 11 units affected · Escalated',
    icon: <ClipboardList className='h-[18px] w-[18px]' strokeWidth={1.5} />,
    iconBg: 'bg-red-3',
    iconColor: 'text-red-9',
    title: 'INV-2044 — Office Hub Supply · $6,200.00 USD',
  },
  {
    borderClass: 'border-gray-6 hover:border-gray-6',
    buttons: [
      { color: 'yellow', label: 'Create PO' },
      { color: 'red', label: 'Reject' },
      { color: 'gray', label: 'View' },
    ] as ButtonSpec[],
    desc: 'No matching PO found in ERP - Invoice references PO-9901 which does not exist · Manual PO creation required',
    icon: <ClipboardList className='h-[18px] w-[18px]' strokeWidth={1.5} />,
    iconBg: 'bg-red-3',
    iconColor: 'text-red-9',
    title: 'INV-2051 — LogiSupply Corp · $3,800.00 USD',
  },
  {
    borderClass: 'border-gray-6 hover:border-gray-6',
    buttons: [
      { color: 'green', label: 'Approve' },
      { color: 'red', label: 'Reject' },
      { color: 'gray', label: 'View' },
    ] as ButtonSpec[],
    desc: 'PO-1077 amount mismatch: Invoice $9,100 vs PO $8,500 - Variance: +$600 (+7.1%) - Above 2% tolerance threshold',
    icon: <ClipboardList className='h-[18px] w-[18px]' strokeWidth={1.5} />,
    iconBg: 'bg-red-3',
    iconColor: 'text-red-9',
    title: 'INV-2058 — FastShip Ltd · $9,100.00 USD',
  },
]

const GL_EXCEPTIONS = [
  {
    borderClass: 'border-gray-6 hover:border-gray-6',
    buttons: [
      { color: 'yellow', label: 'Map GL' },
      { color: 'red', label: 'Hold' },
      { color: 'gray', label: 'View' },
    ] as ButtonSpec[],
    desc: 'GL code missing for line items 3-5 (Software Licenses $12,000) · Cost center CC-IT-2024 not mapped · Blocking ERP posting',
    icon: <Component className='h-[18px] w-[18px]' strokeWidth={1.5} />,
    iconBg: 'bg-cyan-50',
    iconColor: 'text-cyan-500',
    title: 'INV-2059 — CloudOps Inc · $22,000.00 USD ⚠️ CRITICAL',
  },
  {
    borderClass: 'border-gray-6 hover:border-gray-6',
    buttons: [
      { color: 'yellow', label: 'Remap' },
      { color: 'red', label: 'Reject' },
      { color: 'gray', label: 'View' },
    ] as ButtonSpec[],
    desc: 'GL-9999 referenced - Account deactivated in Chart of Accounts since 2025-12-01 · Remap to GL-6100 required',
    icon: <Component className='h-[18px] w-[18px]' strokeWidth={1.5} />,
    iconBg: 'bg-cyan-50',
    iconColor: 'text-cyan-500',
    title: 'INV-2063 — FastShip Ltd · $4,100.00 USD',
  },
]

const DUP_EXCEPTIONS = [
  {
    borderClass: 'border-red-6 hover:border-red-5',
    buttons: [
      { color: 'red', label: 'Block' },
      { color: 'gray', label: 'Review' },
    ] as ButtonSpec[],
    desc: '100% duplicate of INV-1987 submitted 2026-04-20 · Same supplier, amount, PO · Auto-blocked · $7,650 prevented',
    icon: <RefreshCcw className='h-[18px] w-[18px]' strokeWidth={1.5} />,
    iconBg: 'bg-indigo-3',
    iconColor: 'text-indigo-8',
    title: 'INV-2006 — LogiSupply Corp · $7,650.50 USD · EXACT',
  },
  {
    borderClass: 'border-red-6 hover:border-red-5',
    buttons: [
      { color: 'red', label: 'Block' },
      { color: 'gray', label: 'Allow' },
    ] as ButtonSpec[],
    desc: 'Near-duplicate of INV-2009 (3 days ago) - Same supplier + amount - Invoice# differ by 1 digit - Match 94%',
    icon: <RefreshCcw className='h-[18px] w-[18px]' strokeWidth={1.5} />,
    iconBg: 'bg-indigo-3',
    iconColor: 'text-indigo-8',
    title: 'INV-2011 — TechParts Ltd · $3,200.00 USD · NEAR',
  },
  {
    borderClass: 'border-red-6 hover:border-red-500',
    buttons: [
      { color: 'red', label: 'Block' },
      { color: 'gray', label: 'Review' },
    ] as ButtonSpec[],
    desc: '100% duplicate of INV-1994 (2026-04-05) · Same invoice# format + exact amount · Auto-blocked - $12,400 prevented',
    icon: <RefreshCcw className='h-[18px] w-[18px]' strokeWidth={1.5} />,
    iconBg: 'bg-indigo-3',
    iconColor: 'text-indigo-8',
    title: 'INV-2031 — FastShip Ltd · $12,400.00 USD · EXACT',
  },
]

const SUPPLIER_EXCEPTIONS = [
  {
    borderClass: 'border-gray-6 hover:border-gray-6',
    buttons: [
      { color: 'red', label: 'Auto-Reject' },
      { color: 'gray', label: 'Report' },
    ] as ButtonSpec[],
    desc: 'Vendor BLACKLISTED 2025-11-01 · Fraud investigation COMP-2025-441 open · ALL invoices auto-rejected · Do not process',
    icon: <ShieldAlert className='h-[18px] w-[18px]' strokeWidth={1.5} />,
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-500',
    title: 'INV-2028 — XYZ Trade Inc · $15,900.00 USD · BLACKLISTED',
  },
  {
    borderClass: 'border-gray-6 hover:border-gray-6',
    buttons: [
      { color: 'yellow', label: 'Onboard' },
      { color: 'red', label: 'Hold' },
    ] as ButtonSpec[],
    desc: 'Supplier not in approved vendor master - KYC not submitted - Business justification pending from procurement',
    icon: <ShieldAlert className='h-[18px] w-[18px]' strokeWidth={1.5} />,
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-500',
    title: 'INV-2033 — NewVendor Co · $8,200.00 USD',
  },
]

const AI_EXCEPTIONS = [
  {
    borderClass: 'border-gray-6 hover:border-gray-6',
    buttons: [
      { color: 'yellow', label: 'Manual Review' },
      { color: 'gray', label: 'Reprocess' },
    ] as ButtonSpec[],
    desc: 'Low-resolution scan · Supplier name partially obscured · Amount field unclear · Manual verification required',
    icon: <Bot className='h-[18px] w-[18px]' strokeWidth={1.5} />,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-500',
    title: 'INV-2004 — Office Hub · $3,200.00 USD · Confidence: 68.1%',
  },
]

const SectionHeader = ({ title }: { title: string }) => (
  <div className='mt-6 mb-4 flex items-center gap-3 first:mt-0'>
    <div className='text-slate-400 text-[11px] font-bold tracking-wider uppercase'>
      {title}
    </div>
    <div className='bg-gray-200 h-px flex-1'></div>
  </div>
)

export const ExceptionsActionCenter = () => {
  return (
    <div className='col-span-12 mt-2'>
      <div className='grid grid-cols-1 gap-8 lg:grid-cols-2'>
        {/* Left Column */}
        <div className='flex flex-col gap-3'>
          <div>
            <SectionHeader title='PO Mismatch Exceptions (13)' />
            <div className='flex flex-col gap-2.5'>
              {PO_EXCEPTIONS.map((ex, i) => (
                <ExceptionCard key={i} {...ex} />
              ))}
            </div>
          </div>
          <div>
            <SectionHeader title='Missing / Invalid GL Code (8)' />
            <div className='flex flex-col gap-2.5'>
              {GL_EXCEPTIONS.map((ex, i) => (
                <ExceptionCard key={i} {...ex} />
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className='flex flex-col gap-3'>
          <div>
            <SectionHeader title='Duplicate Invoice Alerts (9)' />
            <div className='flex flex-col gap-2.5'>
              {DUP_EXCEPTIONS.map((ex, i) => (
                <ExceptionCard key={i} {...ex} />
              ))}
            </div>
          </div>
          <div>
            <SectionHeader title='Blacklisted / Invalid Supplier (5)' />
            <div className='flex flex-col gap-2.5'>
              {SUPPLIER_EXCEPTIONS.map((ex, i) => (
                <ExceptionCard key={i} {...ex} />
              ))}
            </div>
          </div>
          <div>
            <SectionHeader title='AI Exceptions (5)' />
            <div className='flex flex-col gap-2.5'>
              {AI_EXCEPTIONS.map((ex, i) => (
                <ExceptionCard key={i} {...ex} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const CALENDAR_DAYS = [
  { day: null, type: 'empty' },
  { day: null, type: 'empty' },
  { day: null, type: 'empty' },
  { day: null, type: 'empty' },
  { day: null, type: 'empty' },
  { day: 1, type: 'normal' },
  { day: 2, type: 'due' },
  { day: 3, type: 'normal' },
  { day: 4, type: 'normal' },
  { day: 5, type: 'due' },
  { day: 6, type: 'normal' },
  { day: 7, type: 'normal' },
  { day: 8, type: 'due' },
  { day: 9, type: 'due' },
  { day: 10, type: 'normal' },
  { day: 11, type: 'normal' },
  { day: 12, type: 'due' },
  { day: 13, type: 'normal' },
  { day: 14, type: 'due' },
  { day: 15, type: 'due' },
  { day: 16, type: 'normal' },
  { day: 17, type: 'normal' },
  { day: 18, type: 'due' },
  { day: 19, type: 'normal' },
  { day: 20, type: 'due' },
  { day: 21, type: 'today' },
  { day: 22, type: 'due' },
  { day: 23, type: 'normal' },
  { day: 24, type: 'normal' },
  { day: 25, type: 'due' },
  { day: 26, type: 'normal' },
  { day: 27, type: 'normal' },
  { day: 28, type: 'due' },
  { day: 29, type: 'normal' },
  { day: 30, type: 'due' },
  { day: 31, type: 'normal' },
  { day: null, type: 'empty' },
  { day: null, type: 'empty' },
  { day: null, type: 'empty' },
  { day: null, type: 'empty' },
  { day: null, type: 'empty' },
  { day: null, type: 'empty' },
]

const PaymentCalendarCard = () => {
  return (
    <div className='col-span-12 flex flex-col rounded-xl bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md lg:col-span-4'>
      {/* Title & Subtitle */}
      <div>
        <h4 className='font-poppins text-14 font-semibold text-gray-13 capitalize leading-none'>
          Payment Calendar
        </h4>
        <div className='mt-1 text-[11px] text-[var(--gray-9)] lowercase'>
          may 2026 · scheduled payments
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className='mt-6 w-full max-w-[340px] mx-auto flex-1 flex flex-col justify-between'>
        <div>
          {/* Weekday headers */}
          <div className='grid grid-cols-7 gap-y-2 text-center text-[11px] font-semibold text-gray-10 capitalize mb-2'>
            <div>su</div>
            <div>mo</div>
            <div>tu</div>
            <div>we</div>
            <div>th</div>
            <div>fr</div>
            <div>sa</div>
          </div>

          {/* Calendar days grid */}
          <div className='grid grid-cols-7 gap-[5px]'>
            {CALENDAR_DAYS.map((cell, idx) => {
              if (cell.type === 'empty') {
                return <div key={`empty-${idx}`} className='aspect-square' />
              }

              if (cell.type === 'today') {
                return (
                  <div
                    key={`day-${cell.day}`}
                    className='aspect-square rounded-lg bg-accent-primary text-white font-bold flex items-center justify-center text-[12px] cursor-pointer shadow-sm hover:opacity-90 active:scale-95 transition-all'
                    title='Today (May 21)'
                  >
                    {cell.day}
                  </div>
                )
              }

              if (cell.type === 'due') {
                return (
                  <div
                    key={`day-${cell.day}`}
                    className='aspect-square rounded-lg bg-accent-soft text-accent-primary font-semibold flex items-center justify-center text-[12px] cursor-pointer hover:bg-accent-primary hover:text-white active:scale-95 transition-all'
                    title={`Payment Due on May ${cell.day}`}
                  >
                    {cell.day}
                  </div>
                )
              }

              return (
                <div
                  key={`day-${cell.day}`}
                  className='aspect-square rounded-lg text-gray-11 font-medium flex items-center justify-center text-[12px] cursor-pointer hover:bg-gray-2 active:scale-95 transition-all'
                >
                  {cell.day}
                </div>
              )
            })}
          </div>
        </div>

        {/* Legend */}
        <div className='mt-4 flex items-center gap-4 pl-1 text-[11px] font-medium text-gray-10 capitalize'>
          <div className='flex items-center gap-1.5'>
            <div className='size-3.5 rounded-md bg-accent-primary shrink-0' />
            <span>today</span>
          </div>
          <div className='flex items-center gap-1.5'>
            <div className='size-3.5 rounded-md bg-accent-soft shrink-0 border border-accent-soft' />
            <span>payment due</span>
          </div>
        </div>
      </div>

      {/* Separator line */}
      <div className='my-5 border-t border-gray-2/70' />

      {/* Bottom KPI stats */}
      <div className='flex flex-col gap-3'>
        <h5 className='font-poppins text-13 font-bold text-gray-13 capitalize leading-none pl-0.5'>
          This Month
        </h5>

        <div className='grid grid-cols-2 gap-2'>
          {/* KPI 1 */}
          <div className='bg-gray-2/40 border border-gray-3/20 rounded-xl p-3 flex flex-col gap-0.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)] transition-all hover:bg-gray-2/65'>
            <span className='font-poppins text-16 font-extrabold text-gray-13 leading-tight'>$642k</span>
            <span className='text-[10px] text-gray-10 lowercase font-medium'>total paid</span>
          </div>
          {/* KPI 2 */}
          <div className='bg-gray-2/40 border border-gray-3/20 rounded-xl p-3 flex flex-col gap-0.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)] transition-all hover:bg-gray-2/65'>
            <span className='font-poppins text-16 font-extrabold text-gray-13 leading-tight'>$343k</span>
            <span className='text-[10px] text-gray-10 lowercase font-medium'>outstanding</span>
          </div>
          {/* KPI 3 */}
          <div className='bg-gray-2/40 border border-gray-3/20 rounded-xl p-3 flex flex-col gap-0.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)] transition-all hover:bg-gray-2/65'>
            <span className='font-poppins text-16 font-extrabold text-gray-13 leading-tight'>4.2d</span>
            <span className='text-[10px] text-gray-10 lowercase font-medium'>avg processing</span>
          </div>
          {/* KPI 4 */}
          <div className='bg-gray-2/40 border border-gray-3/20 rounded-xl p-3 flex flex-col gap-0.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)] transition-all hover:bg-gray-2/65'>
            <span className='font-poppins text-16 font-extrabold text-gray-13 leading-tight'>98.1%</span>
            <span className='text-[10px] text-gray-10 lowercase font-medium'>on-time rate</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const DashboardPage = () => {
  const [selectedTimeframe, setSelectedTimeframe] = React.useState('This Month')
  const [selectedSupplier, setSelectedSupplier] = React.useState('All Suppliers')
  const [selectedStatus, setSelectedStatus] = React.useState('All Statuses')
  const [selectedCurrency, setSelectedCurrency] = React.useState('All Currencies')

  const [activeDropdown, setActiveDropdown] = React.useState<string | null>(null)

  React.useEffect(() => {
    const handleOutsideClick = () => {
      setActiveDropdown(null)
    }
    document.addEventListener('click', handleOutsideClick)
    return () => {
      document.removeEventListener('click', handleOutsideClick)
    }
  }, [])

  const timeframeOptions = ['This Month', 'Last Month', 'This Quarter', 'This Year']
  const supplierOptions = ['All Suppliers', 'Global Freight', 'TechParts Ltd', 'Office Hub']
  const statusOptions = ['All Statuses', 'Matched', 'Pending', 'Exception', 'Posted']
  const currencyOptions = ['All Currencies', 'USD', 'EUR', 'INR', 'GBP']

  return (
    <>
      <AnimateSlideUp delay={0.1}>
        {/* <Header /> */}
      </AnimateSlideUp>
      <AnimateFadeIn
        className='bg-gray-50/50 relative flex min-h-0 flex-1 flex-col overflow-y-auto p-6 scrollbar'
        delay={0.2}
      >
        {/* Filters Row */}
        <div className='animate-in fade-in slide-in-from-left-4 mb-4 flex flex-wrap items-center justify-between gap-4 duration-300'>
          <div className='flex flex-wrap items-center gap-2'>
            <span className='text-gray-400 text-[12px] font-medium'>
              Filters:
            </span>
            <FilterDropdown
              icon={<Calendar />}
              label='This Month'
              options={timeframeOptions}
              selectedValue={selectedTimeframe}
              onSelect={setSelectedTimeframe}
              isOpen={activeDropdown === 'timeframe'}
              onToggle={() => setActiveDropdown(activeDropdown === 'timeframe' ? null : 'timeframe')}
            />
            <FilterDropdown
              icon={<Building2 />}
              label='All Suppliers'
              options={supplierOptions}
              selectedValue={selectedSupplier}
              onSelect={setSelectedSupplier}
              isOpen={activeDropdown === 'supplier'}
              onToggle={() => setActiveDropdown(activeDropdown === 'supplier' ? null : 'supplier')}
            />
            <FilterDropdown
              icon={<ClipboardList />}
              label='All Statuses'
              options={statusOptions}
              selectedValue={selectedStatus}
              onSelect={setSelectedStatus}
              isOpen={activeDropdown === 'status'}
              onToggle={() => setActiveDropdown(activeDropdown === 'status' ? null : 'status')}
            />
            <FilterDropdown
              icon={<DollarSign />}
              label='All Currencies'
              options={currencyOptions}
              selectedValue={selectedCurrency}
              onSelect={setSelectedCurrency}
              isOpen={activeDropdown === 'currency'}
              onToggle={() => setActiveDropdown(activeDropdown === 'currency' ? null : 'currency')}
            />
          </div>
          <div className='relative'>
            <Search className='absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[#A142F4]' />
            <input
              className='text-gray-600 placeholder:text-gray-400 hover:bg-opacity-80 w-60 rounded-full border border-gray-3 bg-white py-1.5 pr-4 pl-8 text-[12px] shadow-sm transition-all outline-none focus:border-[#A142F4] focus:ring-1 focus:ring-[#A142F4]'
              placeholder='Search invoice, supplier, PO...'
              type='text'
            />
          </div>
        </div>

        {/* Metrics Cards Row */}
        {/* <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <MetricCard
            title="Total Invoices"
            value="4,234"
            trend="↑ 12.4% vs last month"
            colorTheme="orange"
            icon={FileText}
          />
          <MetricCard
            title="Matched & Posted"
            value="3,914"
            trend="81.1% rate"
            colorTheme="green"
            icon={CheckCircle}
          />
          <MetricCard
            title="Pending Approval"
            value="247"
            trend="12 SLA breach"
            colorTheme="orange"
            icon={Clock}
          />
          <MetricCard
            title="Exceptions"
            value="38"
            trend="3 new today"
            colorTheme="orange"
            icon={AlertTriangle}
          />
          <MetricCard
            title="Duplicates"
            value="9"
            trend="$84K blocked"
            colorTheme="red"
            icon={StickyNote}
          />
          <MetricCard
            title="Total Value"
            value="$42.3M"
            trend="8.7% vs last"
            colorTheme="purple"
            icon={DollarSign}
          />
        </div> */}
        <Overview />
        <div
          className='animate-in fade-in slide-in-from-bottom-4 mt-5 grid grid-cols-12 gap-4 duration-500'
          style={{ animationDelay: '150ms', animationFillMode: 'both' }}
        >
          <TopSuppliersCard />
          {/* <InvoiceTrendCard /> */}
          <InvoiceAgingCard />
          <SupplierRiskCard />
          <CategoryWiseInvoiceDistributionCard />
          {/* <RiskSpendingCard /> */}
          {/* <ExceptionsActionCenter /> */}

          <PaymentCalendarCard />
        </div>
      </AnimateFadeIn>
    </>
  )
}

DashboardPage.displayName = 'DashboardPage'
export default DashboardPage
