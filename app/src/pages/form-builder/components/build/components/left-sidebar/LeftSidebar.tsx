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
import { ActionIcon, Tooltip } from '@mantine/core'
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
  searchQuery: string
  totalPanels: number
  movePanel: (id: string, dir: 'up' | 'down') => void
  onScroll: (id: string) => void
}

const getFieldIcon = (type: string) => {
  switch (type) {
    case 'FULL_NAME':
      return 'lucide:user'
    case 'EMAIL':
      return 'lucide:mail'
    case 'PHONE_NUMBER':
      return 'lucide:phone'
    case 'CURRENCY_AMOUNT':
      return 'lucide:banknote'
    case 'DIVIDER':
      return 'lucide:separator-horizontal'
    case 'FILE_UPLOAD':
      return 'lucide:upload-cloud'
    case 'SINGLE_SELECT':
    case 'MULTI_SELECT':
      return 'lucide:list-todo'
    case 'SINGLE_CHOICE':
    case 'MULTIPLE_CHOICE':
      return 'lucide:radio'
    case 'DATE':
    case 'TIME':
    case 'DATE_TIME':
      return 'lucide:calendar'
    case 'NUMBER':
    case 'COUNTER':
      return 'lucide:binary'
    default:
      return 'mdi:form-textbox'
  }
}

const SortableSectionItem = ({
  index,
  isActive,
  isCollapsed,
  isSearchActive,
  movePanel,
  p,
  searchQuery,
  totalPanels,
  onScroll,
}: SortableSectionProps) => {
  const { activeQuestionId, deletePanel, setActiveQuestionId } = useFormStore()
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isFieldsOpen, setIsFieldsOpen] = useState(true)

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

  const handleMouseLeave = () => setIsConfirmingDelete(false)

  const isSectionMatch =
    searchQuery.trim() &&
    (p.settings.title || '')
      .toLowerCase()
      .includes(searchQuery.toLowerCase())

  const scrollToQuestion = (qId: string) => {
    setActiveQuestionId(qId)
    useFormStore.getState().setSelectionType('question')
    useFormStore.getState().setSidebarOpen(true)
    const el = document.getElementById(qId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const handleSectionHeaderClick = () => {
    onScroll(p.id)
    setIsFieldsOpen((prev) => !prev)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isConfirmingDelete ? {} : attributes)}
      {...(isConfirmingDelete ? {} : listeners)}
      className={cn(
        'group relative cursor-default select-none flex flex-col gap-0.5',
        isDragging && 'z-50 scale-102 rounded-lg bg-white opacity-50 shadow-lg',
      )}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={cn(
          'relative flex w-full items-center rounded-lg transition-all duration-200 cursor-pointer outline-none focus:outline-none focus:ring-0',
          isCollapsed
            ? 'size-9 justify-center p-2'
            : 'gap-2 px-2.5 py-1.5 text-left',
          'text-gray-12 hover:bg-gray-2 hover:text-gray-13',
          isActive &&
            'bg-primary-3 text-primary-9 font-bold shadow-2xs',
          isSectionMatch && 'bg-purple-3 text-purple-11 font-bold',
          isDragging &&
            'scale-[1.02] bg-primary-3 text-primary-9 shadow-md',
          isConfirmingDelete && 'bg-red-3 text-red-11',
        )}
        onClick={handleSectionHeaderClick}
      >
        {isConfirmingDelete ? (
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className='flex w-full flex-col gap-2 rounded-xl border border-red-3 bg-red-2 p-3'
            initial={{ opacity: 0, scale: 0.95 }}
          >
            <div className='flex items-center gap-2 text-red-11'>
              <Icon height={14} name='lucide:alert-triangle' width={14} />
              <span className='text-[10px] font-extrabold tracking-widest uppercase'>
                Action Needed
              </span>
            </div>
            <p className='text-xs leading-relaxed font-medium text-red-12'>
              Delete this section and{' '}
              <span className='font-bold text-red-11'>
                {p.fields?.length || 0} fields
              </span>
              ?
            </p>
            <div className='mt-1 flex items-center gap-2'>
              <button
                className='flex-1 rounded-lg bg-red-9 py-1.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-red-10 active:scale-95'
                onClick={(e) => {
                  e.stopPropagation()
                  deletePanel(p.id)
                }}
              >
                Delete
              </button>
              <button
                className='flex-1 rounded-lg border border-gray-3 bg-white py-1.5 text-xs font-bold text-gray-12 transition-all hover:bg-gray-1 active:scale-95'
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
            <div className='flex min-w-0 flex-1 items-center gap-1.5 text-left'>
              {/* Drag Handle */}
              {!isCollapsed && !isSearchActive && (
                <div className='p-0.5 text-gray-9 opacity-60 transition-opacity group-hover:text-primary-9 group-hover:opacity-100'>
                  <Icon height={14} name='lucide:grip-vertical' width={14} />
                </div>
              )}

              {!isCollapsed && p.fields && p.fields.length > 0 && (
                <div className='rounded p-0.5 text-gray-9 hover:text-gray-12'>
                  <Icon
                    height={13}
                    width={13}
                    name={
                      (isFieldsOpen || isSearchActive)
                        ? 'lucide:chevron-down'
                        : 'lucide:chevron-right'
                    }
                  />
                </div>
              )}

              <div className='flex min-w-0 flex-1 items-center gap-2 text-left'>
                <Tooltip
                  disabled={!p.settings.isLocked}
                  label='Section is locked from edits'
                  position='top'
                  withArrow
                >
                  <Icon
                    name={p.settings.isLocked ? 'lucide:lock' : 'lucide:layout'}
                    width={isCollapsed ? 18 : 14}
                    height={isCollapsed ? 18 : 14}
                    className={cn(
                      'shrink-0 transition-all',
                      isActive
                        ? 'scale-105 text-primary-9 opacity-100'
                        : 'text-gray-10 group-hover:text-primary-9 group-hover:opacity-100',
                    )}
                  />
                </Tooltip>

                {!isCollapsed && (
                  <div
                    className={cn(
                      'animate-in fade-in flex-1 truncate text-xs font-semibold tracking-tight duration-200',
                      isActive
                        ? 'font-bold text-primary-9'
                        : 'text-gray-12 group-hover:text-gray-13',
                    )}
                  >
                    {p.settings.title || 'Untitled Section'}
                  </div>
                )}
              </div>
            </div>

            {!isCollapsed && (
              <div className='animate-in fade-in flex items-center gap-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100'>
                {index > 0 && (
                  <Tooltip label='Move section up' position='top' withArrow>
                    <ActionIcon
                      className='hover:bg-primary-3 hover:text-primary-9 text-gray-10'
                      color='gray'
                      size='xs'
                      variant='subtle'
                      onClick={(e) => {
                        e.stopPropagation()
                        movePanel(p.id, 'up')
                      }}
                    >
                      <Icon height={13} name='lucide:arrow-up' width={13} />
                    </ActionIcon>
                  </Tooltip>
                )}

                {index < totalPanels - 1 && (
                  <Tooltip label='Move section down' position='top' withArrow>
                    <ActionIcon
                      className='hover:bg-primary-3 hover:text-primary-9 text-gray-10'
                      color='gray'
                      size='xs'
                      variant='subtle'
                      onClick={(e) => {
                        e.stopPropagation()
                        movePanel(p.id, 'down')
                      }}
                    >
                      <Icon height={13} name='lucide:arrow-down' width={13} />
                    </ActionIcon>
                  </Tooltip>
                )}

                <Tooltip label='Delete section' position='top' withArrow>
                  <ActionIcon
                    className='hover:bg-red-3 hover:text-red-11 text-gray-10 transition-colors'
                    color='red'
                    size='xs'
                    variant='subtle'
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsConfirmingDelete(true)
                    }}
                  >
                    <Icon height={13} name='lucide:trash-2' width={13} />
                  </ActionIcon>
                </Tooltip>
              </div>
            )}
          </>
        )}
      </div>

      {/* Render Fields Tree inside Section */}
      {!isCollapsed && (isFieldsOpen || isSearchActive) && p.fields && p.fields.length > 0 && (
        <div className='ml-5 flex flex-col gap-0.5 border-l border-gray-3 pl-2 py-0.5'>
          {p.fields.map((f: any) => {
            const isFieldActive = activeQuestionId === f.id
            const isFieldMatch =
              isSearchActive &&
              ((f.label || '')
                .toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
                (f.type || '').toLowerCase().includes(searchQuery.toLowerCase()))

            return (
              <button
                key={f.id}
                type='button'
                className={cn(
                  'group/f flex items-center gap-2 rounded-md px-2 py-1 text-left text-xs transition-all cursor-pointer border-0 outline-none focus:outline-none focus:ring-0',
                  isFieldActive
                    ? 'bg-primary-3 text-primary-9 font-semibold'
                    : isFieldMatch
                      ? 'bg-purple-3 text-purple-11 font-semibold'
                      : 'text-gray-11 hover:bg-gray-2 hover:text-gray-13',
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  scrollToQuestion(f.id)
                }}
              >
                <Icon
                  height={12}
                  name={getFieldIcon(f.type)}
                  width={12}
                  className={cn(
                    'shrink-0 transition-colors',
                    isFieldActive
                      ? 'text-primary-9'
                      : isFieldMatch
                        ? 'text-purple-11'
                        : 'text-gray-9 group-hover/f:text-gray-12',
                  )}
                />
                <span className='truncate flex-1 font-medium'>
                  {f.label || 'Untitled Field'}
                </span>
                {f.isMandatory && (
                  <span className='shrink-0 text-[10px] font-bold text-red-11'>
                    *
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
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
    return panels.filter((p) => {
      const matchTitle =
        (p?.settings?.title || '')
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      const matchDesc =
        (p?.settings?.description || '')
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        p.fields.some(
          (f: any) =>
            (f.label || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (f.type || '').toLowerCase().includes(searchQuery.toLowerCase()),
        )
      return matchTitle || matchDesc
    })
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
        'animate-in slide-in-from-left relative flex h-full shrink-0 flex-col border-r border-gray-3 bg-white font-inter transition-all duration-300',
        isLeftSidebarCollapsed ? 'w-14' : 'w-[270px]',
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
              'flex size-6 items-center justify-center rounded-full border border-gray-3 bg-white text-gray-10 shadow-xs',
              'group transition-all hover:border-primary-9 hover:text-primary-9 hover:shadow-sm active:scale-90',
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

          {/* Search Box - Visible & High Contrast */}
          <div
            className={cn(
              'sticky top-0 z-10 border-b border-gray-3 bg-white p-3 transition-all',
              isLeftSidebarCollapsed
                ? 'flex justify-center px-2 py-3'
                : 'px-3 py-2.5',
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
                  className='text-gray-10'
                  height={16}
                  name='lucide:search'
                  width={16}
                />
              </ActionIcon>
            ) : (
              <div className='group relative w-full'>
                <Icon
                  height={14}
                  name='lucide:search'
                  width={14}
                  className={cn(
                    'absolute top-1/2 left-2.5 -translate-y-1/2 text-gray-9 transition-colors',
                    searchQuery && 'text-primary-9',
                  )}
                />
                <input
                  className='w-full rounded-lg border border-gray-3 bg-white py-1.5 pr-8 pl-8 text-xs font-semibold text-gray-12 opacity-100 transition-all outline-none placeholder:text-gray-9 focus:border-primary-9 focus:ring-2 focus:ring-primary-3 shadow-2xs'
                  placeholder='Search sections or fields...'
                  type='text'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    className='absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-0.5 text-gray-9 transition-colors hover:bg-gray-2 hover:text-gray-12'
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
              'custom-scrollbar flex-1 space-y-4 overflow-y-auto p-3 font-inter transition-all',
              isLeftSidebarCollapsed && 'px-2',
            )}
          >
            <div className='space-y-1'>
              {!isLeftSidebarCollapsed && (
                <div className='group mb-2 flex items-center justify-between rounded-lg px-1 py-1 transition-colors'>
                  <div
                    className='flex min-w-0 flex-1 cursor-pointer items-center gap-2'
                    onClick={() => setIsFormExpanded(!isFormExpanded)}
                  >
                    <Icon
                      className='text-gray-9 transition-colors group-hover:text-gray-12'
                      height={14}
                      width={14}
                      name={
                        isFormExpanded
                          ? 'lucide:chevron-down'
                          : 'lucide:chevron-right'
                      }
                    />
                    <Icon
                      className='text-primary-9'
                      height={14}
                      name='lucide:layers'
                      width={14}
                    />
                    <span className='truncate text-xs font-bold text-gray-12'>
                      Sections
                    </span>
                  </div>

                  {/* Plus button directly on Section header row */}
                  <Tooltip label='Add Section' position='top' withArrow>
                    <ActionIcon
                      className='hover:bg-primary-3 text-primary-9'
                      color='primary'
                      size='xs'
                      variant='subtle'
                      onClick={(e) => {
                        e.stopPropagation()
                        useFormStore.getState().addPanel()
                      }}
                    >
                      <Icon height={14} name='lucide:plus' width={14} />
                    </ActionIcon>
                  </Tooltip>
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
                          searchQuery={searchQuery}
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
        </>
      )}
    </div>
  )
}

export default LeftSidebar
