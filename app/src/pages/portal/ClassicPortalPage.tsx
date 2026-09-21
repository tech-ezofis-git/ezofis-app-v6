import { useLingui } from '@lingui/react/macro'
import { useEffect, useMemo, useState } from 'react'
import {
  getClassicPortal,
  getClassicTenantLogoUrl,
} from '@/api/v5/classicPortal'
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
  const opened = activePortalKey === portalKey

  const auth = useMemo(() => classicAuthFromSettings(settings), [settings])
  const logoUrl = getClassicTenantLogoUrl(tenantId)
  const classicSrc = `${getClassicPath()}/portals/${encodeURIComponent(tenantId)}/${encodeURIComponent(portalId)}`

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
          setError(result.error || t`This portal link is invalid or has not been published yet.`)
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
      <div className='flex min-h-svh flex-col items-center justify-center gap-2 bg-surface px-6 text-center'>
        <p className='text-15 font-semibold text-gray-13'>{t`Loading portal`}</p>
        <p className='max-w-sm text-13 text-gray-10'>
          {t`Fetching the latest portal configuration.`}
        </p>
      </div>
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
        onAuthenticated={() => {
          setClassicRuntimeCookie()
          setActivePortalKey(portalKey)
        }}
        portalId={portalId}
        portalName={portalName}
        tenantId={tenantId}
      />
    )
  }

  return (
    <iframe
      className='h-svh w-full border-0 bg-surface'
      key={portalKey}
      src={classicSrc}
      title={portalName || t`Portal`}
    />
  )
}

export default ClassicPortalPage
