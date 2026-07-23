import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import showToast from '@/components/base/toast/showToast'
import {
  generateFolderConfig,
  type FolderConfigField,
  type FolderConfigReference,
  type FolderConfigSuggestion,
} from '@/services/ai/gemini'
import cn from '@/utils/cn'

type ChatMessage = {
  attachmentName?: string
  id: string
  role: 'user' | 'assistant'
  text: string
  suggestion?: FolderConfigSuggestion
}

type AttachedReference = FolderConfigReference & {
  sizeLabel: string
}

type AiFolderBuilderProps = {
  onBack: () => void
  onApply: (payload: {
    description: string
    fields: FolderConfigField[]
    folderName: string
  }) => void
}

const EXAMPLE_PROMPTS = [
  {
    label: 'HR payslips folder',
    prompt: 'Create an HR folder for payslips and employee documents',
  },
  {
    label: 'Legal contracts folder',
    prompt: 'Create a Legal folder for contracts and compliance documents',
  },
  {
    label: 'Accounts payable folder',
    prompt:
      'Create an Accounts Payable folder for invoices, POs, and vendor bills',
  },
]

const ATTACHMENT_ACCEPT =
  '.pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.csv,.doc,.docx,.xls,.xlsx'
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      const base64 = result.includes(',') ? result.split(',')[1] : result
      if (!base64) {
        reject(new Error('Could not read file'))
        return
      }
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

function fieldVisual(includeInFolderStructure: boolean) {
  if (includeInFolderStructure) {
    return {
      bg: 'bg-[var(--primary-3)]',
      color: 'text-[var(--primary-11)]',
      icon: 'lucide:folder',
    }
  }
  return {
    bg: 'bg-[var(--blue-3)]',
    color: 'text-[var(--blue-11)]',
    icon: 'lucide:file-text',
  }
}

function TypewriterText({
  text,
  active,
  onDone,
  speed = 16,
}: {
  text: string
  active: boolean
  onDone?: () => void
  speed?: number
}) {
  const [shown, setShown] = useState(active ? '' : text)
  const doneRef = useRef(false)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    if (!active) {
      setShown(text)
      return
    }

    doneRef.current = false
    setShown('')
    let index = 0
    const id = window.setInterval(() => {
      index += 1
      setShown(text.slice(0, index))
      if (index >= text.length) {
        window.clearInterval(id)
        if (!doneRef.current) {
          doneRef.current = true
          onDoneRef.current?.()
        }
      }
    }, speed)

    return () => window.clearInterval(id)
  }, [active, speed, text])

  return (
    <span>
      {shown}
      {active && shown.length < text.length ? (
        <span className='ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-[var(--primary-9)] align-[-2px]' />
      ) : null}
    </span>
  )
}

export default function AiFolderBuilder({
  onBack,
  onApply,
}: AiFolderBuilderProps) {
  const [input, setInput] = useState('')
  const [attachment, setAttachment] = useState<AttachedReference | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Describe the folder you need. For example: “Create an HR folder for payslips and employee documents.” I’ll suggest the folder name, description, and fields.',
    },
  ])
  const [latestSuggestion, setLatestSuggestion] =
    useState<FolderConfigSuggestion | null>(null)
  const [revealedCount, setRevealedCount] = useState(0)
  const [showFolderCard, setShowFolderCard] = useState(false)
  const [typingId, setTypingId] = useState<string | null>(null)
  const [isRevealReady, setIsRevealReady] = useState(false)
  const listRef = useRef<HTMLDivElement | null>(null)
  const fieldsPanelRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const revealTimersRef = useRef<number[]>([])

  const clearRevealTimers = () => {
    for (const id of revealTimersRef.current) {
      window.clearTimeout(id)
      window.clearInterval(id)
    }
    revealTimersRef.current = []
  }

  useEffect(() => () => clearRevealTimers(), [])

  useEffect(() => {
    const node = listRef.current
    if (!node) return
    node.scrollTop = node.scrollHeight
  }, [messages, isSending, typingId])

  useEffect(() => {
    const node = fieldsPanelRef.current
    if (!node) return
    node.scrollTop = node.scrollHeight
  }, [revealedCount])

  const revealFieldsSequentially = (total: number) => {
    clearRevealTimers()
    setRevealedCount(0)
    setShowFolderCard(false)
    setIsRevealReady(false)

    const cardTimer = window.setTimeout(() => setShowFolderCard(true), 180)
    revealTimersRef.current.push(cardTimer)

    let count = 0
    const stepMs = Math.max(280, Math.min(520, 2200 / Math.max(total, 1)))
    const id = window.setInterval(() => {
      count += 1
      setRevealedCount(count)
      if (count >= total) {
        window.clearInterval(id)
        setIsRevealReady(true)
      }
    }, stepMs)
    revealTimersRef.current.push(id)
  }

  const handleAttachFile = async (file: File | null) => {
    if (!file) return

    if (file.size > MAX_ATTACHMENT_BYTES) {
      showToast({
        message: 'Attachment must be 8 MB or smaller.',
        variant: 'error',
      })
      return
    }

    try {
      const dataBase64 = await readFileAsBase64(file)
      setAttachment({
        dataBase64,
        mimeType: file.type || 'application/octet-stream',
        name: file.name,
        sizeLabel: formatFileSize(file.size),
      })
    } catch {
      showToast({
        message: 'Could not attach that file. Try another file.',
        variant: 'error',
      })
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const sendPrompt = async (prompt: string) => {
    const trimmed = prompt.trim()
    const activeAttachment = attachment
    if ((!trimmed && !activeAttachment) || isSending) return

    const requestText =
      trimmed ||
      `Design a folder configuration based on this reference file: ${activeAttachment?.name}`

    const history = messages
      .filter((message) => message.id !== 'welcome')
      .map((message) => ({
        role: message.role,
        text: message.text,
      }))

    setInput('')
    setAttachment(null)
    setIsSending(true)
    setIsRevealReady(false)
    setMessages((prev) => [
      ...prev.filter((message) => message.id !== 'welcome'),
      {
        attachmentName: activeAttachment?.name,
        id: crypto.randomUUID(),
        role: 'user',
        text: requestText,
      },
    ])

    try {
      const suggestion = await generateFolderConfig(
        requestText,
        history,
        activeAttachment
          ? {
              dataBase64: activeAttachment.dataBase64,
              mimeType: activeAttachment.mimeType,
              name: activeAttachment.name,
            }
          : null,
      )
      const assistantId = crypto.randomUUID()
      setLatestSuggestion(suggestion)
      setTypingId(assistantId)
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: 'assistant',
          suggestion,
          text: suggestion.reply,
        },
      ])
      revealFieldsSequentially(suggestion.fields.length)

      if (suggestion.source === 'local') {
        showToast({
          message:
            'Gemini unavailable — used local folder setup fallback.',
          variant: 'warning',
        })
      }
    } catch (error: any) {
      const message =
        error?.message ||
        'Could not generate folder configuration. Check VITE_GEMINI_API_KEY and try again.'
      showToast({ message, variant: 'error' })
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: message,
        },
      ])
    } finally {
      setIsSending(false)
    }
  }

  const visibleFields = latestSuggestion
    ? latestSuggestion.fields.slice(0, revealedCount)
    : []
  const fieldProgress =
    latestSuggestion && latestSuggestion.fields.length > 0
      ? revealedCount / latestSuggestion.fields.length
      : 0

  return (
    <div className='flex h-full min-h-0 flex-col bg-[var(--surface)]'>
      <div className='flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border-default)] px-4 py-3'>
        <div className='flex min-w-0 items-center gap-2'>
          <IconButton
            ariaLabel='Back'
            color='gray'
            icon='lucide:arrow-left'
            size='md'
            variant='ghost'
            onClick={onBack}
          />
          <div className='min-w-0'>
            <h1 className='truncate text-15 mb-2 font-semibold text-[var(--gray-13)]'>
              AI Folder Builder
            </h1>
            <p className='truncate text-12 text-[var(--gray-9)]'>
              Chat to generate folder name, description, and fields
            </p>
          </div>
        </div>
        <Button
          color='primary'
          disabled={!latestSuggestion || !isRevealReady}
          icon='lucide:check'
          label='Use this setup'
          onClick={() => {
            if (!latestSuggestion) return
            onApply({
              description: latestSuggestion.description,
              fields: latestSuggestion.fields,
              folderName: latestSuggestion.folderName,
            })
          }}
        />
      </div>

      <div className='grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1.25fr_0.95fr]'>
        {/* Chat */}
        <div className='flex min-h-0 flex-col border-r border-[var(--border-default)]'>
          <div
            className='min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4'
            ref={listRef}
          >
            {messages.map((message) => {
              const isAssistant = message.role === 'assistant'
              const isTyping = typingId === message.id

              return (
                <div
                  className={cn(
                    'flex items-end gap-2',
                    isAssistant ? 'justify-start' : 'justify-end',
                  )}
                  key={message.id}
                >
                  {isAssistant ? (
                    <div className='mb-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary-3)] text-[var(--primary-11)]'>
                      <Icon className='size-4' name='lucide:bot' />
                    </div>
                  ) : null}

                  <div
                    className={cn(
                      'max-w-[78%] px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm',
                      isAssistant
                        ? 'rounded-[14px] rounded-bl-[4px] border border-[var(--gray-3)] bg-surface text-[var(--gray-13)]'
                        : 'rounded-[14px] rounded-br-[4px] bg-[var(--surface-secondary)] text-gray-13',
                    )}
                  >
                    {message.attachmentName ? (
                      <div
                        className={cn(
                          'mb-2 inline-flex max-w-full items-center gap-1.5 rounded-md px-2 py-1 text-[11px]',
                          isAssistant
                            ? 'bg-[var(--gray-2)] text-[var(--gray-11)]'
                            : 'bg-[var(--gray-3)] text-[var(--gray-12)]',
                        )}
                      >
                        <Icon
                          className='size-3.5 shrink-0'
                          name='lucide:paperclip'
                        />
                        <span className='truncate'>{message.attachmentName}</span>
                      </div>
                    ) : null}
                    {isAssistant ? (
                      <TypewriterText
                        active={isTyping}
                        text={message.text}
                        onDone={() => setTypingId(null)}
                      />
                    ) : (
                      <div>{message.text}</div>
                    )}
                  </div>

                  {!isAssistant ? (
                    <div className='mb-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-secondary)] text-[11px] font-semibold text-gray-13'>
                      You
                    </div>
                  ) : null}
                </div>
              )
            })}

            {isSending ? (
              <div className='flex items-end gap-2'>
                <div className='flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary-3)] text-[var(--primary-11)]'>
                  <Icon className='size-4' name='lucide:bot' />
                </div>
                <div className='inline-flex items-center gap-1.5 rounded-[14px] rounded-bl-[4px] border border-[var(--gray-3)] bg-surface px-3.5 py-3'>
                  {[0, 1, 2].map((dot) => (
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                      className='size-1.5 rounded-full bg-[var(--primary-9)]'
                      key={dot}
                      transition={{
                        duration: 0.9,
                        ease: 'easeInOut',
                        repeat: Infinity,
                        delay: dot * 0.15,
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className='shrink-0 border-t border-[var(--border-default)] bg-[var(--surface)] px-4 py-3'>
            {messages.some((message) => message.role === 'user') ? null : (
              <div className='mb-2.5 flex flex-wrap gap-2'>
                {EXAMPLE_PROMPTS.map((item) => (
                  <button
                    className='rounded-full border border-[var(--gray-3)] bg-surface px-3 py-1.5 text-[11px] font-medium text-[var(--gray-11)] transition hover:border-[var(--primary-6)] hover:text-[var(--primary-9)] disabled:opacity-50'
                    disabled={isSending}
                    key={item.label}
                    type='button'
                    onClick={() => void sendPrompt(item.prompt)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            <form
              className='space-y-2'
              onSubmit={(event) => {
                event.preventDefault()
                void sendPrompt(input)
              }}
            >
              <input
                accept={ATTACHMENT_ACCEPT}
                className='hidden'
                ref={fileInputRef}
                type='file'
                onChange={(event) => {
                  void handleAttachFile(event.target.files?.[0] || null)
                }}
              />

              {attachment ? (
                <div className='inline-flex max-w-full items-center gap-2 rounded-[10px] border border-[var(--primary-4)] bg-[var(--primary-2)] px-2.5 py-1.5'>
                  <span className='flex size-7 shrink-0 items-center justify-center rounded-md bg-[var(--primary-4)] text-[var(--primary-11)]'>
                    <Icon className='size-3.5' name='lucide:file-text' />
                  </span>
                  <div className='min-w-0 flex-1'>
                    <p className='truncate text-[12px] font-medium text-[var(--gray-13)]'>
                      {attachment.name}
                    </p>
                    <p className='text-[10px] text-[var(--gray-9)]'>
                      {attachment.sizeLabel} · Reference
                    </p>
                  </div>
                  <button
                    aria-label='Remove attachment'
                    className='flex size-6 shrink-0 items-center justify-center rounded-full text-[var(--gray-10)] transition hover:bg-[var(--primary-3)] hover:text-[var(--primary-11)]'
                    disabled={isSending}
                    type='button'
                    onClick={() => setAttachment(null)}
                  >
                    <Icon className='size-3.5' name='lucide:x' />
                  </button>
                </div>
              ) : null}

              <div className='relative'>
                <textarea
                  className='min-h-[52px] max-h-32 w-full resize-none rounded-[12px] border border-[var(--gray-3)] bg-[var(--gray-1)] py-3 pl-3.5 pr-[5.25rem] text-[13px] text-[var(--gray-13)] outline-none transition focus:border-[var(--primary-7)]'
                  disabled={isSending}
                  placeholder='Describe the folder you want to create...'
                  rows={2}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      void sendPrompt(input)
                    }
                  }}
                />
                <div className='absolute bottom-3 right-2.5 flex items-center gap-1.5'>
                  <button
                    aria-label='Attach reference file'
                    className={cn(
                      'flex size-8 items-center justify-center rounded-full border border-[var(--gray-3)] bg-surface text-[var(--gray-11)] transition hover:border-[var(--primary-6)] hover:text-[var(--primary-9)] disabled:cursor-not-allowed disabled:opacity-40',
                      attachment &&
                        'border-[var(--primary-6)] bg-[var(--primary-2)] text-[var(--primary-9)]',
                    )}
                    disabled={isSending}
                    type='button'
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Icon className='size-4' name='lucide:paperclip' />
                  </button>
                  <button
                    aria-label='Send'
                    className='flex size-8 items-center justify-center rounded-full bg-[var(--primary-9)] text-white transition hover:bg-[var(--primary-10)] disabled:cursor-not-allowed disabled:opacity-40'
                    disabled={isSending || (!input.trim() && !attachment)}
                    type='submit'
                  >
                    <Icon className='size-4' name='lucide:send' />
                  </button>
                </div>
              </div>
            </form>
            <p className='mt-1.5 text-[11px] text-[var(--gray-9)]'>
              Press Enter to send, Shift + Enter for a new line. Attach a file for
              reference.
            </p>
          </div>
        </div>

        {/* Suggested setup */}
        <div className='flex min-h-0 flex-col overflow-hidden border-t border-[var(--border-default)] bg-[var(--gray-1)] lg:border-t-0'>
          <div className='flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border-default)] bg-surface px-4 py-3'>
            <p className='text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--gray-9)]'>
              Suggested setup
            </p>
            {latestSuggestion ? (
              <div className='inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--primary-9)]'>
                <span
                  className={cn(
                    'size-1.5 rounded-full',
                    isRevealReady
                      ? 'bg-[var(--primary-9)]'
                      : 'animate-pulse bg-[var(--primary-7)]',
                  )}
                />
                {isRevealReady ? 'Ready' : 'Building…'}
              </div>
            ) : null}
          </div>

          <div
            className='min-h-0 flex-1 overflow-y-auto px-4 py-4'
            ref={fieldsPanelRef}
          >
            {latestSuggestion ? (
              <div className='space-y-4'>
                <AnimatePresence>
                  {showFolderCard ? (
                    <motion.div
                      animate={{ opacity: 1, y: 0 }}
                      className='rounded-[12px] border border-[var(--primary-4)] bg-[var(--primary-2)] p-3'
                      exit={{ opacity: 0 }}
                      initial={{ opacity: 0, y: 12 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className='flex items-start gap-2.5'>
                        <div className='flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-[var(--primary-4)] text-[var(--primary-11)]'>
                          <Icon className='size-3.5' name='lucide:folder' />
                        </div>
                        <div className='min-w-0'>
                          <p className='text-[13px] font-semibold text-[var(--primary-11)]'>
                            {latestSuggestion.folderName}
                          </p>
                          <p className='mt-0.5 text-[11px] leading-relaxed text-[var(--gray-11)]'>
                            {latestSuggestion.description}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <div className='space-y-2.5'>
                  <div className='flex items-center gap-3'>
                    <p className='shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--gray-9)]'>
                      Fields ({latestSuggestion.fields.length})
                    </p>
                    <div className='h-1 flex-1 overflow-hidden rounded-full bg-[var(--gray-3)]'>
                      <motion.div
                        animate={{ width: `${fieldProgress * 100}%` }}
                        className='h-full rounded-full bg-[var(--primary-9)]'
                        initial={{ width: 0 }}
                        transition={{ duration: 0.25 }}
                      />
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <AnimatePresence initial={false}>
                      {visibleFields.map((field, index) => {
                        const visual = fieldVisual(field.includeInFolderStructure)
                        return (
                          <motion.div
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            className='rounded-[10px] border border-[var(--gray-3)] bg-surface px-3 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
                            initial={{ opacity: 0, x: 18, scale: 0.98 }}
                            key={`${field.fieldName}-${field.dataType}-${index}`}
                            layout
                            transition={{
                              duration: 0.38,
                              ease: [0.16, 1, 0.3, 1],
                            }}
                          >
                            <div className='flex items-start gap-2.5'>
                              <div
                                className={cn(
                                  'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[8px]',
                                  visual.bg,
                                  visual.color,
                                )}
                              >
                                <Icon className='size-4' name={visual.icon} />
                              </div>
                              <div className='min-w-0 flex-1'>
                                <div className='flex items-start justify-between gap-2'>
                                  <p className='text-[13px] font-semibold text-[var(--gray-13)]'>
                                    {field.fieldName}
                                  </p>
                                  <span className='shrink-0 rounded-md border border-[var(--gray-4)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--gray-10)]'>
                                    {field.dataType.replaceAll('_', ' ')}
                                  </span>
                                </div>
                                <p className='mt-0.5 text-[11px] text-[var(--gray-9)]'>
                                  {field.includeInFolderStructure
                                    ? 'Folder structure'
                                    : 'Document metadata'}
                                  {field.isMandatory ? (
                                    <span className='text-[var(--red-10)]'>
                                      {' '}
                                      · Mandatory
                                    </span>
                                  ) : null}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>

                    {!isRevealReady && latestSuggestion.fields.length > 0 ? (
                      <div className='flex items-center gap-2 px-1 py-2 text-[11px] text-[var(--gray-9)]'>
                        <Icon
                          className='size-3.5 animate-spin text-[var(--primary-9)]'
                          name='tabler:loader-2'
                        />
                        Adding fields…
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <div className='flex h-full flex-col items-center justify-center gap-2 px-6 text-center'>
                <div className='flex size-12 items-center justify-center rounded-full bg-[var(--primary-3)] text-[var(--primary-11)]'>
                  <Icon className='size-6' name='lucide:folder-plus' />
                </div>
                <p className='text-[13px] font-medium text-[var(--gray-11)]'>
                  Chat a folder idea to generate the setup
                </p>
                <p className='max-w-[220px] text-[12px] text-[var(--gray-9)]'>
                  Fields will appear here one by one as the AI builds your
                  configuration.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
