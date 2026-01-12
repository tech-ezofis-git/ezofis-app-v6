import { useMemo } from 'react'
import type { Form } from '@/types/form'
import Badge from '@/components/base/Badge'

interface Props {
  type: Form['type']
}

const FormTypeBadge = ({ type }: Props) => {
  const color = useMemo(() => {
    switch (type) {
      case 'Workflow':
        return 'cyan'
      case 'Master':
        return 'purple'
      default:
        return 'gray'
    }
  }, [type])

  return <Badge color={color} label={type} />
}

FormTypeBadge.displayName = 'FormTypeBadge'
export default FormTypeBadge
