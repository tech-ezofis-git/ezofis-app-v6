import { useLingui } from '@lingui/react/macro'
import Avatar from '@/components/base/Avatar'
import Tooltip from '@/components/base/Tooltip'
import authUserStore from '@/stores/authUserStore'
import useProfileImage from '@/hooks/useProfileImage'

const UserMenuTrigger = () => {
  const { t } = useLingui()
  const session = authUserStore((state) => state.session)
  const imageUrl = useProfileImage()

  const getInitials = () => {
    if (!session) return 'U'
    const fullName =
      session.name ||
      (session.firstName
        ? `${session.firstName} ${session.lastName || ''}`.trim()
        : '')
    if (!fullName) return 'U'
    return fullName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Tooltip content={t`User Profile`} openDelay={500}>
      <Avatar
        className='ml-2 cursor-pointer'
        image={imageUrl}
        imageLabel='user picture'
        initials={getInitials()}
      />
    </Tooltip>
  )
}

UserMenuTrigger.displayName = 'UserMenuTrigger'
export default UserMenuTrigger
