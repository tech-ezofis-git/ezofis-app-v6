import Button from './Button'

interface Props {
  onClick: () => void
}

const GoogleButton = ({ onClick }: Props) => {
  return (
    <Button
      className='w-full justify-center gap-3'
      color='gray'
      icon='logos:google-icon'
      label='Continue with Google'
      size='lg'
      variant='outline'
      onClick={onClick}
    />
  )
}

GoogleButton.displayName = 'GoogleButton'
export default GoogleButton
