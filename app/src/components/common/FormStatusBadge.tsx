import { useMemo } from 'react'
import type { Form } from '@/types/form'
import cn from '@/utils/cn'

interface Props {
  status: Form['status'] | string
}

const FormStatusBadge = ({ status }: Props) => {
  const normalized = String(status || '').trim().toUpperCase()

  const { className, label } = useMemo(() => {
    if (normalized === 'PUBLISHED' || normalized === '1' || status === 1) {
      return {
        className:
          'border-[var(--green-5)] bg-[var(--green-3)] text-[var(--green-11)]',
        label: 'Published',
      }
    }
    return {
      className:
        'border-[var(--gray-4)] bg-[var(--gray-2)] text-[var(--gray-10)]',
      label: 'Draft',
    }
  }, [normalized, status])

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[10px] border px-2.5 py-0.5 text-xs font-normal',
        className,
      )}
    >
      {label}
    </span>
  )
}

FormStatusBadge.displayName = 'FormStatusBadge'
export default FormStatusBadge
