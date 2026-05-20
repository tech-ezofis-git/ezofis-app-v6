import Icon from '@/components/base/icon/Icon'
import { AnimateSlideLeft } from '@/components/common/animations'
import cn from '@/utils/cn'

type Props = {
  errors?: string[]
  isSubmitting?: boolean
  mapping: Record<string, string>
  systemColumns: SystemCol[]
  warnings?: string[]
  // setIsSubmitting: (isSubmitting: boolean) => void

  onBack?: () => void
  onConfirm?: () => void
}

type SystemCol = { key: string; required: boolean }

export default function Step3PreviewConfirm({ mapping, systemColumns }: Props) {
  const rows = systemColumns.map((c) => ({
    required: c.required,
    systemField: c.key,
    uploadedColumn: mapping[c.key] || '',
  }))

  const mappedCount = rows.filter((r) => !!r.uploadedColumn).length
  return (
    <AnimateSlideLeft className='flex flex-col gap-4'>
      <div className='flex items-start justify-between gap-4'>
        <div className='min-w-0'>
          <h2 className='text-lg font-bold text-gray-13'>Review & Confirm</h2>
          <p className='mt-0.5 text-xs font-medium text-gray-11'>
            Review your column mapping summary before finalizing the PO
            configuration.
          </p>
        </div>

        <div
          className={cn(
            'inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase shadow-sm',
            'bg-[var(--green-2)] text-[var(--green-9)]',
          )}
        >
          <Icon className='size-4' name='tabler:circle-check' />
          Ready to confirm
        </div>
      </div>

      <div className='overflow-hidden rounded-2xl border border-gray-3 bg-surface-primary shadow-sm'>
        <div className='flex items-center justify-between border-b border-gray-3 bg-surface-secondary/50 px-4 py-3'>
          <div className='text-xs font-bold text-gray-13'>Mapping Summary</div>
          <div className='text-[10px] font-bold tracking-wider text-gray-10 uppercase'>
            {mappedCount}/{rows.length} fields mapped
          </div>
        </div>

        <div className='overflow-x-auto'>
          <table className='w-full border-collapse'>
            <thead>
              <tr className='bg-surface-secondary/30'>
                <th className='border-b border-gray-3 px-4 py-2.5 text-left text-[10px] font-bold tracking-wider text-gray-10 uppercase'>
                  Master Field
                </th>
                <th className='border-b border-gray-3 px-4 py-2.5 text-left text-[10px] font-bold tracking-wider text-gray-10 uppercase'>
                  Mapped Source
                </th>
                <th className='border-b border-gray-3 px-4 py-2.5 text-right text-[10px] font-bold tracking-wider text-gray-10 uppercase'>
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => {
                const missing = !r.uploadedColumn
                return (
                  <tr
                    className='transition-colors hover:bg-surface-secondary/50'
                    key={r.systemField}
                  >
                    <td className='border-b border-gray-2 px-4 py-2.5 last:border-0'>
                      <span className='text-sm font-semibold text-gray-13'>
                        {r.systemField}
                      </span>
                      {r.required && (
                        <span className='ml-2 text-[10px] font-bold tracking-tight text-error-main uppercase'>
                          Required
                        </span>
                      )}
                    </td>

                    <td className='border-b border-gray-2 px-4 py-2.5 last:border-0'>
                      {missing ? (
                        <span className='bg-error-subtle inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-bold tracking-wider text-error-main uppercase'>
                          Not mapped
                        </span>
                      ) : (
                        <span className='inline-flex items-center rounded-lg bg-primary-9/10 px-2 py-0.5 text-[10px] font-bold text-primary-11'>
                          {r.uploadedColumn}
                        </span>
                      )}
                    </td>

                    <td className='border-b border-gray-2 px-4 py-2.5 text-right last:border-0'>
                      {missing ? (
                        <Icon
                          className='inline size-4 text-[var(--red-9)]'
                          name='tabler:alert-circle'
                        />
                      ) : (
                        <Icon
                          className='inline size-4 text-[var(--green-9)]'
                          name='tabler:circle-check'
                        />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AnimateSlideLeft>
  )
}
