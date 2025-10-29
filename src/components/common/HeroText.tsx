import cn from '@/utils/cn'

interface Props {
  description: string
  title: string
  className?: string
}

const HeroText = ({ className, description, title }: Props) => {
  return (
    <div
      className={cn('flex w-full flex-col items-center text-center', className)}
    >
      <h1 className='mb-1 font-poppins text-large font-semibold text-gray-13'>
        {title}
      </h1>
      <p className='text-small/6 text-pretty text-gray-11'>{description}</p>
    </div>
  )
}

HeroText.displayName = 'HeroText'
export default HeroText
