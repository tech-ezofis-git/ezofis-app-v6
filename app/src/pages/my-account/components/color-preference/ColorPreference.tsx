import { msg } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { AnimatePresence } from 'motion/react'
import {
  type ChangeEvent,
  type DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { encryptBrandingName, saveBranding } from '@/api/v6/branding'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import InputCheckbox from '@/components/base/inputs/InputCheckbox'
import InputText from '@/components/base/inputs/InputText'
import showToast from '@/components/base/toast/showToast'
import { AnimateFadeIn } from '@/components/common/animations'
import {
  persistBrandingToSession,
  readBrandingSession as readSession,
  BRANDING_STORAGE_KEYS as STORAGE_KEYS,
  writeBrandingSession as writeSession,
} from '@/lib/branding/session'
import SettingsFormSection from '@/pages/settings/components/SettingsFormSection'
import SettingsWizardLayout from '@/pages/settings/components/SettingsWizardLayout'
import authUserStore from '@/stores/authUserStore'
import cn from '@/utils/cn'
import { trimImageDataUrl } from '@/utils/trimImage'

const MAX_ASSET_BYTES = 5 * 1024 * 1024

type PaletteBases = Record<'light' | 'dark', ThemePalettes>
type PaletteChoice = { hex: string; swatch: number | null }
type PaletteKey = 'primary' | 'secondary'
type ThemePalettes = Record<PaletteKey, PaletteChoice>

const DEFAULT_PALETTES: PaletteBases = {
  dark: {
    primary: { hex: '#a855f7', swatch: null },
    secondary: { hex: '#f8fafc', swatch: null },
  },
  light: {
    primary: { hex: '#7c5cff', swatch: null },
    secondary: { hex: '#ffffff', swatch: null },
  },
}

const BRANDING_STEP_MSGS = [
  {
    description: msg`Upload your organization's logo and favicon`,
    icon: 'tabler:photo',
    key: 'assets' as const,
    title: msg`Logo & Favicon`,
  },
  {
    description: msg`Set your brand name and colors`,
    icon: 'tabler:palette',
    key: 'identity' as const,
    title: msg`Brand Identity`,
  },
]

const CSS_SCALE_L = [98, 95, 90, 83, 75, 65, 55, 46, 41, 33, 22, 12]

const clonePalettes = (value: PaletteBases): PaletteBases =>
  JSON.parse(JSON.stringify(value)) as PaletteBases

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n))

const normalizeHex = (hex: string) => {
  const clean = hex.trim()
  if (/^#[0-9A-Fa-f]{3}$/.test(clean)) {
    return '#' + clean[1] + clean[1] + clean[2] + clean[2] + clean[3] + clean[3]
  }
  if (/^#[0-9A-Fa-f]{6}$/.test(clean)) {
    return clean
  }
  return '#ffffff'
}

const isHexColor = (val: string) =>
  /^#[0-9A-Fa-f]{6}$|^#[0-9A-Fa-f]{3}$/.test(val.trim())

const hexToHsl = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim())
  if (!result) return [0, 0, 50]
  const r = parseInt(result[1], 16) / 255
  const g = parseInt(result[2], 16) / 255
  const b = parseInt(result[3], 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

const hslToHex = (h: number, s: number, l: number): string => {
  const lN = l / 100
  const sN = s / 100
  const k = (n: number) => (n + h / 30) % 12
  const a = sN * Math.min(lN, 1 - lN)
  const f = (n: number) =>
    lN - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const toHex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`
}

const generateCssScale = (hex: string): string[] => {
  const [h, s, l] = hexToHsl(hex)
  const sat = Math.min(s, 85)
  return CSS_SCALE_L.map((stepL, i) => {
    if (i === 8) return normalizeHex(hex)
    if (i === 9) return hslToHex(h, sat, clamp(l - 8, 4, 100))
    if (i === 10) return hslToHex(h, sat, clamp(l - 16, 2, 100))
    return hslToHex(h, sat, stepL)
  })
}

const toDarkModeHex = (hex: string, palette: PaletteKey): string => {
  const [h, s, l] = hexToHsl(hex)
  if (palette === 'secondary' && l > 85) {
    return hslToHex(h, Math.min(s, 12), clamp(l - 8, 88, 98))
  }
  const sat = s < 12 ? s : clamp(s + 6, 35, 90)
  const darkL = clamp(l < 45 ? l + 20 : l < 60 ? l + 10 : 100 - l + 8, 50, 68)
  return hslToHex(h, sat, darkL)
}

const mixBrand = (hex: string, amount: number, base: string) =>
  `color-mix(in srgb, ${normalizeHex(hex)} ${amount}%, ${base})`

/** Surfaces are a wash of primary — never the raw brand color. */
const buildSurfaceOverrides = (
  primaryHex: string,
  theme: 'light' | 'dark',
): Record<string, string> => {
  const hex = normalizeHex(primaryHex)

  if (theme === 'light') {
    const page = mixBrand(hex, 4, '#ffffff')
    const card = mixBrand(hex, 2, '#ffffff')
    const muted = mixBrand(hex, 6, '#ffffff')
    return {
      '--bg-dashboard': mixBrand(hex, 5, '#ffffff'),
      '--gray-0': mixBrand(hex, 2, '#ffffff'),
      '--gray-1': page,
      '--gray-2': muted,
      '--gray-3': mixBrand(hex, 8, '#ffffff'),
      '--gray-4': mixBrand(hex, 10, '#ffffff'),
      '--gray-5': mixBrand(hex, 12, '#ffffff'),
      '--gray-6': mixBrand(hex, 14, '#ffffff'),
      '--surface': page,
      '--surface-hover': mixBrand(hex, 7, '#ffffff'),
      '--surface-muted': muted,
      '--surface-overlay': mixBrand(hex, 3, '#ffffff'),
      '--surface-primary': card,
      '--surface-raised': card,
      '--surface-secondary': muted,
    }
  }

  const page = mixBrand(hex, 8, '#070807')
  const card = mixBrand(hex, 10, '#101210')
  const muted = mixBrand(hex, 9, '#0c0e0c')
  return {
    '--bg-dashboard': mixBrand(hex, 6, '#050605'),
    '--gray-0': mixBrand(hex, 5, '#040504'),
    '--gray-1': page,
    '--gray-2': muted,
    '--gray-3': mixBrand(hex, 12, '#141714'),
    '--gray-4': mixBrand(hex, 14, '#191c19'),
    '--gray-5': mixBrand(hex, 16, '#1e221e'),
    '--gray-6': mixBrand(hex, 18, '#252a25'),
    '--surface': page,
    '--surface-hover': mixBrand(hex, 12, '#161a16'),
    '--surface-muted': muted,
    '--surface-overlay': card,
    '--surface-primary': page,
    '--surface-raised': card,
    '--surface-secondary': muted,
  }
}

const SURFACE_VAR_KEYS = Object.keys(buildSurfaceOverrides('#7c5cff', 'light'))

const omitSurfaceOverrides = (overrides: Record<string, string>) => {
  const next = { ...overrides }
  SURFACE_VAR_KEYS.forEach((key) => {
    delete next[key]
  })
  return next
}

const buildPaletteOverrides = (
  palette: PaletteKey,
  hex: string,
): Record<string, string> => {
  const normalized = normalizeHex(hex)
  const scale = generateCssScale(normalized)
  const updates: Record<string, string> = {}

  scale.forEach((color, i) => {
    if (i === 11) return
    updates[`--${palette}-${i + 1}`] = color
  })

  if (palette === 'primary') {
    updates['--accent-primary'] = scale[8]
    updates['--accent-soft'] = scale[2]
    updates['--border-focus'] = scale[7]
    updates['--focus-ring'] = scale[7]
  }

  return updates
}

const readStoredBases = (): PaletteBases => {
  const raw = readSession(STORAGE_KEYS.bases)
  if (!raw) return clonePalettes(DEFAULT_PALETTES)
  try {
    const parsed = JSON.parse(raw) as Partial<PaletteBases>
    return {
      dark: { ...DEFAULT_PALETTES.dark, ...parsed.dark },
      light: { ...DEFAULT_PALETTES.light, ...parsed.light },
    }
  } catch {
    return clonePalettes(DEFAULT_PALETTES)
  }
}

const parseOverrides = (raw: string): Record<string, string> => {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as Record<string, string>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const applyDomOverrides = (
  updates: Record<string, string>,
  unset: string[] = [],
) => {
  Object.entries(updates).forEach(([name, value]) => {
    document.documentElement.style.setProperty(name, value)
  })
  unset.forEach((name) => {
    document.documentElement.style.removeProperty(name)
  })
}

const resolvedTheme = () =>
  (document.documentElement.getAttribute('data-resolved-theme') || 'light') as
    | 'light'
    | 'dark'

type ColorPreferenceProps = {
  onBack?: () => void
}

const ColorPreference = ({ onBack }: ColorPreferenceProps) => {
  const { i18n, t } = useLingui()
  const [activeStep, setActiveStep] = useState(0)
  const [brandName, setBrandName] = useState('')
  const [logo, setLogo] = useState('')
  const [favicon, setFavicon] = useState('')
  const [paletteBases, setPaletteBases] = useState<PaletteBases>(() =>
    clonePalettes(DEFAULT_PALETTES),
  )
  const [lightOverrides, setLightOverrides] = useState<Record<string, string>>(
    {},
  )
  const [darkOverrides, setDarkOverrides] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [applySurfaceBackground, setApplySurfaceBackground] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    setBrandName(readSession(STORAGE_KEYS.brandName))
    const storedLogo = readSession(STORAGE_KEYS.logo)
    const storedFavicon = readSession(STORAGE_KEYS.favicon)
    setLogo(storedLogo)
    setFavicon(storedFavicon)
    if (storedLogo) {
      void trimImageDataUrl(storedLogo).then((next) => {
        if (next !== storedLogo) {
          setLogo(next)
          writeSession(STORAGE_KEYS.logo, next)
          window.dispatchEvent(new CustomEvent('custom-preferences-updated'))
        }
      })
    }
    if (storedFavicon) {
      void trimImageDataUrl(storedFavicon).then((next) => {
        if (next !== storedFavicon) {
          setFavicon(next)
          writeSession(STORAGE_KEYS.favicon, next)
          window.dispatchEvent(new CustomEvent('custom-preferences-updated'))
        }
      })
    }
    const storedEncrypted = readSession(STORAGE_KEYS.encryptedName)
    if (storedEncrypted) {
      setShareUrl(`${window.location.origin}/${storedEncrypted}`)
    }
    const applySurface = readSession(STORAGE_KEYS.applySurface) === 'true'
    setApplySurfaceBackground(applySurface)

    const parsedLight = parseOverrides(readSession(STORAGE_KEYS.light))
    const parsedDark = parseOverrides(readSession(STORAGE_KEYS.dark))
    const storedBases = readStoredBases()
    const primaryHex = isHexColor(storedBases.light.primary.hex)
      ? normalizeHex(storedBases.light.primary.hex)
      : DEFAULT_PALETTES.light.primary.hex

    const nextLight = {
      ...omitSurfaceOverrides(parsedLight),
      ...buildPaletteOverrides('primary', primaryHex),
      ...(applySurface ? buildSurfaceOverrides(primaryHex, 'light') : {}),
      ...(isHexColor(storedBases.light.secondary.hex)
        ? buildPaletteOverrides(
            'secondary',
            normalizeHex(storedBases.light.secondary.hex),
          )
        : {}),
    }
    const darkPrimary = toDarkModeHex(primaryHex, 'primary')
    const darkSecondary = isHexColor(storedBases.light.secondary.hex)
      ? toDarkModeHex(
          normalizeHex(storedBases.light.secondary.hex),
          'secondary',
        )
      : DEFAULT_PALETTES.dark.secondary.hex
    const nextDark = {
      ...omitSurfaceOverrides(parsedDark),
      ...buildPaletteOverrides('primary', darkPrimary),
      ...(applySurface ? buildSurfaceOverrides(primaryHex, 'dark') : {}),
      ...buildPaletteOverrides('secondary', darkSecondary),
    }

    setLightOverrides(nextLight)
    setDarkOverrides(nextDark)
    const nextBases = {
      dark: {
        primary: { hex: darkPrimary, swatch: null },
        secondary: { hex: darkSecondary, swatch: null },
      },
      light: storedBases.light,
    }
    setPaletteBases(nextBases)

    const hasStoredTheme =
      Boolean(readSession(STORAGE_KEYS.light)) ||
      Boolean(readSession(STORAGE_KEYS.dark)) ||
      Boolean(readSession(STORAGE_KEYS.bases))

    if (hasStoredTheme) {
      writeSession(STORAGE_KEYS.light, JSON.stringify(nextLight))
      writeSession(STORAGE_KEYS.dark, JSON.stringify(nextDark))
      writeSession(STORAGE_KEYS.bases, JSON.stringify(nextBases))
      applyDomOverrides(
        resolvedTheme() === 'dark' ? nextDark : nextLight,
        applySurface ? [] : SURFACE_VAR_KEYS,
      )
    }
  }, [])

  const mergeOverrides = useCallback(
    (theme: 'light' | 'dark', updates: Record<string, string>) => {
      const storageKey =
        theme === 'light' ? STORAGE_KEYS.light : STORAGE_KEYS.dark
      const applyToDom = theme === resolvedTheme()
      const commit = (prev: Record<string, string>) => {
        const next = { ...prev, ...updates }
        writeSession(storageKey, JSON.stringify(next))
        if (applyToDom) applyDomOverrides(updates)
        return next
      }
      if (theme === 'light') {
        setLightOverrides(commit)
        return
      }
      setDarkOverrides(commit)
    },
    [],
  )

  const applyBrandPalette = useCallback(
    (
      palette: PaletteKey,
      hex: string,
      withSurface = applySurfaceBackground,
    ) => {
      if (!isHexColor(hex)) return
      const normalized = normalizeHex(hex)
      const darkHex = toDarkModeHex(normalized, palette)
      const lightUpdates = {
        ...buildPaletteOverrides(palette, normalized),
        ...(palette === 'primary' && withSurface
          ? buildSurfaceOverrides(normalized, 'light')
          : {}),
      }
      const darkUpdates = {
        ...buildPaletteOverrides(palette, darkHex),
        ...(palette === 'primary' && withSurface
          ? buildSurfaceOverrides(normalized, 'dark')
          : {}),
      }

      setPaletteBases((prev) => {
        const next = {
          dark: { ...prev.dark, [palette]: { hex: darkHex, swatch: null } },
          light: {
            ...prev.light,
            [palette]: { hex: normalized, swatch: null },
          },
        }
        writeSession(STORAGE_KEYS.bases, JSON.stringify(next))
        return next
      })
      mergeOverrides('light', lightUpdates)
      mergeOverrides('dark', darkUpdates)
    },
    [applySurfaceBackground, mergeOverrides],
  )

  const handleApplySurfaceToggle = (checked: boolean) => {
    setApplySurfaceBackground(checked)
    writeSession(STORAGE_KEYS.applySurface, checked ? 'true' : null)
    const primary = isHexColor(paletteBases.light.primary.hex)
      ? normalizeHex(paletteBases.light.primary.hex)
      : DEFAULT_PALETTES.light.primary.hex

    if (checked) {
      mergeOverrides('light', buildSurfaceOverrides(primary, 'light'))
      mergeOverrides('dark', buildSurfaceOverrides(primary, 'dark'))
      return
    }

    setLightOverrides((prev) => {
      const next = omitSurfaceOverrides(prev)
      writeSession(STORAGE_KEYS.light, JSON.stringify(next))
      if (resolvedTheme() === 'light') {
        applyDomOverrides({}, SURFACE_VAR_KEYS)
      }
      return next
    })
    setDarkOverrides((prev) => {
      const next = omitSurfaceOverrides(prev)
      writeSession(STORAGE_KEYS.dark, JSON.stringify(next))
      if (resolvedTheme() === 'dark') {
        applyDomOverrides({}, SURFACE_VAR_KEYS)
      }
      return next
    })
  }

  const persistBranding = useCallback(
    (next: {
      brandName: string
      dark: Record<string, string>
      favicon: string
      light: Record<string, string>
      logo: string
      palettes: PaletteBases
    }) => {
      persistBrandingToSession({
        applySurfaceBackground,
        brandName: next.brandName,
        colorPreferences: {
          dark: next.dark,
          light: next.light,
        },
        favicon: next.favicon,
        logo: next.logo,
        palettes: next.palettes,
      })
    },
    [applySurfaceBackground],
  )

  const handleSave = async () => {
    const snapshot = {
      brandName,
      dark: darkOverrides,
      favicon,
      light: lightOverrides,
      logo,
      palettes: paletteBases,
    }

    persistBranding(snapshot)
    setIsSaving(true)

    try {
      const session = authUserStore.getState().session
      const tenantId =
        session?.tenantId || authUserStore.getState().identity?.tenantId || ''
      const brandingJson = JSON.stringify({
        applySurfaceBackground,
        brandName: snapshot.brandName,
        colorPreferences: {
          dark: snapshot.dark,
          light: snapshot.light,
        },
        favicon: snapshot.favicon,
        logo: snapshot.logo,
        palettes: snapshot.palettes,
        savedAt: new Date().toISOString(),
      })

      const { error } = await saveBranding({
        brandingJson,
        brandingName: snapshot.brandName.trim(),
        tenantId,
        userEmail: session?.email || '',
        userId: session?.id || '',
      })

      if (error) {
        showToast({ message: error, variant: 'error' })
        return
      }

      const encrypted = await encryptBrandingName(snapshot.brandName.trim())
      if (encrypted.data?.encryptedBrandingName) {
        const url = `${window.location.origin}/${encrypted.data.encryptedBrandingName}`
        writeSession(
          STORAGE_KEYS.encryptedName,
          encrypted.data.encryptedBrandingName,
        )
        setShareUrl(url)
      } else if (encrypted.error) {
        showToast({
          message: encrypted.error,
          variant: 'error',
        })
      }

      showToast({
        message: t`Brand preferences saved successfully!`,
        variant: 'success',
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      showToast({
        message: t`Failed to save preferences: ${message}`,
        variant: 'error',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const wizardSteps = useMemo(
    () =>
      BRANDING_STEP_MSGS.map((step, index) => ({
        clickable: true,
        description: i18n._(step.description),
        disabled: false,
        icon: step.icon,
        id: index,
        label: i18n._(step.title),
      })),
    [i18n],
  )

  const previewName = brandName.trim() || t`Brand Name`

  return (
    <div className='flex h-full min-h-0 flex-col overflow-hidden'>
      <SettingsWizardLayout
        activeStep={activeStep}
        headerDescription={BRANDING_STEP_MSGS[activeStep]?.description}
        headerTitle={BRANDING_STEP_MSGS[activeStep]?.title}
        isSaving={isSaving}
        moduleTitle={onBack ? msg`Branding` : undefined}
        saveLabel={t`Save Branding`}
        steps={wizardSteps}
        setupTitle={onBack ? msg`Configure Branding` : undefined}
        onBack={() => setActiveStep((step) => Math.max(step - 1, 0))}
        onBackToSettings={onBack}
        onCancel={() => setActiveStep(0)}
        onNext={() => setActiveStep((step) => Math.min(step + 1, 1))}
        onSave={handleSave}
        onStepChange={setActiveStep}
      >
        <AnimatePresence initial={false} mode='wait'>
          {activeStep === 0 ? (
            <AnimateFadeIn
              className='flex flex-col gap-6 md:gap-7'
              key='step-assets'
            >
              <SettingsFormSection>
                <AnimateFadeIn delay={0.1}>
                  <BrandAssetDropzone
                    emptyHint={t`PNG, SVG or JPG, up to 5MB`}
                    emptyLabel={t`Click or drag to upload logo`}
                    image={logo}
                    label={t`Logo`}
                    storageKey={STORAGE_KEYS.logo}
                    onRemove={() => setLogo('')}
                    onUpload={setLogo}
                  />
                </AnimateFadeIn>
                <AnimateFadeIn delay={0.15}>
                  <BrandAssetDropzone
                    emptyHint={t`PNG or SVG`}
                    emptyLabel={t`Upload favicon`}
                    image={favicon}
                    label={t`Favicon`}
                    storageKey={STORAGE_KEYS.favicon}
                    compact
                    onRemove={() => setFavicon('')}
                    onUpload={setFavicon}
                  />
                </AnimateFadeIn>
              </SettingsFormSection>
            </AnimateFadeIn>
          ) : (
            <AnimateFadeIn
              className='flex flex-col gap-6 md:gap-7'
              key='step-identity'
            >
              <SettingsFormSection>
                <AnimateFadeIn delay={0.1}>
                  <InputText
                    description={t`Displayed in the header and login page`}
                    label={t`Brand Name`}
                    placeholder={t`e.g. Pure Agentic`}
                    value={brandName}
                    onChange={(value) => {
                      setBrandName(value)
                      writeSession(STORAGE_KEYS.brandName, value.trim() || null)
                    }}
                  />
                </AnimateFadeIn>

                <AnimateFadeIn delay={0.15}>
                  <div className='flex flex-col gap-4'>
                    <p className='text-13/5 font-semibold text-gray-12'>
                      {t`Brand Colors`}
                    </p>
                    <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                      <BrandColorPicker
                        hex={paletteBases.light.primary.hex}
                        label={t`Primary`}
                        onChange={(hex) => applyBrandPalette('primary', hex)}
                      />
                      <BrandColorPicker
                        hex={paletteBases.light.secondary.hex}
                        label={t`Secondary`}
                        onChange={(hex) => applyBrandPalette('secondary', hex)}
                      />
                    </div>
                  </div>
                </AnimateFadeIn>

                <AnimateFadeIn delay={0.18}>
                  <div className='rounded-xl border border-gray-4 bg-surface-secondary px-4 py-4'>
                    <InputCheckbox
                      checked={applySurfaceBackground}
                      description={t`When enabled, page and card backgrounds use a light or dark wash of the primary color.`}
                      label={t`Apply primary color to the background`}
                      onChange={(checked) =>
                        handleApplySurfaceToggle(Boolean(checked))
                      }
                    />
                  </div>
                </AnimateFadeIn>

                <AnimateFadeIn delay={0.22}>
                  <div className='flex flex-col gap-3'>
                    <p className='text-13/5 font-semibold text-gray-12'>
                      {t`Preview`}
                    </p>
                    <div className='flex items-center justify-between gap-3 rounded-xl border border-gray-4 bg-surface px-4 py-3'>
                      <div className='flex min-w-0 items-center gap-3'>
                        <span className='flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-4 bg-surface text-xs font-bold text-gray-12'>
                          {favicon ? (
                            <img
                              alt=''
                              className='size-full object-contain p-0.5'
                              src={favicon}
                            />
                          ) : (
                            previewName.slice(0, 1).toUpperCase()
                          )}
                        </span>
                        <span className='truncate text-sm font-semibold text-gray-12'>
                          {previewName}
                        </span>
                      </div>
                      {logo ? (
                        <img
                          alt=''
                          className='h-7 max-w-28 object-contain'
                          src={logo}
                        />
                      ) : null}
                    </div>
                  </div>
                </AnimateFadeIn>

                {shareUrl ? (
                  <AnimateFadeIn delay={0.25}>
                    <InputText
                      label={t`Branding URL`}
                      rightSectionPointerEvents='auto'
                      value={shareUrl}
                      readOnly
                      rightSection={
                        <IconButton
                          ariaLabel={t`Copy URL`}
                          color='gray'
                          icon='lucide:copy'
                          size='sm'
                          variant='ghost'
                          onClick={() => {
                            void navigator.clipboard
                              .writeText(shareUrl)
                              .then(() => {
                                showToast({
                                  message: t`URL copied`,
                                  variant: 'success',
                                })
                              })
                          }}
                        />
                      }
                      onChange={() => undefined}
                    />
                  </AnimateFadeIn>
                ) : null}
              </SettingsFormSection>
            </AnimateFadeIn>
          )}
        </AnimatePresence>
      </SettingsWizardLayout>
    </div>
  )
}

function BrandAssetDropzone({
  compact = false,
  emptyHint,
  emptyLabel,
  image,
  label,
  storageKey,
  onRemove,
  onUpload,
}: {
  compact?: boolean
  emptyHint: string
  emptyLabel: string
  image: string
  label: string
  storageKey: string
  onRemove: () => void
  onUpload: (value: string) => void
}) {
  const { t } = useLingui()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const readFile = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast({ message: t`Please upload an image file`, variant: 'error' })
      return
    }
    if (file.size > MAX_ASSET_BYTES) {
      showToast({ message: t`Files must be under 5MB`, variant: 'error' })
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      if (typeof event.target?.result !== 'string') return
      void trimImageDataUrl(event.target.result).then((next) => {
        onUpload(next)
        writeSession(storageKey, next)
        window.dispatchEvent(new CustomEvent('custom-preferences-updated'))
      })
    }
    reader.readAsDataURL(file)
  }

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    readFile(event.target.files?.[0])
    event.target.value = ''
  }

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setIsDragging(false)
    readFile(event.dataTransfer.files?.[0])
  }

  const boxClass = cn(
    'relative overflow-hidden rounded-xl border border-dashed bg-gray-1/60 transition hover:border-primary-6 hover:bg-primary-2/20',
    compact ? 'size-40' : 'h-56 w-full',
    isDragging ? 'border-primary-7 bg-primary-2/30' : 'border-gray-5',
  )

  return (
    <div className='flex flex-col gap-2'>
      <p className='text-13/5 font-semibold text-gray-12'>{label}</p>
      <input
        accept='image/*'
        className='hidden'
        ref={inputRef}
        type='file'
        onChange={handleInput}
      />
      {image ? (
        <div className='flex flex-col items-start gap-3'>
          <button
            className={cn(boxClass, 'border-solid border-gray-3 bg-gray-1')}
            type='button'
            onClick={() => inputRef.current?.click()}
            onDragLeave={() => setIsDragging(false)}
            onDragOver={(event) => {
              event.preventDefault()
              setIsDragging(true)
            }}
            onDrop={handleDrop}
          >
            <img
              alt={label}
              className='absolute inset-3 h-[calc(100%-1.5rem)] w-[calc(100%-1.5rem)] object-contain object-center'
              src={image}
            />
          </button>
          <Button
            color='red'
            label={t`Remove`}
            size='sm'
            variant='outline'
            onClick={() => {
              onRemove()
              writeSession(storageKey, null)
              window.dispatchEvent(
                new CustomEvent('custom-preferences-updated'),
              )
            }}
          />
        </div>
      ) : (
        <button
          type='button'
          className={cn(
            boxClass,
            'flex cursor-pointer items-center justify-center active:scale-[0.99]',
            compact ? 'flex-col gap-2 px-3 py-4' : 'flex-col gap-3 px-6 py-8',
          )}
          onClick={() => inputRef.current?.click()}
          onDragLeave={() => setIsDragging(false)}
          onDragOver={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDrop={handleDrop}
        >
          <span
            className={cn(
              'flex items-center justify-center rounded-full bg-primary-3 text-primary-9',
              compact ? 'size-10' : 'size-14',
            )}
          >
            <Icon
              className={cn(compact ? 'size-5' : 'size-7')}
              name='tabler:cloud-upload'
            />
          </span>
          <span className='flex flex-col items-center gap-0.5 text-center'>
            <span
              className={cn(
                'font-medium text-gray-12',
                compact ? 'text-12/5' : 'text-14/6',
              )}
            >
              {emptyLabel}
            </span>
            <span
              className={cn('text-gray-9', compact ? 'text-11/4' : 'text-12/5')}
            >
              {emptyHint}
            </span>
          </span>
        </button>
      )}
    </div>
  )
}

function BrandColorPicker({
  hex,
  label,
  onChange,
}: {
  hex: string
  label: string
  onChange: (hex: string) => void
}) {
  const value = isHexColor(hex) ? normalizeHex(hex) : '#ffffff'

  return (
    <label className='relative flex cursor-pointer items-center gap-3 rounded-xl border border-gray-3 bg-surface-primary px-3 py-2.5 transition hover:border-primary-6 active:scale-[0.99]'>
      <span
        className='size-8 shrink-0 rounded-md border border-gray-4 shadow-sm'
        style={{ backgroundColor: value }}
      />
      <span className='min-w-0 flex-1'>
        <span className='block text-13/5 font-semibold text-gray-12'>
          {label}
        </span>
        <span className='block font-mono text-12/5 text-gray-10'>{value}</span>
      </span>
      <input
        className='absolute inset-0 cursor-pointer opacity-0'
        type='color'
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  )
}

ColorPreference.displayName = 'ColorPreference'
export default ColorPreference
