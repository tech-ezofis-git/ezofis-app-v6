import { useMantineColorScheme } from '@mantine/core'
import { IconButton } from '@/components/base'

interface Props {
  className?: string
}

const ThemeSwitcher: React.FC<Props> = ({ className }) => {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme()

  return (
    <IconButton
      className={className}
      color='gray'
      icon={colorScheme === 'dark' ? 'tabler:sun-high' : 'tabler:moon'}
      variant='ghost'
      onClick={toggleColorScheme}
    />
  )
}

export default ThemeSwitcher
