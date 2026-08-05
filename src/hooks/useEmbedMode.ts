import { useLocation } from '@tanstack/react-router'

export interface EmbedModeOptions {
  /**
   * Future configuration options for embed session handling
   */
  sessionKey?: string
}

export interface EmbedModeState {
  isEmbed: boolean
  sessionToken?: string
  hasTopbar: boolean
  hasActions: boolean
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
  const hasTopbar =
    searchParams.get('topbar') === 'true' ||
    searchParams.get('brand') === 'true' ||
    true
  const hasActions =
    searchParams.get('actions') === 'true' ||
    searchParams.get('showActions') === 'true'

  const isEmbed = isEmbedPath || isEmbedQuery

  return {
    isEmbed,
    sessionToken,
    hasTopbar,
    hasActions,
  }
}

export default useEmbedMode
