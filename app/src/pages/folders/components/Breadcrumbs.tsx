export type BreadcrumbItem = {
  id: string
  label: string
}

export function Breadcrumbs({
  items,
  onSelect,
}: {
  items: BreadcrumbItem[]
  onSelect: (id: string) => void
}) {
  return (
    <div className='flex h-[56px] items-center gap-3 border-b border-gray-3 bg-surface-primary px-6 text-sm'>
      {items.map((item, index) => {
        const isLast = index === items.length - 1

        return (
          <span className='flex items-center gap-3' key={`${item.id}-${index}`}>
            <button
              disabled={isLast}
              type='button'
              className={
                isLast
                  ? 'cursor-default font-semibold text-gray-13'
                  : 'cursor-pointer text-gray-11 hover:text-blue-11 hover:underline'
              }
              onClick={() => onSelect(item.id)}
            >
              {item.label}
            </button>

            {!isLast && <span className='text-gray-8'>›</span>}
          </span>
        )
      })}
    </div>
  )
}
