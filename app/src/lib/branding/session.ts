export const BRANDING_STORAGE_KEYS = {
  applySurface: 'custom-apply-surface-from-primary',
  bases: 'custom-color-palette-bases',
  brandName: 'custom-brand-name',
  dark: 'custom-color-preferences-dark',
  encryptedName: 'custom-encrypted-branding-name',
  favicon: 'custom-logo-mark',
  json: 'custom-branding-json',
  light: 'custom-color-preferences-light',
  logo: 'custom-logo-text',
  signInPath: 'custom-sign-in-entry-path',
} as const

export const BRANDING_UPDATED_EVENT = 'custom-preferences-updated'

const DEFAULT_FAVICON = '/favicon.svg'

export type PersistBrandingInput = {
  applySurfaceBackground?: boolean
  brandName?: string
  colorPreferences?: {
    dark?: ColorMap
    light?: ColorMap
  }
  encryptedName?: string
  favicon?: string
  logo?: string
  palettes?: unknown
}

type ColorMap = Record<string, string>

export const readBrandingSession = (key: string) => {
  if (typeof window === 'undefined') return ''
  try {
    return sessionStorage.getItem(key) || ''
  } catch {
    return ''
  }
}

export const writeBrandingSession = (key: string, value: string | null) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
  try {
    if (!value) {
      sessionStorage.removeItem(key)
      return
    }
    sessionStorage.setItem(key, value)
  } catch {
    // ignore quota / private mode
  }
}

const parseColorMap = (raw: string): ColorMap => {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as ColorMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const resolvedTheme = () =>
  (document.documentElement.getAttribute('data-resolved-theme') || 'light') as
    | 'light'
    | 'dark'

export const applyColorOverrides = (overrides: ColorMap) => {
  if (typeof document === 'undefined') return
  Object.entries(overrides).forEach(([name, value]) => {
    if (typeof value === 'string') {
      document.documentElement.style.setProperty(name, value)
    }
  })
}

export const applySessionFavicon = (href?: string) => {
  if (typeof document === 'undefined') return
  const next = href?.trim() || DEFAULT_FAVICON
  const existing = document.querySelector("link[rel='icon']")
  const link =
    existing instanceof HTMLLinkElement
      ? existing
      : document.createElement('link')
  link.rel = 'icon'
  link.href = next
  if (!existing) document.head.appendChild(link)
}

export const hasSessionBranding = () =>
  Boolean(
    readBrandingSession(BRANDING_STORAGE_KEYS.light) ||
    readBrandingSession(BRANDING_STORAGE_KEYS.dark) ||
    readBrandingSession(BRANDING_STORAGE_KEYS.brandName) ||
    readBrandingSession(BRANDING_STORAGE_KEYS.logo) ||
    readBrandingSession(BRANDING_STORAGE_KEYS.favicon),
  )

export const applyBrandingFromSession = () => {
  if (typeof window === 'undefined') return
  const theme = resolvedTheme()
  const key =
    theme === 'dark' ? BRANDING_STORAGE_KEYS.dark : BRANDING_STORAGE_KEYS.light
  const overrides = parseColorMap(readBrandingSession(key))
  if (Object.keys(overrides).length) applyColorOverrides(overrides)
  applySessionFavicon(readBrandingSession(BRANDING_STORAGE_KEYS.favicon))
}

export const persistBrandingToSession = (input: PersistBrandingInput) => {
  const brandName = input.brandName?.trim() || ''
  writeBrandingSession(BRANDING_STORAGE_KEYS.brandName, brandName || null)
  writeBrandingSession(BRANDING_STORAGE_KEYS.logo, input.logo || null)
  writeBrandingSession(BRANDING_STORAGE_KEYS.favicon, input.favicon || null)
  if (input.encryptedName !== undefined) {
    writeBrandingSession(
      BRANDING_STORAGE_KEYS.encryptedName,
      input.encryptedName.trim() || null,
    )
  }

  if (input.applySurfaceBackground === true) {
    writeBrandingSession(BRANDING_STORAGE_KEYS.applySurface, 'true')
  } else if (input.applySurfaceBackground === false) {
    writeBrandingSession(BRANDING_STORAGE_KEYS.applySurface, null)
  }

  if (input.colorPreferences?.light) {
    writeBrandingSession(
      BRANDING_STORAGE_KEYS.light,
      JSON.stringify(input.colorPreferences.light),
    )
  }
  if (input.colorPreferences?.dark) {
    writeBrandingSession(
      BRANDING_STORAGE_KEYS.dark,
      JSON.stringify(input.colorPreferences.dark),
    )
  }
  if (input.palettes) {
    writeBrandingSession(
      BRANDING_STORAGE_KEYS.bases,
      JSON.stringify(input.palettes),
    )
  }

  const snapshot: PersistBrandingInput = {
    applySurfaceBackground: input.applySurfaceBackground,
    brandName,
    colorPreferences: input.colorPreferences,
    favicon: input.favicon,
    logo: input.logo,
    palettes: input.palettes,
  }
  writeBrandingSession(BRANDING_STORAGE_KEYS.json, JSON.stringify(snapshot))

  applyBrandingFromSession()
  window.dispatchEvent(new CustomEvent(BRANDING_UPDATED_EVENT))
}

export const persistSignInEntryPath = (path: string) => {
  const next = path.trim()
  writeBrandingSession(
    BRANDING_STORAGE_KEYS.signInPath,
    next.startsWith('/') ? next : `/${next}`,
  )
}

export const resolveSignInPath = () => {
  const entry = readBrandingSession(BRANDING_STORAGE_KEYS.signInPath).trim()
  if (entry.startsWith('/') && entry !== '/' && !entry.startsWith('//')) {
    return entry
  }
  const encrypted = readBrandingSession(
    BRANDING_STORAGE_KEYS.encryptedName,
  ).trim()
  if (encrypted) return `/${encrypted}`
  return '/sign-in'
}

export const isAuthEntryPath = (pathname: string) => {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/sign-in' || path === '/login') return true
  const signIn = resolveSignInPath().replace(/\/+$/, '')
  return signIn !== '/sign-in' && path === signIn
}

export const persistBrandingJsonToSession = (
  json: PersistBrandingInput | null,
  extras?: { encryptedName?: string },
) => {
  if (!json) return
  persistBrandingToSession({
    applySurfaceBackground: json.applySurfaceBackground,
    brandName: json.brandName,
    colorPreferences: json.colorPreferences,
    encryptedName: extras?.encryptedName,
    favicon: json.favicon,
    logo: json.logo,
    palettes: json.palettes,
  })
}
