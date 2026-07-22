import type { ReactNode } from 'react'
import { useIsMobile } from '../../hooks/useIsMobile'

type AdaptiveScreenProps = {
  mobile: ReactNode
  web: ReactNode
}

/** Renders `mobile` under the mobile breakpoint, otherwise `web`. */
export function AdaptiveScreen({ mobile, web }: AdaptiveScreenProps) {
  const isMobile = useIsMobile()
  return <>{isMobile ? mobile : web}</>
}
