import { useLingui } from '@lingui/react/macro'
import MenuItem from '@/components/base/menu/MenuItem'
import MenuSub from '@/components/base/menu/MenuSub'
import useLanguage from '@/hooks/useLanguage'

const Language = () => {
  const { t } = useLingui()
  const { language, languages, setLanguage } = useLanguage()

  return (
    <MenuSub icon='lucide:languages' label={t`Language`}>
      {languages.map(({ code, name }) => (
        <MenuItem
          key={code}
          label={name}
          suffixIcon={language === code ? 'lucide:check' : ''}
          suffixIconClass='text-primary-11'
          onClick={() => setLanguage(code)}
        />
      ))}
    </MenuSub>
  )
}

Language.displayName = 'Language'
export default Language
