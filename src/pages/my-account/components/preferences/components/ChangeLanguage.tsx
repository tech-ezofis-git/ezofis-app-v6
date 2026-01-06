import Button from '@/components/base/button/Button'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import Title from '@/components/base/Title'
import useLanguage from '@/hooks/useLanguage'

const ChangeLanguage = () => {
  const { language, languages, selectedLanguage, setLanguage } = useLanguage()

  return (
    <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
      <Title
        description='Select your preferred language'
        level={4}
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
              suffixIcon='lucide:chevron-down'
              variant='outline'
            />
          }
        >
          {languages.map(({ code, name }) => (
            <MenuItem
              key={code}
              label={name}
              suffixIcon={language === code ? 'lucide:check' : ''}
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
