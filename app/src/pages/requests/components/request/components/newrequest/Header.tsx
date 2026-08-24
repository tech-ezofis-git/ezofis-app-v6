import { useLingui } from '@lingui/react/macro'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import Tooltip from '@/components/base/Tooltip'
import cn from '@/utils/cn'

interface Props {
  activePanel?: SidePanel | null
  attachmentCount?: number
  badge?: string
  commentCount?: number
  isSubmitDisabled?: boolean
  isSubmitting?: boolean
  title?: string
  onClose: () => void
  onSubmit?: () => void
  onTogglePanel?: (panel: SidePanel) => void
}

type SidePanel = 'attachments' | 'comments'

const Header = ({
  activePanel,
  attachmentCount = 0,
  badge,
  commentCount = 0,
  isSubmitDisabled,
  isSubmitting,
  title,
  onClose,
  onSubmit,
  onTogglePanel,
}: Props) => {
  const { t } = useLingui()

  const panelButtons: {
    count: number
    icon: string
    id: SidePanel
    label: string
  }[] = [
    {
      count: attachmentCount,
      icon: 'tabler:paperclip',
      id: 'attachments',
      label: t`Attachments`,
    },
    {
      count: commentCount,
      icon: 'tabler:message-circle',
      id: 'comments',
      label: t`Comments`,
    },
  ]

  return (
    <div className='flex h-13 items-center justify-between gap-2 border-b border-gray-3 bg-gradient-to-b from-gray-1 to-gray-2 px-2'>
      <div className='flex items-center gap-1.5'>
        <IconButton
          aria-label={t`Back`}
          color='gray'
          variant='ghost'
          onClick={onClose}
        >
          <Icon className='size-4 text-gray-10' name='tabler:arrow-left' />
        </IconButton>

        <div className='flex items-center gap-2'>
          <h1 className='m-0 text-15 font-semibold text-gray-13'>
            {title ?? t`New Request`}
          </h1>

          {badge ? (
            <span className='rounded-full bg-[var(--primary-2)] px-2 py-0.5 text-12 font-semibold text-[var(--primary-11)]'>
              {badge}
            </span>
          ) : null}
        </div>
      </div>

      <div className='flex items-center gap-1'>
        {onTogglePanel &&
          panelButtons.map((panel) => (
            <Tooltip content={panel.label} key={panel.id} position='bottom'>
              <button
                aria-label={panel.label}
                type='button'
                className={cn(
                  'relative flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md transition-all hover:bg-gray-3 active:scale-95',
                  activePanel === panel.id
                    ? 'bg-[var(--primary-2)] text-[var(--primary-11)]'
                    : 'text-gray-10',
                )}
                onClick={() => onTogglePanel(panel.id)}
              >
                <Icon className='size-4' name={panel.icon} />
                {panel.count > 0 && (
                  <span className='absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--primary-9)] px-1 text-[10px] font-bold text-white'>
                    {panel.count}
                  </span>
                )}
              </button>
            </Tooltip>
          ))}

        {onSubmit && (
          <button
            aria-label={t`Submit`}
            disabled={isSubmitDisabled || isSubmitting}
            type='button'
            className={cn(
              'group animate-in fade-in flex h-8 shrink-0 cursor-pointer items-center overflow-hidden rounded-md bg-[var(--primary-9)] px-2 text-white shadow-sm transition-all duration-200 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-60',
            )}
            onClick={onSubmit}
          >
            <Icon
              className={cn('size-4 shrink-0', isSubmitting && 'animate-spin')}
              name={isSubmitting ? 'tabler:loader-2' : 'tabler:send-2'}
            />
            <span className='max-w-0 overflow-hidden text-13 font-semibold whitespace-nowrap transition-all duration-200 group-hover:max-w-[80px] group-hover:pl-1.5'>
              {t`Submit`}
            </span>
          </button>
        )}
      </div>
    </div>
  )
}

Header.displayName = 'Header'
export default Header
