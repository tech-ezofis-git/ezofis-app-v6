import { Avatar as Base } from '@mantine/core'

interface Props {
  initials: string
  className?: string
  image?: string
  imageLabel?: string
  size?: number
}

const Avatar = ({
  className,
  image,
  imageLabel = 'avatar',
  initials,
  size = 36,
}: Props) => {
  return (
    <Base
      alt={imageLabel}
      className={className}
      size={size}
      src={image}
      classNames={{
        placeholder: 'border-none bg-gray-3 font-medium text-gray-11',
      }}
    >
      {initials}
    </Base>
  )
}

Avatar.displayName = 'Avatar'
export default Avatar
