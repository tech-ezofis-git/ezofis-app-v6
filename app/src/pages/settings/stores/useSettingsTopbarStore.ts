import { create } from 'zustand'
import type { SettingsBreadcrumbItem } from '../helpers/settingsBreadcrumbs'

export type SettingsTopbarAction = {
  color?: 'gray' | 'green' | 'primary' | 'red' | 'secondary'
  icon?: string
  label: string
  onClick: () => void
}

type SettingsTopbarState = {
  action: SettingsTopbarAction | null
  breadcrumbs: SettingsBreadcrumbItem[]
  onNavigate?: (key: string) => void
  reset: () => void
  setAction: (action: SettingsTopbarAction | null) => void
  setBreadcrumbs: (
    breadcrumbs: SettingsBreadcrumbItem[],
    onNavigate?: (key: string) => void,
  ) => void
}

const DEFAULT_BREADCRUMBS: SettingsBreadcrumbItem[] = [{ label: 'Settings' }]

const useSettingsTopbarStore = create<SettingsTopbarState>((set) => ({
  action: null,
  breadcrumbs: DEFAULT_BREADCRUMBS,
  reset: () =>
    set({
      action: null,
      breadcrumbs: DEFAULT_BREADCRUMBS,
      onNavigate: undefined,
    }),
  setAction: (action) => set({ action }),
  setBreadcrumbs: (breadcrumbs, onNavigate) =>
    set({
      breadcrumbs: Array.isArray(breadcrumbs)
        ? breadcrumbs
        : DEFAULT_BREADCRUMBS,
      onNavigate,
    }),
  onNavigate: undefined,
}))

export default useSettingsTopbarStore
