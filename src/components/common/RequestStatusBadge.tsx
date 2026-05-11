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
      case 'Duplicated':
        return 'red'
      case 'Pending':
        return 'orange'
      case 'Approved':
      case 'Completed':
      case 'Verifier':
        return 'green'
      case 'Start':
      case 'AI Agent':
      case 'Extracting':
      case 'Processing':
        return 'primary'
      default:
        return 'gray'
    }
  }, [status])

  const isProcessing = ['Start', 'AI Agent', 'Extracting', 'Processing'].includes(status || '')

  return (
    <Badge
      color={color}
      label={
        isProcessing ? (
          <span className="flex items-center gap-1.5">
            <svg className="animate-spin h-3 w-3 text-current" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="animate-pulse">Processing</span>
          </span>
        ) : status
      }
    />
  )
}

RequestStatusBadge.displayName = 'RequestStatusBadge'
export default RequestStatusBadge
