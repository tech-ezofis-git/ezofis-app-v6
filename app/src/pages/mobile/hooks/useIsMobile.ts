import { useEffect, useState } from 'react'

/** Mobile breakpoint matches Tailwind `md` (768px). */
export const MOBILE_MAX_WIDTH = 767

export function useIsMobile(maxWidth = MOBILE_MAX_WIDTH) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(`(max-width: ${maxWidth}px)`).matches
  })

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${maxWidth}px)`)
    const onChange = () => setIsMobile(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [maxWidth])

  return isMobile
}
