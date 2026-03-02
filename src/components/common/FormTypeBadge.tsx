import { useMemo } from 'react'
import type { Form } from '@/types/form'
import Badge from '@/components/base/Badge'

interface Props {
  type: Form['type']
}

const FormTypeBadge = ({ type }: Props) => {
  const color = useMemo(() => {
    switch (type?.toUpperCase()) {
      case 'WORKFLOW':
        return 'cyan'
      case 'MASTER':
        return 'purple'
      case 'TASK':
        return 'blue'
      case 'FEEDBACK':
        return 'pink'
      default:
        return 'gray'
    }
  }, [type])

  return <Badge color={color} label={type} />
}

FormTypeBadge.displayName = 'FormTypeBadge'
export default FormTypeBadge
