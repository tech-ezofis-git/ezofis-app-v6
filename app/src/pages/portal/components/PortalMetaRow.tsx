import { Tooltip as Base } from '@mantine/core'
import { useEffect, useRef, useState } from 'react'
import cn from '@/utils/cn'

type PortalMetaRowProps = {
  bordered?: boolean
  label: string
  value: string
}

const PortalMetaRow = ({
  bordered = true,
  label,
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
        'flex items-center justify-between gap-4 px-4 py-2.5',
        bordered && 'border-b border-gray-3 last:border-b-0',
      )}
    >
      <span className='max-w-[42%] shrink-0 text-12 text-gray-9'>{label}</span>
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
            className='block cursor-default truncate text-13 font-semibold text-gray-9'
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
