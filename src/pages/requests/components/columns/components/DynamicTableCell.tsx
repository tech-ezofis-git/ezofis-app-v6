// @src/pages/requests/components/columns/dynamicTable/DynamicTableCell.tsx
import { useState } from 'react'
import type { TableColMeta } from '@/pages/requests/utils/dynamicTable.utils'
import Icon from '@/components/base/icon/Icon'
import DynamicTableModal from './DynamicTableModal'

export default function DynamicTableCell({
  colMeta,
  modalWidth = 900,
  rawVal,
  safeParse,
  title,
}: {
  colMeta?: TableColMeta[]
  modalWidth?: number | string
  rawVal: any
  title: string
  safeParse: (v: any) => any
}) {
  const [opened, setOpened] = useState(false)

  return (
    <>
      <button
        aria-label='Open table'
        className='inline-flex cursor-pointer items-center text-gray-11 hover:text-gray-12'
        type='button'
        onClick={(e) => {
          e.stopPropagation()
          setOpened(true)
        }}
      >
        <Icon name='tabler:table' />
      </button>

      <DynamicTableModal
        colMeta={colMeta}
        opened={opened}
        rawVal={rawVal}
        safeParse={safeParse}
        title={title}
        width={modalWidth}
        onClose={() => setOpened(false)}
      />
    </>
  )
}
