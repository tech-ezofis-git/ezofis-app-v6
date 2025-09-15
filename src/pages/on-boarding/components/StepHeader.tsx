import IconIllustrated from '@/components/base/icon/IconIllustrated'
import AuthTitle from '@/layouts/auth/components/AuthTitle'

interface Props {
  description: string
  icon: string
  title: string
}

const StepHeader = ({ description, icon, title }: Props) => {
  return (
    <>
      <IconIllustrated icon={icon} />
      <AuthTitle description={description} title={title} />
    </>
  )
}

StepHeader.displayName = 'StepHeader'
export default StepHeader
