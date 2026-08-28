export const SETTINGS_ROOT_LABEL = 'Settings'

const OPENED_FROM_SETTINGS_KEY = 'ezofis:opened-from-settings'

export const markOpenedFromSettings = () => {
  try {
    sessionStorage.setItem(OPENED_FROM_SETTINGS_KEY, '1')
  } catch {
    // ignore
  }
}

export const clearOpenedFromSettings = () => {
  try {
    sessionStorage.removeItem(OPENED_FROM_SETTINGS_KEY)
  } catch {
    // ignore
  }
}

export const isOpenedFromSettings = () => {
  try {
    return sessionStorage.getItem(OPENED_FROM_SETTINGS_KEY) === '1'
  } catch {
    return false
  }
}

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
      { key: 'module', label: moduleLabel },
      { label: setupLabel },
    ],
    onNavigate: (key) => {
      if (key === 'settings') {
        if (onBackToSettings) {
          onBackToSettings()
        } else {
          onCancelSetup()
        }
      } else if (key === 'module') {
        onCancelSetup()
      }
    },
  }
}
