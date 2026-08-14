import { useMemo } from 'react'
import type { Form } from '@/types/form'
import Badge from '@/components/base/Badge'

interface Props {
  type?: Form['type'] | string | null
}

const FormTypeBadge = ({ type }: Props) => {
  const color = useMemo(() => {
    switch (type?.toUpperCase()) {
      case 'WORKFLOW':
        return 'cyan'
      case 'FORM':
        return 'green'
      case 'DOCUMENT':
        return 'blue'
      case 'DOCUMENT_FORM':
        return 'indigo'
      case 'MASTER':
        return 'violet'
      default:
        return 'gray'
    }
  }, [type])

  if (!type || String(type).trim().toUpperCase() === 'ITEM') {
    return null
  }

  return <Badge color={color} label={type} />
}

FormTypeBadge.displayName = 'FormTypeBadge'
export default FormTypeBadge
