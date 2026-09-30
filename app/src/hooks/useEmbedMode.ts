import { useLocation } from '@tanstack/react-router'

export interface EmbedModeOptions {
  /**
   * Future configuration options for embed session handling
   */
  sessionKey?: string
}

export interface EmbedModeState {
  hasActions: boolean
  hasLogo: boolean
  hasTopbar: boolean
  isEmbed: boolean
  email?: string
  filters?: Record<string, string>
  sessionToken?: string
  viewMode?: 'list' | 'grid'
}

/**
 * Hook/utility to detect embed mode and provide future session hook points.
 * Checks if current pathname starts with `/embed` or if `embed=true` is present in URL search params.
 */
export function useEmbedMode(_options?: EmbedModeOptions): EmbedModeState {
  const location = useLocation()

  const isEmbedPath = location.pathname.startsWith('/embed')

  const searchParams = new URLSearchParams(
    location.searchStr.startsWith('?')
      ? location.searchStr.slice(1)
      : location.searchStr,
  )
  const isEmbedQuery = searchParams.get('embed') === 'true'
  const sessionToken = searchParams.get('session') ?? undefined
  const email = searchParams.get('email') ?? undefined
  const hasTopbar = searchParams.get('topbar') !== 'false'
  const hasActions =
    searchParams.get('actions') === 'true' ||
    searchParams.get('showActions') === 'true'
  const hasLogo =
    searchParams.get('logo') === 'true' ||
    searchParams.get('showLogo') === 'true'

  const isEmbed = isEmbedPath || isEmbedQuery

  const viewParam = searchParams.get('view') || searchParams.get('viewMode')
  const viewMode: 'list' | 'grid' =
    viewParam === 'grid' || viewParam === 'list'
      ? viewParam
      : isEmbed
        ? 'list'
        : 'grid'

  let filters: Record<string, string> | undefined = undefined
  const filtersRaw = searchParams.get('filters')
  if (filtersRaw) {
    try {
      const parsed = JSON.parse(filtersRaw)
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        !Array.isArray(parsed)
      ) {
        filters = parsed as Record<string, string>
      }
    } catch (e) {
      console.warn('Failed to parse filters parameter from URL:', e)
    }
  }

  return {
    email,
    filters,
    hasActions,
    hasLogo,
    hasTopbar,
    isEmbed,
    sessionToken,
    viewMode,
  }
}

export default useEmbedMode
