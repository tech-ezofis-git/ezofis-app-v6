import { useLocation } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

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

/** Generic (brand-free) document titles for the white-label routes. */
export const WHITE_LABEL_TITLES: Record<string, string> = {
  '/login': 'Sign In',
  '/newuser': 'Create Account',
  '/recover': 'Forgot Password',
  '/setup': 'Complete Setup',
}

const WHITE_LABEL_PATHS = new Set(Object.values(WHITE_LABEL_ROUTE_MAP))
const BRANDED_AUTH_PATHS = new Set(Object.keys(WHITE_LABEL_ROUTE_MAP))
const SESSION_FLAG_KEY = 'ezofis:white-label-session'

export const isWhiteLabelPath = (pathname: string) =>
  WHITE_LABEL_PATHS.has(pathname.replace(/\/$/, ''))

const readSessionFlag = () => {
  try {
    return sessionStorage.getItem(SESSION_FLAG_KEY) === '1'
  } catch {
    return false
  }
}

const writeSessionFlag = (value: boolean) => {
  try {
    if (value) {
      sessionStorage.setItem(SESSION_FLAG_KEY, '1')
    } else {
      sessionStorage.removeItem(SESSION_FLAG_KEY)
    }
  } catch {
    // sessionStorage unavailable (e.g. private mode) — flag just won't persist
  }
}

/**
 * True on the white-label auth routes themselves, and also on any later page
 * in the same tab (e.g. onboarding) reached during a flow that started on a
 * white-label route. Cleared as soon as the matching branded auth route is visited.
 */
export const useIsWhiteLabel = () => {
  const location = useLocation()
  const pathname = location.pathname.replace(/\/$/, '')
  const onWhiteLabelRoute = WHITE_LABEL_PATHS.has(pathname)
  const [sessionFlag, setSessionFlag] = useState(readSessionFlag)

  useEffect(() => {
    if (onWhiteLabelRoute) {
      writeSessionFlag(true)
      setSessionFlag(true)
    } else if (BRANDED_AUTH_PATHS.has(pathname)) {
      writeSessionFlag(false)
      setSessionFlag(false)
    }
  }, [pathname, onWhiteLabelRoute])

  return onWhiteLabelRoute || sessionFlag
}

/** Resolve a branded auth path to its white-label equivalent when on a white-label route. */
export const resolveAuthPath = (path: string, isWhiteLabel: boolean) =>
  isWhiteLabel ? (WHITE_LABEL_ROUTE_MAP[path] ?? path) : path

// Empty SVG — renders as a blank tab icon instead of the EZOFIS favicon.svg from index.html.
const BLANK_FAVICON =
  'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3C%2Fsvg%3E'

/**
 * Swaps the browser tab title and favicon (both otherwise fixed by index.html)
 * while on a white-label page; restores both on the way out.
 */
export const useWhiteLabelDocumentTitle = (title: string) => {
  const isWhiteLabel = useIsWhiteLabel()

  useEffect(() => {
    if (!isWhiteLabel) return

    const previousTitle = document.title
    document.title = title

    const faviconLink =
      document.querySelector<HTMLLinkElement>('link[rel~="icon"]')
    const previousFaviconHref = faviconLink?.getAttribute('href') ?? null
    faviconLink?.setAttribute('href', BLANK_FAVICON)

    return () => {
      document.title = previousTitle
      if (faviconLink && previousFaviconHref !== null) {
        faviconLink.setAttribute('href', previousFaviconHref)
      }
    }
  }, [isWhiteLabel, title])
}
