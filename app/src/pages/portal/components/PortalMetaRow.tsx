import { Tooltip as Base } from '@mantine/core'
import { useEffect, useRef, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

type PortalMetaRowProps = {
  badge?: 'ocr'
  bordered?: boolean
  label: string
  padded?: boolean
  value: string
}

const PortalMetaRow = ({
  badge,
  bordered = true,
  label,
  padded = true,
  value,
}: PortalMetaRowProps) => {
  const display = value || '—'
  const valueRef = useRef<HTMLSpanElement>(null)
  const [isTruncated, setIsTruncated] = useState(false)

  useEffect(() => {
    const element = valueRef.current
    if (!element) return

    const measure = () => {
      setIsTruncated(element.scrollWidth > element.clientWidth)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [display])

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 py-3',
        padded && 'px-4',
        bordered && 'border-b border-gray-3 last:border-b-0',
      )}
    >
      <span className='flex max-w-[58%] min-w-0 shrink-0 items-center gap-2'>
        <span className='truncate text-13 text-gray-11'>{label}</span>
        {badge === 'ocr' && (
          <span
            className='inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--teal-3)] bg-[var(--teal-1)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--teal-10)]'
            title='Source: OCR Document'
          >
            <Icon
              className='size-2.5 text-[var(--teal-9)]'
              name='lucide:scan-text'
            />
            <span>OCR</span>
          </span>
        )}
      </span>
      <div className='min-w-0 flex-1 text-right'>
        <Base
          arrowOffset={8}
          arrowRadius={1.5}
          arrowSize={6}
          disabled={!isTruncated}
          label={display}
          position='top'
          w={280}
          zIndex={1000000}
          multiline
          withArrow
          classNames={{
            tooltip: 'rounded bg-gray-12 px-2 py-1 text-xs text-gray-0',
          }}
        >
          <span
            className='block cursor-default truncate text-13 font-semibold text-gray-13'
            ref={valueRef}
          >
            {display}
          </span>
        </Base>
      </div>
    </div>
  )
}

PortalMetaRow.displayName = 'PortalMetaRow'
export default PortalMetaRow
