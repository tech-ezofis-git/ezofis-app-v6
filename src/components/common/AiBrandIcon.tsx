import darkIcon from '@/assets/aibrandicon/dark.png'
import lightIcon from '@/assets/aibrandicon/light.png'
import useTheme from '@/hooks/useTheme'
import cn from '@/utils/cn'

interface AiBrandIconProps {
  className?: string
  alt?: string
}

export default function AiBrandIcon({
  className,
  alt = 'AI Brand',
}: AiBrandIconProps) {
  const { resolvedColorScheme } = useTheme()
  
  // Choose the icon based on the resolved color scheme.
  // Note: Adjust the mapping if 'dark.png' is actually meant for light backgrounds.
  const iconSrc = resolvedColorScheme === 'dark' ? darkIcon : lightIcon

  return (
    <img
      src={iconSrc}
      alt={alt}
      className={cn('object-contain', className)}
    />
  )
}
