import { useLocation } from '@tanstack/react-router'

/**
 * Branded auth path -> white-label auth path.
 * The white-label routes render the same page components but hide
 * all EZOFIS branding (logo, copyright, "EZOFIS" copy, ezofis.com placeholders).
 */
export const WHITE_LABEL_ROUTE_MAP: Record<string, string> = {
  '/forgot-password': '/recover',
  '/reset-password': '/setup',
  '/sign-in': '/login',
  '/sign-up': '/newuser',
}

const WHITE_LABEL_PATHS = new Set(Object.values(WHITE_LABEL_ROUTE_MAP))

export const isWhiteLabelPath = (pathname: string) =>
  WHITE_LABEL_PATHS.has(pathname.replace(/\/$/, ''))

export const useIsWhiteLabel = () => {
  const location = useLocation()
  return isWhiteLabelPath(location.pathname)
}

/** Resolve a branded auth path to its white-label equivalent when on a white-label route. */
export const resolveAuthPath = (path: string, isWhiteLabel: boolean) =>
  isWhiteLabel ? (WHITE_LABEL_ROUTE_MAP[path] ?? path) : path
