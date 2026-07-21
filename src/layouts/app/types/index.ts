export interface Menu {
  icon: string
  label: string
  route: string
  permissionKey?: string
}

export interface MenuGroup {
  items: Menu[]
  label: string
}

export type Menus = MenuGroup[]
