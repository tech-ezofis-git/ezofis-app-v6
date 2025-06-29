import { tv } from 'tailwind-variants'
import type { ButtonColor, ButtonVariant } from './types'

export default function getStyles(variant: ButtonVariant, color: ButtonColor) {
  const styles = tv({
    base: 'flex shrink-0 cursor-pointer appearance-none items-center gap-2 rounded-md border border-transparent font-medium outline-none select-none hover:transition-colors focus-visible:ring-2 focus-visible:ring-primary-300 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 data-[loading]:pointer-events-none',
    compoundVariants: [
      {
        class: 'bg-primary-bc hover:bg-primary-bc-hover',
        color: 'primary',
        variant: 'solid',
      },
      {
        class: 'bg-red-bc hover:bg-red-bc-hover',
        color: 'red',
        variant: 'solid',
      },
      {
        class: 'bg-gray-bc hover:bg-gray-bc-hover',
        color: 'gray',
        variant: 'solid',
      },

      {
        class:
          'border-gray-200 text-gray-fc hover:bg-gray-50 hover:text-gray-fc-hover',
        color: 'gray',
        variant: 'outline',
      },
      {
        class:
          'border-primary-200 text-primary-fc hover:bg-primary-50 hover:text-primary-fc-hover',
        color: 'primary',
        variant: 'outline',
      },
      {
        class:
          'border-red-200 text-red-fc hover:bg-red-50 hover:text-red-fc-hover',
        color: 'red',
        variant: 'outline',
      },

      {
        class:
          'bg-gray-50 text-gray-fc hover:bg-gray-100 hover:text-gray-fc-hover',
        color: 'gray',
        variant: 'subtle',
      },
      {
        class:
          'bg-primary-50 text-primary-fc hover:bg-primary-100 hover:text-primary-fc-hover',
        color: 'primary',
        variant: 'subtle',
      },
      {
        class: 'bg-red-50 text-red-fc hover:bg-red-100 hover:text-red-fc-hover',
        color: 'red',
        variant: 'subtle',
      },

      {
        class: 'text-gray-fc hover:bg-gray-50 hover:text-gray-fc-hover',
        color: 'gray',
        variant: 'ghost',
      },
      {
        class:
          'text-primary-fc hover:bg-primary-50 hover:text-primary-fc-hover',
        color: 'primary',
        variant: 'ghost',
      },
      {
        class: 'text-red-fc hover:bg-red-50 hover:text-red-fc-hover',
        color: 'red',
        variant: 'ghost',
      },
    ],
    variants: {
      color: {
        gray: '',
        primary: '',
        red: '',
      },
      variant: {
        ghost: '',
        outline: '',
        solid: 'text-gray-0 shadow-sm',
        subtle: '',
      },
    },
  })

  return styles({ color, variant })
}
