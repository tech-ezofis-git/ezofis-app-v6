import { useLingui } from '@lingui/react/macro'
import { DynamicIcon } from '@/pages/folders/components/icons'
import { Card } from '@/pages/folders/components/Ui'

export interface DetailCard {
  iconKey: string
  id: string
  rows: DetailCardRow[]
  title: string
}

export interface DetailCardRow {
  label: string
  value: string
}

interface Props {
  cards: DetailCard[]
  emptyLabel?: string
}

const toDisplayValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

// The repository-field panel from the folders' document view
// (DocumentDetailsView's `infoCards` aside), lifted into a shared component
// so a request's attachment preview shows its metadata exactly the way the
// folder file view does — same sectioned cards, same label/value rows.
// Kept read-only here: the request overview has no metadata-edit affordance
// (and no OCR-match highlighting, which the folder view drives off its own
// PDF text probe).
const DocumentFieldCards = ({ cards, emptyLabel }: Props) => {
  const { t } = useLingui()

  if (cards.length === 0) {
    return (
      <div className='px-4 py-6 text-center text-13 text-gray-9'>
        {emptyLabel || t`No field data available for this document.`}
      </div>
    )
  }

  return (
    <div className='min-w-0 space-y-4'>
      {cards.map((card) => (
        <Card className='overflow-hidden p-0' key={card.id}>
          <h3 className='flex items-center gap-2 border-b border-gray-3 px-4 py-3 text-[15px] font-semibold text-gray-13'>
            <DynamicIcon className='h-4 w-4 text-blue-11' name={card.iconKey} />
            {card.title}
          </h3>
          <div>
            {card.rows.map((row) => {
              const displayVal = toDisplayValue(row.value)
              return (
                <div
                  className='group flex w-full items-start gap-2 border-b border-gray-3 px-3.5 py-2.5 text-left transition-all last:border-0 hover:bg-gray-1'
                  key={`${card.id}:${row.label}`}
                >
                  <div className='min-w-0 flex-1 overflow-hidden pt-0.5 text-[13px] text-gray-10'>
                    <span
                      className='block truncate text-left group-hover:overflow-visible group-hover:break-words group-hover:whitespace-normal'
                      title={row.label}
                    >
                      {row.label}
                    </span>
                  </div>
                  <div className='ml-auto max-w-[50%] min-w-0 shrink-0 overflow-hidden pt-0.5 text-right transition-all group-hover:max-w-[65%] group-hover:overflow-visible'>
                    <b
                      className='block w-full min-w-0 truncate text-right text-[13px] font-semibold text-gray-13 group-hover:overflow-visible group-hover:text-left group-hover:break-words group-hover:whitespace-normal'
                      title={displayVal}
                    >
                      {displayVal}
                    </b>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      ))}
    </div>
  )
}

DocumentFieldCards.displayName = 'DocumentFieldCards'
export default DocumentFieldCards
