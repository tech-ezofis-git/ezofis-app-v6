import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import Tooltip from '@/components/base/Tooltip'

interface Props {
  badge?: string
  title?: string
  onClose: () => void
  onOpenPlayground?: () => void
}

const Header = ({
  badge,
  title = 'New Request',
  onClose,
  onOpenPlayground,
}: Props) => {
  return (
    <div className='flex h-13 items-center justify-between gap-2 border-b border-gray-3 bg-gradient-to-b from-gray-1 to-gray-2 px-2'>
      <div className='flex items-center gap-1.5'>
        <IconButton
          aria-label='Back'
          color='gray'
          variant='ghost'
          onClick={onClose}
        >
          <Icon className='size-4 text-gray-10' name='tabler:arrow-left' />
        </IconButton>

        <div className='flex items-center gap-2'>
          <h1 className='m-0 text-15 font-semibold text-gray-13'>{title}</h1>

          {badge ? (
            <span className='rounded-full bg-[var(--primary-2)] px-2 py-0.5 text-12 font-semibold text-[var(--primary-11)]'>
              {badge}
            </span>
          ) : null}
        </div>
      </div>

      <div className='flex items-center gap-1'>
        {onOpenPlayground && (
          <div className='animate-in fade-in duration-300'>
            <Tooltip content='Playground API' position='bottom'>
              <button
                aria-label='Playground Api'
                className='flex h-8 w-8 cursor-pointer items-center justify-center rounded-md bg-[var(--primary-9)] text-white shadow-lg transition-all hover:scale-105 hover:bg-[var(--primary-10)] focus:outline-none active:scale-95'
                type='button'
                onClick={onOpenPlayground}
              >
                <Icon
                  className='h-4 w-4 text-white'
                  name='tabler:plug-connected'
                />
              </button>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  )
}

Header.displayName = 'Header'
export default Header
