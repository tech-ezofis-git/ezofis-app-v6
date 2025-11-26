import { useLocalStorage } from '@mantine/hooks'

export default function useLanguage() {
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'French' },
    { code: 'ar', name: 'Arabic' },
  ]

  const [language, setLanguage] = useLocalStorage({
    defaultValue: 'en',
    key: 'language',
  })

  const selectedLanguage =
    languages.find((lang) => lang.code === language) || languages[0]

  return { language, languages, selectedLanguage, setLanguage }
}
