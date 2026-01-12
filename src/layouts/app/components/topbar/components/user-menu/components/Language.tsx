import MenuItem from '@/components/base/menu/MenuItem'
import MenuSub from '@/components/base/menu/MenuSub'
import useLanguage from '@/hooks/useLanguage'

const Language = () => {
  const { language, languages, setLanguage } = useLanguage()

  return (
    <MenuSub icon='tabler:world' label='Language'>
      {languages.map(({ code, name }) => (
        <MenuItem
          key={code}
          label={name}
          suffixIcon={language === code ? 'tabler:check' : ''}
          suffixIconClass='text-primary-11'
          onClick={() => setLanguage(code)}
        />
      ))}
    </MenuSub>
  )
}

Language.displayName = 'Language'
export default Language