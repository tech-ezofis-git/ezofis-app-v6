import IconAI from '@/components/base/icon/IconAI'
import OverlayHeader from '@/components/base/overlay/OverlayHeader'
import ScrollArea from '@/components/base/scroll-area/ScrollArea'
import Title from '@/components/base/Title'
import { Text } from '@mantine/core'
import PromptInput from './components/PromptInput'
import Suggestions from './components/Suggestions'
import useAskAIStore from './stores/useAskAIStore'
import { useEffect, useRef } from 'react'
import cn from '@/utils/cn'

const AskAI = () => {
  const isOpen = useAskAIStore((state) => state.isOpen)
  const close = useAskAIStore((state) => state.close)
  const messages = useAskAIStore((state) => state.messages)
  const isLoading = useAskAIStore((state) => state.isLoading)
  const viewportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [messages, isLoading])

  if (!isOpen) {
    return null
  }

  return (
    <div className='flex h-full flex-col bg-surface-primary'>
      <OverlayHeader className='pr-2' title='Ask AI' onClose={close} />
      <ScrollArea className='flex-1' viewportRef={viewportRef}>
        <div className='flex h-full flex-col min-h-[calc(100dvh-64px)]'>
          {messages.length === 0 ? (
            <div className='flex-1 flex flex-col justify-end pb-4'>
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
            <div className='flex-1 p-4 space-y-6'>
              {messages.map((msg, i) => (
                <div key={i} className={cn(
                  'flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300',
                  msg.role === 'user' ? 'items-end' : 'items-start'
                )}>
                  <div className={cn(
                    'max-w-[85%] p-3 rounded-2xl text-sm font-medium leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-accent-primary text-white rounded-tr-none shadow-md shadow-accent-soft/20'
                      : 'bg-gray-100 text-gray-900 rounded-tl-none border border-gray-2/50'
                  )}>
                    {msg.content}
                  </div>

                  {msg.data && (
                    <div className='w-full mt-2 p-4 bg-gray-50 rounded-xl border border-gray-2 overflow-hidden animate-in zoom-in-95 duration-500'>
                      <div className='flex items-center justify-between mb-3 pb-2 border-b border-gray-2/50'>
                        <Text className='text-[10px] font-black uppercase tracking-widest text-gray-500'>Generated Form JSON</Text>
                        <Text size='xs' className='text-accent-primary font-bold'>Applied to Canvas</Text>
                      </div>
                      <pre className='text-[11px] font-mono text-gray-7 overflow-x-auto p-2 bg-white/50 rounded-lg'>
                        {JSON.stringify(msg.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className='flex flex-col items-start gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300'>
                  <div className='bg-gray-100 text-gray-500 rounded-2xl rounded-tl-none border border-gray-2/50 p-3 flex items-center gap-3'>
                    <div className='flex gap-1'>
                      <div className='size-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]' />
                      <div className='size-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]' />
                      <div className='size-1.5 rounded-full bg-gray-400 animate-bounce' />
                    </div>
                    <span className='text-xs font-bold uppercase tracking-widest opacity-60'>AI is thinking...</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className='mt-auto sticky bottom-0 bg-surface-primary pt-2'>
            <PromptInput />
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

AskAI.displayName = 'AskAI'
export default AskAI
