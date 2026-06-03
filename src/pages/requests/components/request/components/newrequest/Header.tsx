import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'

interface Props {
  badge?: string
  title?: string
  onClose: () => void
}

const Header = ({ badge, title = 'New Request', onClose }: Props) => {
  return (
    <div className='flex h-13 items-center justify-between gap-2 border-b border-gray-3 px-2 bg-gradient-to-b from-gray-1 to-gray-2'>
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

      <div className='flex items-center gap-1'>{/* future actions */}</div>
    </div>
  )
}

Header.displayName = 'Header'
export default Header
