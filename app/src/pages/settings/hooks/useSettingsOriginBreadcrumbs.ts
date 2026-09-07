import { useMemo } from 'react'
import { useLingui } from '@lingui/react/macro'
import { useNavigate } from '@tanstack/react-router'
import {
  clearOpenedFromSettings,
  createSettingsListBreadcrumbs,
  isOpenedFromSettings,
} from '../helpers/settingsBreadcrumbs'
import useSettingsTopbar from './useSettingsTopbar'

export default function useSettingsOriginBreadcrumbs(moduleLabel: string) {
  const { i18n, t } = useLingui()
  const navigate = useNavigate()
  const fromSettings = isOpenedFromSettings()

  const breadcrumbConfig = useMemo(
    () =>
      fromSettings
        ? createSettingsListBreadcrumbs(
            moduleLabel,
            () => {
              clearOpenedFromSettings()
              void navigate({ to: '/settings' })
            },
            t`Settings`,
          )
        : { items: [] },
    [fromSettings, moduleLabel, navigate, t, i18n.locale],
  )

  useSettingsTopbar(breadcrumbConfig)
}
