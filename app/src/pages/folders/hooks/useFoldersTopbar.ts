import { useEffect } from 'react'
import type { SettingsBreadcrumbConfig } from '@/pages/settings/helpers/settingsBreadcrumbs'
import useFoldersTopbarStore from '../stores/useFoldersTopbarStore'

export default function useFoldersTopbar({
  items,
  onNavigate,
}: SettingsBreadcrumbConfig) {
  const setBreadcrumbs = useFoldersTopbarStore((state) => state.setBreadcrumbs)
  const reset = useFoldersTopbarStore((state) => state.reset)

  useEffect(() => {
    setBreadcrumbs(items, onNavigate)
    return () => reset()
  }, [items, onNavigate, reset, setBreadcrumbs])
}
