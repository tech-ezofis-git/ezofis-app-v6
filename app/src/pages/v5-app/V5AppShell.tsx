import { useLingui } from '@lingui/react/macro'
import { useEffect, useRef, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import { getFromLocalStorage } from '@/utils/local-storage'
import { determineV5LandingHash, getV5BaseUrl } from '@/utils/v5Handoff'

export const V5AppShell = () => {
  const { t } = useLingui()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [v5Url, setV5Url] = useState('')

  useEffect(() => {
    const identity = getFromLocalStorage('identity')
    const session = getFromLocalStorage('session')

    const baseUrl = getV5BaseUrl()
    const landingHash = determineV5LandingHash(session)
    const fullTargetUrl = `${baseUrl}/${landingHash}`

    setV5Url(fullTargetUrl)

    // Sync session payload with iframe container when loaded
    const handleIframeLoad = () => {
      setIframeLoaded(true)
      if (iframeRef.current?.contentWindow && identity) {
        try {
          iframeRef.current.contentWindow.postMessage(
            {
              identity,
              session,
              type: 'EZOFIS_V5_SESSION_SET',
            },
            '*',
          )
        } catch (err) {
          console.warn('PostMessage notice:', err)
        }
      }
    }

    const timer = setTimeout(() => {
      setIframeLoaded(true)
    }, 1000)

    const frameEl = iframeRef.current
    if (frameEl) {
      frameEl.addEventListener('load', handleIframeLoad)
    }

    return () => {
      clearTimeout(timer)
      if (frameEl) {
        frameEl.removeEventListener('load', handleIframeLoad)
      }
    }
  }, [])

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-white">
      {!iframeLoaded && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center space-y-3 bg-surface-primary">
          <Icon name="tabler:loader-2" className="size-8 animate-spin text-accent-primary" />
          <span className="text-sm font-medium text-text-secondary">
            {t`Loading application...`}
          </span>
        </div>
      )}

      {v5Url && (
        <iframe
          ref={iframeRef}
          src={v5Url}
          title="EZOFIS Application"
          className="size-full border-none"
          allow="geolocation; microphone; camera; encrypted-media; midi; accelerometer; gyroscope"
        />
      )}
    </div>
  )
}

export default V5AppShell
