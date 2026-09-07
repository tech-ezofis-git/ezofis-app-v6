import {
  applyBrandingFromSession,
  persistBrandingJsonToSession,
} from '@/lib/branding/session'
import type { PortalBrandingSnapshot } from '@/pages/settings/helpers/portalConfigStorage'

export const applyPortalBranding = (branding?: PortalBrandingSnapshot) => {
  if (
    !branding?.brandName &&
    !branding?.logo &&
    !branding?.favicon &&
    !branding?.colorPreferences
  ) {
    applyBrandingFromSession()
    return
  }

  persistBrandingJsonToSession({
    applySurfaceBackground: branding.applySurfaceBackground,
    brandName: branding.brandName,
    colorPreferences: branding.colorPreferences,
    favicon: branding.favicon,
    logo: branding.logo,
  })
}
