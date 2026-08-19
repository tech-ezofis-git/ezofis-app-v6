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
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  ScanLine,
  Send,
  Bot,
  Store,
  Table2,
  Trash2,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { WorkflowChatPage } from '@/pages/workflow-chat/WorkflowChatPage'
import {
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import Tooltip from '@/components/base/Tooltip'
import AiBrandIcon from '../AiBrandIcon'
import Icon from '@/components/base/icon/Icon'
import {
  browseFilterByToUiFilters,
  hasBrowsableAction,
  postChatbotMessage,
  resolveAskAiPageContext,
} from './chatbotApi'
import useAskAiActionStore from './stores/useAskAiActionStore'
import useAskAIStore from './stores/useAskAIStore'
import type {
  AskAiAnswer,
  AskAiActionContext,
  AskAiBrowseRequest,
  AskAiCard,
  AskAiCtaMode,
  AskAiTextBlock as TextBlock,
} from './types'
import type { WorkflowHistoryData } from '@/pages/workflow-chat/WorkflowChatPage'

type HistoryItem = {
  createdAt: string
  creditsRemaining: number
  creditsUsed: number
  id: string
  messages: Message[]
  subtitle: string
  title: string
  isWorkflow?: boolean
  workflowState?: WorkflowHistoryData
}

type Message = {
  actionContext?: AskAiActionContext
  actionTo?: string
  blocks?: TextBlock[]
  browseRequest?: AskAiBrowseRequest
  ctaMode?: AskAiCtaMode | null
  id: string
  isTyping?: boolean
  revealExtras?: boolean
  role: Role
  text: string
}

type Role = 'user' | 'ai' | 'status'

const AI_STATUS_WORDS = [
  'Thinking…',
  'Working…',
  'Finding…',
  'Analyzing…',
  'Reasoning…',
  'Searching…',
  'Generating…',
]

type ViewMode = 'chat' | 'history'

const suggestions = [
  {
    description: 'Provide details and send for approval',
    label: 'Submit a new request',
    query: 'Initiate workflow',
  },
  {
    description: "Check status of requests you've submitted",
    label: 'Track my requests',
    query: 'Show my pending requests',
  },
  {
    description: 'Find files by name, folder, or content',
    label: 'Search my documents',
    query: 'Search my documents',
  },
]

const paragraphTextFromBlocks = (blocks: TextBlock[]) =>
  blocks
    .filter(
      (b): b is Extract<TextBlock, { type: 'paragraph' }> =>
        b.type === 'paragraph',
    )
    .map((b) => b.text)
    .join('\n')

function resolveCtaMode(
  answer: AskAiAnswer,
  pathname: string,
  currentSpecificId: string,
): AskAiCtaMode | null {
  if (!hasBrowsableAction(answer)) return null

  const target = String(answer.actionTo || '').toLowerCase()
  const browse = answer.action?.browse_request
  const filters = browseFilterByToUiFilters(browse?.filterBy)
  if (!Object.keys(filters).length && target !== 'repository' && target !== 'workflow') {
    return null
  }

  if (target === 'repository') {
    const repoId = String(
      answer.actionContext?.repositoryId ?? browse?.repositoryId ?? '',
    ).trim()
    const onFolders = pathname.startsWith('/folders')
    const sameRepo =
      onFolders &&
      repoId &&
      currentSpecificId &&
      String(currentSpecificId).toLowerCase() === repoId.toLowerCase()
    return sameRepo ? 'apply' : 'navigate'
  }

  if (target === 'workflow') {
    const onWorkflows = pathname.startsWith('/workflows')
    return onWorkflows ? 'apply' : 'navigate'
  }

  return null
}

async function fetchAskAIAnswer(
  question: string,
  pageContext: { actionFrom: string; specificId: string },
): Promise<AskAiAnswer> {
  return postChatbotMessage(question, pageContext)
}


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
  maximize: Maximize2,
  minimize: Minimize2,
  more: MoreHorizontal,
  pdf: FileText,
  pencil: Pencil,
  question: BadgeHelp,
  scan: ScanLine,
  send: Send,
  store: Store,
  table: Table2,
  trash: Trash2,
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
  'mingcute:maximize-line': 'maximize',
  'mingcute:minimize-line': 'minimize',
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
  disabled,
  title,
  onClick,
}: {
  children: ReactNode
  disabled?: boolean
  title: string
  onClick?: () => void
}) => (
  <Tooltip content={title} position='bottom'>
    <button
      aria-label={title}
      className='group grid size-[30px] place-items-center rounded-lg text-[var(--text2)] hover:bg-[var(--bg2)] disabled:pointer-events-none disabled:opacity-40'
      disabled={disabled}
      type='button'
      onClick={onClick}
    >
      {children}
    </button>
  </Tooltip>
)

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now() + Math.random())

const SparkIconLoading = ({ className = 'size-[18px]' }: { className?: string }) => (
  <motion.div
    className='inline-flex text-[var(--primary-9)]'
    transition={{ duration: 1.6, ease: 'easeInOut', repeat: Infinity }}
    animate={{
      opacity: [0.55, 1, 0.55],
      rotate: [0, 8, -8, 0],
      scale: [0.92, 1.12, 0.92],
    }}
  >
    <AiBrandIcon className={className} />
  </motion.div>
)

const useAiStatusWord = (active: boolean) => {
  const [statusIndex, setStatusIndex] = useState(0)

  useEffect(() => {
    if (!active) {
      setStatusIndex(0)
      return
    }
    const timer = window.setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % AI_STATUS_WORDS.length)
    }, 1300)
    return () => window.clearInterval(timer)
  }, [active])

  return active ? AI_STATUS_WORDS[statusIndex] : null
}

const CallingLoader = () => (
  <div className='px-[18px] py-4'>
    <div className='flex items-center gap-2.5'>
      <div className='shrink-0 text-[var(--text2)]'>
        <Bot size={16} strokeWidth={1.75} />
      </div>
      <div className='flex items-center gap-1.5'>
        {[0, 1, 2].map((dot) => (
          <motion.span
            animate={{ opacity: [0.35, 1, 0.35], y: [0, -3, 0] }}
            className='size-2 rounded-full bg-[var(--text3)]'
            key={dot}
            transition={{
              delay: dot * 0.16,
              duration: 0.7,
              ease: 'easeInOut',
              repeat: Infinity,
            }}
          />
        ))}
      </div>
    </div>
  </div>
)

const TypewriterReply = ({
  text,
  onComplete,
  onProgress,
}: {
  text: string
  onComplete?: () => void
  onProgress?: () => void
}) => {
  const [count, setCount] = useState(0)
  const completedRef = useRef(false)

  useEffect(() => {
    completedRef.current = false
    setCount(0)
    // ~2-3.5s typed reply depending on length (not instant)
    const step = Math.max(1, Math.ceil(text.length / 160))
    const timer = window.setInterval(() => {
      setCount((prev) => {
        if (prev >= text.length) {
          window.clearInterval(timer)
          return prev
        }
        return Math.min(text.length, prev + step)
      })
    }, 28)

    return () => window.clearInterval(timer)
  }, [text])

  useEffect(() => {
    if (count > 0) onProgress?.()
    if (count >= text.length && text.length > 0 && !completedRef.current) {
      completedRef.current = true
      // Brief pause before cards start appearing
      window.setTimeout(() => onComplete?.(), 280)
    }
  }, [count, onComplete, onProgress, text.length])

  return (
    <span>
      {text.slice(0, count)}
      {count < text.length && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          className='ml-0.5 inline-block h-[14px] w-[2px] translate-y-[2px] bg-[var(--spark1)] align-middle'
          transition={{ duration: 0.55, ease: 'easeInOut', repeat: Infinity }}
        />
      )}
    </span>
  )
}

const StaggeredCards = ({
  items,
  onProgress,
}: {
  items: ReactElement[]
  onProgress?: () => void
}) => {
  const [visibleCount, setVisibleCount] = useState(0)
  const itemsKey = items.length

  useEffect(() => {
    setVisibleCount(0)
  }, [itemsKey])

  useEffect(() => {
    if (visibleCount >= items.length) return
    const timer = window.setTimeout(
      () => {
        setVisibleCount((prev) => prev + 1)
        onProgress?.()
      },
      visibleCount === 0 ? 120 : 380,
    )
    return () => window.clearTimeout(timer)
  }, [items.length, onProgress, visibleCount])

  return (
    <div className='flex flex-col'>
      {items.slice(0, visibleCount).map((item, index) => (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 12 }}
          key={item.key ?? index}
          transition={{ duration: 0.32, ease: 'easeOut' }}
        >
          {item}
        </motion.div>
      ))}
    </div>
  )
}

const AskAI = () => {
  const isOpen = useAskAIStore((state: any) => state.isOpen)
  const isMaximized = useAskAIStore((state: any) => state.isMaximized)
  const toggleMaximize = useAskAIStore((state: any) => state.toggleMaximize)
  const close = useAskAIStore((state: any) => state.close)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const pageContext = useAskAiActionStore((state) => state.pageContext)
  const setPending = useAskAiActionStore((state) => state.setPending)

  const [view, setView] = useState<ViewMode>('chat')
  const [messages, setMessages] = useState<Message[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [credits, setCredits] = useState(15)
  const [isWorkflowMode, setIsWorkflowMode] = useState(false)
  const [initialWorkflowAction, setInitialWorkflowAction] = useState<string | undefined>()
  const [currentWorkflowHistoryData, setCurrentWorkflowHistoryData] = useState<WorkflowHistoryData | undefined>()
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const hasMessages = messages.length > 0
  const canSend = input.trim().length > 0 && !busy
  const aiStatusWord = useAiStatusWord(busy && view === 'chat')
  const resolvedPageContext = useMemo(
    () => resolveAskAiPageContext(pathname, pageContext),
    [pageContext, pathname],
  )

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
        messages: nextMessages
          .filter((m) => m.role !== 'status')
          .map(
            ({
              isTyping: _isTyping,
              revealExtras: _revealExtras,
              ...rest
            }) => ({
              ...rest,
              revealExtras: true,
            }),
          ),
        subtitle: lastAi.text,
        title: existing?.title || firstUser.text,
      }

      const withoutCurrent = prev.filter((item) => item.id !== sessionId)
      return [updatedItem, ...withoutCurrent].slice(0, 20)
    })
  }

  const clearChat = () => {
    setMessages([])
    setCurrentHistoryId(null)
    setInput('')
    setBusy(false)
    setView('chat')
    setIsWorkflowMode(false)
    setCurrentWorkflowHistoryData(undefined)
  }

  const openHistory = () => {
    setView('history')
  }

  const loadHistory = (item: HistoryItem) => {
    if (item.isWorkflow) {
      setCurrentWorkflowHistoryData(item.workflowState)
      setCurrentHistoryId(item.id)
      setIsWorkflowMode(true)
      setView('chat')
      return
    }

    setMessages(
      item.messages.map((m) => ({ ...m, isTyping: false, revealExtras: true })),
    )
    setCurrentHistoryId(item.id)
    setIsWorkflowMode(false)
    setCurrentWorkflowHistoryData(undefined)
    setView('chat')
  }

  const saveWorkflowHistory = (workflowState: WorkflowHistoryData) => {
    const sessionId = currentHistoryId || uid()
    if (!currentHistoryId) setCurrentHistoryId(sessionId)

    // Find the last assistant message or user message for subtitle
    const lastMsg = [...workflowState.messages].reverse().find(m => m.textContent || m.htmlContent)
    let subtitleText = lastMsg?.textContent || lastMsg?.htmlContent || 'Workflow Assistant'
    // clean up html tags for subtitle if needed
    subtitleText = subtitleText.replace(/<[^>]*>?/gm, '').substring(0, 80)

    setHistory((prev) => {
      const existing = prev.find((item) => item.id === sessionId)
      const updatedItem: HistoryItem = {
        createdAt: existing?.createdAt || new Date().toLocaleString(),
        creditsRemaining: existing?.creditsRemaining || 15,
        creditsUsed: existing?.creditsUsed || 0,
        id: sessionId,
        messages: [],
        subtitle: subtitleText,
        title: existing?.title || workflowState.activeWorkflow?.name || 'Workflow Chat',
        isWorkflow: true,
        workflowState
      }

      const withoutCurrent = prev.filter((item) => item.id !== sessionId)
      return [updatedItem, ...withoutCurrent].slice(0, 20)
    })
  }

  const finishTyping = (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, isTyping: false, revealExtras: true } : m,
      ),
    )
  }

  const applyAnswerAction = (msg: Message) => {
    const target = String(msg.actionTo || '').toLowerCase()
    if (target !== 'repository' && target !== 'workflow') return

    const browse = msg.browseRequest
    const filters = browseFilterByToUiFilters(browse?.filterBy)
    const repositoryId = String(
      msg.actionContext?.repositoryId ?? browse?.repositoryId ?? '',
    ).trim()
    const workflowId = String(msg.actionContext?.workflowId ?? '').trim()

    if (target === 'repository') {
      setPending({
        filters,
        repositoryId,
        repositoryLabel: 'Repository',
        target: 'Repository',
      })
      if (!pathname.startsWith('/folders')) {
        void navigate({ to: '/folders' })
      }
      return
    }

    setPending({
      filters,
      target: 'Workflow',
      workflowId,
    })
    if (!pathname.startsWith('/workflows')) {
      void navigate({ to: '/workflows' })
    }
  }

  const sendMessage = async (value?: string) => {
    const text = (value ?? input).trim()
    if (!text || busy) return
    if (credits <= 0) return

    const lowerText = text.toLowerCase()
    if (lowerText === 'initiate workflow' || lowerText === 'show my pending requests') {
      setInitialWorkflowAction(text)
      setIsWorkflowMode(true)
      setInput('')
      setView('chat')
      return
    }

    if (
      lowerText === 'search my documents' ||
      lowerText === 'find open documents and requests'
    ) {
      const userMsg: Message = {
        id: uid(),
        role: 'user',
        text: 'Search my documents',
      }
      const aiPromptMsg: Message = {
        id: uid(),
        isTyping: false,
        revealExtras: true,
        role: 'ai',
        text: 'What document, folder, or keyword would you like to search for?',
      }
      setMessages((prev) => [
        ...prev.filter((m) => m.role !== 'status'),
        userMsg,
        aiPromptMsg,
      ])
      setInput('')
      setView('chat')
      return
    }

    const userMessage: Message = { id: uid(), role: 'user', text }
    const baseMessages = [
      ...messages.filter((m) => m.role !== 'status'),
      userMessage,
    ]

    setMessages(baseMessages)
    setInput('')
    setBusy(true)
    setView('chat')

    try {
      // Keep loading (border loop) for at least 4s so answers are not instant
      const answer = await Promise.all([
        fetchAskAIAnswer(text, resolvedPageContext),
        new Promise<void>((resolve) => {
          window.setTimeout(resolve, 4000)
        }),
      ]).then(([result]) => result)

      const blocks = Array.isArray(answer.text?.blocks)
        ? answer.text.blocks
        : []
      const replyText =
        paragraphTextFromBlocks(blocks) ||
        'I found matching documents based on your search.'
      const ctaMode = resolveCtaMode(
        answer,
        pathname,
        resolvedPageContext.specificId,
      )
      const aiMessage: Message = {
        actionContext: answer.actionContext,
        actionTo: answer.actionTo,
        blocks,
        browseRequest: answer.action?.browse_request,
        ctaMode,
        id: uid(),
        isTyping: true,
        revealExtras: false,
        role: 'ai',
        text: replyText,
      }
      const finalMessages = [...baseMessages, aiMessage]

      // One user message = one AI credit.
      const creditsUsed = 1
      const nextCredits = Math.max(0, credits - creditsUsed)

      setMessages(finalMessages)
      saveHistory(finalMessages, creditsUsed, nextCredits)
      setCredits(nextCredits)
    } catch (error) {
      // Still respect the minimum wait feel on errors
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 1200)
      })
      const detail =
        error instanceof Error && error.message
          ? error.message
          : 'Please check the chatbot API and try again.'
      setMessages([
        ...baseMessages,
        {
          id: uid(),
          isTyping: true,
          revealExtras: false,
          role: 'ai',
          text: `Unable to complete the AI search. ${detail}`,
        },
      ])
    } finally {
      setBusy(false)
    }
  }

  const shellStyle = useMemo(
    () =>
      ({
        '--bg': 'var(--surface, #ffffff)',
        '--bg2': 'var(--surface-muted, #f7f7f8)',
        '--bg3': 'var(--primary-2, #f3e8ff)',
        '--border': 'var(--border-default, #e5e5e5)',
        '--border2': 'var(--border-strong, #d4d4d4)',
        '--green': 'var(--green-9, #30a46c)',
        '--green-bg': 'var(--green-3, #e6f6ed)',
        '--purple': 'var(--primary-9, #7c3aed)',
        '--purple-light': 'var(--primary-3, #f3e8ff)',
        '--spark1': 'var(--primary-8, #8b5cf6)',
        '--teal': 'var(--secondary-9, #0d9488)',
        '--text1': 'var(--text-primary, #171717)',
        '--text2': 'var(--text-secondary, #525252)',
        '--text3': 'var(--text-muted, #a3a3a3)',
      }) as CSSProperties,
    [],
  )

  return (
    <>
      {isOpen ? (
        <motion.aside
          animate={{ opacity: 1, x: 0 }}
          className={`fixed bottom-0 right-0 z-[9999] flex flex-col overflow-hidden bg-[var(--bg)] font-['Inter',system-ui,sans-serif] ${isMaximized
            ? 'top-[56px] left-0 xl:left-[56px] w-auto max-w-none border-l border-[var(--border)]'
            : 'top-0 w-[420px] max-w-[calc(100vw-16px)] border-l border-[var(--border)] shadow-[-8px_0_24px_rgba(0,0,0,.06)]'
            }`}
          initial={{ opacity: 0.96, x: 28 }}
          style={shellStyle}
          transition={{ duration: 0.18, ease: 'easeOut' }}
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
              <div className='relative grid size-8 shrink-0 place-items-center'>
                {busy ? (
                  <SparkIconLoading className='size-[18px]' />
                ) : (
                  <AiBrandIcon className='size-[18px]' variant='outline-purple' />
                )}
              </div>
            )}

            <div className='min-w-0 flex-1'>
              <div className='truncate text-[15px] font-semibold tracking-[-.2px] text-[var(--text1)]'>
                {view === 'history' ? 'Chat History' : 'AI Assistant'}
              </div>
              {aiStatusWord && (
                <AnimatePresence mode='wait'>
                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    className='text-[11.5px] text-[var(--text2)]'
                    exit={{ opacity: 0, y: -3 }}
                    initial={{ opacity: 0, y: 3 }}
                    key={aiStatusWord}
                    transition={{ duration: 0.2 }}
                  >
                    {aiStatusWord}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

            <HeaderIconButton
              title={isMaximized ? 'Minimize' : 'Expand'}
              onClick={toggleMaximize}
            >
              <UiIcon
                className='text-[var(--text2)] group-hover:text-[var(--text1)]'
                name={isMaximized ? 'minimize' : 'maximize'}
                size={16}
              />
            </HeaderIconButton>

            {view === 'history' ? null : (
              <>
                <HeaderIconButton
                  disabled={(!hasMessages && !busy) && !isWorkflowMode}
                  title='Clear chat'
                  onClick={clearChat}
                >
                  <UiIcon
                    className='text-[var(--text2)] group-hover:text-[var(--text1)]'
                    name='trash'
                    size={16}
                  />
                </HeaderIconButton>
                <HeaderIconButton title='Chat history' onClick={openHistory}>
                  <UiIcon
                    className='text-[var(--text2)] group-hover:text-[var(--text1)]'
                    name='history'
                    size={16}
                  />
                </HeaderIconButton>
              </>
            )}

            <HeaderIconButton title='Close' onClick={close}>
              <UiIcon
                className='text-[var(--text2)] group-hover:text-[var(--text1)]'
                name='close'
                size={16}
              />
            </HeaderIconButton>
          </div>

          {view === 'history' ? (
            <div className='min-h-0 flex-1 overflow-y-auto scroll-smooth'>
              <HistoryView
                history={history}
                onClear={clearChat}
                onLoad={loadHistory}
              />
            </div>
          ) : isWorkflowMode ? (
            <div className='flex min-h-0 flex-1 flex-col'>
              <WorkflowChatPage
                embedded
                initialState={currentWorkflowHistoryData}
                initialAction={initialWorkflowAction}
                isExpanded={isMaximized}
                onSaveHistory={saveWorkflowHistory}
              />
            </div>
          ) : (
            <>
              <div className='min-h-0 flex-1 overflow-y-auto scroll-smooth'>
                {!hasMessages ? (
                  <WelcomeView onSend={sendMessage} />
                ) : (
                  <div className='pb-2'>
                    {messages.map((msg) => (
                      <ChatMessage
                        key={msg.id}
                        msg={msg}
                        onActionClick={() => applyAnswerAction(msg)}
                        onTypingComplete={() => finishTyping(msg.id)}
                        onTypingProgress={() =>
                          bottomRef.current?.scrollIntoView({ behavior: 'auto' })
                        }
                      />
                    ))}
                    {busy && <CallingLoader />}
                    <div ref={bottomRef} />
                  </div>
                )}
              </div>

              {view === 'chat' && (
                <div className='shrink-0 border-t border-[var(--border)] bg-[var(--bg)] px-4 py-3.5'>
                  <div className='overflow-hidden rounded-[14px] border border-[var(--border2)] bg-[var(--bg2)] focus-within:border-[var(--purple)] focus-within:shadow-[0_0_0_3px_rgba(131,0,230,.07)]'>
                    <div className='px-3.5 pt-2.5 pb-1'>
                      <textarea
                        className='max-h-[100px] min-h-[34px] w-full resize-none bg-transparent text-[13.5px] leading-[1.5] text-[var(--text1)] outline-none placeholder:text-[var(--text3)]'
                        placeholder='Ask me anything about your documents or requests...'
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

                    <div className='flex items-center justify-end gap-1.5 px-2 pb-2'>
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
              )}
            </>
          )}
        </motion.aside>
      ) : null}
    </>
  )
}

const WelcomeView = ({ onSend }: { onSend: (value: string) => void }) => (
  <div className='px-5 pt-6 pb-4'>
    <div className='mb-4 text-[var(--gray-7)]'>
      <Bot size={36} strokeWidth={1.75} />
    </div>
    <h2 className='mb-1.5 text-[18px] font-semibold tracking-[-.2px] text-[var(--text1)]'>
      How can I help you today?
    </h2>
    <p className='mb-5 text-[13.5px] leading-[1.5] text-[var(--text2)]'>
      Submit requests, track progress, and find documents — all in one place.
    </p>
    <div className='flex flex-col gap-2'>
      {suggestions.map((item, index) => (
        <motion.button
          animate={{ opacity: 1, x: 0 }}
          className='group flex items-start gap-3 rounded-xl border border-[var(--border)] bg-surface p-3 text-left transition-colors hover:border-[var(--spark1)] hover:bg-[var(--bg2)]'
          initial={{ opacity: 0, x: -8 }}
          key={item.query}
          transition={{ delay: 0.05 * index, duration: 0.25 }}
          type='button'
          onClick={() => onSend(item.query)}
        >
          <UiIcon
            className='mt-0.5 size-[15px] shrink-0 text-[var(--text3)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--purple)]'
            name='mingcute:arrow-right-line'
          />
          <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
            <span className='text-[13px] font-semibold text-[var(--text1)] group-hover:text-[var(--purple)]'>
              {item.label}
            </span>
            <span className='text-[12px] font-normal leading-normal text-[var(--text2)]'>
              {item.description}
            </span>
          </div>
        </motion.button>
      ))}
    </div>
  </div>
)

const HistoryView = ({
  history,
  onClear,
  onLoad,
}: {
  history: HistoryItem[]
  onClear: () => void
  onLoad: (item: HistoryItem) => void
}) => (
  <div className='px-4 py-4'>
    {history.length === 0 ? (
      <div className='flex h-[calc(100vh-110px)] flex-col items-center justify-center text-center'>
        <div className='mb-4 text-[var(--text2)]'>
          <Bot size={28} strokeWidth={1.75} />
        </div>
        <div className='text-[15px] font-semibold text-[var(--text1)]'>
          No chat history yet
        </div>
        <p className='mt-1 max-w-[300px] text-[12.5px] leading-5 text-[var(--text2)]'>
          Start an AI conversation. Completed searches will appear here.
        </p>
        <button
          className='mt-4 rounded-lg bg-[var(--spark1)] px-4 py-2 text-xs font-semibold text-white'
          type='button'
          onClick={onClear}
        >
          Back to chat
        </button>
      </div>
    ) : (
      <div className='space-y-2'>
        <div className='mb-3 text-[12px] font-semibold tracking-[.4px] text-[var(--text3)] uppercase'>
          Recent conversations
        </div>
        {history.map((item) => (
          <button
            className='w-full rounded-[14px] border border-[var(--border)] bg-[var(--bg)] p-3 text-left transition hover:border-[var(--purple)] hover:bg-[var(--purple-light)]'
            key={item.id}
            type='button'
            onClick={() => onLoad(item)}
          >
            <div className='mb-1 flex items-center gap-2'>
              <UiIcon
                className={item.isWorkflow ? 'text-[var(--primary-main)]' : 'text-[var(--purple)]'}
                name={item.isWorkflow ? 'bot' : 'history'}
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
              <div className='flex shrink-0 items-center gap-1 rounded-full border border-[var(--primary-4)] bg-[var(--primary-3)] px-2 py-1 text-[10.5px] font-semibold text-[var(--spark1)]'>
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

const ChatMessage = ({
  msg,
  onActionClick,
  onTypingComplete,
  onTypingProgress,
}: {
  msg: Message
  onActionClick?: () => void
  onTypingComplete?: () => void
  onTypingProgress?: () => void
}) => {
  if (msg.role === 'status') {
    return <CallingLoader />
  }

  if (msg.role === 'user') {
    return (
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className='px-[18px] py-3'
        initial={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.22 }}
      >
        <div className='flex justify-end'>
          <div className='max-w-[88%] rounded-[16px_4px_16px_16px] bg-[var(--purple-light)] px-3.5 py-2 text-[13.5px] leading-[1.55] text-[var(--text1)]'>
            {msg.text}
          </div>
        </div>
      </motion.div>
    )
  }

  const blocks = Array.isArray(msg.blocks) ? msg.blocks : []
  const paragraphs = msg.text.split('\n').filter(Boolean)
  const showExtras = Boolean(msg.revealExtras)
  const richBlocks = blocks.filter((b) => b.type !== 'paragraph')

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className='px-[18px] py-2.5'
      initial={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.22 }}
    >
      <div className='flex items-start gap-3'>
        <div className='mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--purple-light)] text-[var(--purple)] shadow-xs'>
          <Bot size={18} strokeWidth={1.75} />
        </div>
        <div className='min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-[var(--border)] bg-[var(--bg2)] px-4 py-3 text-[13.5px] leading-relaxed text-[var(--text1)] shadow-xs'>
          {msg.isTyping ? (
            <p className='whitespace-pre-wrap'>
              <TypewriterReply
                text={msg.text}
                onComplete={onTypingComplete}
                onProgress={onTypingProgress}
              />
            </p>
          ) : (
            paragraphs.map((p, i) => (
              <p
                className={i < paragraphs.length - 1 ? 'mb-2.5' : ''}
                key={`${p}-${i}`}
              >
                {p}
              </p>
            ))
          )}

          {showExtras && richBlocks.length > 0 && (
            <div className='mt-3 border-t border-[var(--border)] pt-3'>
              <StaggeredCards
                items={richBlocks.map((block, index) => (
                  <AnswerBlock
                    block={block}
                    ctaMode={msg.ctaMode}
                    key={`${block.type}-${index}`}
                    onActionClick={onActionClick}
                  />
                ))}
                onProgress={onTypingProgress}
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

const AnswerBlock = ({
  block,
  ctaMode,
  onActionClick,
}: {
  block: TextBlock
  ctaMode?: AskAiCtaMode | null
  onActionClick?: () => void
}) => {
  if (block.type === 'paragraph') {
    return <p className='mb-2.5'>{block.text}</p>
  }

  if (block.type === 'bullets') {
    const bulletItems = block.items ?? []
    if (!bulletItems.length) return null

    const isClickable = Boolean(onActionClick && ctaMode)
    const isApply = ctaMode === 'apply'
    const actionLabel = isApply ? 'Apply filter' : 'Open the page'

    const content = (
      <>
        <div className='flex items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--bg2)] px-3 py-2'>
          <div className='flex min-w-0 items-center gap-1.5 text-[10.5px] font-medium tracking-[.4px] text-[var(--text2)] uppercase'>
            <Filter className='size-3.5 shrink-0' strokeWidth={2} />
            <span className='truncate'>{block.title || 'Filters Applied'}</span>
          </div>
          {isClickable ? (
            isApply ? (
              <Filter
                className='size-3.5 shrink-0 text-[var(--purple)]'
                strokeWidth={2}
              />
            ) : (
              <ExternalLink
                className='size-3.5 shrink-0 text-[var(--purple)] transition group-hover:translate-x-0.5'
                strokeWidth={2}
              />
            )
          ) : null}
        </div>

        <div className='flex flex-wrap gap-1.5 px-3 py-2.5'>
          {bulletItems.map((item) => (
            <span
              className='inline-flex max-w-full items-center gap-1 rounded-full border border-[var(--primary-4)] bg-[var(--primary-2)] px-2.5 py-1 text-[12px] text-[var(--text1)]'
              key={`${item.label}-${item.value}`}
            >
              <span className='font-medium text-[var(--text2)]'>
                {item.label}
              </span>
              <span className='text-[var(--text3)]'>:</span>
              <span className='min-w-0 truncate font-semibold text-[var(--spark1)]'>
                {item.value}
              </span>
            </span>
          ))}
        </div>

        {isClickable ? (
          <div className='flex items-center justify-between gap-2 border-t border-[var(--primary-4)] bg-[var(--primary-2)] px-3 py-2.5'>
            <div className='text-[12.5px] font-semibold text-[var(--purple)] underline-offset-2 group-hover:underline'>
              {actionLabel}
            </div>
            {isApply ? (
              <Filter className='size-4 shrink-0 text-[var(--purple)]' strokeWidth={2} />
            ) : (
              <ExternalLink
                className='size-4 shrink-0 text-[var(--purple)]'
                strokeWidth={2}
              />
            )}
          </div>
        ) : null}
      </>
    )

    if (isClickable) {
      return (
        <button
          className='group mb-2.5 w-full overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--bg)] text-left transition hover:border-[var(--primary-7)] hover:shadow-[0_6px_18px_rgba(124,58,237,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-7)]'
          type='button'
          onClick={onActionClick}
        >
          {content}
        </button>
      )
    }

    return (
      <div className='mb-2.5 overflow-hidden rounded-[14px] border border-[var(--border)]'>
        {content}
      </div>
    )
  }

  if (block.type === 'card') {
    return <AnswerCard card={block} />
  }

  if (block.type === 'cards') {
    const cards = block.items ?? []
    if (!cards.length) return null

    return (
      <div className='mb-2.5'>
        {block.title && (
          <div className='mb-1.5 text-[10.5px] font-medium tracking-[.4px] text-[var(--text2)] uppercase'>
            {block.title}
          </div>
        )}
        {cards.map((card, index) => (
          <AnswerCard card={card} key={`${card.title || 'card'}-${index}`} />
        ))}
      </div>
    )
  }

  return null
}

const AnswerCard = ({ card }: { card: AskAiCard }) => {
  const fields = card.fields ?? []

  return (
    <div className='mb-2.5 overflow-hidden rounded-[14px] border border-[var(--border)]'>
      <div className='border-b border-[var(--border)] px-3 py-2.5'>
        <div className='text-[13.5px] font-semibold text-[var(--text1)]'>
          {card.title}
        </div>
        {card.subtitle && (
          <div className='mt-0.5 text-[11.5px] text-[var(--text3)]'>
            {card.subtitle}
          </div>
        )}
      </div>
      <div className='grid grid-cols-2'>
        {fields.map((field, index) => (
          <div
            key={`${field.label}-${index}`}
            className={`border-b border-[var(--border)] px-3 py-2 ${index % 2 === 0 ? 'border-r' : ''
              } ${fields.length % 2 === 1 && index === fields.length - 1
                ? 'col-span-2 border-r-0'
                : ''
              }`}
          >
            <div className='mb-0.5 text-[10px] tracking-[.3px] text-[var(--text3)] uppercase'>
              {field.label}
            </div>
            <div className='text-xs font-medium text-[var(--text1)]'>
              {field.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

AskAI.displayName = 'AskAI'
export default AskAI
