import type { ReactNode } from 'react'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { useEffect } from 'react'
import useLanguage from '@/hooks/useLanguage'
import { messages as arMessages } from '@/locales/ar/messages'
import { messages as enMessages } from '@/locales/en/messages'
import { messages as frMessages } from '@/locales/fr/messages'

i18n.load({ ar: arMessages, en: enMessages, fr: frMessages })
i18n.activate('en')

interface Props {
  children: ReactNode
}

const LingUiProvider = ({ children }: Props) => {
  const { language } = useLanguage()

  useEffect(() => {
    i18n.activate(language)
  }, [language])

  return <I18nProvider i18n={i18n}>{children}</I18nProvider>
}

LingUiProvider.displayName = 'LingUiProvider'
export default LingUiProvider
