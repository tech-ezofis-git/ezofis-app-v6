import { Avatar as Primitive } from '@mantine/core'

interface Props {
  initials: string
  className?: string
  image?: string
  imageLabel?: string
  size?: number
}

const Avatar: React.FC<Props> = ({
  className,
  image,
  imageLabel = 'avatar',
  initials,
  size = 36,
}) => {
  return (
    <Primitive
      alt={imageLabel}
      className={className}
      size={size}
      src={image}
      classNames={{
        placeholder: 'border-gray-200 bg-gray-100 font-semibold text-gray-700',
      }}
    >
      {initials}
    </Primitive>
  )
}

export default Avatar
