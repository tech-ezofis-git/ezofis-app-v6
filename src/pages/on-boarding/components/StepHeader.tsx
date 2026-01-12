import IconIllustrated from '@/components/base/icon/IconIllustrated'
import Title from '@/components/base/Title'

interface Props {
  description: string
  icon: string
  title: string
}

const StepHeader = ({ description, icon, title }: Props) => {
  return (
    <>
      <IconIllustrated icon={icon} />
      <Title
        className='text-center'
        description={description}
        level={1}
        title={title}
      />
    </>
  )
}

StepHeader.displayName = 'StepHeader'
export default StepHeader
