import { useLingui } from '@lingui/react/macro'
import { useEffect, useMemo, useState } from 'react'
import {
  getClassicPortal,
  getClassicTenantLogoUrl,
} from '@/api/v5/classicPortal'
import Icon from '@/components/base/icon/Icon'
import {
  clearClassicPortalSession,
  getClassicPath,
  hasClassicPortalSession,
  setClassicRuntimeCookie,
} from '@/lib/classic-gateway'
import ClassicPortalLogin from './components/ClassicPortalLogin'
import { classicAuthFromSettings } from './helpers/classicPortalConfig'

type ClassicPortalPageProps = {
  portalId: string
  tenantId: string
}

const portalKeyFor = (tenantId: string, portalId: string) =>
  `${tenantId}/${portalId}`

const ClassicBootScreen = ({
  description,
  title,
}: {
  description: string
  title: string
}) => (
  <div className='flex min-h-svh flex-col items-center justify-center gap-3 bg-surface px-6 text-center'>
    <Icon className='size-7 animate-spin text-primary-11' name='fa:spinner' />
    <p className='text-15 font-semibold text-gray-13'>{title}</p>
    <p className='max-w-sm text-13 text-gray-10'>{description}</p>
  </div>
)

const ClassicPortalPage = ({ portalId, tenantId }: ClassicPortalPageProps) => {
  const { t } = useLingui()
  const portalKey = portalKeyFor(tenantId, portalId)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [portalName, setPortalName] = useState('')
  const [settings, setSettings] = useState<Record<string, unknown>>({})
  const [activePortalKey, setActivePortalKey] = useState<string | null>(() =>
    hasClassicPortalSession(tenantId, portalId) ? portalKey : null,
  )
  const [iframeReady, setIframeReady] = useState(false)
  const opened = activePortalKey === portalKey

  const auth = useMemo(() => classicAuthFromSettings(settings), [settings])
  const logoUrl = getClassicTenantLogoUrl(tenantId)
  const classicSrc = `${getClassicPath()}/portals/${encodeURIComponent(tenantId)}/${encodeURIComponent(portalId)}`

  useEffect(() => {
    setIframeReady(false)
  }, [classicSrc])

  useEffect(() => {
    if (!opened || iframeReady) return
    const timeout = window.setTimeout(() => setIframeReady(true), 12000)
    return () => window.clearTimeout(timeout)
  }, [iframeReady, opened])

  useEffect(() => {
    const closePortalSession = () => {
      if (hasClassicPortalSession(tenantId, portalId)) return
      setActivePortalKey(null)
    }

    const onMessage = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin &&
        event.origin !== 'https://cloud.ezofis.com' &&
        event.origin !== 'https://trial.ezofis.com'
      ) {
        return
      }
      if (!event.data || typeof event.data !== 'object') return
      const type = (event.data as { type?: string }).type
      if (type === 'ezofis:classic-ready') {
        setIframeReady(true)
        return
      }
      if (type !== 'ezofis:classic-portal-logout') return
      clearClassicPortalSession()
      setActivePortalKey(null)
    }

    window.addEventListener('message', onMessage)
    window.addEventListener('storage', closePortalSession)
    const interval = opened
      ? window.setInterval(closePortalSession, 400)
      : undefined

    return () => {
      window.removeEventListener('message', onMessage)
      window.removeEventListener('storage', closePortalSession)
      if (interval) window.clearInterval(interval)
    }
  }, [opened, portalId, tenantId])

  useEffect(() => {
    if (hasClassicPortalSession(tenantId, portalId)) {
      setActivePortalKey(portalKey)
      return
    }

    clearClassicPortalSession()
    setActivePortalKey((current) => (current === portalKey ? current : null))
  }, [portalId, portalKey, tenantId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    getClassicPortal(tenantId, portalId)
      .then((result) => {
        if (cancelled) return
        if (result.error || !result.data) {
          setError(
            result.error ||
              t`This portal link is invalid or has not been published yet.`,
          )
          return
        }
        setPortalName(result.data.name)
        setSettings(result.data.settings)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [portalId, t, tenantId])

  if (loading) {
    return (
      <ClassicBootScreen
        description={t`Fetching the latest portal configuration.`}
        title={t`Loading portal`}
      />
    )
  }

  if (error && !opened) {
    return (
      <div className='flex min-h-svh flex-col items-center justify-center gap-2 bg-surface px-6 text-center'>
        <p className='text-15 font-semibold text-gray-13'>{t`Portal not found`}</p>
        <p className='max-w-sm text-13 text-gray-10'>{error}</p>
      </div>
    )
  }

  if (!opened) {
    return (
      <ClassicPortalLogin
        auth={auth}
        logoUrl={logoUrl}
        portalId={portalId}
        portalName={portalName}
        tenantId={tenantId}
        onAuthenticated={() => {
          setClassicRuntimeCookie()
          setActivePortalKey(portalKey)
        }}
      />
    )
  }

  return (
    <div className='relative h-svh w-full bg-surface'>
      {iframeReady ? null : (
        <div className='absolute inset-0 z-10'>
          <ClassicBootScreen
            description={t`Opening EZOFIS Classic`}
            title={t`Loading portal`}
          />
        </div>
      )}
      <iframe
        className='h-svh w-full border-0 bg-surface'
        key={portalKey}
        src={classicSrc}
        title={portalName || t`Portal`}
      />
    </div>
  )
}

export default ClassicPortalPage
