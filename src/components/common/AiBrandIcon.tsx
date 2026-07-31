import type { CSSProperties } from 'react'
import darkIcon from '@/assets/aibrandicon/dark.png'
import lightIcon from '@/assets/aibrandicon/sparkles.png'
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
  style?: CSSProperties
  variant?: AiBrandIconVariant
}

// Curved Path D string (from EZOFIS sparkles curved edition)
const CURVED_PATH_D =
  'M 12.000 3.300 L 11.685 3.330 L 11.370 3.420 L 11.130 3.540 L 10.935 3.675 L 10.605 4.035 L 10.125 4.845 L 9.570 5.655 L 8.895 6.525 L 8.250 7.260 L 7.260 8.250 L 6.210 9.150 L 5.340 9.795 L 3.915 10.695 L 3.675 10.935 L 3.510 11.175 L 3.360 11.535 L 3.300 11.850 L 3.300 12.150 L 3.360 12.465 L 3.510 12.825 L 3.675 13.065 L 3.975 13.350 L 4.845 13.875 L 5.655 14.430 L 6.525 15.105 L 7.260 15.750 L 8.250 16.740 L 9.150 17.790 L 9.795 18.660 L 10.695 20.085 L 10.995 20.370 L 11.370 20.580 L 11.685 20.670 L 12.000 20.700 L 12.315 20.670 L 12.630 20.580 L 12.870 20.460 L 13.065 20.325 L 13.395 19.965 L 13.875 19.155 L 14.430 18.345 L 15.105 17.475 L 15.750 16.740 L 16.740 15.750 L 17.790 14.850 L 18.660 14.205 L 20.085 13.305 L 20.325 13.065 L 20.490 12.825 L 20.640 12.465 L 20.700 12.150 L 20.700 11.850 L 20.640 11.535 L 20.490 11.175 L 20.325 10.935 L 20.025 10.650 L 19.155 10.125 L 18.345 9.570 L 17.475 8.895 L 16.740 8.250 L 15.750 7.260 L 14.850 6.210 L 14.205 5.340 L 13.305 3.915 L 13.005 3.630 L 12.630 3.420 L 12.315 3.330 Z'

// Standard Outlined Path D string
const OUTLINE_PATH_D =
  'M12 0C12 6.6 6.6 12 0 12C6.6 12 12 17.4 12 24C12 17.4 17.4 12 24 12C17.4 12 12 6.6 12 0Z'

export default function AiBrandIcon({
  className,
  alt = 'AI Brand',
  style,
  variant = 'default',
}: AiBrandIconProps) {
  const { resolvedColorScheme } = useTheme()

  if (variant === 'default') {
    const iconSrc = resolvedColorScheme === 'dark' ? darkIcon : lightIcon
    return (
      <img
        alt={alt}
        className={cn('object-contain', className)}
        style={style}
        src={iconSrc}
      />
    )
  }

  // Determine stroke color & path type
  let strokeColor = '#8300E6' // default purple
  let pathD = OUTLINE_PATH_D
  let isFilled = false

  switch (variant) {
    case 'curved-purple':
      strokeColor = resolvedColorScheme === 'dark' ? '#B47AF2' : '#5E00A8'
      pathD = CURVED_PATH_D
      break
    case 'curved-purple-dark':
      strokeColor = '#5E00A8'
      pathD = CURVED_PATH_D
      break
    case 'curved-purple-light':
      strokeColor = '#B47AF2'
      pathD = CURVED_PATH_D
      break
    case 'curved-blue':
      strokeColor = resolvedColorScheme === 'dark' ? '#6FA8F5' : '#0B3D91'
      pathD = CURVED_PATH_D
      break
    case 'curved-black':
      strokeColor = resolvedColorScheme === 'dark' ? '#8C8C8C' : '#000000'
      pathD = CURVED_PATH_D
      break
    case 'outline-purple':
      strokeColor = '#8300E6'
      pathD = OUTLINE_PATH_D
      break
    case 'outline-blue':
      strokeColor = '#19C1D4'
      pathD = OUTLINE_PATH_D
      break
    case 'outline-black':
      strokeColor = resolvedColorScheme === 'dark' ? '#FFFFFF' : '#000000'
      pathD = OUTLINE_PATH_D
      break
    case 'purple':
      strokeColor = '#8300E6'
      isFilled = true
      break
    case 'blue':
      strokeColor = '#19C1D4'
      isFilled = true
      break
    case 'black':
      strokeColor = resolvedColorScheme === 'dark' ? '#FFFFFF' : '#000000'
      isFilled = true
      break
  }

  return (
    <svg
      aria-label={alt}
      className={cn('object-contain', className)}
      style={style}
      viewBox='0 0 1080 1080'
      xmlns='http://www.w3.org/2000/svg'
    >
      <g transform='translate(20,220) scale(35)'>
        <path
          d={pathD}
          fill={isFilled ? strokeColor : 'none'}
          stroke={strokeColor}
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={isFilled ? '0.15' : '1.4'}
        />
      </g>
      <g transform='translate(700,20) scale(15.7)'>
        <path
          d={pathD}
          fill={isFilled ? strokeColor : 'none'}
          stroke={strokeColor}
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={isFilled ? '0.15' : '1.4'}
        />
      </g>
    </svg>
  )
}
