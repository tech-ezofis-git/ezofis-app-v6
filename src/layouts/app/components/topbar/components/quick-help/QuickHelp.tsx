import { useEffect, useRef, useState } from 'react'
import CloseButton from '@/components/base/button/CloseButton'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import InputText from '@/components/base/inputs/InputText'
import Popover from '@/components/base/Popover'
import cn from '@/utils/cn'

const QUICK_QUESTIONS = [
  { keyword: 'invoice', label: 'Help me process a new invoice batch' },
  { keyword: 'vendor', label: 'How do I resolve a duplicate vendor alert?' },
  { keyword: 'sync', label: 'Check SAP Sage Intacct sync status' },
  { keyword: 'payment', label: 'Where are my pending payment approvals?' },
]

const RESPONSE_MAP: Record<string, string> = {
  default:
    "I'm your AP Agent Assistant. I can help you with invoice extraction, vendor verification, payment scheduling, and ERP sync status. How can I assist you further?",
  invoice:
    'I can help you extract data from your invoice batch. You can upload the PDFs here or connect your email source for automatic extraction. Which do you prefer?',
  payment:
    'You currently have 5 payments pending approval in your queue, totaling $12,450.30. Would you like me to highlight the high-priority items?',
  sync: 'The latest SAP/Sage Intacct sync was completed successfully 12 minutes ago. All 42 validated invoices have been pushed to the ERP.',
  vendor:
    "To resolve vendor alerts, please navigate to the 'Vendor Management' dashboard. I've detected 2 potential duplicates in your recent onboarding queue.",
}

type HelpView = 'initial' | 'chat'

interface Message {
  id: string
  sender: 'user' | 'bot'
  text: string
  isTyping?: boolean
}

const TypingDots = () => (
  <div className='flex items-center gap-1 py-1'>
    <div className='size-1.5 animate-bounce rounded-full bg-primary-9' />
    <div className='size-1.5 animate-bounce rounded-full bg-primary-9 [animation-delay:0.2s]' />
    <div className='size-1.5 animate-bounce rounded-full bg-primary-9 [animation-delay:0.4s]' />
  </div>
)

const QuickHelp = () => {
  const [opened, setOpened] = useState(false)
  const [view, setView] = useState<HelpView>('initial')
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [typingId, setTypingId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Reset state when popover is closed
  useEffect(() => {
    if (!opened) {
      setTimeout(() => {
        setView('initial')
        setMessages([])
        setTypingId(null)
      }, 200)
    }
  }, [opened])

  // Scroll to bottom on content change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, typingId, view])

  const generateResponse = (userInput: string) => {
    const lowerInput = userInput.toLowerCase()
    const key =
      Object.keys(RESPONSE_MAP).find((k) => lowerInput.includes(k)) || 'default'
    return RESPONSE_MAP[key]
  }

  const triggerBotResponse = (responseText: string) => {
    const botMsgId = Math.random().toString(36).substr(2, 9)

    // 1. Show global loader bubble for a moment
    setTypingId('global')

    setTimeout(() => {
      setTypingId(null)
      // 2. Add an empty bot message that will "type" out
      const newBotMsg: Message = {
        id: botMsgId,
        isTyping: true,
        sender: 'bot',
        text: '',
      }
      setMessages((prev) => [...prev, newBotMsg])

      let i = 0
      const interval = setInterval(() => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botMsgId ? { ...m, text: responseText.slice(0, i) } : m,
          ),
        )
        i++
        if (i > responseText.length) {
          clearInterval(interval)
          setMessages((prev) =>
            prev.map((m) =>
              m.id === botMsgId ? { ...m, isTyping: false } : m,
            ),
          )
        }
      }, 25)
    }, 1200)
  }

  const handleSend = (text?: string) => {
    const content = text || query
    if (!content.trim()) return

    if (view === 'initial') setView('chat')

    const userMsg: Message = {
      id: Math.random().toString(36).substr(2, 9),
      sender: 'user',
      text: content,
    }
    setMessages((prev) => [...prev, userMsg])
    setQuery('')

    triggerBotResponse(generateResponse(content))
  }

  return (
    <Popover
      opened={opened}
      position='bottom-end'
      width={400}
      target={
        <IconButton
          color='gray'
          icon='lucide:help-circle'
          variant='ghost'
          className={cn(
            'text-gray-11 hover:text-gray-13',
            opened && 'text-gray-13',
          )}
          onClick={() => setOpened((o) => !o)}
        />
      }
      onChange={setOpened}
    >
      <div className='flex h-auto max-h-[85vh] flex-col overflow-hidden rounded-lg bg-surface-raised shadow-xl'>
        {/* Header */}
        <div className='flex items-center justify-between border-b border-gray-3 bg-surface-raised/80 px-4 py-3 backdrop-blur-sm'>
          <div className='flex flex-1 items-center'>
            {view === 'chat' && (
              <IconButton
                className='-ml-2 text-primary-9'
                icon='lucide:arrow-left'
                size='sm'
                variant='ghost'
                onClick={() => {
                  setView('initial')
                  setMessages([])
                }}
              />
            )}
          </div>
          <h2 className='text-center text-xs font-bold tracking-wider text-gray-13 uppercase'>
            {view === 'initial' ? 'Get Quick Help' : 'Instant AI Assistant'}
          </h2>
          <div className='flex flex-1 justify-end'>
            <CloseButton size='sm' onClick={() => setOpened(false)} />
          </div>
        </div>

        {/* Content Area */}
        <div className='flex flex-1 flex-col overflow-y-auto' ref={scrollRef}>
          {view === 'initial' ? (
            <div className='animate-in slide-in-from-right-4 fade-in flex flex-col gap-6 p-6 duration-300'>
              {/* AI Assistant Section */}
              <div className='flex flex-col gap-3'>
                <div>
                  <h3 className='font-inter text-sm font-semibold text-gray-13'>
                    Instant AI Assistant
                  </h3>
                  <p className='mt-1 font-inter text-xs leading-relaxed text-gray-10'>
                    Personalized Accounts Payable assistance. Type your query or
                    choose an option below.
                  </p>
                </div>

                <InputText
                  placeholder='Ask about invoices, vendors, or sync status...'
                  rightSectionPointerEvents='auto'
                  rightSectionWidth={40}
                  value={query}
                  classNames={{
                    input:
                      'h-12 rounded-lg border-gray-3 text-sm shadow-sm transition-all focus:border-primary-9',
                  }}
                  rightSection={
                    <IconButton
                      className='text-primary-9'
                      icon='lucide:send-horizontal'
                      size='sm'
                      variant='ghost'
                      onClick={() => handleSend()}
                    />
                  }
                  onChange={setQuery}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
              </div>

              {/* Quick Questions Section */}
              <div className='flex flex-col gap-3'>
                <h3 className='font-inter text-xs font-bold tracking-widest text-gray-10 uppercase'>
                  AP Intelligence
                </h3>
                <ul className='flex flex-col gap-3'>
                  {QUICK_QUESTIONS.map((q, i) => (
                    <li key={i}>
                      <button
                        className='text-left font-inter text-sm text-blue-9 transition-all hover:text-blue-11 hover:underline'
                        onClick={() => handleSend(q.label)}
                      >
                        {q.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className='animate-in slide-in-from-left-4 fade-in flex flex-col gap-5 p-6 duration-300'>
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    'flex flex-col gap-2',
                    m.sender === 'user' ? 'items-end' : 'items-start',
                  )}
                >
                  <div className='flex items-end gap-2'>
                    {m.sender === 'bot' && (
                      <div className='mb-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-3 text-primary-9 shadow-sm'>
                        <Icon className='size-4' name='lucide:bot' />
                      </div>
                    )}
                    <div
                      className={cn(
                        'max-w-[280px] rounded-xl px-4 py-2.5 text-sm leading-relaxed shadow-sm',
                        m.sender === 'user'
                          ? 'bg-[#F3F4F6] text-gray-13'
                          : 'border border-gray-2 bg-surface text-gray-12',
                      )}
                    >
                      {m.text.split('\n').map((line, idx) => (
                        <p key={idx}>{line}</p>
                      ))}
                      {m.isTyping && <TypingDots />}
                    </div>
                  </div>
                </div>
              ))}

              {typingId === 'global' && (
                <div className='animate-in slide-in-from-bottom-2 flex items-center gap-2 duration-300'>
                  <div className='flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-3 text-primary-9 shadow-sm'>
                    <Icon className='size-4' name='lucide:bot' />
                  </div>
                  <div className='rounded-xl border border-gray-2 bg-surface px-4 py-2 shadow-sm'>
                    <TypingDots />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Input for Chat View */}
        {view === 'chat' && (
          <div className='border-t border-gray-3 bg-surface-raised/50 p-4'>
            <InputText
              placeholder='Ask anything else...'
              rightSectionPointerEvents='auto'
              rightSectionWidth={40}
              value={query}
              classNames={{
                input:
                  'h-11 rounded-lg border-gray-3 text-sm transition-all focus:border-primary-9',
              }}
              rightSection={
                <IconButton
                  className='text-primary-9'
                  icon='lucide:send-horizontal'
                  size='sm'
                  variant='ghost'
                  onClick={() => handleSend()}
                />
              }
              onChange={setQuery}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
          </div>
        )}

        {/* Global Footer Button */}
        <div className='border-t border-gray-3 bg-surface-raised/80 backdrop-blur-sm'>
          <button
            className='group flex w-full items-center justify-center gap-2 py-4 font-inter text-[10px] font-bold tracking-[0.1em] text-primary-9 uppercase transition-all hover:bg-primary-3/30'
            onClick={() => {}}
          >
            View Help Center
            <Icon
              className='size-3 transition-transform group-hover:translate-x-1'
              name='lucide:arrow-right'
            />
          </button>
        </div>
      </div>
    </Popover>
  )
}

QuickHelp.displayName = 'QuickHelp'
export default QuickHelp
