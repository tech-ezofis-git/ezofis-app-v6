export function Breadcrumbs({ items }: { items: string[] }) {
  return (
    <div className='flex h-[56px] items-center gap-3 border-b border-gray-3 bg-surface-primary px-5 text-sm'>
      {items.map((it, i) => (
        <span className='flex items-center gap-3' key={it + i}>
          <span
            className={
              i === items.length - 1
                ? 'font-semibold text-gray-13'
                : 'text-gray-11'
            }
          >
            {it}
          </span>
          {i < items.length - 1 ? <span className='text-gray-8'>›</span> : null}
        </span>
      ))}
    </div>
  )
}
