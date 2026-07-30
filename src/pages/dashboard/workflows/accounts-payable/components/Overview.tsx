import { Trans, useLingui } from '@lingui/react/macro'
import { useViewportSize } from '@mantine/hooks'
import { useMemo, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import { AnimateSlideUp } from '@/components/common/animations'
import { SCREEN_XL } from '@/constants'
import cn from '@/utils/cn'
import Section from '../../shared/components/Section'

interface Invoice {
  aging: string
  amount: number
  ccy: string
  dueDate: string
  id: string
  owner: string
  poRef: string
  status: 'Matched & Posted' | 'Pending Approval' | 'Exception' | 'Duplicate'
  statusColor: string
  supplier: string
}

const INVOICES_DATA: Invoice[] = [
  {
    aging: 'Current',
    amount: 15240.0,
    ccy: 'USD',
    dueDate: '2026-06-01',
    id: 'INV-2026-001',
    owner: 'Sarah Jenkins',
    poRef: 'PO-90812',
    status: 'Matched & Posted',
    statusColor: 'text-green-9 bg-green-9/10 border-green-9/20 border',
    supplier: 'Acme Corporation',
  },
  {
    aging: '3 days overdue',
    amount: 24500.0,
    ccy: 'USD',
    dueDate: '2026-05-18',
    id: 'INV-2026-002',
    owner: 'David Miller',
    poRef: 'PO-88291',
    status: 'Pending Approval',
    statusColor: 'text-orange-9 bg-orange-9/10 border-orange-9/20 border',
    supplier: 'Globex Laboratories',
  },
  {
    aging: '11 days overdue',
    amount: 8920.0,
    ccy: 'EUR',
    dueDate: '2026-05-10',
    id: 'INV-2026-003',
    owner: 'Emily Rose',
    poRef: 'PO-44210',
    status: 'Exception',
    statusColor: 'text-red-9 bg-red-9/10 border-red-9/20 border',
    supplier: 'Initech Systems',
  },
  {
    aging: 'Current',
    amount: 125000.0,
    ccy: 'USD',
    dueDate: '2026-06-15',
    id: 'INV-2026-004',
    owner: 'James Stark',
    poRef: 'PO-77382',
    status: 'Matched & Posted',
    statusColor: 'text-green-9 bg-green-9/10 border-green-9/20 border',
    supplier: 'Umbrella Corp',
  },
  {
    aging: '1 day overdue',
    amount: 15240.0,
    ccy: 'USD',
    dueDate: '2026-05-20',
    id: 'INV-2026-005',
    owner: 'Sarah Jenkins',
    poRef: 'PO-90812',
    status: 'Duplicate',
    statusColor: 'text-gray-10 bg-gray-2 border-gray-3 border',
    supplier: 'Veer Industries',
  },
  {
    aging: 'Current',
    amount: 450000.0,
    ccy: 'USD',
    dueDate: '2026-06-30',
    id: 'INV-2026-006',
    owner: 'David Miller',
    poRef: 'PO-55190',
    status: 'Pending Approval',
    statusColor: 'text-orange-9 bg-orange-9/10 border-orange-9/20 border',
    supplier: 'Hooli Inc',
  },
  {
    aging: '19 days overdue',
    amount: 3150.0,
    ccy: 'GBP',
    dueDate: '2026-05-02',
    id: 'INV-2026-007',
    owner: 'Emily Rose',
    poRef: 'PO-33829',
    status: 'Exception',
    statusColor: 'text-red-9 bg-red-9/10 border-red-9/20 border',
    supplier: 'Soylent Green Co',
  },
  {
    aging: 'Current',
    amount: 360000.0,
    ccy: 'USD',
    dueDate: '2026-07-05',
    id: 'INV-2026-008',
    owner: 'James Stark',
    poRef: 'PO-10928',
    status: 'Matched & Posted',
    statusColor: 'text-green-9 bg-green-9/10 border-green-9/20 border',
    supplier: 'Stark Industries',
  },
  {
    aging: '1 day overdue',
    amount: 9000.0,
    ccy: 'USD',
    dueDate: '2026-05-20',
    id: 'INV-2026-009',
    owner: 'Sarah Jenkins',
    poRef: 'PO-45612',
    status: 'Duplicate',
    statusColor: 'text-gray-10 bg-gray-2 border-gray-3 border',
    supplier: 'Wayne Enterprises',
  },
]

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
}

interface InvoiceTablePanelProps {
  activeCard: string
  onClose: () => void
}

const InvoiceTablePanel = ({ activeCard, onClose }: InvoiceTablePanelProps) => {
  const { t } = useLingui()
  const [searchQuery, setSearchQuery] = useState('')

  const filteredInvoices = useMemo(() => {
    let result = [...INVOICES_DATA]
    const cardLower = activeCard.toLowerCase()

    if (cardLower.includes('matched')) {
      result = result.filter((inv) => inv.status === 'Matched & Posted')
    } else if (cardLower.includes('pending')) {
      result = result.filter((inv) => inv.status === 'Pending Approval')
    } else if (cardLower.includes('exception')) {
      result = result.filter((inv) => inv.status === 'Exception')
    } else if (cardLower.includes('duplicate')) {
      result = result.filter((inv) => inv.status === 'Duplicate')
    } else if (cardLower.includes('value')) {
      result.sort((a, b) => b.amount - a.amount)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (inv) =>
          inv.id.toLowerCase().includes(q) ||
          inv.supplier.toLowerCase().includes(q) ||
          inv.poRef.toLowerCase().includes(q) ||
          inv.owner.toLowerCase().includes(q),
      )
    }

    return result
  }, [activeCard, searchQuery])

  return (
    <div className='animate-in fade-in slide-in-from-top-4 mt-6 overflow-hidden rounded-xl border border-gray-3 bg-surface p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] duration-300'>
      {/* Header */}
      <div className='mb-4 flex items-center justify-between border-b border-gray-2 pb-4'>
        <div className='flex items-center gap-3'>
          <h3 className='flex items-center gap-2 text-14 font-semibold text-gray-13 capitalize'>
            <span>
              <Trans>invoices</Trans>
            </span>
            <span className='font-normal text-gray-10'>·</span>
            <span className='text-13 font-semibold text-accent-primary'>
              <Trans>{activeCard}</Trans>
            </span>
          </h3>
          <span className='rounded-full bg-accent-soft px-2.5 py-0.5 text-11 font-medium text-accent-primary'>
            {filteredInvoices.length}{' '}
            <Trans>
              {filteredInvoices.length === 1 ? 'record' : 'records'}
            </Trans>
          </span>
        </div>
        <button
          className='flex size-7 items-center justify-center rounded-lg text-gray-10 transition-all hover:bg-gray-3 hover:text-gray-13 active:scale-95'
          title={t`Close panel`}
          onClick={onClose}
        >
          <Icon className='size-4' name='lucide:x' />
        </button>
      </div>

      {/* Search & Actions Bar */}
      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <div className='relative w-full max-w-xs'>
          <Icon
            className='absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-gray-10'
            name='lucide:search'
          />
          <input
            className='w-full rounded-lg border border-gray-3 bg-surface py-1.5 pr-4 pl-9 text-12 shadow-sm transition-all outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary'
            placeholder={t`Search invoice, supplier, PO...`}
            type='text'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className='flex items-center gap-2'>
          <button className='hover:bg-opacity-80 flex items-center gap-1.5 rounded-lg border border-gray-3 bg-white px-2.5 py-1.5 text-12 font-medium text-gray-11 shadow-sm transition-all hover:bg-gray-2 active:scale-95'>
            <Icon className='size-3.5 text-gray-10' name='lucide:download' />
            <span>
              <Trans>Export CSV</Trans>
            </span>
          </button>
          <button className='hover:bg-opacity-80 flex items-center gap-1.5 rounded-lg border border-gray-3 bg-white px-2.5 py-1.5 text-12 font-medium text-gray-11 shadow-sm transition-all hover:bg-gray-2 active:scale-95'>
            <Icon className='size-3.5 text-gray-10' name='lucide:filter' />
            <span>
              <Trans>Filters</Trans>
            </span>
          </button>
        </div>
      </div>

      {/* Table */}
      {filteredInvoices.length > 0 ? (
        <div className='scrollbar w-full overflow-x-auto rounded-lg border border-gray-3'>
          <table className='w-full border-separate border-spacing-0 text-left text-13'>
            <thead>
              <tr className='bg-gray-2'>
                <th className='border-b border-gray-3 px-4 py-3 text-xs font-semibold whitespace-nowrap text-gray-11'>
                  <Trans>invoice #</Trans>
                </th>
                <th className='border-b border-gray-3 px-4 py-3 text-xs font-semibold whitespace-nowrap text-gray-11'>
                  <Trans>supplier</Trans>
                </th>
                <th className='border-b border-gray-3 px-4 py-3 text-xs font-semibold whitespace-nowrap text-gray-11'>
                  <Trans>po ref</Trans>
                </th>
                <th className='border-b border-gray-3 px-4 py-3 text-right text-xs font-semibold whitespace-nowrap text-gray-11'>
                  <Trans>amount</Trans>
                </th>
                <th className='border-b border-gray-3 px-4 py-3 text-center text-xs font-semibold whitespace-nowrap text-gray-11'>
                  <Trans>ccy</Trans>
                </th>
                <th className='border-b border-gray-3 px-4 py-3 text-xs font-semibold whitespace-nowrap text-gray-11'>
                  <Trans>due date</Trans>
                </th>
                <th className='border-b border-gray-3 px-4 py-3 text-center text-xs font-semibold whitespace-nowrap text-gray-11'>
                  <Trans>status</Trans>
                </th>
                <th className='border-b border-gray-3 px-4 py-3 text-xs font-semibold whitespace-nowrap text-gray-11'>
                  <Trans>aging</Trans>
                </th>
                <th className='border-b border-gray-3 px-4 py-3 text-xs font-semibold whitespace-nowrap text-gray-11'>
                  <Trans>owner</Trans>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((inv) => (
                <tr
                  className='group border-b border-gray-3 transition-colors last:border-b-0 hover:bg-gray-2/45'
                  key={inv.id}
                >
                  <td className='border-b border-gray-3 px-4 py-3 align-middle font-mono text-12 font-semibold text-gray-13 group-last:border-0 last:border-b-0'>
                    {inv.id}
                  </td>

                  <td className='border-b border-gray-3 px-4 py-3 align-middle font-medium text-gray-13 group-last:border-0 last:border-b-0'>
                    {inv.supplier}
                  </td>

                  <td className='border-b border-gray-3 px-4 py-3 align-middle group-last:border-0 last:border-b-0'>
                    <span className='rounded border border-gray-3/30 bg-gray-3/50 px-1.5 py-0.5 font-mono text-11 text-gray-10'>
                      {inv.poRef}
                    </span>
                  </td>

                  <td className='border-b border-gray-3 px-4 py-3 text-right align-middle font-mono font-bold text-gray-13 group-last:border-0 last:border-b-0'>
                    {inv.amount.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                      minimumFractionDigits: 2,
                    })}
                  </td>

                  <td className='border-b border-gray-3 px-4 py-3 text-center align-middle text-xs font-medium text-gray-10 group-last:border-0 last:border-b-0'>
                    {inv.ccy}
                  </td>

                  <td className='border-b border-gray-3 px-4 py-3 align-middle text-12 whitespace-nowrap text-gray-11 group-last:border-0 last:border-b-0'>
                    {inv.dueDate}
                  </td>

                  <td className='border-b border-gray-3 px-4 py-3 text-center align-middle group-last:border-0 last:border-b-0'>
                    <span
                      className={cn(
                        'text-10 inline-block rounded-full border px-2 py-0.5 font-semibold whitespace-nowrap capitalize',
                        inv.statusColor,
                      )}
                    >
                      <Trans>{inv.status}</Trans>
                    </span>
                  </td>

                  <td className='border-b border-gray-3 px-4 py-3 align-middle whitespace-nowrap group-last:border-0 last:border-b-0'>
                    <div className='flex items-center gap-1.5'>
                      <span
                        className={cn(
                          'size-1.5 shrink-0 rounded-full',
                          inv.aging === 'Current'
                            ? 'animate-pulse bg-green-9'
                            : 'bg-orange-9',
                        )}
                      />
                      <span
                        className={cn(
                          'text-11 font-medium',
                          inv.aging === 'Current'
                            ? 'text-green-9'
                            : 'text-orange-9',
                        )}
                      >
                        <Trans>{inv.aging}</Trans>
                      </span>
                    </div>
                  </td>

                  <td className='border-b border-gray-3 px-4 py-3 align-middle group-last:border-0 last:border-b-0'>
                    <div className='flex items-center gap-2'>
                      <div className='flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft font-poppins text-[9px] font-bold text-accent-primary uppercase shadow-sm'>
                        {getInitials(inv.owner)}
                      </div>
                      <span
                        className='max-w-[100px] truncate text-12 text-gray-11'
                        title={inv.owner}
                      >
                        {inv.owner}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className='flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-3 px-4 py-10 text-center'>
          <Icon className='mb-2 size-8 text-gray-8' name='lucide:info' />
          <p className='text-13 font-medium text-gray-11'>
            <Trans>No matching invoices found</Trans>
          </p>
          <p className='mt-0.5 text-11 text-gray-10'>
            <Trans>
              Try widening your search or choosing another status card.
            </Trans>
          </p>
        </div>
      )}
    </div>
  )
}

const Overview = () => {
  const { width } = useViewportSize()
  const [activeCard, setActiveCard] = useState<string | null>(null)

  const items = [
    {
      barColor: 'bg-accent-primary opacity-[0.18]',
      change: '+23%',
      deltaColor: 'text-green-9',
      icon: 'lucide:file-text',
      isUp: true,
      name: `total invoices`,
      value: '2,240',
    },
    {
      barColor: 'bg-green-9 opacity-[0.20]',
      change: '-67%',
      deltaColor: 'text-red-9',
      icon: 'lucide:check-circle',
      isUp: false,
      name: `matched & posted`,
      value: '1,240',
    },
    {
      barColor: 'bg-orange-9 opacity-[0.20]',
      change: '+156%',
      deltaColor: 'text-orange-9',
      icon: 'lucide:clock',
      isUp: true,
      name: `pending approval`,
      value: '$24.5k',
    },
    {
      barColor: 'bg-red-9 opacity-[0.18]',
      change: '+0.5%',
      deltaColor: 'text-green-9',
      icon: 'lucide:alert-triangle',
      isUp: true,
      name: `exception rate`,
      value: '99.9%',
    },
    {
      barColor: 'bg-gray-8 opacity-[0.30]',
      change: '-10.5%',
      deltaColor: 'text-red-9',
      icon: 'heroicons-outline:document-duplicate',
      isUp: false,
      name: `duplicates`,
      value: '9',
    },
    {
      barColor: 'bg-accent-primary opacity-[0.18]',
      change: '+25%',
      deltaColor: 'text-green-9',
      icon: 'lucide:dollar-sign',
      isUp: true,
      name: `total value`,
      value: '$985k',
    },
  ]

  const handleCardClick = (name: string) => {
    if (activeCard === name) {
      setActiveCard(null)
    } else {
      setActiveCard(name)
    }
  }

  return (
    <Section title=''>
      <div
        className={cn(
          'grid grid-cols-1 gap-[10px]',
          width >= SCREEN_XL
            ? '@xl:grid-cols-2 @5xl:grid-cols-6'
            : 'md:grid-cols-2 xl:grid-cols-6',
        )}
      >
        {items.map((item, index) => {
          const isSelected = activeCard === item.name
          return (
            <AnimateSlideUp delay={0.1 + index * 0.06} key={item.name}>
              <div
                className={cn(
                  'relative cursor-pointer overflow-hidden rounded-xl border bg-surface p-4 transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98]',
                  isSelected
                    ? 'border-accent-primary shadow-[0_4px_12px_rgba(147,51,234,0.06)] ring-2 ring-accent-primary/12'
                    : 'border-gray-3 hover:border-[#e0dde8] hover:shadow-[0_3px_8px_rgba(0,0,0,0.07)]',
                )}
                onClick={() => handleCardClick(item.name)}
              >
                {/* monochrome icon box */}
                <div
                  className={cn(
                    'mb-3.5 flex size-7 items-center justify-center rounded text-12 transition-colors',
                    isSelected
                      ? 'bg-accent-soft text-accent-primary'
                      : 'bg-gray-3 text-gray-11',
                  )}
                >
                  <Icon className='size-3.5' name={item.icon} />
                </div>

                {/* Poppins Value */}
                <div className='mb-1 font-poppins text-20 leading-none font-bold tracking-tight text-gray-13'>
                  {item.value}
                </div>

                {/* Label */}
                <div className='mb-2.5 text-11 font-medium text-gray-10 capitalize'>
                  <Trans>{item.name}</Trans>
                </div>

                {/* Delta change text */}
                <div
                  className={cn(
                    'flex items-center gap-1 text-11 leading-none font-semibold',
                    item.deltaColor,
                  )}
                >
                  <span>{item.isUp ? '↑' : '↓'}</span>
                  <span>{item.change}</span>
                  <span className='ml-0.5 font-normal text-gray-10'>
                    vs <Trans>last month</Trans>
                  </span>
                </div>

                {/* thin bottom accent bar */}
                <div
                  className={cn(
                    'absolute right-0 bottom-0 left-0 h-[2px]',
                    isSelected ? 'bg-accent-primary' : item.barColor,
                  )}
                />
              </div>
            </AnimateSlideUp>
          )
        })}
      </div>

      {activeCard && (
        <InvoiceTablePanel
          activeCard={activeCard}
          onClose={() => setActiveCard(null)}
        />
      )}
    </Section>
  )
}

Overview.displayName = 'Overview'
export default Overview
