import type { useNavigate } from '@tanstack/react-router'
import { markOpenedFromSettings } from '@/pages/settings/helpers/settingsBreadcrumbs'

const SETTINGS_STATE_KEY = 'ezofis_settings_state'

export type ReportBuilderStep =
  | 'ask-ai'
  | 'details'
  | 'fields'
  | 'filters'
  | 'schedule'

/**
 * Navigates to the Settings → Report Builder wizard. Settings has no
 * dedicated route per page (SettingsMain switches on an `activePage` kept in
 * sessionStorage), so we seed that state before navigating, mirroring the
 * `href` item pattern in SettingsMain/settingsBreadcrumbs.
 */
export const openReportBuilder = (
  navigate: ReturnType<typeof useNavigate>,
  step?: ReportBuilderStep,
) => {
  try {
    sessionStorage.setItem(
      SETTINGS_STATE_KEY,
      JSON.stringify({ activePage: 'report-builder' }),
    )
  } catch {
    // ignore
  }
  markOpenedFromSettings()
  void navigate({ search: step ? { step } : {}, to: '/settings' })
}
