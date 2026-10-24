import { useLingui } from '@lingui/react/macro'
import type { StageTrailItem } from '@/pages/requests/utils/workflow.utils'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import Tooltip from '@/components/base/Tooltip'
import usePlaygroundStore from '@/stores/usePlaygroundStore'
import cn from '@/utils/cn'
import StageTrail from '../StageTrail'

interface Props {
  activePanel?: SidePanel | null
  attachmentCount?: number
  badge?: string
  commentCount?: number
  isSubmitDisabled?: boolean
  isSubmitting?: boolean
  /** Workflow steps (previous / current / next), shown in the header. */
  stageTrail?: StageTrailItem[]
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
  stageTrail = [],
  title,
  onClose,
  onSubmit,
  onTogglePanel,
}: Props) => {
  const { t } = useLingui()
  const isPlaygroundOpen = usePlaygroundStore((state) => state.isOpen)
  const openPlayground = usePlaygroundStore((state) => state.open)
  const closePlayground = usePlaygroundStore((state) => state.close)

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
    <div className='flex h-13 items-center justify-between gap-3 border-b border-gray-3 bg-gradient-to-b from-gray-1 to-gray-2 px-4'>
      <div className='flex shrink-0 items-center gap-1.5'>
        <IconButton
          aria-label={t`Back`}
          className='-ml-2'
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

      {/* Same compact stage trail as the request details header. */}
      {stageTrail.length > 0 ? (
        <div className='hidden min-w-0 flex-auto items-center justify-center md:flex'>
          <StageTrail items={stageTrail} />
        </div>
      ) : null}

      <div className='flex shrink-0 items-center gap-1'>
        {/* <Tooltip content={t`Console / Workflow API`} position='bottom'>
          <button
            aria-label={t`Console`}
            type='button'
            className={cn(
              'relative flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md transition-all hover:bg-gray-3 active:scale-95',
              isPlaygroundOpen
                ? 'bg-[var(--primary-2)] text-[var(--primary-11)]'
                : 'text-gray-10',
            )}
            onClick={() => {
              if (isPlaygroundOpen) {
                closePlayground()
              } else {
                openPlayground()
              }
            }}
          >
            <Icon className='size-4' name='tabler:terminal-2' />
          </button>
        </Tooltip> */}

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
          // Divider between the panel icons and the primary action.
          <div
            className={cn(
              'flex items-center',
              onTogglePanel && 'ml-2 border-l border-gray-3 pl-3',
            )}
          >
            <button
              aria-label={t`Submit`}
              disabled={isSubmitDisabled || isSubmitting}
              type='button'
              className={cn(
                'inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md bg-[var(--primary-9)] px-3 text-white shadow-sm transition-all duration-200 hover:bg-[var(--primary-10)] hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-60',
              )}
              onClick={onSubmit}
            >
              <Icon
                className={cn(
                  'size-4 shrink-0',
                  isSubmitting && 'animate-spin',
                )}
                name={isSubmitting ? 'tabler:loader-2' : 'tabler:send-2'}
              />
              <span className='text-13 font-semibold whitespace-nowrap'>
                {t`Submit`}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

Header.displayName = 'Header'
export default Header
