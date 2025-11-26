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
      <h1 className='mb-1 font-poppins text-17 font-semibold text-gray-13'>
        {title}
      </h1>
      <p className='text-13/6 text-pretty text-gray-11'>{description}</p>
    </div>
  )
}

HeroText.displayName = 'HeroText'
export default HeroText
