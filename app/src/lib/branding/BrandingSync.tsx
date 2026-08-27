import { useEffect } from 'react'
import {
  getBrandingByEncryptedName,
  getTenantBranding,
  resolveBrandingFromResponse,
} from '@/api/v6/branding'
import authUserStore from '@/stores/authUserStore'
import { trimImageDataUrl } from '@/utils/trimImage'
import {
  applyBrandingFromSession,
  BRANDING_STORAGE_KEYS,
  BRANDING_UPDATED_EVENT,
  persistBrandingJsonToSession,
  readBrandingSession,
  writeBrandingSession,
} from './session'

const hasSessionColors = () =>
  Boolean(
    readBrandingSession(BRANDING_STORAGE_KEYS.light) ||
    readBrandingSession(BRANDING_STORAGE_KEYS.dark),
  )

const BrandingSync = () => {
  const isAuthenticated = authUserStore((state) => state.isAuthenticated)
  const tenantId = authUserStore((state) => state.session?.tenantId)

  useEffect(() => {
    applyBrandingFromSession()

    const trimStoredAssets = async () => {
      const logo = readBrandingSession(BRANDING_STORAGE_KEYS.logo)
      const favicon = readBrandingSession(BRANDING_STORAGE_KEYS.favicon)
      const [nextLogo, nextFavicon] = await Promise.all([
        logo ? trimImageDataUrl(logo) : Promise.resolve(''),
        favicon ? trimImageDataUrl(favicon) : Promise.resolve(''),
      ])
      let changed = false
      if (nextLogo && nextLogo !== logo) {
        writeBrandingSession(BRANDING_STORAGE_KEYS.logo, nextLogo)
        changed = true
      }
      if (nextFavicon && nextFavicon !== favicon) {
        writeBrandingSession(BRANDING_STORAGE_KEYS.favicon, nextFavicon)
        changed = true
      }
      if (changed) {
        window.dispatchEvent(new CustomEvent(BRANDING_UPDATED_EVENT))
      }
    }

    void trimStoredAssets()

    const onUpdate = () => applyBrandingFromSession()
    window.addEventListener(BRANDING_UPDATED_EVENT, onUpdate)
    return () => window.removeEventListener(BRANDING_UPDATED_EVENT, onUpdate)
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return

    applyBrandingFromSession()
    if (hasSessionColors()) return

    let cancelled = false

    const load = async () => {
      const encrypted = readBrandingSession(BRANDING_STORAGE_KEYS.encryptedName)
      const payloads: unknown[] = []

      if (encrypted) {
        const byName = await getBrandingByEncryptedName(encrypted)
        if (cancelled) return
        if (byName.data) payloads.push(byName.data)
      }

      const tenant = await getTenantBranding()
      if (cancelled) return
      if (tenant.data) payloads.push(tenant.data)

      for (const payload of payloads) {
        const resolved = resolveBrandingFromResponse(payload)
        if (!resolved.json) continue
        persistBrandingJsonToSession(resolved.json, {
          encryptedName: resolved.encryptedBrandingName || encrypted,
        })
        return
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, tenantId])

  return null
}

BrandingSync.displayName = 'BrandingSync'
export default BrandingSync
