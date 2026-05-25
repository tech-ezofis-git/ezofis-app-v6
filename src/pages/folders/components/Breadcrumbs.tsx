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
    <div className="flex h-[56px] items-center gap-3 border-b border-gray-3 bg-surface-primary px-5 text-sm">
      {items.map((item, index) => {
        const isLast = index === items.length - 1

        return (
          <span key={`${item.id}-${index}`} className="flex items-center gap-3">
            <button
              type="button"
              disabled={isLast}
              onClick={() => onSelect(item.id)}
              className={
                isLast
                  ? 'cursor-default font-semibold text-gray-13'
                  : 'cursor-pointer text-gray-11 hover:text-blue-11 hover:underline'
              }
            >
              {item.label}
            </button>

            {!isLast && <span className="text-gray-8">›</span>}
          </span>
        )
      })}
    </div>
  )
}
