import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'

const AIChatInput = () => {
  return (
    <div className='p-2'>
      <div className='rounded border border-gray-3 bg-surface-muted'>
        <div className='p-2 text-mini font-medium'>
          3 of 15 calls remaining • Upgrade
        </div>

        <div className='rounded border-t border-gray-3 bg-surface p-2'>
          <div className='h-12 text-gray-8'>Ask me anything ...</div>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <IconButton
                color='gray'
                icon='tabler:paperclip'
                variant='outline'
              />
              <Button
                color='gray'
                label='All'
                suffixIcon='tabler:chevron-down'
                variant='outline'
              />
            </div>

            <IconButton color='gray' icon='tabler:send-2' variant='outline' />
          </div>
        </div>
      </div>
    </div>
  )
}

AIChatInput.displayName = 'AIChatInput'
export default AIChatInput
