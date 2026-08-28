import { useLingui } from '@lingui/react/macro'
import { useEffect, useMemo, useState } from 'react'
import {
  type BrandingJson,
  getBrandingByEncryptedName,
  resolveBrandingFromResponse,
} from '@/api/v6/branding'
import Icon from '@/components/base/icon/Icon'
import ThemeSwitcher from '@/layouts/auth/components/ThemeSwitcher'
import {
  persistBrandingJsonToSession,
  persistBrandingToSession,
  persistSignInEntryPath,
} from '@/lib/branding/session'
import SignInForm from '@/pages/sign-in/components/SignInForm'
import authUserStore from '@/stores/authUserStore'
import { trimImageDataUrl } from '@/utils/trimImage'

const DEFAULT_DOCUMENT_TITLE = 'EZOFIS | AI Workflow Automation'
const DEFAULT_FAVICON = '/favicon.svg'

const applyDocumentBrand = (name: string, favicon?: string) => {
  document.title = name
  const existing = document.querySelector("link[rel='icon']")
  const link =
    existing instanceof HTMLLinkElement
      ? existing
      : document.createElement('link')
  link.rel = 'icon'
  link.href = favicon || DEFAULT_FAVICON
  if (!existing) document.head.appendChild(link)
}

const restoreDocumentBrand = () => {
  document.title = DEFAULT_DOCUMENT_TITLE
  const link = document.querySelector("link[rel='icon']")
  if (link instanceof HTMLLinkElement) {
    link.href = DEFAULT_FAVICON
  }
}

type BrandedSignInPageProps = {
  encryptedName: string
}

const BrandedSignInPage = ({ encryptedName }: BrandedSignInPageProps) => {
  const { t } = useLingui()
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [branding, setBranding] = useState<BrandingJson | null>(null)
  const [brandName, setBrandName] = useState('')
  const [tenantId, setTenantId] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!encryptedName) {
        setStatus('error')
        return
      }

      persistSignInEntryPath(`/${encryptedName}`)

      const { data, error } = await getBrandingByEncryptedName(encryptedName)
      if (cancelled) return

      if (error || !data) {
        setStatus('error')
        return
      }

      const resolved = resolveBrandingFromResponse(data)
      const parsed = resolved.json
      const name = resolved.name || parsed?.brandName?.trim() || ''

      if (parsed) {
        const [logo, favicon] = await Promise.all([
          parsed.logo ? trimImageDataUrl(parsed.logo) : Promise.resolve(''),
          parsed.favicon
            ? trimImageDataUrl(parsed.favicon)
            : Promise.resolve(''),
        ])
        if (cancelled) return
        persistBrandingJsonToSession(
          {
            ...parsed,
            brandName: parsed.brandName || name,
            favicon: favicon || parsed.favicon,
            logo: logo || parsed.logo,
          },
          { encryptedName },
        )
        parsed.favicon = favicon || parsed.favicon
        parsed.logo = logo || parsed.logo
      } else {
        persistBrandingToSession({
          brandName: name,
          encryptedName,
        })
      }

      setBrandName(name)
      setBranding(parsed)
      setTenantId(resolved.tenantId || '')
      applyDocumentBrand(name || 'Sign In', parsed?.favicon)
      setStatus('ready')
    }

    void load()

    return () => {
      cancelled = true
      if (authUserStore.getState().isAuthenticated) return
      restoreDocumentBrand()
    }
  }, [encryptedName])

  const displayName = brandName || t`your workspace`

  const headerLogo = useMemo(() => {
    if (branding?.logo) {
      return (
        <img
          alt={displayName}
          className='h-12 w-auto max-w-72 object-contain object-left'
          src={branding.logo}
        />
      )
    }
    if (branding?.favicon) {
      return (
        <div className='flex items-center gap-2'>
          <img
            alt=''
            className='size-10 rounded-md object-contain'
            src={branding.favicon}
          />
          <span className='text-sm font-semibold text-gray-12'>
            {displayName}
          </span>
        </div>
      )
    }
    return (
      <span className='text-sm font-semibold text-gray-12'>{displayName}</span>
    )
  }, [branding, displayName])

  if (status === 'loading') {
    return (
      <div className='flex min-h-svh flex-col items-center justify-center gap-4 bg-surface px-6'>
        <span className='flex size-14 items-center justify-center rounded-full bg-primary-3'>
          <Icon
            className='size-7 animate-spin text-primary-9'
            name='lucide:loader-circle'
          />
        </span>
        <div className='flex flex-col items-center gap-1'>
          <p className='text-15/6 font-semibold text-gray-13'>
            {t`Fetching Details..`}
          </p>
          <p className='text-13/5 text-gray-10'>
            {t`Loading your branded sign-in`}
          </p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className='flex min-h-svh flex-col items-center justify-center gap-3 bg-surface px-6 text-center'>
        <p className='text-15/6 font-semibold text-gray-13'>
          {t`Branding not found`}
        </p>
        <p className='max-w-sm text-13/5 text-gray-10'>
          {t`This branded sign-in link is invalid or no longer available.`}
        </p>
      </div>
    )
  }

  return (
    <div className='flex min-h-svh flex-col bg-surface p-6'>
      <header className='flex items-center'>{headerLogo}</header>

      <main className='flex flex-1 items-center justify-center py-10'>
        <div className='w-105'>
          <SignInForm
            tenantId={tenantId || undefined}
            branding={{
              favicon: branding?.favicon,
              name: displayName,
            }}
            onChangeView={() => undefined}
          />
        </div>
      </main>

      <footer className='flex items-center justify-between gap-4 text-13 text-gray-10'>
        <span>{t`© 2026 ${displayName}. All rights reserved.`}</span>
        <ThemeSwitcher />
      </footer>
    </div>
  )
}

BrandedSignInPage.displayName = 'BrandedSignInPage'
export default BrandedSignInPage
