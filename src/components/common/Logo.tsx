import logoMark from '@/assets/logo/mark.png'
import logoText from '@/assets/logo/text.png'
import cn from '@/utils/cn'

interface Props {
  className?: string
  hideText?: boolean
}

const Logo = ({ className, hideText = false }: Props) => {
  return (
    <div className={cn('flex h-9 items-center gap-1', className)}>
      <img alt='logo mark' className='size-8' src={logoMark} />
      {!hideText && <img alt='logo text' className='h-7' src={logoText} />}
    </div>
  )
}

Logo.displayName = 'Logo'
export default Logo
