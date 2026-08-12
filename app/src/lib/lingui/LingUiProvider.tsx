import type { ReactNode } from 'react'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { useLayoutEffect } from 'react'
import useLanguage from '@/hooks/useLanguage'
import { messages as arMessages } from '@/locales/ar/messages'
import { messages as enMessages } from '@/locales/en/messages'
import { messages as frMessages } from '@/locales/fr/messages'
import { messages as msMessages } from '@/locales/ms/messages'

i18n.load({
  ar: arMessages,
  en: enMessages,
  fr: frMessages,
  ms: msMessages,
})
i18n.activate('en')

// Never mirror the layout for any language — keep LTR chrome.
if (typeof document !== 'undefined') {
  document.documentElement.setAttribute('dir', 'ltr')
  document.body?.setAttribute('dir', 'ltr')
}

interface Props {
  children: ReactNode
}

const LingUiProvider = ({ children }: Props) => {
  const { language } = useLanguage()

  useLayoutEffect(() => {
    i18n.activate(language)
    document.documentElement.lang = language
    document.documentElement.setAttribute('dir', 'ltr')
    document.body.setAttribute('dir', 'ltr')
  }, [language])

  return <I18nProvider i18n={i18n}>{children}</I18nProvider>
}

LingUiProvider.displayName = 'LingUiProvider'
export default LingUiProvider
