import {
  ArrowLeft,
  ArrowRight,
  BadgeHelp,
  BarChart3,
  Bolt,
  Building2,
  Calendar,
  ChartLine,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  File,
  FileCheck2,
  FileText,
  Filter,
  History,
  Lightbulb,
  type LucideIcon as LucideIconType,
  Mail,
  MailOpen,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  ScanLine,
  Send,
  Store,
  Table2,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import useAskAIStore from './stores/useAskAIStore'

type AnalysisRow = {
  icon?: string
  label?: string
  ok?: boolean
  value?: string
}
type ApiAiPayload = {
  actions?: string[]
  analysis?: AnalysisRow[] | null
  attachments?: Attachments | null
  clarify?: Clarify | null
  creditsRemaining?: number
  extraResults?: ExtraResult[] | null
  insight?: { stats?: InsightStat[]; title?: string } | null
  reply?: string | string[]
  result?: FileResult | null
  text?: string
}

type AttachmentItem = {
  cite?: string
  file?: string
  meta?: string
  url?: string
}

type Attachments = {
  docx?: AttachmentItem[]
  excel?: AttachmentItem[]
  other?: AttachmentItem[]
  pdf?: AttachmentItem[]
}

type Clarify = {
  options?: string[]
  question?: string
}

type ExtraResult = {
  confidence?: string | number
  icon?: string
  name?: string
  url?: string
}

type FileResult = {
  confidence?: string | number
  date?: string
  name?: string
  path?: string
  reason?: string
  source?: string
  type?: string
  url?: string
}

type HistoryItem = {
  createdAt: string
  creditsRemaining: number
  creditsUsed: number
  id: string
  messages: Message[]
  subtitle: string
  title: string
}

type InsightStat = {
  label?: string
  n?: string | number
}

type Message = {
  id: string
  payload?: ApiAiPayload
  role: Role
  text: string
}

type Role = 'user' | 'ai' | 'status'

type ViewMode = 'chat' | 'history'

const suggestions = [
  { label: 'Show recent documents.', query: 'Show recent documents' },
  {
    label: 'Search for a supplier invoice.',
    query: 'Find the latest GST invoice from Rajan Suppliers',
  },
  {
    label: 'Retrieve scanned contracts.',
    query: 'Show me all scanned contracts from Q1 2025',
  },
  {
    label: 'Summarise archive insights.',
    query: 'Give me data insights for documents this month',
  },
  {
    label: 'Find an email attachment.',
    query: 'Find the onboarding email attachment for Priya Nair',
  },
]

const iconMap: Record<string, LucideIconType> = {
  add: Plus,
  arrowRight: ArrowRight,
  attachment: Paperclip,
  back: ArrowLeft,
  bill: FileText,
  building: Building2,
  bulb: Lightbulb,
  calendar: Calendar,
  certificate: FileCheck2,
  chart: ChartLine,
  chartBar: BarChart3,
  check: CheckCircle2,
  chevronDown: ChevronDown,
  close: X,
  copy: Copy,
  download: Download,
  external: ExternalLink,
  file: File,
  fileText: FileText,
  filter: Filter,
  history: History,
  lightning: Bolt,
  mail: Mail,
  mailOpen: MailOpen,
  more: MoreHorizontal,
  pdf: FileText,
  pencil: Pencil,
  question: BadgeHelp,
  scan: ScanLine,
  send: Send,
  store: Store,
  table: Table2,
  user: FileText,
}

const legacyIconMap: Record<string, keyof typeof iconMap> = {
  'lucide:history': 'history',
  'lucide:x': 'close',
  'mingcute:add-line': 'add',
  'mingcute:arrow-left-line': 'back',
  'mingcute:arrow-right-line': 'arrowRight',
  'mingcute:attachment-line': 'attachment',
  'mingcute:bill-line': 'bill',
  'mingcute:building-2-line': 'building',
  'mingcute:bulb-line': 'bulb',
  'mingcute:calendar-line': 'calendar',
  'mingcute:certificate-line': 'certificate',
  'mingcute:chart-bar-line': 'chartBar',
  'mingcute:chart-line': 'chart',
  'mingcute:check-circle-line': 'check',
  'mingcute:copy-2-line': 'copy',
  'mingcute:copy-line': 'copy',
  'mingcute:down-line': 'chevronDown',
  'mingcute:download-line': 'download',
  'mingcute:external-link-line': 'external',
  'mingcute:file-certificate-line': 'certificate',
  'mingcute:file-line': 'file',
  'mingcute:file-pdf-line': 'pdf',
  'mingcute:file-text-line': 'fileText',
  'mingcute:filter-line': 'filter',
  'mingcute:history-line': 'history',
  'mingcute:lightning-line': 'lightning',
  'mingcute:loading-line': 'send',
  'mingcute:mail-line': 'mail',
  'mingcute:mail-open-line': 'mailOpen',
  'mingcute:more-2-line': 'more',
  'mingcute:pencil-line': 'pencil',
  'mingcute:question-line': 'question',
  'mingcute:scan-line': 'scan',
  'mingcute:send-plane-line': 'send',
  'mingcute:store-2-line': 'store',
  'mingcute:table-line': 'table',
  'mingcute:user-3-line': 'user',
}

const UiIcon = ({
  className = '',
  name,
  size,
}: {
  className?: string
  name: string
  size?: number
}) => {
  const key = legacyIconMap[name] || (name as keyof typeof iconMap)
  const Lucide = iconMap[key] || File
  return (
    <i
      aria-hidden='true'
      className={`inline-flex shrink-0 items-center justify-center leading-none ${className}`}
    >
      <Lucide size={size || 16} strokeWidth={2} />
    </i>
  )
}

const HeaderIconButton = ({
  children,
  title,
  onClick,
}: {
  children: ReactNode
  title: string
  onClick?: () => void
}) => (
  <button
    className='group grid size-[30px] place-items-center rounded-lg text-[var(--text2)] hover:bg-[var(--bg2)]'
    title={title}
    type='button'
    onClick={onClick}
  >
    {children}
  </button>
)

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now() + Math.random())
const asArray = (value?: string | string[]) =>
  Array.isArray(value) ? value : value ? [value] : []
const confidenceText = (value?: string | number) => {
  if (value === undefined || value === null || value === '') return '96%'
  return typeof value === 'number' ? `${value}%` : value
}

async function fetchAskAIAnswer(question: string): Promise<ApiAiPayload> {
  await new Promise((resolve) => setTimeout(resolve, 550))
  const q = question.toLowerCase()

  if (q.includes('insight') || q.includes('summar')) {
    return {
      actions: ['Full report', 'Copy', 'Export'],
      creditsRemaining: 14,
      insight: {
        stats: [
          { label: 'Total docs', n: '1,842' },
          { label: 'This month', n: '312' },
          { label: 'Email', n: '94' },
          { label: 'Scanned', n: '78' },
          { label: 'Workflow', n: '61' },
          { label: 'Unclassified', n: '14' },
        ],
        title: 'Archive insights · May 2026',
      },
      reply:
        'Archive insights for May 2026 — storage grew 18% MoM. 14 documents remain unclassified and 3 potential duplicates were detected.',
    }
  }

  if (q.includes('contract') || q.includes('q1') || q.includes('scanned')) {
    return {
      analysis: [
        {
          icon: 'mingcute:certificate-line',
          label: 'Document type',
          ok: true,
          value: 'Contract · 8 found',
        },
        {
          icon: 'mingcute:calendar-line',
          label: 'Date range',
          value: 'Jan – Mar 2025',
        },
        {
          icon: 'mingcute:scan-line',
          label: 'Source',
          ok: true,
          value: 'Scanner / OCR',
        },
      ],
      clarify: {
        options: ['All vendors', 'Hexaware', 'TCS', 'No filter'],
        question: 'Which department or vendor to filter by?',
      },
      creditsRemaining: 14,
      extraResults: [
        {
          confidence: '87%',
          icon: 'mingcute:file-certificate-line',
          name: 'VendorContract_TCS_Feb2025.pdf',
        },
        {
          confidence: '79%',
          icon: 'mingcute:file-certificate-line',
          name: 'ServiceAgreement_Infosys_Mar2025.pdf',
        },
      ],
      reply:
        'Found 8 scanned contracts from Q1 2025. Showing the highest-confidence result below.',
      result: {
        confidence: '91%',
        date: '06 Jan 2025',
        name: 'VendorContract_Hexaware_Jan2025.pdf',
        path: 'Legal / Contracts / 2025 / Q1',
        reason:
          'OCR matched contract, agreement, and terms in the Q1 date window.',
        source: 'Scanner + OCR import',
        type: 'PDF · Vendor contract',
      },
    }
  }

  if (q.includes('email') || q.includes('priya') || q.includes('onboarding')) {
    return {
      analysis: [
        {
          icon: 'mingcute:mail-open-line',
          label: 'Email source',
          ok: true,
          value: 'HR@company.com',
        },
        {
          icon: 'mingcute:user-3-line',
          label: 'Employee',
          ok: true,
          value: 'Priya Nair',
        },
        {
          icon: 'mingcute:building-2-line',
          label: 'Department',
          ok: true,
          value: 'HR / Onboarding',
        },
      ],
      clarify: {
        options: ['Jan–Mar 2025', 'Apr–Jun 2025', 'Last 30 days', 'Not sure'],
        question: 'When was this email received?',
      },
      creditsRemaining: 14,
      reply:
        'Found 1 onboarding document for Priya Nair from HR. Name matched in email subject, body, and metadata.',
      result: {
        confidence: '98%',
        date: '22 Mar 2025',
        name: 'Onboarding_PriyaNair_OfferLetter.docx',
        path: 'HR / Onboarding / 2025',
        reason:
          'Employee name matched in subject, body, and document metadata.',
        source: 'Email (HR@company.com)',
        type: 'DOCX · Offer letter',
      },
    }
  }

  return {
    analysis: [
      {
        icon: 'mingcute:bill-line',
        label: 'Document type',
        ok: true,
        value: 'GST invoice',
      },
      {
        icon: 'mingcute:store-2-line',
        label: 'Supplier',
        ok: true,
        value: 'Rajan Suppliers',
      },
      {
        icon: 'mingcute:mail-line',
        label: 'Source',
        ok: true,
        value: 'Email attachment',
      },
    ],
    clarify: {
      options: ['Email attachment', 'Manual upload', 'Any source'],
      question: 'Which source should I check first?',
    },
    creditsRemaining: 14,
    reply:
      'Found 2 matching GST invoices from Rajan Suppliers. The most recent one is shown below.',
    result: {
      confidence: '96%',
      date: '14 Feb 2025',
      name: 'GST_Invoice_RajanSuppliers_Feb2025.pdf',
      path: 'Finance / Supplier Invoices / 2025 / Feb',
      reason: 'Supplier name and invoice number matched via OCR extraction.',
      source: 'Email attachment',
      type: 'PDF · GST Invoice',
    },
  }
}

const SparkIcon = ({ small = false }: { small?: boolean }) => (
  <svg
    fill='none'
    height={small ? 18 : 44}
    viewBox='0 0 44 44'
    width={small ? 18 : 44}
    aria-hidden
  >
    <defs>
      <linearGradient
        gradientUnits='userSpaceOnUse'
        id={small ? 'sparkSmall' : 'sparkLarge'}
        x1='0'
        x2='44'
        y1='0'
        y2='44'
      >
        <stop offset='0%' stopColor='#9c40ff' />
        <stop offset='100%' stopColor='#448aff' />
      </linearGradient>
    </defs>
    <path
      d='M22 3L25.6 16.8L39.5 22L25.6 27.2L22 41L18.4 27.2L4.5 22L18.4 16.8L22 3Z'
      fill={`url(#${small ? 'sparkSmall' : 'sparkLarge'})`}
    />
    {!small && <circle cx='34' cy='8' fill='#c084fc' opacity='.7' r='3.5' />}
  </svg>
)

const AskAI = () => {
  const isOpen = useAskAIStore((state: any) => state.isOpen)
  const close = useAskAIStore((state: any) => state.close)

  const [view, setView] = useState<ViewMode>('chat')
  const [messages, setMessages] = useState<Message[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [credits, setCredits] = useState(15)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const hasMessages = messages.length > 0
  const canSend = input.trim().length > 0 && !busy

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy, view])

  const saveHistory = (
    nextMessages: Message[],
    creditsUsed: number,
    creditsRemaining: number,
  ) => {
    const firstUser = nextMessages.find((m) => m.role === 'user')
    const lastAi = [...nextMessages].reverse().find((m) => m.role === 'ai')
    if (!firstUser || !lastAi) return

    const sessionId = currentHistoryId || uid()
    if (!currentHistoryId) setCurrentHistoryId(sessionId)

    setHistory((prev) => {
      const existing = prev.find((item) => item.id === sessionId)
      const updatedItem: HistoryItem = {
        createdAt: existing?.createdAt || new Date().toLocaleString(),
        creditsRemaining,
        creditsUsed: (existing?.creditsUsed || 0) + creditsUsed,
        id: sessionId,
        messages: nextMessages.filter((m) => m.role !== 'status'),
        subtitle: lastAi.text,
        title: existing?.title || firstUser.text,
      }

      const withoutCurrent = prev.filter((item) => item.id !== sessionId)
      return [updatedItem, ...withoutCurrent].slice(0, 20)
    })
  }

  const newChat = () => {
    setMessages([])
    setCurrentHistoryId(null)
    setInput('')
    setBusy(false)
    setView('chat')
  }

  const openHistory = () => {
    setView('history')
  }

  const loadHistory = (item: HistoryItem) => {
    setMessages(item.messages)
    setCurrentHistoryId(item.id)
    setView('chat')
  }

  const sendMessage = async (value?: string) => {
    const text = (value ?? input).trim()
    if (!text || busy) return
    if (credits <= 0) return

    const userMessage: Message = { id: uid(), role: 'user', text }
    const statusMessage: Message = {
      id: uid(),
      role: 'status',
      text: 'Searching email index, OCR content and document metadata…',
    }
    const baseMessages = [...messages, userMessage]

    setMessages([...baseMessages, statusMessage])
    setInput('')
    setBusy(true)
    setView('chat')

    try {
      const payload = await fetchAskAIAnswer(text)
      const replyText =
        asArray(payload.reply || payload.text).join('\n') ||
        'I found matching documents based on your search.'
      const aiMessage: Message = {
        id: uid(),
        payload,
        role: 'ai',
        text: replyText,
      }
      const finalMessages = [...baseMessages, aiMessage]

      // One user message = one AI credit.
      // Do not depend on mock/API creditsRemaining here because sample payloads may always return 14.
      const creditsUsed = 1
      const nextCredits = Math.max(0, credits - creditsUsed)

      setMessages(finalMessages)
      saveHistory(finalMessages, creditsUsed, nextCredits)
      setCredits(nextCredits)
    } catch {
      setMessages([
        ...baseMessages,
        {
          id: uid(),
          role: 'ai',
          text: 'Unable to complete the AI search. Please check the API endpoint and try again.',
        },
      ])
    } finally {
      setBusy(false)
    }
  }

  const shellStyle = useMemo(
    () =>
      ({
        '--bg': '#ffffff',
        '--bg2': '#f7f7f7',
        '--bg3': '#f0eef8',
        '--border': '#e6e6e6',
        '--border2': '#d0d0d0',
        '--green': '#1a9e6e',
        '--green-bg': '#e6f7f2',
        '--purple': '#8300e6',
        '--purple-light': '#f3e8ff',
        '--spark1': '#7c4dff',
        '--teal': '#19c1d4',
        '--text1': '#1a1a1a',
        '--text2': '#4a4a4a',
        '--text3': '#9a9a9a',
      }) as CSSProperties,
    [],
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          animate={{ x: 0 }}
          className="fixed top-0 right-0 bottom-0 z-[9999] flex w-[420px] max-w-[calc(100vw-16px)] flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--bg)] font-['Inter',system-ui,sans-serif]"
          exit={{ x: 440 }}
          initial={{ x: 440 }}
          style={shellStyle}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <div className='flex shrink-0 items-center gap-2 border-b border-[var(--border)] px-4 pt-3.5 pb-3'>
            {view === 'history' ? (
              <HeaderIconButton
                title='Back to chat'
                onClick={() => setView('chat')}
              >
                <UiIcon
                  className='text-[var(--text2)] group-hover:text-[var(--text1)]'
                  name='back'
                  size={18}
                />
              </HeaderIconButton>
            ) : (
              <HeaderIconButton title='New chat' onClick={newChat}>
                <UiIcon
                  className='text-[var(--text2)] group-hover:text-[var(--text1)]'
                  name='add'
                  size={20}
                />
              </HeaderIconButton>
            )}

            <span className='flex-1 text-[15px] font-semibold tracking-[-.2px] text-[var(--text1)]'>
              {view === 'history' ? 'Chat History' : 'AI Chat'}
            </span>

            {view === 'history' ? (
              <HeaderIconButton title='New chat' onClick={newChat}>
                <UiIcon
                  className='text-[var(--text2)] group-hover:text-[var(--text1)]'
                  name='add'
                  size={20}
                />
              </HeaderIconButton>
            ) : (
              <HeaderIconButton title='Chat history' onClick={openHistory}>
                <UiIcon
                  className='text-[var(--text2)] group-hover:text-[var(--text1)]'
                  name='history'
                  size={16}
                />
              </HeaderIconButton>
            )}

            <HeaderIconButton title='Close' onClick={close}>
              <UiIcon
                className='text-[var(--text2)] group-hover:text-[var(--text1)]'
                name='close'
                size={16}
              />
            </HeaderIconButton>
          </div>

          <div className='min-h-0 flex-1 overflow-y-auto scroll-smooth'>
            {view === 'history' ? (
              <HistoryView
                history={history}
                onLoad={loadHistory}
                onNewChat={newChat}
              />
            ) : !hasMessages ? (
              <WelcomeView onSend={sendMessage} />
            ) : (
              <div className='pb-2'>
                {messages.map((msg) => (
                  <ChatMessage key={msg.id} msg={msg} />
                ))}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {view === 'chat' && (
            <>
              <div className='shrink-0 border-t border-[var(--border)] bg-[var(--bg)] px-4 pt-2.5 pb-2'>
                <div className='mb-2 text-[12.5px] text-[var(--text2)]'>
                  <strong className='text-[var(--text1)]'>{credits}</strong> of{' '}
                  <strong className='text-[var(--text1)]'>15</strong> calls
                  remaining ·{' '}
                  <button
                    className='font-medium text-[var(--purple)]'
                    type='button'
                  >
                    Upgrade
                  </button>
                </div>
              </div>

              <div className='shrink-0 bg-[var(--bg)] px-4 pb-3.5'>
                <div className='overflow-hidden rounded-[14px] border border-[var(--border2)] bg-[var(--bg2)] focus-within:border-[var(--purple)] focus-within:shadow-[0_0_0_3px_rgba(131,0,230,.07)]'>
                  <div className='px-3.5 pt-2.5 pb-1'>
                    <textarea
                      className='max-h-[100px] min-h-[34px] w-full resize-none bg-transparent text-[13.5px] leading-[1.5] text-[var(--text1)] outline-none placeholder:text-[var(--text3)]'
                      placeholder='Ask me anything ...'
                      rows={1}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          sendMessage()
                        }
                      }}
                    />
                  </div>

                  <div className='flex items-center gap-1.5 px-2 pb-2'>
                    <button
                      className='grid size-8 place-items-center rounded-[9px] border border-[var(--border2)] bg-[var(--bg)] text-[var(--text2)] hover:bg-[var(--bg3)]'
                      title='Attach file'
                      type='button'
                    >
                      <UiIcon
                        className='size-4'
                        name='mingcute:attachment-line'
                      />
                    </button>
                    <button
                      className='flex h-8 items-center gap-1 rounded-[9px] border border-[var(--border2)] bg-[var(--bg)] px-2.5 text-[12.5px] font-medium text-[var(--text1)] hover:bg-[var(--bg3)]'
                      type='button'
                    >
                      All{' '}
                      <UiIcon
                        className='size-3.5 text-[var(--text3)]'
                        name='mingcute:down-line'
                      />
                    </button>
                    <div className='flex-1' />
                    <button
                      className={`grid size-8 place-items-center rounded-[9px] border transition ${canSend ? 'border-[var(--spark1)] bg-[var(--spark1)] text-white' : 'border-[var(--border2)] bg-[var(--bg3)] text-[var(--text3)] opacity-70'}`}
                      disabled={!canSend}
                      title='Send'
                      type='button'
                      onClick={() => sendMessage()}
                    >
                      <UiIcon
                        className='size-4'
                        name='mingcute:send-plane-line'
                      />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

const WelcomeView = ({ onSend }: { onSend: (value: string) => void }) => (
  <div className='px-5 pt-7 pb-4'>
    <div className='mb-[18px] grid size-11 place-items-center'>
      <SparkIcon />
    </div>
    <h2 className='mb-2 text-[19px] font-bold tracking-[-.3px] text-[var(--text1)]'>
      How can I assist you?
    </h2>
    <p className='mb-[22px] text-[13.5px] leading-[1.55] text-[var(--text2)]'>
      Here are a few things I can do, or ask me anything!
    </p>
    <div className='flex flex-col'>
      {suggestions.map((item) => (
        <button
          className='flex items-center gap-3 border-b border-[var(--border)] px-1 py-[13px] text-left text-[13.5px] leading-[1.4] text-[var(--text1)] hover:rounded-[10px] hover:bg-[var(--bg2)]'
          key={item.query}
          type='button'
          onClick={() => onSend(item.query)}
        >
          <UiIcon
            className='size-[15px] shrink-0 text-[var(--text3)]'
            name='mingcute:arrow-right-line'
          />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  </div>
)

const HistoryView = ({
  history,
  onLoad,
  onNewChat,
}: {
  history: HistoryItem[]
  onLoad: (item: HistoryItem) => void
  onNewChat: () => void
}) => (
  <div className='px-4 py-4'>
    {history.length === 0 ? (
      <div className='flex h-[calc(100vh-110px)] flex-col items-center justify-center text-center'>
        <div className='mb-3 grid size-12 place-items-center rounded-2xl bg-[var(--purple-light)] text-[var(--purple)]'>
          <UiIcon name='history' size={22} />
        </div>
        <div className='text-[15px] font-semibold text-[var(--text1)]'>
          No chat history yet
        </div>
        <p className='mt-1 max-w-[300px] text-[12.5px] leading-5 text-[var(--text2)]'>
          Start a new AI conversation. Completed searches will appear here in
          the same panel area.
        </p>
        <button
          className='mt-4 rounded-lg bg-[var(--spark1)] px-4 py-2 text-xs font-semibold text-white'
          type='button'
          onClick={onNewChat}
        >
          Start new chat
        </button>
      </div>
    ) : (
      <div className='space-y-2'>
        <div className='mb-3 text-[12px] font-semibold tracking-[.4px] text-[var(--text3)] uppercase'>
          Recent conversations
        </div>
        {history.map((item) => (
          <button
            className='w-full rounded-[14px] border border-[var(--border)] bg-white p-3 text-left transition hover:border-[var(--purple)] hover:bg-[var(--purple-light)]'
            key={item.id}
            type='button'
            onClick={() => onLoad(item)}
          >
            <div className='mb-1 flex items-center gap-2'>
              <UiIcon
                className='text-[var(--purple)]'
                name='history'
                size={15}
              />
              <span className='min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--text1)]'>
                {item.title}
              </span>
            </div>
            <div className='line-clamp-2 text-[12px] leading-5 text-[var(--text2)]'>
              {item.subtitle}
            </div>
            <div className='mt-3 flex items-center justify-between gap-2'>
              <div className='text-[10.5px] text-[var(--text3)]'>
                {item.createdAt}
              </div>
              <div className='flex shrink-0 items-center gap-1 rounded-full border border-[#d8cef5] bg-[#f0ebff] px-2 py-1 text-[10.5px] font-semibold text-[var(--spark1)]'>
                <UiIcon className='size-3' name='mingcute:lightning-line' />
                {item.creditsUsed} credit{item.creditsUsed > 1 ? 's' : ''} used
              </div>
            </div>
            <div className='mt-1 text-[10.5px] text-[var(--text3)]'>
              {item.creditsRemaining} credits remaining after this chat
            </div>
          </button>
        ))}
      </div>
    )}
  </div>
)

const ChatMessage = ({ msg }: { msg: Message }) => {
  if (msg.role === 'status') {
    return (
      <div className='px-[18px] py-3'>
        <div className='flex items-start gap-2.5'>
          <div className='mt-1 grid size-6 shrink-0 place-items-center'>
            <SparkIcon small />
          </div>
          <div className='flex items-center gap-2 pt-0.5 text-[12.5px] text-[var(--text2)] italic'>
            <span className='size-[7px] animate-pulse rounded-full bg-[var(--spark1)]' />
            {msg.text}
          </div>
        </div>
      </div>
    )
  }

  if (msg.role === 'user') {
    return (
      <div className='px-[18px] py-3'>
        <div className='mb-[6px] flex items-start gap-[9px]'>
          <div className='mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-[var(--border2)] bg-[var(--bg)] text-[var(--text3)]'>
            <UiIcon className='size-3' name='mingcute:pencil-line' />
          </div>
          <div className='max-w-[88%] rounded-[4px_16px_16px_16px] border border-[#e4e2ec] bg-[#f1f0f5] px-3.5 py-2 text-[13.5px] leading-[1.55] text-[var(--text1)]'>
            {msg.text}
          </div>
        </div>
      </div>
    )
  }

  const payload = msg.payload
  const paragraphs = msg.text.split('\n').filter(Boolean)

  return (
    <div className='px-[18px] py-3'>
      <div className='flex items-start gap-2.5'>
        <div className='mt-1 grid size-6 shrink-0 place-items-center'>
          <SparkIcon small />
        </div>
        <div className='min-w-0 flex-1 pt-0.5 text-[13.5px] leading-[1.72] text-[var(--text1)]'>
          {payload?.clarify && <ClarifyCard clarify={payload.clarify} />}
          {payload?.analysis?.length ? (
            <AnalysisRibbon rows={payload.analysis} />
          ) : null}
          {paragraphs.map((p, i) => (
            <p className='mb-2.5' key={`${p}-${i}`}>
              {p}
            </p>
          ))}
          {payload?.result && <FileCard result={payload.result} />}
          {payload?.extraResults?.length ? (
            <ExtraResults results={payload.extraResults} />
          ) : null}
          {payload?.insight?.stats?.length ? (
            <InsightCard insight={payload.insight} />
          ) : null}
          {payload?.attachments && (
            <AttachmentSection attachments={payload.attachments} />
          )}
          <ActionRow
            actions={payload?.actions}
            insight={Boolean(payload?.insight)}
          />
          <div className='mt-3 flex items-center justify-center gap-1 border-t border-[var(--border)] pt-2 text-[11px] text-[var(--text3)]'>
            <UiIcon
              className='size-3 text-[#b090e0]'
              name='mingcute:lightning-line'
            />
            <span className='rounded border border-[#d8cef5] bg-[#f0ebff] px-1.5 py-0.5 text-[9.5px] font-semibold text-[var(--spark1)]'>
              EZOFIS Search AI
            </span>
            <span>· 1 call used</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const ClarifyCard = ({ clarify }: { clarify: Clarify }) => {
  const [picked, setPicked] = useState('')
  if (!clarify.question && !clarify.options?.length) return null

  return (
    <div className='mb-2.5 overflow-hidden rounded-[14px] border border-[var(--border)]'>
      <div className='flex items-center gap-1.5 border-b border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-[10.5px] font-medium tracking-[.4px] text-[var(--text2)] uppercase'>
        <UiIcon
          className='size-3 text-[var(--purple)]'
          name='mingcute:question-line'
        />{' '}
        Quick clarification
      </div>
      {clarify.question && (
        <div className='border-b border-[var(--border)] px-3 py-2.5 text-[13px] leading-[1.5]'>
          {clarify.question}
        </div>
      )}
      <div className='flex flex-wrap gap-1.5 px-3 py-2.5'>
        {(clarify.options || []).map((item) => (
          <button
            className={`rounded-full border px-3 py-1.5 text-xs ${picked === item ? 'border-[var(--purple)] bg-[var(--purple-light)] text-[var(--purple)]' : 'border-[var(--border2)] bg-white text-[var(--text1)] hover:border-[var(--purple)] hover:bg-[var(--purple-light)] hover:text-[var(--purple)]'}`}
            key={item}
            type='button'
            onClick={() => setPicked(item)}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  )
}

const AnalysisRibbon = ({ rows }: { rows: AnalysisRow[] }) => (
  <div className='mb-2.5 overflow-hidden rounded-[14px] border border-[var(--border)]'>
    <div className='flex items-center gap-1.5 border-b border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-[10px] font-medium tracking-[.5px] text-[var(--text2)] uppercase'>
      <span className='size-1.5 rounded-full bg-[var(--teal)]' /> Archive match
      analysis
    </div>
    {rows.map((row, index) => (
      <div
        className='flex items-center justify-between border-b border-[var(--border)] px-3 py-2 last:border-b-0'
        key={`${row.label}-${index}`}
      >
        <div className='flex items-center gap-1.5 text-[12.5px] text-[var(--text2)]'>
          <UiIcon
            className='size-3.5 text-[var(--purple)]'
            name={row.icon || 'mingcute:check-circle-line'}
          />
          {row.label || 'Match'}
        </div>
        <div
          className={`text-[11.5px] font-medium ${row.ok ? 'text-[var(--green)]' : 'text-[var(--teal)]'}`}
        >
          {row.value || '-'}
        </div>
      </div>
    ))}
  </div>
)

const FileCard = ({ result }: { result: FileResult }) => (
  <div className='mt-2.5 overflow-hidden rounded-[14px] border border-[var(--border)]'>
    <div className='flex items-center gap-2.5 border-b border-[var(--border)] px-3 py-2.5'>
      <div className='grid size-[30px] shrink-0 place-items-center rounded-lg border border-[rgba(131,0,230,.15)] bg-[var(--purple-light)] text-[var(--purple)]'>
        <UiIcon className='size-4' name='mingcute:file-text-line' />
      </div>
      <div className='min-w-0 flex-1'>
        <div className='text-xs leading-[1.4] font-medium break-all text-[var(--text1)]'>
          {result.name || 'Document.pdf'}
        </div>
        <div className='mt-0.5 truncate text-[10.5px] text-[var(--text3)]'>
          {result.path || 'Repository / Documents'}
        </div>
      </div>
      <div className='shrink-0 rounded-full border border-[rgba(26,158,110,.2)] bg-[var(--green-bg)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--green)]'>
        {confidenceText(result.confidence)}
      </div>
    </div>
    <div className='grid grid-cols-2'>
      <MetaCell label='Type' value={result.type || 'PDF · Document'} />
      <MetaCell label='Date' value={result.date || '-'} />
      <div className='col-span-2'>
        <MetaCell label='Source' value={result.source || '-'} noRightBorder />
      </div>
    </div>
    <div className='flex items-start gap-2.5 border-t border-[var(--border)] bg-[var(--bg2)] px-3 py-2.5'>
      <div className='flex min-w-0 flex-1 items-start gap-1.5 text-[11.5px] leading-[1.45] text-[var(--text2)]'>
        <UiIcon
          className='mt-0.5 size-3 text-[var(--teal)]'
          name='mingcute:bulb-line'
        />
        <span>
          {result.reason || 'Matched using metadata and OCR extraction.'}
        </span>
      </div>
      <button
        className='flex shrink-0 items-center gap-1 rounded-md border border-[rgba(131,0,230,.3)] bg-white px-2.5 py-1.5 text-[11.5px] font-medium text-[var(--purple)] hover:bg-[var(--purple-light)]'
        type='button'
        onClick={() => result.url && window.open(result.url, '_blank')}
      >
        <UiIcon className='size-3' name='mingcute:external-link-line' />
        Open
      </button>
    </div>
  </div>
)

const MetaCell = ({
  label,
  noRightBorder,
  value,
}: {
  label: string
  noRightBorder?: boolean
  value: string
}) => (
  <div
    className={`border-b border-[var(--border)] px-3 py-2 ${noRightBorder ? '' : 'border-r'}`}
  >
    <div className='mb-0.5 text-[10px] tracking-[.3px] text-[var(--text3)] uppercase'>
      {label}
    </div>
    <div className='text-xs text-[var(--text1)]'>{value}</div>
  </div>
)

const ExtraResults = ({ results }: { results: ExtraResult[] }) => (
  <div className='mt-2 flex flex-col gap-1.5'>
    <div className='mb-0.5 text-[11px] text-[var(--text3)]'>
      {results.length} more matching file{results.length > 1 ? 's' : ''}:
    </div>
    {results.map((item, index) => (
      <button
        className='flex items-center gap-2 rounded-[10px] border border-[var(--border)] bg-white px-2.5 py-2 hover:border-[var(--purple)] hover:bg-[var(--purple-light)]'
        key={`${item.name}-${index}`}
        type='button'
        onClick={() => item.url && window.open(item.url, '_blank')}
      >
        <span className='grid size-[26px] shrink-0 place-items-center rounded-md border border-[rgba(131,0,230,.12)] bg-[var(--purple-light)] text-[var(--purple)]'>
          <UiIcon
            className='size-3.5'
            name={item.icon || 'mingcute:file-line'}
          />
        </span>
        <span className='min-w-0 flex-1 truncate text-left text-[11.5px] font-medium text-[var(--text1)]'>
          {item.name || 'Document'}
        </span>
        <span className='shrink-0 rounded-xl bg-[var(--green-bg)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--green)]'>
          {confidenceText(item.confidence)}
        </span>
      </button>
    ))}
  </div>
)

const InsightCard = ({
  insight,
}: {
  insight: NonNullable<ApiAiPayload['insight']>
}) => (
  <div className='mt-2.5 overflow-hidden rounded-[14px] border border-[var(--border)]'>
    <div className='flex items-center gap-1.5 border-b border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-[10px] font-medium tracking-[.5px] text-[var(--text2)] uppercase'>
      <UiIcon
        className='size-3 text-[var(--purple)]'
        name='mingcute:chart-bar-line'
      />
      {insight.title || 'Archive insights'}
    </div>
    <div className='grid grid-cols-3'>
      {(insight.stats || []).map((s, index) => (
        <div
          className='border-r border-b border-[var(--border)] px-3 py-2.5'
          key={`${s.label}-${index}`}
        >
          <div className='text-[17px] font-semibold text-[var(--purple)]'>
            {s.n}
          </div>
          <div className='mt-0.5 text-[10.5px] text-[var(--text2)]'>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  </div>
)

const AttachmentSection = ({ attachments }: { attachments: Attachments }) => {
  const groups = (
    [
      ['DOCX', attachments.docx ?? [], 'mingcute:file-text-line'],
      ['Excel', attachments.excel ?? [], 'mingcute:table-line'],
      ['PDF', attachments.pdf ?? [], 'mingcute:file-pdf-line'],
      ['Other', attachments.other ?? [], 'mingcute:attachment-line'],
    ] satisfies Array<[string, AttachmentItem[], string]>
  ).filter(([, items]) => items.length > 0)

  if (!groups.length) return null

  return (
    <div className='mt-3'>
      <p className='mb-2 text-[12.5px] leading-[1.55]'>
        Documents attached or mentioned in the email thread:
      </p>
      {groups.map(([label, items, icon]) => (
        <div className='mb-2' key={label}>
          <div className='mb-1 flex items-center gap-1 text-[11px] font-semibold tracking-[.4px] text-[var(--text2)] uppercase'>
            <UiIcon className='size-3 text-[var(--purple)]' name={icon} />
            {label}
          </div>
          {items.map((item, index) => (
            <div key={`${item.file}-${index}`}>
              <button
                className='mb-1 flex w-full items-center gap-1.5 rounded-md border border-[#ddd6f3] bg-[#f4f0ff] px-2.5 py-1.5 text-left font-mono text-[11.5px] text-[#3a2070] hover:bg-[#ece4ff]'
                type='button'
                onClick={() => item.url && window.open(item.url, '_blank')}
              >
                <UiIcon
                  className='size-3 shrink-0 text-[var(--purple)]'
                  name='mingcute:attachment-line'
                />
                <span className='min-w-0 flex-1 truncate'>{item.file}</span>
                {item.cite && (
                  <sup className='text-[8.5px] font-bold text-[#448aff]'>
                    {item.cite}
                  </sup>
                )}
              </button>
              {item.meta && (
                <div className='mb-1 pl-0.5 text-[11px] text-[var(--text3)]'>
                  ({item.meta})
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

const ActionRow = ({
  actions,
  insight,
}: {
  actions?: string[]
  insight?: boolean
}) => {
  const finalActions = actions?.length
    ? actions
    : insight
      ? ['Full report', 'Copy', 'Export']
      : ['All results', 'Refine', 'Copy', 'Export']
  const actionIcons: Record<string, string> = {
    'All results': 'mingcute:copy-2-line',
    'Copy': 'mingcute:copy-line',
    'Export': 'mingcute:download-line',
    'Full report': 'mingcute:chart-line',
    'Refine': 'mingcute:filter-line',
  }

  return (
    <div className='mt-3 flex flex-wrap items-center gap-1.5'>
      {finalActions.map((label) => (
        <button
          className='flex items-center gap-1 rounded-full border border-[var(--border)] bg-white px-2.5 py-1 text-[11.5px] text-[var(--text2)] hover:border-[var(--purple)] hover:bg-[var(--purple-light)] hover:text-[var(--purple)]'
          key={label}
          type='button'
        >
          <UiIcon
            className='size-3'
            name={actionIcons[label] || 'mingcute:more-2-line'}
          />
          {label}
        </button>
      ))}
    </div>
  )
}

AskAI.displayName = 'AskAI'
export default AskAI
