import type { OptionsPerLineClass } from './constants'

export type InputWrapperOrder = 'input' | 'label' | 'description' | 'error'

export type OptionsPerLine = keyof typeof OptionsPerLineClass

export type SelectVariant = 'single' | 'multiple'
