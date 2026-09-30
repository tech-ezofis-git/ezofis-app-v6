const SETTINGS_STATE_KEY = 'ezofis_settings_state'

export function getSettingsReturnPath(modulePage: string): '/settings' | null {
  return readSettingsActivePage() === modulePage ? '/settings' : null
}

export function readSettingsActivePage(): string | null {
  try {
    const stored = sessionStorage.getItem(SETTINGS_STATE_KEY)
    if (!stored) return null
    const parsed = JSON.parse(stored) as { activePage?: unknown }
    return typeof parsed.activePage === 'string' ? parsed.activePage : null
  } catch {
    return null
  }
}
