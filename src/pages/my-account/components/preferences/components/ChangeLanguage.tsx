import Button from '@/components/base/button/Button'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import useLanguage from '@/hooks/useLanguage'
import SectionTitle from '../../SectionTitle'

const ChangeLanguage = () => {
  const { language, languages, selectedLanguage, setLanguage } = useLanguage()

  return (
    <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
      <SectionTitle
        description='Select your preferred language'
        title='Change Language'
      />

      <div className='flex items-center justify-end'>
        <Menu
          position='bottom-start'
          width={144}
          target={
            <Button
              color='gray'
              label={selectedLanguage.name}
              suffixIcon='tabler:chevron-down'
              variant='outline'
            />
          }
        >
          {languages.map(({ code, name }) => (
            <MenuItem
              key={code}
              label={name}
              suffixIcon={language === code ? 'tabler:check' : ''}
              suffixIconClass='text-primary-11'
              onClick={() => setLanguage(code)}
            />
          ))}
        </Menu>
      </div>
    </div>
  )
}

ChangeLanguage.displayName = 'ChangeLanguage'
export default ChangeLanguage
