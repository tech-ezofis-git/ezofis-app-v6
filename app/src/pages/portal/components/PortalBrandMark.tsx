import type { PortalBrandingSnapshot } from '@/pages/settings/helpers/portalConfigStorage'
import cn from '@/utils/cn'

const DEFAULT_MARK = '/mark.png'
const DEFAULT_TEXT = '/text.png'

type PortalBrandMarkProps = {
  branding?: PortalBrandingSnapshot
  className?: string
  fallbackName?: string
  size?: 'lg' | 'sm'
}

export default function PortalBrandMark({
  branding,
  className,
  fallbackName = 'EZOFIS',
  size = 'sm',
}: PortalBrandMarkProps) {
  const name = branding?.brandName?.trim() || fallbackName
  const markSize = size === 'lg' ? 'size-16' : 'size-9'
  const imgSize = size === 'lg' ? 'h-16 max-w-56' : 'h-9 max-w-40'
  const isLarge = size === 'lg'

  if (branding?.logo) {
    return (
      <img
        alt={name}
        className={cn('w-auto object-contain object-left', imgSize, className)}
        src={branding.logo}
      />
    )
  }

  if (branding?.favicon) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <img
          alt=''
          className={cn('rounded-lg object-contain', markSize)}
          src={branding.favicon}
        />
        {isLarge ? null : (
          <span className='text-15 font-semibold text-gray-13'>{name}</span>
        )}
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <img
        alt={name}
        src={DEFAULT_MARK}
        className={cn(
          'object-contain object-center',
          isLarge ? 'h-16 w-auto' : 'h-9 w-auto',
        )}
      />
      {isLarge ? null : (
        <img
          alt=''
          className='h-8 w-auto max-w-44 object-contain object-left'
          src={DEFAULT_TEXT}
        />
      )}
    </div>
  )
}
