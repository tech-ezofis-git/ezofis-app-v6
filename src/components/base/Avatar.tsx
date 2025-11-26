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
  size = 30,
}: Props) => {
  return (
    <Base
      alt={imageLabel}
      className={className}
      size={size}
      src={image}
      classNames={{
        placeholder: 'border-none bg-gray-3 font-semibold text-gray-11',
      }}
    >
      {initials}
    </Base>
  )
}

Avatar.displayName = 'Avatar'
export default Avatar
