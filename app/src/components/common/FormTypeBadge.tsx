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

  const label = useMemo(() => {
    if (!type) return ''
    const str = String(type).trim()
    switch (str.toUpperCase()) {
      case 'WORKFLOW':
        return 'Workflow'
      case 'FORM':
        return 'Form'
      case 'DOCUMENT':
        return 'Document'
      case 'DOCUMENT_FORM':
        return 'Document Form'
      case 'MASTER':
        return 'Master'
      default:
        return str
    }
  }, [type])

  if (!type || String(type).trim().toUpperCase() === 'ITEM') {
    return null
  }

  return <Badge color={color} label={label} />
}

FormTypeBadge.displayName = 'FormTypeBadge'
export default FormTypeBadge
