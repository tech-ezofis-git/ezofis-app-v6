import { useMemo } from 'react'
import type { Request } from '@/types/request'
import Badge from '@/components/base/Badge'

interface Props {
  status: Request['status']
}

const RequestStatusBadge = ({ status }: Props) => {
  const color = useMemo(() => {
    switch (status) {
      case 'Rejected':
        return 'red'
      case 'Pending':
        return 'orange'
      case 'Approved':
        return 'green'
      default:
        return 'gray'
    }
  }, [status])

  return <Badge color={color} label={status} />
}

RequestStatusBadge.displayName = 'RequestStatusBadge'
export default RequestStatusBadge
