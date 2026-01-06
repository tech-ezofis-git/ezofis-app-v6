import { useMemo } from 'react'
import type { Form } from '@/types/form'
import Badge from '@/components/base/Badge'

interface Props {
  status: Form['status']
}

const FormStatusBadge = ({ status }: Props) => {
  const color = useMemo(() => {
    switch (status) {
      case 'Draft':
        return 'orange'
      case 'Published':
        return 'green'
      default:
        return 'gray'
    }
  }, [status])

  return <Badge color={color} label={status} />
}

FormStatusBadge.displayName = 'FormStatusBadge'
export default FormStatusBadge
