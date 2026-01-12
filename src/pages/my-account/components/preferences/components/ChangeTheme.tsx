import Button from '@/components/base/button/Button'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import Title from '@/components/base/Title'
import useTheme from '@/hooks/useTheme'

const ChangeTheme = () => {
  const {
    colorScheme,
    ColorSchemeOptions,
    handleColorSchemeChange,
    selectedColorScheme,
  } = useTheme()

  return (
    <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
      <Title
        description='Select or customize your interface color scheme'
        level={4}
        title='Change Theme'
      />

      <div className='flex items-center justify-end'>
        <Menu
          position='bottom-start'
          width={144}
          target={
            <Button
              color='gray'
              icon={selectedColorScheme.icon}
              label={selectedColorScheme.label}
              suffixIcon='lucide:chevron-down'
              variant='outline'
            />
          }
        >
          {ColorSchemeOptions.map((option) => (
            <MenuItem
              icon={option.icon}
              key={option.value}
              label={option.label}
              iconClass={
                option.value === colorScheme ? 'text-primary-11' : 'text-gray-9'
              }
              onClick={handleColorSchemeChange(option.value)}
            />
          ))}
        </Menu>
      </div>
    </div>
  )
}

ChangeTheme.displayName = 'ChangeTheme'
export default ChangeTheme
