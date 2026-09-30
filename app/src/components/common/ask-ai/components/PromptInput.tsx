import { Textarea } from '@mantine/core'
import { useEffect, useState } from 'react'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import useAskAIStore from '../stores/useAskAIStore'

const PromptInput = () => {
  const [prompt, setPrompt] = useState('')
  const sendMessage = useAskAIStore((state) => state.sendMessage)
  const isLoading = useAskAIStore((state) => state.isLoading)
  const credits = useAskAIStore((state) => state.credits)
  const suggestion = useAskAIStore((state) => state.suggestion)

  useEffect(() => {
    if (suggestion) {
      setPrompt(suggestion)
    }
  }, [suggestion])

  const handleSend = () => {
    if (prompt.trim() && !isLoading) {
      sendMessage(prompt)
      setPrompt('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className='p-2'>
      <div
        className={`rounded border bg-surface-muted transition-colors focus-within:border-primary-9 ${isLoading ? 'pointer-events-none border-gray-3 opacity-50' : 'border-gray-4'}`}
      >
        {isLoading ? (
          <div className='animate-pulse p-2 text-xs font-medium text-primary-9'>
            Generating form...
          </div>
        ) : null}

        <div className='rounded border-t border-gray-4 bg-surface p-2'>
          <Textarea
            disabled={isLoading}
            maxRows={10}
            minRows={3}
            resize='none'
            value={prompt}
            autoFocus
            autosize
            classNames={{
              input:
                'w-full border-0 bg-transparent p-0 text-13 font-medium text-gray-12 outline-none placeholder:font-normal placeholder:text-gray-8',
            }}
            placeholder={
              isLoading
                ? 'AI is thinking...'
                : 'Describe your form (e.g. "Registration form for a tech conference")'
            }
            onChange={(e) => setPrompt(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
          />
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <IconButton
                color='gray'
                disabled={isLoading}
                icon='lucide:paperclip'
                variant='outline'
              />
              <Button
                color='gray'
                disabled={isLoading}
                label='All'
                suffixIcon='lucide:chevron-down'
                variant='outline'
              />
            </div>

            <IconButton
              color={prompt.trim() ? 'primary' : 'gray'}
              disabled={!prompt.trim() || isLoading}
              icon={isLoading ? 'lucide:loader-2' : 'lucide:send-horizontal'}
              loading={isLoading}
              variant={prompt.trim() ? 'solid' : 'outline'}
              onClick={handleSend}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

PromptInput.displayName = 'PromptInput'
export default PromptInput
