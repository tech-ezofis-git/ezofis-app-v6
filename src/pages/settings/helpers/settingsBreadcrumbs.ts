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
      { key: 'module', label: moduleLabel },
      { label: setupLabel },
    ],
    onNavigate: (key) => {
      // From create/edit setup, breadcrumb clicks return to the module list
      // (not the Settings home page).
      if (key === 'settings' || key === 'module') onCancelSetup()
    },
  }
}
