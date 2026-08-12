import type { TableColMeta } from '@/pages/requests/utils/dynamicTable.utils'
import Icon from '@/components/base/icon/Icon'
import Modal from '@/components/base/Modal'
import {
  normalizeTablePayload,
  toDisplayString,
} from '@/pages/requests/utils/dynamicTable.utils'
import DTModelTable from './DTModelTable'

export default function DynamicTableModal({
  colMeta,
  opened,
  rawVal,
  safeParse,
  title,
  width = 900,
  onClose,
}: {
  colMeta?: TableColMeta[]
  opened: boolean
  rawVal: any
  title: string
  width?: number | string
  onClose: () => void
  safeParse: (v: any) => any
}) {
  const { meta, rows } = normalizeTablePayload(safeParse, rawVal)

  return (
    <Modal opened={opened} width={width} onClose={onClose}>
      <div className='flex items-center justify-between border-b border-gray-3 px-6 py-3 md:px-8'>
        <div className='font-medium'>{title}</div>
        <button
          aria-label='Close'
          className='text-gray-11 hover:text-gray-12'
          type='button'
          onClick={onClose}
        >
          <Icon name='tabler:x' />
        </button>
      </div>

      <div className='px-6 py-4 md:px-8'>
        {!rows?.length ? (
          <div className='text-sm text-gray-11'>No table data available.</div>
        ) : (
          <div className='bg-primary flex flex-col rounded-lg shadow'>
            <div className='max-h-[65vh] flex-1 overflow-auto p-2'>
              <DTModelTable colMeta={colMeta} rows={rows} />
            </div>
          </div>
        )}

        {/* Safety fallback: if payload is object but rows not detected */}
        {!rows?.length && meta ? (
          <div className='border-gray-200 mt-3 max-h-[40vh] overflow-auto rounded-md border p-3 text-xs break-words whitespace-pre-wrap text-gray-12'>
            {toDisplayString(meta)}
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
