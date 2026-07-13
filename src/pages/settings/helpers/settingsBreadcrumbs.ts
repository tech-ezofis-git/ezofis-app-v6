export const SETTINGS_ROOT_LABEL = 'Settings'

export type SettingsBreadcrumbItem = {
  key?: string
  label: string
}

export type SettingsBreadcrumbConfig = {
  items: SettingsBreadcrumbItem[]
  onNavigate?: (key: string) => void
}

export function createSettingsRootBreadcrumbs(): SettingsBreadcrumbConfig {
  return {
    items: [{ label: SETTINGS_ROOT_LABEL }],
  }
}

export function createSettingsListBreadcrumbs(
  moduleLabel: string,
  onBackToSettings?: () => void,
): SettingsBreadcrumbConfig {
  return {
    items: [
      { key: 'settings', label: SETTINGS_ROOT_LABEL },
      { label: moduleLabel },
    ],
    onNavigate: onBackToSettings
      ? (key) => {
          if (key === 'settings') onBackToSettings()
        }
      : undefined,
  }
}

export function createSettingsSetupBreadcrumbs(
  moduleLabel: string,
  setupLabel: string,
  {
    onBackToSettings,
    onCancelSetup,
  }: {
    onBackToSettings?: () => void
    onCancelSetup: () => void
  },
): SettingsBreadcrumbConfig {
  return {
    items: [
      { key: 'settings', label: SETTINGS_ROOT_LABEL },
      { key: 'module', label: moduleLabel },
      { label: setupLabel },
    ],
    onNavigate: (key) => {
      if (key === 'settings') {
        onCancelSetup()
        onBackToSettings?.()
        return
      }

      if (key === 'module') onCancelSetup()
    },
  }
}
