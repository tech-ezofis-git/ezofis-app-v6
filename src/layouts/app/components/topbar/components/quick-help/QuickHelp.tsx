import { useState, useEffect, useRef } from 'react'
import Popover from '@/components/base/Popover'
import IconButton from '@/components/base/button/IconButton'
import CloseButton from '@/components/base/button/CloseButton'
import InputText from '@/components/base/inputs/InputText'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

const QUICK_QUESTIONS = [
  { label: 'Help me process a new invoice batch', keyword: 'invoice' },
  { label: 'How do I resolve a duplicate vendor alert?', keyword: 'vendor' },
  { label: 'Check SAP Sage Intacct sync status', keyword: 'sync' },
  { label: 'Where are my pending payment approvals?', keyword: 'payment' },
]

const RESPONSE_MAP: Record<string, string> = {
  invoice: "I can help you extract data from your invoice batch. You can upload the PDFs here or connect your email source for automatic extraction. Which do you prefer?",
  vendor: "To resolve vendor alerts, please navigate to the 'Vendor Management' dashboard. I've detected 2 potential duplicates in your recent onboarding queue.",
  sync: "The latest SAP/Sage Intacct sync was completed successfully 12 minutes ago. All 42 validated invoices have been pushed to the ERP.",
  payment: "You currently have 5 payments pending approval in your queue, totaling $12,450.30. Would you like me to highlight the high-priority items?",
  default: "I'm your AP Agent Assistant. I can help you with invoice extraction, vendor verification, payment scheduling, and ERP sync status. How can I assist you further?",
}

interface Message {
  id: string
  text: string
  sender: 'user' | 'bot'
  isTyping?: boolean
}

type HelpView = 'initial' | 'chat'

const TypingDots = () => (
  <div className="flex items-center gap-1 py-1">
    <div className="size-1.5 animate-bounce bg-primary-9 rounded-full" />
    <div className="size-1.5 animate-bounce bg-primary-9 rounded-full [animation-delay:0.2s]" />
    <div className="size-1.5 animate-bounce bg-primary-9 rounded-full [animation-delay:0.4s]" />
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
    const key = Object.keys(RESPONSE_MAP).find((k) => lowerInput.includes(k)) || 'default'
    return RESPONSE_MAP[key]
  }

  const triggerBotResponse = (responseText: string) => {
    const botMsgId = Math.random().toString(36).substr(2, 9)
    
    // 1. Show global loader bubble for a moment
    setTypingId('global')
    
    setTimeout(() => {
      setTypingId(null)
      // 2. Add an empty bot message that will "type" out
      const newBotMsg: Message = { id: botMsgId, text: '', sender: 'bot', isTyping: true }
      setMessages((prev) => [...prev, newBotMsg])
      
      let i = 0
      const interval = setInterval(() => {
        setMessages((prev) => 
          prev.map((m) => (m.id === botMsgId ? { ...m, text: responseText.slice(0, i) } : m))
        )
        i++
        if (i > responseText.length) {
          clearInterval(interval)
          setMessages((prev) => 
            prev.map((m) => (m.id === botMsgId ? { ...m, isTyping: false } : m))
          )
        }
      }, 25)
    }, 1200)
  }

  const handleSend = (text?: string) => {
    const content = text || query
    if (!content.trim()) return

    if (view === 'initial') setView('chat')
    
    const userMsg: Message = { id: Math.random().toString(36).substr(2, 9), text: content, sender: 'user' }
    setMessages((prev) => [...prev, userMsg])
    setQuery('')

    triggerBotResponse(generateResponse(content))
  }

  return (
    <Popover
      position="bottom-end"
      width={400}
      opened={opened}
      onChange={setOpened}
      target={
        <IconButton
          icon="lucide:help-circle"
          variant="ghost"
          color="gray"
          className={cn('text-gray-11 hover:text-gray-13', opened && 'text-gray-13')}
          onClick={() => setOpened((o) => !o)}
        />
      }
    >
      <div className="flex flex-col overflow-hidden h-auto max-h-[85vh] bg-surface-raised shadow-xl rounded-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-3 px-4 py-3 bg-surface-raised/80 backdrop-blur-sm">
          <div className="flex flex-1 items-center">
            {view === 'chat' && (
              <IconButton
                icon="lucide:arrow-left"
                variant="ghost"
                size="sm"
                className="text-primary-9 -ml-2"
                onClick={() => {
                  setView('initial')
                  setMessages([])
                }}
              />
            )}
          </div>
          <h2 className="text-center text-xs font-bold uppercase tracking-wider text-gray-13">
            {view === 'initial' ? 'Get Quick Help' : 'Instant AI Assistant'}
          </h2>
          <div className="flex flex-1 justify-end">
            <CloseButton size="sm" onClick={() => setOpened(false)} />
          </div>
        </div>

        {/* Content Area */}
        <div ref={scrollRef} className="flex flex-1 flex-col overflow-y-auto">
          {view === 'initial' ? (
            <div className="flex flex-col gap-6 p-6 animate-in slide-in-from-right-4 fade-in duration-300">
              {/* AI Assistant Section */}
              <div className="flex flex-col gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-13 font-inter">Instant AI Assistant</h3>
                  <p className="mt-1 text-xs text-gray-10 font-inter leading-relaxed">
                    Personalized Accounts Payable assistance. Type your query or choose an option below.
                  </p>
                </div>

                <InputText
                  placeholder="Ask about invoices, vendors, or sync status..."
                  value={query}
                  onChange={setQuery}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  rightSection={
                    <IconButton
                      icon="lucide:send-horizontal"
                      variant="ghost"
                      size="sm"
                      className="text-primary-9"
                      onClick={() => handleSend()}
                    />
                  }
                  rightSectionWidth={40}
                  rightSectionPointerEvents="auto"
                  classNames={{
                    input: 'h-12 rounded-lg border-gray-3 focus:border-primary-9 transition-all text-sm shadow-sm',
                  }}
                />
              </div>

              {/* Quick Questions Section */}
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-10 font-inter">AP Intelligence</h3>
                <ul className="flex flex-col gap-3">
                  {QUICK_QUESTIONS.map((q, i) => (
                    <li key={i}>
                      <button
                        onClick={() => handleSend(q.label)}
                        className="text-left text-sm text-blue-9 hover:text-blue-11 hover:underline transition-all font-inter"
                      >
                        {q.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5 p-6 animate-in slide-in-from-left-4 fade-in duration-300">
              {messages.map((m) => (
                <div key={m.id} className={cn('flex flex-col gap-2', m.sender === 'user' ? 'items-end' : 'items-start')}>
                  <div className="flex gap-2 items-end">
                    {m.sender === 'bot' && (
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-3 text-primary-9 mb-1 shadow-sm">
                        <Icon name="lucide:bot" className="size-4" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'rounded-xl px-4 py-2.5 text-sm shadow-sm max-w-[280px] leading-relaxed',
                        m.sender === 'user' ? 'bg-[#F3F4F6] text-gray-13' : 'bg-white border border-gray-2 text-gray-12'
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
                <div className="flex gap-2 items-center animate-in slide-in-from-bottom-2 duration-300">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-3 text-primary-9 shadow-sm">
                    <Icon name="lucide:bot" className="size-4" />
                  </div>
                  <div className="rounded-xl bg-white border border-gray-2 px-4 py-2 shadow-sm">
                    <TypingDots />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Input for Chat View */}
        {view === 'chat' && (
          <div className="p-4 border-t border-gray-3 bg-surface-raised/50">
            <InputText
              placeholder="Ask anything else..."
              value={query}
              onChange={setQuery}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              rightSection={
                <IconButton
                  icon="lucide:send-horizontal"
                  variant="ghost"
                  size="sm"
                  className="text-primary-9"
                  onClick={() => handleSend()}
                />
              }
              rightSectionWidth={40}
              rightSectionPointerEvents="auto"
              classNames={{
                input: 'h-11 rounded-lg border-gray-3 focus:border-primary-9 transition-all text-sm',
              }}
            />
          </div>
        )}

        {/* Global Footer Button */}
        <div className="border-t border-gray-3 bg-surface-raised/80 backdrop-blur-sm">
          <button
            className="group flex w-full items-center justify-center gap-2 py-4 text-[10px] font-bold uppercase tracking-[0.1em] text-primary-9 hover:bg-primary-3/30 transition-all font-inter"
            onClick={() => {}}
          >
            View Help Center
            <Icon name="lucide:arrow-right" className="size-3 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </Popover>
  )
}

QuickHelp.displayName = 'QuickHelp'
export default QuickHelp
