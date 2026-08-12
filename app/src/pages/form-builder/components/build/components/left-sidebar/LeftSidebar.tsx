import type { DragEndEvent } from '@dnd-kit/core'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ActionIcon } from '@mantine/core'
import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import { useFormStore } from '@/pages/form-builder/store/formStore'
import cn from '@/utils/cn'
import FieldLibrary from './FieldLibrary'

interface SortableSectionProps {
  index: number
  isActive: boolean
  isCollapsed: boolean
  isSearchActive: boolean
  p: any
  totalPanels: number
  movePanel: (id: string, dir: 'up' | 'down') => void
  onScroll: (id: string) => void
}

const SortableSectionItem = ({
  index,
  isActive,
  isCollapsed,
  isSearchActive,
  movePanel,
  p,
  totalPanels,
  onScroll,
}: SortableSectionProps) => {
  const { deletePanel } = useFormStore()
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const {
    attributes,
    isDragging,
    listeners,
    transform,
    transition,
    setNodeRef,
  } = useSortable({ disabled: isSearchActive || isConfirmingDelete, id: p.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : undefined,
  }

  // Cancel confirmation if we stop hovering or start dragging
  const handleMouseLeave = () => setIsConfirmingDelete(false)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isConfirmingDelete ? {} : attributes)}
      {...(isConfirmingDelete ? {} : listeners)}
      className={cn(
        'group relative cursor-default select-none',
        isDragging && 'z-50 scale-102 rounded-lg bg-white opacity-50 shadow-lg',
      )}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={cn(
          'relative flex w-full items-center rounded-lg border border-transparent transition-all',
          isCollapsed
            ? 'size-9 justify-center p-2'
            : 'gap-2 px-2 py-1.5 text-left',
          'text-gray-10 hover:border-accent-soft/20 hover:bg-accent-soft/5',
          isActive &&
            'border-accent-soft/30 bg-accent-soft/10 text-accent-primary shadow-sm',
          isDragging &&
            'scale-[1.02] bg-accent-soft/15 text-accent-primary shadow-md',
          isConfirmingDelete && 'bg-red-50 border-red-200',
        )}
      >
        {isConfirmingDelete ? (
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className='flex w-full flex-col gap-2.5 rounded-xl border border-red-2 bg-red-5/5 p-3.5'
            initial={{ opacity: 0, scale: 0.95 }}
          >
            <div className='flex items-center gap-2 text-red-6'>
              <Icon height={14} name='lucide:alert-triangle' width={14} />
              <span className='text-[10px] font-extrabold tracking-widest uppercase'>
                Action Needed
              </span>
            </div>
            <p className='text-red-7/0.8 text-[11px] leading-relaxed font-medium'>
              Delete this section and{' '}
              <span className='font-bold text-red-7'>
                {p.fields?.length || 0} fields
              </span>
              ? This cannot be undone.
            </p>
            <div className='mt-0.5 flex items-center gap-2'>
              <button
                className='flex-1 rounded-lg bg-red-6 py-2 text-[10px] font-bold text-white shadow-sm shadow-red-2 transition-all hover:bg-red-9 active:scale-95'
                onClick={(e) => {
                  e.stopPropagation()
                  deletePanel(p.id)
                }}
              >
                Confirm
              </button>
              <button
                className='flex-1 rounded-lg border border-gray-2 bg-white py-2 text-[10px] font-bold text-gray-6 transition-all hover:bg-gray-1 active:scale-95'
                onClick={(e) => {
                  e.stopPropagation()
                  setIsConfirmingDelete(false)
                }}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        ) : (
          <>
            <button
              className='flex min-w-0 flex-1 items-center gap-2'
              onClick={() => onScroll(p.id)}
            >
              {/* Drag Handle - Improved Arrorws */}
              {!isCollapsed && !isSearchActive && (
                <div className='mr-1 -ml-1 p-1 text-gray-4 opacity-30 transition-opacity group-hover:text-accent-primary group-hover:opacity-100'>
                  <Icon height={14} name='lucide:grip-vertical' width={14} />
                </div>
              )}

              <Icon
                name={index === 0 ? 'lucide:shield-check' : 'lucide:layout'}
                width={isCollapsed ? 18 : 14}
                className={cn(
                  'shrink-0 transition-all',
                  isActive
                    ? 'scale-110 text-accent-primary opacity-100'
                    : 'opacity-60 group-hover:text-accent-primary group-hover:opacity-100',
                )}
              />

              {!isCollapsed && (
                <div
                  className={cn(
                    'animate-in fade-in flex-1 truncate text-[13px] font-medium tracking-tight duration-300',
                    isActive
                      ? 'font-bold text-accent-primary'
                      : 'text-gray-13 group-hover:text-gray-13',
                  )}
                >
                  {p.settings.title}
                </div>
              )}
            </button>

            {!isCollapsed && (
              <div className='animate-in fade-in slide-in-from-right-2 hidden items-center gap-0.5 duration-200 group-hover:flex'>
                <ActionIcon
                  className='hover:bg-accent-soft/10 hover:text-accent-primary disabled:opacity-30'
                  color='gray'
                  disabled={index === 0}
                  size='xs'
                  variant='subtle'
                  onClick={(e) => {
                    e.stopPropagation()
                    movePanel(p.id, 'up')
                  }}
                >
                  <Icon height={12} name='lucide:arrow-up' width={12} />
                </ActionIcon>
                <ActionIcon
                  className='hover:bg-accent-soft/10 hover:text-accent-primary disabled:opacity-30'
                  color='gray'
                  disabled={index === totalPanels - 1}
                  size='xs'
                  variant='subtle'
                  onClick={(e) => {
                    e.stopPropagation()
                    movePanel(p.id, 'down')
                  }}
                >
                  <Icon height={12} name='lucide:arrow-down' width={12} />
                </ActionIcon>
                <div className='mx-0.5 h-3 w-px bg-gray-2' />
                <ActionIcon
                  className='hover:bg-red-50 hover:text-red-500 text-gray-4 transition-colors'
                  color='red'
                  size='xs'
                  variant='subtle'
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsConfirmingDelete(true)
                  }}
                >
                  <Icon height={12} name='lucide:trash-2' width={12} />
                </ActionIcon>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const LeftSidebar = () => {
  const {
    activePanelId,
    activeQuestionId,
    isLeftSidebarCollapsed,
    movePanel,
    name,
    panels,
    sidebarView,
    setActiveQuestionId,
    setLeftSidebarCollapsed,
    setPanels,
  } = useFormStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [isFormExpanded, setIsFormExpanded] = useState(true)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const filteredPanels = useMemo(() => {
    if (!searchQuery.trim()) return panels
    return panels.filter(
      (p) =>
        (p.settings.title || '')
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (p.settings.description || '')
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        p.fields.some(
          (f) =>
            (f.label || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (f.type || '').toLowerCase().includes(searchQuery.toLowerCase()),
        ),
    )
  }, [panels, searchQuery])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = panels.findIndex((p) => p.id === active.id)
      const newIndex = panels.findIndex((p) => p.id === over.id)
      setPanels(arrayMove(panels, oldIndex, newIndex))
    }
  }

  const scrollToPanel = (id: string) => {
    if (activeQuestionId) {
      setActiveQuestionId(null)
    }
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div
      className={cn(
        'animate-in slide-in-from-left relative flex h-full shrink-0 flex-col border-r border-gray-2 bg-gray-1/30 font-inter transition-all duration-300',
        isLeftSidebarCollapsed ? 'w-14' : 'w-[280px]',
      )}
    >
      {sidebarView === 'fields' && !isLeftSidebarCollapsed ? (
        <FieldLibrary />
      ) : (
        <>
          {/* Edge Collapse Toggle */}
          <button
            className={cn(
              'absolute top-1/2 -right-3 z-50 -translate-y-1/2',
              'flex size-6 items-center justify-center rounded-full border border-gray-2 bg-white text-gray-4 shadow-sm',
              'group transition-all hover:border-accent-soft hover:text-accent-primary hover:shadow-md active:scale-90',
            )}
            title={
              isLeftSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'
            }
            onClick={() => setLeftSidebarCollapsed(!isLeftSidebarCollapsed)}
          >
            <Icon
              className='transition-transform duration-300 group-hover:scale-110'
              height={14}
              width={14}
              name={
                isLeftSidebarCollapsed
                  ? 'lucide:chevron-right'
                  : 'lucide:chevron-left'
              }
            />
          </button>

          <div
            className={cn(
              'flex h-16 shrink-0 items-center justify-between border-b border-gray-2 bg-white px-3 transition-all',
              isLeftSidebarCollapsed ? 'justify-center py-2' : 'px-4 py-3',
            )}
          >
            {!isLeftSidebarCollapsed && (
              <div className='animate-in fade-in text-[11px] font-extrabold tracking-[0.1em] text-gray-10 uppercase duration-300'>
                Explorer
              </div>
            )}

            <div
              className={cn(
                'flex items-center',
                isLeftSidebarCollapsed ? 'flex-col gap-2' : 'gap-1',
              )}
            >
              {!isLeftSidebarCollapsed && (
                <ActionIcon
                  className='hover:bg-gray-2'
                  color='gray'
                  size='sm'
                  title='Add Section'
                  variant='subtle'
                  onClick={() => useFormStore.getState().addPanel()}
                >
                  <Icon height={14} name='lucide:plus' width={14} />
                </ActionIcon>
              )}
            </div>
          </div>

          <div
            className={cn(
              'sticky top-0 z-10 border-b border-gray-2 bg-white/50 p-3 backdrop-blur-sm transition-all',
              isLeftSidebarCollapsed
                ? 'flex justify-center px-2 py-3'
                : 'px-4 py-2.5',
            )}
          >
            {isLeftSidebarCollapsed ? (
              <ActionIcon
                color='gray'
                size='sm'
                title='Search Sections'
                variant='subtle'
                onClick={() => setLeftSidebarCollapsed(false)}
              >
                <Icon
                  className='text-gray-5'
                  height={16}
                  name='lucide:search'
                  width={16}
                />
              </ActionIcon>
            ) : (
              <div className='group animate-in slide-in-from-top-1 relative duration-300'>
                <Icon
                  height={13}
                  name='lucide:search'
                  width={13}
                  className={cn(
                    'absolute top-1/2 left-2.5 -translate-y-1/2 text-gray-4 transition-colors',
                    searchQuery && 'text-accent-primary',
                  )}
                />
                <input
                  className='bg-gray-50 w-full rounded-lg border border-gray-2 py-1.5 pr-8 pl-8 text-xs font-medium transition-all outline-none placeholder:text-gray-4 focus:border-accent-primary focus:bg-white focus:ring-2 focus:ring-accent-soft/20'
                  placeholder='Search sections or fields...'
                  type='text'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    className='absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-0.5 text-gray-4 transition-colors hover:bg-gray-2 hover:text-gray-6'
                    onClick={() => setSearchQuery('')}
                  >
                    <Icon height={12} name='lucide:x' width={12} />
                  </button>
                )}
              </div>
            )}
          </div>

          <div
            className={cn(
              'custom-scrollbar flex-1 space-y-6 overflow-y-auto p-3 font-inter transition-all',
              isLeftSidebarCollapsed && 'px-2',
            )}
          >
            <div className='space-y-1'>
              {!isLeftSidebarCollapsed && (
                <div
                  className={cn(
                    'group mb-1 flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-2',
                  )}
                  onClick={() => setIsFormExpanded(!isFormExpanded)}
                >
                  <Icon
                    className='text-gray-5 transition-colors group-hover:text-gray-9'
                    height={14}
                    width={14}
                    name={
                      isFormExpanded
                        ? 'lucide:chevron-down'
                        : 'lucide:chevron-right'
                    }
                  />
                  <Icon
                    className='text-gray-4 transition-colors group-hover:text-accent-primary'
                    height={14}
                    name='lucide:file-text'
                    width={14}
                  />
                  <div className='truncate text-[11px] font-extrabold tracking-widest text-gray-10 transition-colors group-hover:text-gray-12'>
                    {(name as string) || 'Untitled Form'}
                  </div>
                </div>
              )}

              {isFormExpanded && (
                <div
                  className={cn(
                    'space-y-0.5 transition-all outline-none',
                    isLeftSidebarCollapsed
                      ? 'ml-0 flex flex-col items-center gap-2 border-0 pl-0'
                      : 'ml-2 border-l border-gray-2 pl-3',
                  )}
                >
                  <DndContext
                    collisionDetection={closestCenter}
                    sensors={sensors}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={filteredPanels.map((p) => p.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {filteredPanels.map((p, index) => (
                        <SortableSectionItem
                          index={index}
                          isActive={activePanelId === p.id}
                          isCollapsed={isLeftSidebarCollapsed}
                          isSearchActive={!!searchQuery.trim()}
                          key={p.id}
                          movePanel={movePanel}
                          p={p}
                          totalPanels={panels.length}
                          onScroll={scrollToPanel}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>

                  {filteredPanels.length === 0 && searchQuery && (
                    <div className='py-4 text-center'>
                      <div className='text-[10px] font-semibold tracking-widest text-gray-4 uppercase'>
                        No results
                      </div>
                    </div>
                  )}
                  {isLeftSidebarCollapsed && !searchQuery && (
                    <button
                      className='mt-2 flex size-9 items-center justify-center rounded-lg border border-dashed border-gray-3 text-gray-4 transition-all hover:border-accent-primary hover:text-accent-primary'
                      title='Add Section'
                      onClick={() => useFormStore.getState().addPanel()}
                    >
                      <Icon height={16} name='lucide:plus' width={16} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div
            className={cn(
              'shrink-0 border-t border-gray-2 bg-white p-4 transition-all',
              isLeftSidebarCollapsed && 'flex justify-center p-3',
            )}
          >
            <div className='flex items-center gap-2 text-gray-5'>
              <Icon
                className='text-green-500'
                height={14}
                name='lucide:check-circle-2'
                width={14}
              />
              {!isLeftSidebarCollapsed && (
                <div className='animate-in fade-in text-[10px] font-semibold tracking-widest uppercase duration-300'>
                  Auto-saved
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default LeftSidebar
