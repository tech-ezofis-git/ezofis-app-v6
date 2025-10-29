import Button from './Button'

interface Props {
  onClick: () => void
}

const MicrosoftButton = ({ onClick }: Props) => {
  return (
    <Button
      className='w-full justify-center gap-3'
      color='gray'
      icon='logos:microsoft-icon'
      label='Continue with Microsoft'
      size='lg'
      variant='outline'
      onClick={onClick}
    />
  )
}

MicrosoftButton.displayName = 'MicrosoftButton'
export default MicrosoftButton
