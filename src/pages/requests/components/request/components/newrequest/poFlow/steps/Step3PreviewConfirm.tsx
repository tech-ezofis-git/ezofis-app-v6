import Icon from '@/components/base/icon/Icon'
import { AnimateSlideLeft } from '@/components/common/animations'
// import { useState } from 'react';

type Props = {
  errors?: string[]
  isSubmitting: boolean
  mapping: Record<string, string>
  systemColumns: SystemCol[]
  warnings?: string[]
  // setIsSubmitting: (isSubmitting: boolean) => void

  onBack: () => void
  onConfirm: () => void
}

type SystemCol = { key: string; required: boolean }

export default function Step3PreviewConfirm({
  isSubmitting,
  mapping,
  systemColumns,
  onBack,
  onConfirm,
  // setIsSubmitting
}: Props) {
  const rows = systemColumns.map((c) => ({
    required: c.required,
    systemField: c.key,
    uploadedColumn: mapping[c.key] || '',
  }))

  const mappedCount = rows.filter((r) => !!r.uploadedColumn).length
  const handleConfirmClick = () => {
    if (isSubmitting) return // Prevent multiple submissions

    try {
      onConfirm() // Call the parent function to process the confirmation
    } catch (error) {
      // Handle any errors if needed
      console.error(error)
    } finally {
      // setIsSubmitting(false); // Reset loading state after the process is done
    }
  }
  return (
    <div
      className={[
        // ✅ Fit into viewport
        'w-full max-w-full',
        'max-h-[calc(90vh-190px)]', // adjust offset if your page has bigger header
        'overflow-hidden',

        // ✅ Card styling
        'rounded-2xl border border-[var(--gray-3)] bg-[var(--gray-0)] shadow-sm',
        // ✅ Layout to allow internal scrolling
        'flex flex-col',
      ].join(' ')}
    >
      {/* Header (stays visible) */}
      <div className='shrink-0 p-5'>
        <div className='flex items-start justify-between gap-3'>
          <div className='min-w-0'>
            <div className='text-18 font-semibold text-[var(--gray-13)]'>
              Preview & Confirm
            </div>
            <div className='mt-1 text-13 text-[var(--gray-10)]'>
              Review your mapping, verify warnings, and confirm to proceed.
            </div>
          </div>

          <div
            className={[
              'inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-12 font-semibold',
              'bg-[var(--green-2)] text-[var(--green-9)]',
            ].join(' ')}
          >
            <Icon className='size-4' name='tabler:circle-check' />
            Ready to confirm
          </div>
        </div>
      </div>

      {/* Content area (scrolls if needed) */}
      <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-5 pb-5'>
        {/* Mapping preview */}
        <div className='flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--gray-3)]'>
          <div className='flex shrink-0 items-center justify-between bg-[var(--gray-1)] px-4 py-3'>
            <div className='text-13 font-semibold text-[var(--gray-12)]'>
              Mapping Summary
            </div>
            <div className='text-12 text-[var(--gray-10)]'>
              {mappedCount}/{rows.length} fields mapped
            </div>
          </div>

          {/* ✅ This becomes the scrolling region */}
          <div className='min-h-0 flex-1 overflow-auto'>
            <div className='min-w-full overflow-x-auto'>
              <AnimateSlideLeft>
                <table className='w-full border-collapse'>
                  <thead className='sticky top-0 z-10 bg-[var(--gray-0)]'>
                    <tr className='border-b border-[var(--gray-3)]'>
                      <th className='px-4 py-2 text-left text-12 font-semibold text-[var(--gray-11)]'>
                        Master Field
                      </th>
                      <th className='px-4 py-2 text-left text-12 font-semibold text-[var(--gray-11)]'>
                        Mapped Source
                      </th>
                      <th className='px-4 py-2 text-right text-12 font-semibold text-[var(--gray-11)]'>
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((r) => {
                      const missing = !r.uploadedColumn
                      return (
                        <tr
                          className='border-b border-[var(--gray-2)]'
                          key={r.systemField}
                        >
                          <td className='px-4 py-3 text-13 font-medium text-[var(--gray-12)]'>
                            <div className='flex min-w-0 items-center gap-2'>
                              <span className='truncate'>{r.systemField}</span>
                            </div>
                          </td>

                          <td className='px-4 py-3 text-13 text-[var(--gray-12)]'>
                            {missing ? (
                              <span className='inline-flex items-center gap-2 rounded-lg bg-[var(--red-2)] px-2 py-1 text-12 font-semibold text-[var(--red-9)]'>
                                Not mapped
                              </span>
                            ) : (
                              <span className='inline-flex items-center gap-2 rounded-lg bg-[var(--green-2)] px-2 py-1 text-12 font-semibold text-[var(--green-11)]'>
                                <span className='max-w-[320px] truncate'>
                                  {r.uploadedColumn}
                                </span>
                              </span>
                            )}
                          </td>

                          <td className='px-4 py-3 text-right'>
                            {missing ? (
                              <span className='text-12 font-semibold text-[var(--red-9)]'>
                                <Icon
                                  className='inline size-4'
                                  name='tabler:x'
                                />
                              </span>
                            ) : (
                              <span className='text-12 font-semibold text-[var(--green-9)]'>
                                <Icon
                                  className='inline size-4'
                                  name='tabler:check'
                                />
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </AnimateSlideLeft>
            </div>
          </div>
        </div>
      </div>

      {/* Actions (stays visible) */}
      <div className='shrink-0 px-5 pb-5'>
        <div className='flex items-center justify-between'>
          <button
            className='group inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--gray-4)] bg-[var(--gray-0)] px-2 py-2 text-12 font-semibold text-[var(--gray-12)] transition-colors hover:bg-[var(--gray-1)]'
            onClick={onBack}
          >
            <Icon
              className='size-5 transition-transform group-hover:-translate-x-1'
              name='tabler:chevron-left'
            />
            Back
          </button>

          <button
            disabled={isSubmitting}
            type='button'
            className={[
              'flex items-center gap-2 rounded-xl px-4 py-2 text-13 font-semibold text-white shadow-sm',
              'cursor-pointer bg-[var(--primary-9)] hover:bg-[var(--primary-10)]',
              isSubmitting ? 'cursor-not-allowed opacity-50' : '',
            ].join(' ')}
            onClick={handleConfirmClick}
            // title="Confirm and proceed"
          >
            {isSubmitting ? (
              <>
                <Icon className='size-4 animate-spin' name='tabler:loader' />
                <span>Please Wait...</span>
              </>
            ) : (
              <>
                {/* Added Icon here */}
                <Icon className='size-5' name='tabler:circle-dashed-check' />
                <span>Confirm and Submit</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
