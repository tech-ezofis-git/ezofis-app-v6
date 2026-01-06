export interface Menu {
  icon: string
  label: string
  route: string
}

export interface MenuGroup {
  items: Menu[]
  label: string
}

export type Menus = MenuGroup[]
