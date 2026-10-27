// Where the Search page's Back button returns to: the page the user was on
// when they opened search (kept per tab in sessionStorage).
const STORAGE_KEY = 'ezofis.searchReturnTo'

export type SearchReturnTarget = {
  /** Path + query string to go back to. */
  href: string
  /** That page's title, for the "Back to …" label. */
  title: string
}

export const rememberSearchReturn = (target: SearchReturnTarget) => {
  if (!target.href || target.href.startsWith('/search')) return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(target))
  } catch {
    // Storage unavailable: Back falls back to browser history.
  }
}

export const readSearchReturn = (): SearchReturnTarget | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SearchReturnTarget>
    return parsed?.href
      ? { href: String(parsed.href), title: String(parsed.title || '') }
      : null
  } catch {
    return null
  }
}
