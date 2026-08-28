import { useLingui } from '@lingui/react/macro'
import cn from '@/utils/cn'
import type { PortalNavSection } from '../helpers/portalDetail'

type PortalPanelNavProps = {
  activeId: string
  sections: PortalNavSection[]
  onSelect: (id: string) => void
}

export default function PortalPanelNav({
  activeId,
  sections,
  onSelect,
}: PortalPanelNavProps) {
  const { t } = useLingui()

  if (!sections.length) return null

  return (
    <nav className='flex h-full min-h-0 flex-col bg-surface'>
      <div className='shrink-0 border-b border-gray-3 px-5 py-4'>
        <div className='text-15 font-semibold text-gray-13'>{t`Form Sections`}</div>
      </div>
      <div className='min-h-0 flex-1 overflow-y-auto px-3 py-4'>
        <div className='relative'>
          {sections.length > 1 && (
            <span
              className='pointer-events-none absolute top-7 bottom-7 left-[26px] z-0 w-px bg-gray-4'
              aria-hidden
            />
          )}
          <ol className='relative flex flex-col gap-3'>
            {sections.map((section, index) => {
              const selected = section.id === activeId

              return (
                <li key={section.id}>
                  <button
                    type='button'
                    className='relative z-10 flex w-full items-center gap-3 rounded-xl px-2.5 py-3 text-left transition-all duration-200 hover:bg-gray-2 active:scale-98'
                    onClick={() => onSelect(section.id)}
                  >
                    <span
                      className={cn(
                        'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-12 font-semibold transition-all',
                        selected
                          ? 'bg-primary-9 text-white'
                          : 'border border-gray-5 bg-surface text-gray-9',
                      )}
                    >
                      {index + 1}
                    </span>
                    <span
                      className={cn(
                        'min-w-0 flex-1 text-13 font-medium',
                        selected ? 'text-primary-11' : 'text-gray-12',
                      )}
                    >
                      {section.title}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </nav>
  )
}
