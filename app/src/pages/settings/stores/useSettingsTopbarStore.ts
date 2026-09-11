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
  actionToken: number
  breadcrumbs: SettingsBreadcrumbItem[]
  /** Clears the action only if `token` is still the most recent setAction call. */
  clearAction: (token: number) => void
  onNavigate?: (key: string) => void
  reset: () => void
  setAction: (action: SettingsTopbarAction | null) => number
  setBreadcrumbs: (
    breadcrumbs: SettingsBreadcrumbItem[],
    onNavigate?: (key: string) => void,
  ) => void
}

const DEFAULT_BREADCRUMBS: SettingsBreadcrumbItem[] = [{ label: 'Settings' }]

const useSettingsTopbarStore = create<SettingsTopbarState>((set, get) => ({
  action: null,
  actionToken: 0,
  breadcrumbs: DEFAULT_BREADCRUMBS,
  clearAction: (token) => {
    if (get().actionToken === token) {
      set({ action: null })
    }
  },
  reset: () =>
    set({
      breadcrumbs: DEFAULT_BREADCRUMBS,
      onNavigate: undefined,
    }),
  setAction: (action) => {
    const nextToken = get().actionToken + 1
    set({ action, actionToken: nextToken })
    return nextToken
  },
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
