import { Text } from '@mantine/core'
import { useEffect, useRef } from 'react'
import IconAI from '@/components/base/icon/IconAI'
import OverlayHeader from '@/components/base/overlay/OverlayHeader'
import ScrollArea from '@/components/base/scroll-area/ScrollArea'
import Title from '@/components/base/Title'
import cn from '@/utils/cn'
import PromptInput from './components/PromptInput'
import Suggestions from './components/Suggestions'
import useAskAIStore from './stores/useAskAIStore'

const AskAI = () => {
  const isOpen = useAskAIStore((state) => state.isOpen)
  const close = useAskAIStore((state) => state.close)
  const messages = useAskAIStore((state) => state.messages)
  const isLoading = useAskAIStore((state) => state.isLoading)
  const viewportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTo({
        behavior: 'smooth',
        top: viewportRef.current.scrollHeight,
      })
    }
  }, [messages, isLoading])

  if (!isOpen) {
    return null
  }

  return (
    <div className='flex h-full flex-col bg-surface-primary'>
      <OverlayHeader className='pr-2' title='Ask AI' onClose={close} />
      <ScrollArea className='flex-1' viewportRef={viewportRef}>
        <div className='flex h-full min-h-[calc(100dvh-64px)] flex-col'>
          {messages.length === 0 ? (
            <div className='flex flex-1 flex-col justify-end pb-4'>
              <div className='px-4'>
                <IconAI className='size-9' />
                <Title
                  className='mt-6'
                  description='Here are a few things I can do, or ask me anything!'
                  level={1}
                  title='How can I assist you?'
                />
              </div>
              <Suggestions />
            </div>
          ) : (
            <div className='flex-1 space-y-6 p-4'>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'animate-in fade-in slide-in-from-bottom-2 flex flex-col gap-2 duration-300',
                    msg.role === 'user' ? 'items-end' : 'items-start',
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed font-medium',
                      msg.role === 'user'
                        ? 'rounded-tr-none bg-accent-primary text-white shadow-md shadow-accent-soft/20'
                        : 'bg-gray-100 text-gray-900 rounded-tl-none border border-gray-2/50',
                    )}
                  >
                    {msg.content}
                  </div>

                  {msg.data && (
                    <div className='bg-gray-50 animate-in zoom-in-95 mt-2 w-full overflow-hidden rounded-xl border border-gray-2 p-4 duration-500'>
                      <div className='mb-3 flex items-center justify-between border-b border-gray-2/50 pb-2'>
                        <Text className='text-gray-500 text-[10px] font-black tracking-widest uppercase'>
                          Generated Form JSON
                        </Text>
                        <Text
                          className='font-bold text-accent-primary'
                          size='xs'
                        >
                          Applied to Canvas
                        </Text>
                      </div>
                      <pre className='overflow-x-auto rounded-lg bg-white/50 p-2 font-mono text-[11px] text-gray-7'>
                        {JSON.stringify(msg.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className='animate-in fade-in slide-in-from-bottom-2 flex flex-col items-start gap-2 duration-300'>
                  <div className='bg-gray-100 text-gray-500 flex items-center gap-3 rounded-2xl rounded-tl-none border border-gray-2/50 p-3'>
                    <div className='flex gap-1'>
                      <div className='bg-gray-400 size-1.5 animate-bounce rounded-full [animation-delay:-0.3s]' />
                      <div className='bg-gray-400 size-1.5 animate-bounce rounded-full [animation-delay:-0.15s]' />
                      <div className='bg-gray-400 size-1.5 animate-bounce rounded-full' />
                    </div>
                    <span className='text-xs font-bold tracking-widest uppercase opacity-60'>
                      AI is thinking...
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className='sticky bottom-0 mt-auto bg-surface-primary pt-2'>
            <PromptInput />
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

AskAI.displayName = 'AskAI'
export default AskAI
