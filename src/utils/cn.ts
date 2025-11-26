import { type ClassValue, clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21'],
    },
  },
})

export default function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
