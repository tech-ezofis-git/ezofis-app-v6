import { Avatar as Base } from '@mantine/core'

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
    <Base
      alt={imageLabel}
      className={className}
      size={size}
      src={image}
      classNames={{
        placeholder:
          'border-gray-600/10 bg-gray-600/5 font-semibold text-gray-700',
      }}
    >
      {initials}
    </Base>
  )
}

Avatar.displayName = 'Avatar'
export default Avatar
