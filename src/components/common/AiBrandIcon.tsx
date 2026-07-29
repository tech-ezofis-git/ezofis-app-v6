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

// Curved SVG variants from Magic_outputs_2 subfolder
import curvedPurpleDarkIcon from '@/assets/aibrandicon/Magic_outputs_2/EZOFIS_Sparkles_Purple_Dark.svg'
import curvedPurpleLightIcon from '@/assets/aibrandicon/Magic_outputs_2/EZOFIS_Sparkles_Purple_Light.svg'
import curvedBlueDarkIcon from '@/assets/aibrandicon/Magic_outputs_2/EZOFIS_Sparkles_Blue_Dark.svg'
import curvedBlueLightIcon from '@/assets/aibrandicon/Magic_outputs_2/EZOFIS_Sparkles_Blue_Light.svg'
import curvedBlackDarkIcon from '@/assets/aibrandicon/Magic_outputs_2/EZOFIS_Sparkles_Black_Dark.svg'
import curvedBlackLightIcon from '@/assets/aibrandicon/Magic_outputs_2/EZOFIS_Sparkles_Black_Light.svg'

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
}

export default function AiBrandIcon({
  className,
  alt = 'AI Brand',
  variant = 'default',
}: AiBrandIconProps) {
  const { resolvedColorScheme } = useTheme()

  let iconSrc: string
  switch (variant) {
    case 'curved-purple':
      iconSrc =
        resolvedColorScheme === 'dark'
          ? curvedPurpleLightIcon
          : curvedPurpleDarkIcon
      break
    case 'curved-purple-dark':
      iconSrc = curvedPurpleDarkIcon
      break
    case 'curved-purple-light':
      iconSrc = curvedPurpleLightIcon
      break
    case 'curved-blue':
      iconSrc =
        resolvedColorScheme === 'dark'
          ? curvedBlueLightIcon
          : curvedBlueDarkIcon
      break
    case 'curved-black':
      iconSrc =
        resolvedColorScheme === 'dark'
          ? curvedBlackLightIcon
          : curvedBlackDarkIcon
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
      iconSrc = resolvedColorScheme === 'dark' ? darkIcon : lightIcon
      break
  }

  return (
    <svg
      aria-label={alt}
      className={cn('object-contain', className)}
    />
  )
}

