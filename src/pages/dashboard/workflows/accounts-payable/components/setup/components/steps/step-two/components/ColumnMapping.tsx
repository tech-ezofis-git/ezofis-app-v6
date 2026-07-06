import { Select } from '@mantine/core'
import { useEffect } from 'react'
import Icon from '@/components/base/icon/Icon'
import showToast from '@/components/base/toast/showToast'
import { compareHeaderSimilarity } from '@/pages/requests/components/request/components/newrequest/poFlow/utils/headerSimilarity'
import { SYSTEM_TEMPLATE_COLUMNS } from '@/pages/requests/components/request/components/newrequest/poFlow/utils/templateSchema'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import { AnimateFadeIn } from '@/components/common/animations'

const ColumnMapping = () => {
  const erpSettings = setupStore((state) => state.erpSettings)
  const setErpSettings = setupStore((state) => state.setErpSettings)

  const uploadedColumns = erpSettings.uploadedColumns || []
  const previewRows = erpSettings.previewRows || []
  const mapping = erpSettings.mapping || {}

  // Automatically run auto-map on mount if mapping is empty
  useEffect(() => {
    if (Object.keys(mapping).length === 0 && uploadedColumns.length > 0) {
      runAutoMap()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const runAutoMap = () => {
    const nextMapping: Record<string, string> = {}
    SYSTEM_TEMPLATE_COLUMNS.forEach((col) => {
      const match = uploadedColumns.find((u) =>
        compareHeaderSimilarity(u, col.key),
      )
      if (match) {
        nextMapping[col.key] = match
      }
    })
    setErpSettings({
      ...erpSettings,
      mapping: nextMapping,
    })
  }

  const handleReset = () => {
    runAutoMap()
    showToast({
      message: 'Reset to initial mapping suggestions.',
      variant: 'default',
    })
  }

  const handleSelectChange = (systemKey: string, value: string | null) => {
    setErpSettings({
      ...erpSettings,
      mapping: {
        ...mapping,
        [systemKey]: value ?? '',
      },
    })
  }

  const requiredColumns = SYSTEM_TEMPLATE_COLUMNS.filter((c) => c.required)
  const requiredTotalCount = requiredColumns.length
  const requiredMappedCount = requiredColumns.filter(
    (c) => !!mapping[c.key] && mapping[c.key] !== 'Skip to Import',
  ).length

  return (
    <AnimateFadeIn className='mt-5 space-y-4 rounded-xl border border-gray-3 bg-surface p-5 shadow-sm md:p-6'>
      <div className='flex items-center justify-between border-b border-gray-3 pb-3.5'>
        <div>
          <h4 className='text-15/5 font-semibold text-gray-13'>
            Confirm Column Mapping
          </h4>
          <p className='mt-0.5 text-12/4.5 text-gray-11'>
            Align uploaded columns with master system fields to validate your PO data.
          </p>
        </div>
        <button
          className='flex items-center gap-1 text-12/4.5 font-semibold text-primary-11 transition-colors hover:text-primary-10 hover:underline'
          type='button'
          onClick={handleReset}
        >
          <Icon className='size-3.5' name='tabler:rotate' />
          <span>Reset</span>
        </button>
      </div>

      {/* Mapping Grid */}
      <div className='flex flex-col gap-2.5'>
        {/* Table Header */}
        <div className='grid grid-cols-[1.2fr_1.5fr_1fr] border-b border-gray-3 pb-2 text-[10px] font-bold tracking-wider text-gray-10 uppercase'>
          <div>System Field</div>
          <div>Your Column</div>
          <div>Preview Value</div>
        </div>

        {/* Rows */}
        <div className='max-h-[350px] divide-y divide-gray-3 overflow-y-auto pr-1 custom-scrollbar'>
          {[...SYSTEM_TEMPLATE_COLUMNS]
            .sort((a, b) => {
              if (a.required === b.required) return 0
              return a.required ? -1 : 1
            })
            .map((col) => {
              const selectedValue = mapping[col.key] || ''
              const isMapped = !!selectedValue && selectedValue !== 'Skip to Import'
              const previewValue =
                isMapped && previewRows.length > 0
                  ? String(previewRows[0]?.[selectedValue] ?? '')
                  : ''

              return (
                <div
                  className='grid grid-cols-[1.2fr_1.5fr_1fr] items-center gap-4 py-3 first:pt-1.5 last:pb-1.5'
                  key={col.key}
                >
                  {/* System Field Name */}
                  <div className='flex items-center gap-1.5 min-w-0'>
                    <span className='truncate text-13/5 font-semibold text-gray-13'>
                      {col.key}
                    </span>
                    {col.required && (
                      <span className='inline-flex text-error-9' title='Required'>
                        *
                      </span>
                    )}
                  </div>

                  {/* Dropdown Selector */}
                  <div className='min-w-0'>
                    <Select
                      className='w-full'
                      clearable
                      searchable
                      data={[
                        { label: 'Skip to Import', value: 'Skip to Import' },
                        ...uploadedColumns.map((c) => ({ label: c, value: c })),
                      ]}
                      placeholder='Select column...'
                      radius='md'
                      size='sm'
                      styles={{
                        dropdown: {
                          border: '1px solid var(--gray-3)',
                          borderRadius: '12px',
                          boxShadow: 'var(--shadow-md)',
                          zIndex: 1000,
                        },
                        input: {
                          backgroundColor: isMapped
                            ? 'var(--primary-2)'
                            : 'var(--surface-primary)',
                          border: isMapped
                            ? '1px solid var(--primary-9)'
                            : '1px solid var(--gray-4)',
                          color: isMapped
                            ? 'var(--primary-12)'
                            : 'var(--gray-12)',
                          fontSize: '12px',
                          fontWeight: 500,
                          height: '34px',
                        },
                      }}
                      value={selectedValue || null}
                      onChange={(v) => handleSelectChange(col.key, v)}
                    />
                  </div>

                  {/* Preview Value */}
                  <div
                    className='truncate text-12/4.5 text-gray-11 font-medium'
                    title={previewValue}
                  >
                    {selectedValue === 'Skip to Import' ? (
                      <span className='text-gray-9 italic'>Skipped</span>
                    ) : previewValue ? (
                      <span className='font-semibold text-gray-12'>
                        "{previewValue}"
                      </span>
                    ) : (
                      <span className='text-gray-8 italic'>No data</span>
                    )}
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {/* Summary Footer */}
      <div className='flex items-center justify-between border-t border-gray-3 pt-4 text-13/5'>
        <span className='font-medium text-gray-11'>
          {requiredMappedCount} of {requiredTotalCount} required fields mapped
        </span>
        {requiredMappedCount === requiredTotalCount ? (
          <div className='flex items-center gap-1.5 text-green-11 font-medium'>
            <Icon className='size-4' name='tabler:circle-check' />
            <span>Ready to continue</span>
          </div>
        ) : (
          <div className='flex items-center gap-1.5 text-orange-11 font-medium'>
            <Icon className='size-4' name='tabler:alert-circle' />
            <span>Mapping required</span>
          </div>
        )}
      </div>
    </AnimateFadeIn>
  )
}

ColumnMapping.displayName = 'ColumnMapping'
export default ColumnMapping
