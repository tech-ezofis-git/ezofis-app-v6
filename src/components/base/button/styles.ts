import { tv } from 'tailwind-variants'
import type { ButtonColor, ButtonVariant } from './types'

export default function getStyles(variant: ButtonVariant, color: ButtonColor) {
  const styles = tv({
    base: 'flex shrink-0 cursor-pointer appearance-none items-center gap-2 rounded-md border border-transparent font-medium outline-none select-none hover:transition-colors focus-visible:ring-2 focus-visible:ring-primary/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 data-[loading]:pointer-events-none',
    compoundVariants: [
      {
        class: 'bg-gray-600 hover:bg-gray-650',
        color: 'gray',
        variant: 'solid',
      },
      {
        class: 'bg-primary hover:bg-primary-hover',
        color: 'primary',
        variant: 'solid',
      },
      {
        class: 'bg-red hover:bg-red-hover',
        color: 'red',
        variant: 'solid',
      },

      {
        class:
          'border-gray-600/20 text-gray-700 hover:bg-gray-600/10 hover:text-gray-750',
        color: 'gray',
        variant: 'outline',
      },
      {
        class:
          'border-primary/20 text-primary hover:bg-primary/10 hover:text-primary-hover',
        color: 'primary',
        variant: 'outline',
      },
      {
        class: 'border-red/20 text-red hover:bg-red/10 hover:text-red-hover',
        color: 'red',
        variant: 'outline',
      },

      {
        class:
          'bg-gray-600/10 text-gray-700 hover:bg-gray-600/15 hover:text-gray-750',
        color: 'gray',
        variant: 'subtle',
      },
      {
        class:
          'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary-hover',
        color: 'primary',
        variant: 'subtle',
      },
      {
        class: 'bg-red/10 text-red hover:bg-red/15 hover:text-red-hover',
        color: 'red',
        variant: 'subtle',
      },

      {
        class: 'text-gray-700 hover:bg-gray-600/10 hover:text-gray-750',
        color: 'gray',
        variant: 'ghost',
      },
      {
        class: 'text-primary hover:bg-primary/10 hover:text-primary-hover',
        color: 'primary',
        variant: 'ghost',
      },
      {
        class: 'text-red hover:bg-red/10 hover:text-red-hover',
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
