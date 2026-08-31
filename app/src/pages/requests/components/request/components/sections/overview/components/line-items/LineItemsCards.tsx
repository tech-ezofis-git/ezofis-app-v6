import { useMemo } from 'react'
import { useLingui } from '@lingui/react/macro'
import Badge from '@/components/base/Badge'
import Title from '@/components/base/Title'
import cn from '@/utils/cn'

interface Props {
  data: any
}

const LineItemsCards = ({ data }: Props) => {
  const { t } = useLingui()
  const items = useMemo(() => {
    const raw = data?.debug?.['Side-by-side Line Item matching'] || []

    return raw.map((line: any, index: number) => {
      const invQty = line?.Quantity?.['Invoice Value']
      const poQty = line?.Quantity?.['PO Value']
      const invPrice = line?.['Unit Price']?.['Invoice Value']
      const poPrice = line?.['Unit Price']?.['PO Value']
      const desc = line?.Description?.['Invoice Value'] || t`Unknown Item`
      const score = Number(line?.['Line Score'] || 0)

      return {
        desc,
        id: index + 1,
        invPrice,
        invQty,
        poPrice,
        poQty,
        score,
        status: score >= 100 ? 'match' : score >= 70 ? 'review' : 'mismatch',
      }
    })
  }, [data])

  if (!items.length) return null

  return (
    <div>
      <Title className='mb-3' level={3} title={t`Line Items`} />

      <div className='space-y-2'>
        {items.map((item: any) => (
          <div
            className='rounded-lg border border-gray-3 bg-surface p-3 shadow-sm'
            key={item.id}
          >
            {/* header */}
            <div className='mb-2 flex items-center justify-between'>
              <div className='min-w-0'>
                <div className='text-xs font-semibold text-gray-11'>
                  {t`Line #${item.id}`}
                </div>
                <div className='truncate text-sm font-semibold text-gray-13'>
                  {item.desc}
                </div>
              </div>

              <Badge
                className='capitalize'
                label={item.status}
                color={
                  item.status === 'match'
                    ? 'green'
                    : item.status === 'review'
                      ? 'orange'
                      : 'red'
                }
              />
            </div>

            {/* values */}
            <div className='grid grid-cols-3 gap-3 text-sm'>
              <div
                className={cn(
                  item.invQty !== item.poQty && 'font-semibold text-red-11',
                )}
              >
                <div className='text-[11px] text-gray-11'>{t`Quantity`}</div>
                {item.invQty} / {item.poQty}
              </div>

              <div
                className={cn(
                  item.invPrice !== item.poPrice && 'font-semibold text-red-11',
                )}
              >
                <div className='text-[11px] text-gray-11'>{t`Unit Price`}</div>
                {item.invPrice} / {item.poPrice}
              </div>

              <div className='text-right'>
                <div className='text-[11px] text-gray-11'>{t`Match Score`}</div>
                <span
                  className={cn('font-bold', {
                    'text-green-11': item.score >= 90,
                    'text-orange-11': item.score >= 70 && item.score < 90,
                    'text-red-11': item.score < 70,
                  })}
                >
                  {item.score.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default LineItemsCards
