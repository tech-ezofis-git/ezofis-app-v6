import { useEffect } from 'react'
import type { SettingsBreadcrumbConfig } from '../helpers/settingsBreadcrumbs'
import useSettingsTopbarStore from '../stores/useSettingsTopbarStore'

export default function useSettingsTopbar({
  items,
  onNavigate,
}: SettingsBreadcrumbConfig) {
  const setBreadcrumbs = useSettingsTopbarStore((state) => state.setBreadcrumbs)
  const reset = useSettingsTopbarStore((state) => state.reset)

  useEffect(() => {
    setBreadcrumbs(items, onNavigate)
    return () => reset()
  }, [items, onNavigate, reset, setBreadcrumbs])
}
