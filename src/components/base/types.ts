import type { OptionsPerLineClass } from './constants'

interface IList {
  items: IListItem[]
  limit: number
  skip: number
  total: number
}

interface IListItem {
  id: number
  label: string
  description?: string
  isDisabled?: boolean
}

interface IToast {
  message: string
  type?: TToastType
}

type TOptionsPerLine = keyof typeof OptionsPerLineClass
type TSelectType = 'single' | 'multiple'
type TToastType = 'default' | 'error' | 'success' | 'warning'

export type {
  IList,
  IListItem,
  IToast,
  TOptionsPerLine,
  TSelectType,
  TToastType,
}
