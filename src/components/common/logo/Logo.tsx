import logoMark from '@/assets/logo/mark.png'
import logoText from '@/assets/logo/text.png'

const Logo = () => {
  return (
    <div className='flex h-8.5 items-center gap-1'>
      <img alt='logo mark' className='size-8' src={logoMark} />
      <img alt='logo text' className='hidden h-7 lg:block' src={logoText} />
    </div>
  )
}

Logo.displayName = 'Logo'
export default Logo
