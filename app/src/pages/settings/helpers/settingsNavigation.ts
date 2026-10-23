const SETTINGS_STATE_KEY = 'ezofis_settings_state'

/** Settings sub-pages remember their view (list / builder) in these keys. */
const SETTINGS_SUBPAGE_STATE_KEYS = [
  'ezofis_audit_monitoring_state',
  'ezofis_credits_state',
  'ezofis_dms_settings_state',
  'ezofis_group_management_state',
  'ezofis_manage_user_state',
  'ezofis_portal_configuration_state',
  'ezofis_roles_permissions_state',
]

export const RESET_SETTINGS_VIEW_EVENT = 'ezofis:reset-settings-view'

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

/**
 * Re-clicking Settings while on Settings: back to the main menu, and every
 * sub-page reopens on its list (not the builder that was open).
 */
export function resetSettingsView() {
  try {
    sessionStorage.removeItem(SETTINGS_STATE_KEY)
    SETTINGS_SUBPAGE_STATE_KEYS.forEach((key) => sessionStorage.removeItem(key))
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(RESET_SETTINGS_VIEW_EVENT))
}
