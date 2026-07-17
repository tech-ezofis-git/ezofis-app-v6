import { AnimatePresence, motion } from 'motion/react'
import { Sparkles } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import IconButton from '@/components/base/button/IconButton'
import Menu from '@/components/base/menu/Menu'
import cn from '@/utils/cn'

type SearchItem = {
  answer: string
  id: string
  keywords: string[]
  title: string
}

const SEARCH_ITEMS: SearchItem[] = [
  {
    id: '1',
    keywords: ['ap agent', 'start', 'account', 'onboard'],
    title: 'How do I start using AP Agent and create my first account?',
    answer:
      'Open AP Agent from the top bar, complete your workspace profile, then create your first account under Settings → Organization to begin invoice intake.',
  },
  {
    id: '2',
    keywords: ['invoice', 'ingest', 'upload', 'email', 'import'],
    title: 'What options does AP Agent offer for ingesting invoices?',
    answer:
      'You can ingest invoices via email attachment capture, manual upload, scanner/OCR import, or connected ERP mailboxes for automatic extraction.',
  },
  {
    id: '3',
    keywords: ['vendor', 'supplier', 'verify', 'duplicate'],
    title: 'How do I verify vendors and resolve duplicate supplier alerts?',
    answer:
      'Go to Vendor Management, review duplicate alerts, merge or dismiss matches, then verify bank and tax details before the first payment.',
  },
  {
    id: '4',
    keywords: ['payment', 'approval', 'schedule', 'remittance'],
    title: 'Where can I review pending payment approvals and schedules?',
    answer:
      'Open Payments → Approvals to see pending items, amounts, and schedules. High-priority payments are highlighted for faster review.',
  },
  {
    id: '5',
    keywords: ['document', 'search', 'po', 'purchase order', 'repository'],
    title: 'How do I search documents, invoices, and PO records?',
    answer:
      'Use repository search with filters like PO Number, invoice number, vendor, or date range to locate matching AP documents quickly.',
  },
  {
    id: '6',
    keywords: ['request', 'purchase request', 'approval workflow'],
    title: 'How do purchase requests and approval workflows work?',
    answer:
      'Purchase requests route through your configured approval chain. Track status in Requests and approve or reject from the request detail view.',
  },
  {
    id: '7',
    keywords: ['matching', '2-way', '3-way', 'goods receipt'],
    title: 'How does 2-way and 3-way invoice matching work?',
    answer:
      '2-way matches invoice to PO; 3-way also requires a goods receipt. Incomplete matches appear in Matching until all documents align.',
  },
  {
    id: '8',
    keywords: ['erp', 'sync', 'sap', 'intacct', 'export', 'page about'],
    title: 'What is this page about?',
    answer:
      'This page helps you manage Accounts Payable requests — review status, discrepancies, supplier filters, and move matched items to verification.',
  },
]

type ViewMode = 'search' | 'answer'

const GlobalSearch = () => {
  const [opened, setOpened] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<ViewMode>('search')
  const [activeItem, setActiveItem] = useState<SearchItem | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!opened) {
      setQuery('')
      setDebouncedQuery('')
      setLoading(false)
      setView('search')
      setActiveItem(null)
      return
    }

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus()
    }, 30)

    return () => window.clearTimeout(focusTimer)
  }, [opened])

  useEffect(() => {
    if (view !== 'search') return
    const trimmed = query.trim()
    if (!trimmed) {
      setDebouncedQuery('')
      setLoading(false)
      return
    }

    setLoading(true)
    setDebouncedQuery('')
    const timer = window.setTimeout(() => {
      setDebouncedQuery(trimmed)
      setLoading(false)
    }, 500)

    return () => window.clearTimeout(timer)
  }, [query, view])

  const results = useMemo(() => {
    if (!debouncedQuery) return []
    const q = debouncedQuery.toLowerCase()
    return SEARCH_ITEMS.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.includes(q) || q.includes(k)),
    )
  }, [debouncedQuery])

  const openAnswer = (item: SearchItem) => {
    setActiveItem(item)
    setQuery(item.title)
    setView('answer')
    setLoading(false)
  }

  const askCurrentQuery = () => {
    const trimmed = query.trim()
    if (!trimmed) return

    const matched =
      results[0] ||
      SEARCH_ITEMS.find(
        (item) =>
          item.title.toLowerCase() === trimmed.toLowerCase() ||
          item.keywords.some((k) => trimmed.toLowerCase().includes(k)),
      )

    openAnswer(
      matched || {
        id: 'custom',
        keywords: [],
        title: trimmed,
        answer:
          'I searched AP help for your question. Try keywords like invoice, vendor, payment, request, matching, or ERP sync for a detailed answer.',
      },
    )
  }

  const showIdle = !query.trim() && !loading && view === 'search'
  const showResults = view === 'search' && !loading && Boolean(debouncedQuery)

  return (
    <Menu
      closeOnItemClick={false}
      offset={8}
      opened={opened}
      position='bottom-end'
      width={460}
      className='!p-0'
      target={
        opened ? (
          <div
            className={cn(
              'relative flex h-9 w-[460px] items-center gap-2 rounded-lg border px-2.5 transition-colors',
              query.trim()
                ? 'border-primary-6 bg-primary-2'
                : 'border-gray-4 bg-gray-2',
            )}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              className='min-w-0 flex-1 bg-transparent text-[13.5px] text-gray-13 outline-none placeholder:text-gray-9'
              placeholder='Search...'
              value={query}
              onChange={(e) => {
                setView('search')
                setActiveItem(null)
                setQuery(e.target.value)
              }}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === 'Enter') {
                  e.preventDefault()
                  askCurrentQuery()
                }
                if (e.key === 'Escape') setOpened(false)
                if (e.key === 'Backspace' && view === 'answer' && !query) {
                  setView('search')
                }
              }}
            />
            <button
              aria-label='Search'
              className='grid size-7 shrink-0 place-items-center rounded-md text-gray-11 transition-colors hover:bg-gray-4 hover:text-gray-13'
              type='button'
              onClick={(e) => {
                e.stopPropagation()
                askCurrentQuery()
              }}
            >
              <Icon name='lucide:search' />
            </button>
            {loading && (
              <div className='absolute right-0 bottom-0 left-0 h-0.5 overflow-hidden rounded-b-lg bg-primary-3'>
                <div className='global-search-bar h-full w-1/3 bg-primary-9' />
              </div>
            )}
          </div>
        ) : (
          <IconButton
            ariaLabel='Search'
            className='text-gray-11 hover:text-gray-13'
            color='gray'
            icon='lucide:search'
            tooltip='Search'
            variant='ghost'
          />
        )
      }
      onChange={setOpened}
    >
      <div
        className='overflow-hidden rounded-xl bg-surface-raised'
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes global-search-bar {
            0% { transform: translateX(-120%); }
            100% { transform: translateX(420%); }
          }
          .global-search-bar {
            animation: global-search-bar 1s ease-in-out infinite;
          }
        `}</style>

        <div className='max-h-[420px] min-h-[200px] overflow-y-auto'>
          <AnimatePresence mode='wait'>
            {view === 'answer' && activeItem && (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className='px-4 py-4'
                exit={{ opacity: 0, y: 8 }}
                initial={{ opacity: 0, y: 8 }}
                key='answer'
                transition={{ duration: 0.22 }}
              >
                <button
                  className='mb-3 inline-flex items-center gap-1 text-xs font-medium text-primary-9 hover:underline'
                  type='button'
                  onClick={() => {
                    setView('search')
                    setActiveItem(null)
                  }}
                >
                  <Icon name='lucide:arrow-left' />
                  Back to results
                </button>
                <div className='mb-2 flex items-start gap-2'>
                  <Sparkles
                    className='mt-0.5 shrink-0 text-primary-9'
                    size={16}
                    strokeWidth={2}
                  />
                  <h3 className='text-[14px] font-semibold leading-5 text-gray-13'>
                    {activeItem.title}
                  </h3>
                </div>
                <p className='pl-6 text-[13px] leading-6 text-gray-11'>
                  {activeItem.answer}
                </p>
              </motion.div>
            )}

            {view === 'search' && showIdle && (
              <motion.div
                animate={{ opacity: 1 }}
                className='flex flex-col items-center justify-center gap-2 px-6 py-14 text-center'
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                key='idle'
              >
                <Sparkles className='text-primary-8' size={22} strokeWidth={2} />
                <p className='text-sm font-medium text-gray-12'>
                  Start typing to search
                </p>
                <p className='max-w-[280px] text-xs leading-5 text-gray-10'>
                  Ask about invoices, documents, requests, vendors, or AP Agent.
                </p>
              </motion.div>
            )}

            {view === 'search' && loading && (
              <motion.div
                animate={{ opacity: 1 }}
                className='flex flex-col items-center justify-center gap-3 px-4 py-14'
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                key='loading'
              >
                <motion.div
                  animate={{
                    opacity: [0.55, 1, 0.55],
                    rotate: [0, 8, -8, 0],
                    scale: [0.92, 1.1, 0.92],
                  }}
                  className='text-primary-9'
                  transition={{
                    duration: 1.4,
                    ease: 'easeInOut',
                    repeat: Infinity,
                  }}
                >
                  <Sparkles size={24} strokeWidth={2} />
                </motion.div>
                <p className='text-xs font-medium text-gray-11'>Searching…</p>
                <div className='h-1 w-44 overflow-hidden rounded-full bg-primary-3'>
                  <div className='global-search-bar h-full w-1/2 rounded-full bg-primary-9' />
                </div>
              </motion.div>
            )}

            {showResults && results.length === 0 && (
              <motion.div
                animate={{ opacity: 1 }}
                className='px-4 py-12 text-center text-sm text-gray-10'
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                key='empty'
              >
                No related answers for “{debouncedQuery}”.
              </motion.div>
            )}

            {showResults && results.length > 0 && (
              <motion.ul
                animate={{ opacity: 1 }}
                className='flex flex-col py-1'
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                key='list'
              >
                {results.map((item, index) => (
                  <motion.li
                    animate={{ opacity: 1, y: 0 }}
                    initial={{ opacity: 0, y: 8 }}
                    key={item.id}
                    transition={{ delay: index * 0.05, duration: 0.22 }}
                  >
                    <button
                      className='flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-primary-2'
                      type='button'
                      onClick={() => openAnswer(item)}
                    >
                      <Sparkles
                        className='shrink-0 text-primary-9'
                        size={16}
                        strokeWidth={2}
                      />
                      <span className='min-w-0 flex-1 text-[13.5px] leading-5 text-gray-12'>
                        {item.title}
                      </span>
                      <Icon
                        className='shrink-0 text-primary-7'
                        name='lucide:chevron-right'
                      />
                    </button>
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Menu>
  )
}

GlobalSearch.displayName = 'GlobalSearch'
export default GlobalSearch
