import { useState } from 'react'
import { Textarea } from '@mantine/core'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import useAskAIStore from '../stores/useAskAIStore'

const PromptInput = () => {
  const [prompt, setPrompt] = useState('')
  const sendMessage = useAskAIStore((state) => state.sendMessage)
  const isLoading = useAskAIStore((state) => state.isLoading)

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
      <div className={`rounded border bg-surface-muted transition-colors focus-within:border-primary-9 ${isLoading ? 'opacity-50 pointer-events-none border-gray-3' : 'border-gray-4'}`}>
        <div className='p-2 text-xs font-medium'>
          {isLoading ? 'Generating form...' : '3 of 15 calls remaining'} •{' '}
          <span className='cursor-pointer hover:text-gray-13 hover:underline'>
            Upgrade
          </span>
        </div>

        <div className='rounded border-t border-gray-4 bg-surface p-2'>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            maxRows={10}
            minRows={3}
            placeholder={isLoading ? 'AI is thinking...' : 'Describe your form (e.g. "Registration form for a tech conference")'}
            resize='none'
            autoFocus
            autosize
            disabled={isLoading}
            classNames={{
              input:
                'w-full border-0 bg-transparent p-0 text-13 font-medium text-gray-12 outline-none placeholder:font-normal placeholder:text-gray-8',
            }}
          />
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <IconButton
                color='gray'
                icon='lucide:paperclip'
                variant='outline'
                disabled={isLoading}
              />
              <Button
                color='gray'
                label='All'
                suffixIcon='lucide:chevron-down'
                variant='outline'
                disabled={isLoading}
              />
            </div>

            <IconButton
              color={prompt.trim() ? 'primary' : 'gray'}
              icon={isLoading ? 'lucide:loader-2' : 'lucide:send-horizontal'}
              variant={prompt.trim() ? 'solid' : 'outline'}
              onClick={handleSend}
              loading={isLoading}
              disabled={!prompt.trim() || isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

PromptInput.displayName = 'PromptInput'
export default PromptInput
