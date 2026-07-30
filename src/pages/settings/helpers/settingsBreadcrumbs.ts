export const SETTINGS_ROOT_LABEL = 'Settings'

export type SettingsBreadcrumbConfig = {
  items: SettingsBreadcrumbItem[]
  onNavigate?: (key: string) => void
}

export type SettingsBreadcrumbItem = {
  key?: string
  label: string
}

export function createSettingsListBreadcrumbs(
  moduleLabel: string,
  onBackToSettings?: () => void,
  settingsLabel: string = SETTINGS_ROOT_LABEL,
): SettingsBreadcrumbConfig {
  return {
    items: [
      { key: 'settings', label: settingsLabel },
      { label: moduleLabel },
    ],
    onNavigate: onBackToSettings
      ? (key) => {
          if (key === 'settings') onBackToSettings()
        }
      : undefined,
  }
}

export function createSettingsRootBreadcrumbs(
  settingsLabel: string = SETTINGS_ROOT_LABEL,
): SettingsBreadcrumbConfig {
  return {
    items: [{ label: settingsLabel }],
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
  settingsLabel: string = SETTINGS_ROOT_LABEL,
): SettingsBreadcrumbConfig {
  return {
    items: [
      { key: 'settings', label: settingsLabel },
      { key: 'folder', label: setupLabel },
      { label: moduleLabel },
    ],
    onNavigate: (key) => {
      if (key === 'settings') {
        onCancelSetup()
        onBackToSettings?.()
        return
      }

      if (key === 'folder') onCancelSetup()
    },
  }
}
