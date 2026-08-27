import { useEffect, useState } from 'react'
import logoMarkDefault from '@/assets/logo/mark.png'
import logoTextDefault from '@/assets/logo/text.png'
import cn from '@/utils/cn'

interface Props {
  className?: string
  hideMark?: boolean
  hideText?: boolean
  markClassName?: string
}

const readSession = (key: string) => {
  if (typeof window === 'undefined') return ''
  return sessionStorage.getItem(key) || ''
}

const Logo = ({
  className,
  hideMark = false,
  hideText = false,
  markClassName,
}: Props) => {
  const [logoMark, setLogoMark] = useState(logoMarkDefault)
  const [logoText, setLogoText] = useState(logoTextDefault)
  const [brandName, setBrandName] = useState('')

  useEffect(() => {
    const syncFromSession = () => {
      const customMark = readSession('custom-logo-mark')
      const customText = readSession('custom-logo-text')
      const customName = readSession('custom-brand-name')
      setLogoMark(customMark || logoMarkDefault)
      setLogoText(customText || logoTextDefault)
      setBrandName(customName)
    }

    syncFromSession()
    window.addEventListener('storage', syncFromSession)
    window.addEventListener('custom-preferences-updated', syncFromSession)

    return () => {
      window.removeEventListener('storage', syncFromSession)
      window.removeEventListener('custom-preferences-updated', syncFromSession)
    }
  }, [])

  const customMark = logoMark !== logoMarkDefault
  const customText = logoText !== logoTextDefault
  const name = brandName.trim()
  const initial = name.slice(0, 1).toUpperCase()

  const mark = customMark ? (
    <img
      alt='logo mark'
      className={cn('size-10 object-contain object-center', markClassName)}
      src={logoMark}
    />
  ) : initial ? (
    <span
      className={cn(
        'flex size-10 items-center justify-center rounded-md bg-primary-9 text-sm font-bold text-white',
        markClassName,
      )}
    >
      {initial}
    </span>
  ) : (
    <img
      alt='logo mark'
      className={cn('size-10 object-contain object-center', markClassName)}
      src={logoMarkDefault}
    />
  )

  const wordmark = customText ? (
    <img
      alt='logo'
      className='h-12 w-full object-contain object-left'
      src={logoText}
    />
  ) : name ? (
    <span className='truncate text-base font-semibold text-gray-12'>
      {name}
    </span>
  ) : (
    <img
      alt='logo'
      className='h-10 object-contain object-left'
      src={logoTextDefault}
    />
  )

  if (hideText) {
    return (
      <div
        className={cn('flex size-10 items-center justify-center', className)}
      >
        {mark}
      </div>
    )
  }

  if (hideMark) {
    return (
      <div className={cn('flex h-12 min-w-0 flex-1 items-center', className)}>
        {wordmark}
      </div>
    )
  }

  return (
    <div className={cn('flex h-12 items-center gap-1', className)}>
      {mark}
      {wordmark}
    </div>
  )
}

Logo.displayName = 'Logo'
export default Logo
