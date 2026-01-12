import { Textarea } from '@mantine/core'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'

const PromptInput = () => {
  return (
    <div className='p-2'>
      <div className='rounded border border-gray-4 bg-surface-muted transition-colors focus-within:border-primary-9'>
        <div className='p-2 text-xs font-medium'>
          3 of 15 calls remaining •{' '}
          <span className='cursor-pointer hover:text-gray-13 hover:underline'>
            Upgrade
          </span>
        </div>

        <div className='rounded border-t border-gray-4 bg-surface p-2'>
          <Textarea
            maxRows={10}
            minRows={3}
            placeholder='Ask me anything ...'
            resize='none'
            autoFocus
            autosize
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
              />
              <Button
                color='gray'
                label='All'
                suffixIcon='lucide:chevron-down'
                variant='outline'
              />
            </div>

            <IconButton
              color='gray'
              icon='lucide:send-horizontal'
              variant='outline'
            />
          </div>
        </div>
      </div>
    </div>
  )
}

PromptInput.displayName = 'PromptInput'
export default PromptInput
