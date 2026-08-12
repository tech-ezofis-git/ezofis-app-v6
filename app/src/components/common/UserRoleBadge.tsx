import { useMemo } from 'react'
import type { User } from '@/types/user'
import Badge from '@/components/base/Badge'

interface Props {
  role: User['role']
}

const UserRoleBadge = ({ role }: Props) => {
  const color = useMemo(() => {
    switch (role) {
      case 'Admin':
        return 'red'
      case 'Manager':
        return 'orange'
      case 'User':
        return 'green'
      default:
        return 'gray'
    }
  }, [role])

  return <Badge color={color} label={role} />
}

export default UserRoleBadge
