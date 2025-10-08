import IconIllustrated from '@/components/base/icon/IconIllustrated'
import HeroText from '@/components/common/HeroText'

interface Props {
  description: string
  icon: string
  title: string
}

const StepHeader = ({ description, icon, title }: Props) => {
  return (
    <>
      <IconIllustrated icon={icon} />
      <HeroText description={description} title={title} />
    </>
  )
}

StepHeader.displayName = 'StepHeader'
export default StepHeader
