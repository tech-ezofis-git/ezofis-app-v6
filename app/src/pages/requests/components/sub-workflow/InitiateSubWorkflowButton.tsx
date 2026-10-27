import { useLingui } from '@lingui/react/macro'
import Button from '@/components/base/button/Button'

interface Props {
  childName: string
  disabled?: boolean
  onClick: () => void
}

/** V5 "Initiate - <child workflow>" button shown in a request header. */
const InitiateSubWorkflowButton = ({ childName, disabled, onClick }: Props) => {
  const { t } = useLingui()
  return (
    <Button
      className='animate-in fade-in slide-in-from-right-1 h-8 rounded-lg px-3 text-[13px] font-semibold duration-200 active:scale-95'
      color='primary'
      disabled={disabled}
      icon='lucide:git-branch-plus'
      iconClass='size-4'
      label={t`Initiate - ${childName}`}
      size='md'
      variant='outline'
      onClick={onClick}
    />
  )
}

export default InitiateSubWorkflowButton
