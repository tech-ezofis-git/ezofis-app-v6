import type { ComponentProps } from 'react'
import logoMark from '@/assets/logo/mark.png'
import logoText from '@/assets/logo/text.png'
import cn from '@/utils/cn'

const Logo = ({ className }: ComponentProps<'div'>) => {
  return (
    <div className={cn('flex h-8.5 items-center gap-1', className)}>
      <img alt='logo mark' className='size-8' src={logoMark} />
      <img alt='logo text' className='h-7' src={logoText} />
    </div>
  )
}

Logo.displayName = 'Logo'
export default Logo
