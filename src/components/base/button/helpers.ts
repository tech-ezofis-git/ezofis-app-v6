import { tv } from 'tailwind-variants'
import type { ButtonColor, ButtonVariant } from './types'

function getVariantClassName(variant: ButtonVariant, color: ButtonColor) {
  const className = tv({
    base: 'flex shrink-0 cursor-pointer appearance-none items-center gap-2 rounded border border-transparent font-medium outline-primary-8 transition-colors select-none focus-visible:outline-2 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 data-[loading]:pointer-events-none data-[loading]:opacity-75',
    compoundVariants: [
      {
        class: 'bg-gray-9 hover:bg-gray-10',
        color: 'gray',
        variant: 'solid',
      },
      {
        class: 'bg-primary-9 hover:bg-primary-10',
        color: 'primary',
        variant: 'solid',
      },
      {
        class: 'bg-secondary-9 hover:bg-secondary-10',
        color: 'secondary',
        variant: 'solid',
      },
      {
        class: 'bg-red-9 hover:bg-red-10',
        color: 'red',
        variant: 'solid',
      },
      {
        class: 'bg-green-9 hover:bg-green-10',
        color: 'green',
        variant: 'solid',
      },

      {
        class: 'border-gray-6 text-gray-11 hover:bg-gray-4 hover:text-gray-12',
        color: 'gray',
        variant: 'outline',
      },
      {
        class: 'border-primary-6 text-primary-11 hover:bg-primary-4',
        color: 'primary',
        variant: 'outline',
      },
      {
        class: 'border-secondary-6 text-secondary-11 hover:bg-secondary-4',
        color: 'secondary',
        variant: 'outline',
      },
      {
        class: 'border-red-6 text-red-11 hover:bg-red-4',
        color: 'red',
        variant: 'outline',
      },
      {
        class: 'border-green-6 text-green-11 hover:bg-green-4',
        color: 'green',
        variant: 'outline',
      },

      {
        class: 'bg-gray-3 text-gray-11 hover:bg-gray-4 hover:text-gray-12',
        color: 'gray',
        variant: 'subtle',
      },
      {
        class: 'bg-primary-3 text-primary-11 hover:bg-primary-4',
        color: 'primary',
        variant: 'subtle',
      },
      {
        class: 'bg-secondary-3 text-secondary-11 hover:bg-secondary-4',
        color: 'secondary',
        variant: 'subtle',
      },
      {
        class: 'bg-red-3 text-red-11 hover:bg-red-4',
        color: 'red',
        variant: 'subtle',
      },
      {
        class: 'bg-green-3 text-green-11 hover:bg-green-4',
        color: 'green',
        variant: 'subtle',
      },

      {
        class: 'text-gray-11 hover:bg-gray-4 hover:text-gray-12',
        color: 'gray',
        variant: 'ghost',
      },
      {
        class: 'text-primary-11 hover:bg-primary-4',
        color: 'primary',
        variant: 'ghost',
      },
      {
        class: 'text-secondary-11 hover:bg-secondary-4',
        color: 'secondary',
        variant: 'ghost',
      },
      {
        class: 'text-red-11 hover:bg-red-4',
        color: 'red',
        variant: 'ghost',
      },
      {
        class: 'text-green-11 hover:bg-green-4',
        color: 'green',
        variant: 'ghost',
      },
    ],
    variants: {
      color: {
        gray: '',
        green: '',
        primary: '',
        red: '',
        secondary: '',
      },
      variant: {
        ghost: '',
        outline: '',
        solid: 'text-white shadow-sm',
        subtle: '',
      },
    },
  })

  return className({ color, variant })
}

export { getVariantClassName }
