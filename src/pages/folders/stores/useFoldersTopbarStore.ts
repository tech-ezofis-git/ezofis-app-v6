import { create } from 'zustand'
import type { SettingsBreadcrumbItem } from '@/pages/settings/helpers/settingsBreadcrumbs'

type FoldersTopbarState = {
  breadcrumbs: SettingsBreadcrumbItem[]
  onNavigate?: (key: string) => void
  reset: () => void
  setBreadcrumbs: (
    breadcrumbs: SettingsBreadcrumbItem[],
    onNavigate?: (key: string) => void,
  ) => void
}

const DEFAULT_BREADCRUMBS: SettingsBreadcrumbItem[] = [{ label: 'Folders' }]

const useFoldersTopbarStore = create<FoldersTopbarState>((set) => ({
  breadcrumbs: DEFAULT_BREADCRUMBS,
  onNavigate: undefined,
  reset: () => set({ breadcrumbs: DEFAULT_BREADCRUMBS, onNavigate: undefined }),
  setBreadcrumbs: (breadcrumbs, onNavigate) =>
    set({ breadcrumbs, onNavigate }),
}))

export default useFoldersTopbarStore
