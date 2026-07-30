import darkIcon from '@/assets/aibrandicon/dark.png'
import lightIcon from '@/assets/aibrandicon/light.png'

// Outlined SVG variants from Magic Outlin subfolder
import outlinePurpleIcon from '@/assets/aibrandicon/Magic Outlin/sparkles_outline_purple.svg'
import outlineBlueIcon from '@/assets/aibrandicon/Magic Outlin/sparkles_outline.svg'
import outlineBlackIcon from '@/assets/aibrandicon/Magic Outlin/sparkles_outline_black.svg'

// Solid / Filled SVG variants from Magic Outlin subfolder
import purpleIcon from '@/assets/aibrandicon/Magic Outlin/EZOFIS_Sparkles_Purple.svg'
import blueIcon from '@/assets/aibrandicon/Magic Outlin/EZOFIS_Sparkles_Blue.svg'
import blackIcon from '@/assets/aibrandicon/Magic Outlin/EZOFIS_Sparkles_Black.svg'

import useTheme from '@/hooks/useTheme'
import cn from '@/utils/cn'

export type AiBrandIconVariant =
  | 'default'
  | 'outline-purple'
  | 'outline-blue'
  | 'outline-black'
  | 'purple'
  | 'blue'
  | 'black'
  | 'curved-purple'
  | 'curved-purple-dark'
  | 'curved-purple-light'
  | 'curved-blue'
  | 'curved-black'

interface AiBrandIconProps {
  className?: string
  alt?: string
  variant?: AiBrandIconVariant
  style?: React.CSSProperties
}

export default function AiBrandIcon({
  className,
  alt = 'AI Brand',
  variant = 'curved-purple',
  style,
}: AiBrandIconProps) {
  const { resolvedColorScheme } = useTheme()

  let iconSrc: string
  switch (variant) {
    case 'curved-purple':
    case 'curved-purple-dark':
    case 'curved-purple-light':
      iconSrc = outlinePurpleIcon
      break
    case 'curved-blue':
      iconSrc = outlineBlueIcon
      break
    case 'curved-black':
      iconSrc = outlineBlackIcon
      break
    case 'outline-purple':
      iconSrc = outlinePurpleIcon
      break
    case 'outline-blue':
      iconSrc = outlineBlueIcon
      break
    case 'outline-black':
      iconSrc = outlineBlackIcon
      break
    case 'purple':
      iconSrc = purpleIcon
      break
    case 'blue':
      iconSrc = blueIcon
      break
    case 'black':
      iconSrc = blackIcon
      break
    case 'default':
    default:
      iconSrc = outlinePurpleIcon
      break
  }

  return (
    <img
      src={iconSrc}
      alt={alt}
      style={style}
      className={cn('object-contain', className)}
    />
  )
}

