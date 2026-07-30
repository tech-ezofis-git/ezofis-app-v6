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
}

/**
  * Hook/utility to detect embed mode and provide future session hook points.
  * Checks if current pathname starts with `/embed` or if `embed=true` is present in URL search params.
  */
export function useEmbedMode(_options?: EmbedModeOptions): EmbedModeState {
  const location = useLocation()
  
  const isEmbedPath = location.pathname.startsWith('/embed')
  
  const searchParams = new URLSearchParams(location.search)
  const isEmbedQuery = searchParams.get('embed') === 'true'
  const sessionToken = searchParams.get('session') ?? undefined

  const isEmbed = isEmbedPath || isEmbedQuery

  return {
    isEmbed,
    sessionToken,
  }
}

export default useEmbedMode
