import { useMantineColorScheme } from '@mantine/core'
import IconButton from '@/components/base/button/IconButton'

interface Props {
  className?: string
}

const ThemeSwitcher = ({ className }: Props) => {
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
