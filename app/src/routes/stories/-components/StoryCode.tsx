import { ActionIcon, Tooltip } from '@mantine/core'
import { useClipboard } from '@mantine/hooks'
import { type ReactNode } from 'react'
import Icon from '@/components/base/icon/Icon'

interface Props {
  children: ReactNode
}

const StoryCode = ({ children }: Props) => {
  const clipboard = useClipboard({ timeout: 2000 })

  const handleCopy = () => {
    if (typeof children === 'string') {
      clipboard.copy(children)
    }
  }

  return (
    <div className='group relative mb-6 rounded bg-gray-2 p-3 font-mono text-13 text-gray-12'>
      <div className='absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100'>
        <Tooltip label={clipboard.copied ? 'Copied' : 'Copy code'}>
          <ActionIcon
            color={clipboard.copied ? 'green' : 'gray'}
            size='sm'
            variant='subtle'
            onClick={handleCopy}
          >
            <Icon
              className='size-3.5'
              name={clipboard.copied ? 'lucide:check' : 'lucide:copy'}
            />
          </ActionIcon>
        </Tooltip>
      </div>
      <pre className='whitespace-pre-wrap'>{children}</pre>
    </div>
  )
}

export default StoryCode
