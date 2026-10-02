import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

interface SectionProps {
  children: React.ReactNode
  icon: string
  isOpen: boolean
  title: string
  className?: string
  variant?: 'default' | 'premium'
  onToggle: () => void
}

export default function SettingsSection({
  children,
  className,
  icon,
  isOpen,
  title,
  variant = 'default',
  onToggle,
}: SectionProps) {
  return (
    <div className={cn('flex flex-col gap-1', isOpen && 'mb-2.5', className)}>
      <div
        className='group -mx-2 flex cursor-pointer items-center justify-between rounded-xl p-2 transition-all duration-300 select-none hover:bg-surface-hover active:scale-[0.99]'
        onClick={onToggle}
      >
        <div className='flex items-center gap-2'>
          <span
            className={cn(
              'inline-block h-5 w-1 rounded transition-all duration-300',
              isOpen ? 'scale-y-110 bg-primary-9' : 'bg-gray-3',
            )}
          />
          <Icon
            name={icon}
            className={cn(
              'animate-in zoom-in-50 h-4 w-4 transition-colors duration-300 duration-500',
              isOpen ? 'text-primary-9' : 'text-gray-8',
            )}
          />
          <span
            className={cn(
              'text-13 font-medium transition-colors duration-300',
              isOpen ? 'text-primary-9' : 'text-gray-11',
            )}
          >
            {title}
          </span>
        </div>
        <div
          className={cn(
            'transition-all duration-300',
            isOpen ? 'text-primary-9' : 'text-gray-8',
          )}
        >
          <Icon
            name='lucide:chevron-down'
            className={cn(
              'h-4 w-4 transition-transform duration-300',
              isOpen && 'rotate-180',
            )}
          />
        </div>
      </div>
      {isOpen && (
        <div
          className={cn(
            'animate-in fade-in slide-in-from-top-2 rounded-xl duration-300',
            variant === 'premium'
              ? 'space-y-3 bg-surface-muted p-3'
              : 'space-y-3.5 border border-gray-2 bg-surface p-3.5 shadow-sm',
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}
