import { create } from 'zustand'
import type { SettingsBreadcrumbItem } from '../helpers/settingsBreadcrumbs'

type SettingsTopbarState = {
  breadcrumbs: SettingsBreadcrumbItem[]
  onNavigate?: (key: string) => void
  reset: () => void
  setBreadcrumbs: (
    breadcrumbs: SettingsBreadcrumbItem[],
    onNavigate?: (key: string) => void,
  ) => void
}

const DEFAULT_BREADCRUMBS: SettingsBreadcrumbItem[] = [{ label: 'Settings' }]

const useSettingsTopbarStore = create<SettingsTopbarState>((set) => ({
  breadcrumbs: DEFAULT_BREADCRUMBS,
  reset: () => set({ breadcrumbs: DEFAULT_BREADCRUMBS, onNavigate: undefined }),
  setBreadcrumbs: (breadcrumbs, onNavigate) => set({ breadcrumbs, onNavigate }),
  onNavigate: undefined,
}))

export default useSettingsTopbarStore
