import { Button, Textarea } from '@mantine/core'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import useAskAIStore from '@/components/common/ask-ai/stores/useAskAIStore'

const FORM_AI_STATUS_WORDS = [
  'Thinking',
  'Reading your form',
  'Structuring the change',
  'Almost done',
]

const useFormAiStatusWord = (active: boolean) => {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!active) {
      setIndex(0)
      return
    }
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % FORM_AI_STATUS_WORDS.length)
    }, 1600)
    return () => window.clearInterval(timer)
  }, [active])

  return active ? FORM_AI_STATUS_WORDS[index] : null
}

/**
 * Form-builder-scoped AI panel. Unlike the app-wide `AskAI` chat (document
 * search, workflow initiation - only mounted inside the authenticated app
 * shell), this reuses `useAskAIStore.sendMessage`, which calls the form
 * generation endpoint and writes straight into the form-builder canvas via
 * `appendAIResponse`. It renders inside form-builder's own right-hand panel
 * slot (see Build.tsx) so it never competes with the app-wide assistant.
 */
const FormAIPanel = () => {
  const {
    close,
    credits,
    isLoading,
    messages,
    sendMessage,
    sendSuggestion,
    suggestions,
  } = useAskAIStore()
  const [prompt, setPrompt] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const statusWord = useFormAiStatusWord(isLoading)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages, isLoading])

  const handleSend = async (value?: string) => {
    const text = (value ?? prompt).trim()
    if (!text || isLoading || credits <= 0) return
    setPrompt('')
    await sendMessage(text)
  }

  return (
    <div className='animate-in slide-in-from-right flex h-full w-[400px] flex-col border-l border-gray-2 bg-white font-inter shadow-xl duration-300'>
      {/* Header */}
      <div className='flex shrink-0 items-center justify-between gap-2 border-b border-gray-2 bg-white px-5 py-4'>
        <div className='flex min-w-0 items-center gap-3'>
          <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft/10 text-accent-primary'>
            <AiBrandIcon className='size-5' variant='outline-purple' />
          </div>
          <div className='min-w-0'>
            <h2 className='truncate text-15/5 font-bold text-gray-13'>
              AI Form Assistant
            </h2>
            <span className='text-[11px] text-gray-8'>
              {credits} of 15 generations left
            </span>
          </div>
        </div>
        <IconButton
          className='rounded-xl text-gray-6 transition-colors hover:bg-gray-2 hover:text-gray-9'
          color='gray'
          icon='lucide:x'
          size='md'
          variant='ghost'
          onClick={close}
        />
      </div>

      {/* Conversation */}
      <div
        className='custom-scrollbar flex-1 space-y-4 overflow-y-auto p-4'
        ref={listRef}
      >
        {messages.length === 0 ? (
          <div className='flex flex-col gap-4'>
            <div className='rounded-xl border border-gray-1 bg-accent-soft/5 p-3 text-13 leading-relaxed text-gray-11'>
              Describe the form you need and I'll build the sections and fields
              for you. You can keep refining it with follow-up prompts.
            </div>
            <div className='space-y-1.5'>
              <div className='px-1 text-[10px] font-bold tracking-widest text-gray-5 uppercase'>
                Try one of these
              </div>
              {suggestions.map((s) => (
                <button
                  className='w-full rounded-lg border border-gray-1 bg-white px-3 py-2 text-left text-13 text-gray-11 transition-colors hover:border-accent-soft hover:bg-accent-soft/5 hover:text-accent-primary'
                  key={s}
                  onClick={() => sendSuggestion(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div className={cnRole(m.role)} key={i}>
              {m.content}
            </div>
          ))
        )}

        {isLoading && (
          <div className='flex items-center gap-2.5 self-start rounded-2xl rounded-tl-sm border border-gray-1 bg-white px-3.5 py-2.5'>
            <Icon
              className='shrink-0 text-accent-primary'
              height={16}
              name='lucide:bot'
              width={16}
            />
            <AnimatePresence mode='wait'>
              <motion.span
                animate={{ opacity: 1, y: 0 }}
                className='text-13 text-gray-8'
                exit={{ opacity: 0, y: -3 }}
                initial={{ opacity: 0, y: 3 }}
                key={statusWord}
                transition={{ duration: 0.2 }}
              >
                {statusWord}
              </motion.span>
            </AnimatePresence>
            <div className='flex items-center gap-1'>
              {[0, 1, 2].map((dot) => (
                <motion.span
                  animate={{ opacity: [0.35, 1, 0.35], y: [0, -3, 0] }}
                  className='size-1.5 rounded-full bg-gray-5'
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
        )}
      </div>

      {/* Composer */}
      <div className='shrink-0 space-y-2 border-t border-gray-2 bg-white p-4'>
        {credits <= 0 ? (
          <div className='rounded-lg border border-gray-1 bg-gray-1 px-3 py-2 text-center text-12 text-gray-8'>
            You've used all your AI generations for this session.
          </div>
        ) : (
          <>
            <Textarea
              disabled={isLoading}
              maxRows={4}
              minRows={2}
              placeholder='Describe the form you want to build or change...'
              value={prompt}
              autosize
              classNames={{
                input:
                  'border-gray-2 bg-gray-1/50 text-13 focus:border-accent-primary focus:bg-white',
              }}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
            />
            <Button
              color='primary'
              disabled={!prompt.trim() || isLoading}
              loading={isLoading}
              size='sm'
              fullWidth
              leftSection={
                <Icon height={14} name='mingcute:ai-fill' width={14} />
              }
              onClick={() => handleSend()}
            >
              Generate
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

const cnRole = (role: 'user' | 'assistant') =>
  role === 'user'
    ? 'ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-accent-primary px-3.5 py-2 text-13 text-white'
    : 'mr-auto max-w-[85%] rounded-2xl rounded-tl-sm border border-gray-1 bg-white px-3.5 py-2 text-13 text-gray-12'

FormAIPanel.displayName = 'FormAIPanel'
export default FormAIPanel
