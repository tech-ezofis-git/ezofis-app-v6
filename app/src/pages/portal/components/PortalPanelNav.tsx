import Icon from '@/components/base/icon/Icon'
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
  if (!sections.length) return null

  return (
    <nav className='flex h-full min-h-0 flex-col bg-surface'>
      <div className='min-h-0 flex-1 overflow-y-auto px-3 py-4'>
        <div className='relative'>
          {sections.length > 1 && (
            <span
              className='pointer-events-none absolute top-7 bottom-7 left-[26px] z-0 w-px bg-gray-5'
              aria-hidden
            />
          )}
          <ol className='relative flex flex-col'>
            {sections.map((section, index) => {
              const selected = section.id === activeId
              const completed = Boolean(section.completed)

              return (
                <li key={section.id}>
                  <button
                    className='relative z-10 flex w-full items-center gap-3 px-2.5 py-3 text-left transition-all duration-200 hover:opacity-80 active:scale-98'
                    type='button'
                    onClick={() => onSelect(section.id)}
                  >
                    <span
                      className={cn(
                        'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-12 font-semibold transition-all',
                        completed
                          ? 'bg-green-9 text-white'
                          : selected
                            ? 'bg-primary-9 text-white'
                            : 'border border-gray-5 bg-surface text-gray-9',
                      )}
                    >
                      {completed ? (
                        <Icon className='size-4' name='lucide:check' />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span
                      className={cn(
                        'min-w-0 flex-1 text-13 font-medium',
                        selected
                          ? 'font-bold text-primary-11'
                          : completed
                            ? 'font-semibold text-green-11'
                            : 'text-gray-12',
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
