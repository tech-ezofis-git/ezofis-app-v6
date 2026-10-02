import { useLingui } from '@lingui/react/macro'
import { notifications } from '@mantine/notifications'
import { type Table as TanstackTable } from '@tanstack/react-table'
import dayjs from 'dayjs'
import { motion } from 'motion/react'
import { type MutableRefObject, useMemo, useRef, useState } from 'react'
import type { WorkflowOption } from '@/pages/requests/types'
import workflowsApiV6 from '@/api/v6/workflows'
import Avatar from '@/components/base/Avatar'
import Icon from '@/components/base/icon/Icon'
import showToast from '@/components/base/toast/showToast'
import Tooltip from '@/components/base/Tooltip'
import ListEmptyState from '@/components/common/ListEmptyState'
import requestStore from '@/pages/requests/stores/useRequestStore'
import {
  findInvoiceNumber,
  findSupplierName,
} from '@/pages/requests/utils/inboxItemDisplay'
import {
  getGenericStageInfo,
  isAccountsPayableWorkflow,
} from '@/pages/requests/utils/workflow.utils'
import { kanbanColorDotClass } from '@/pages/workflows/utils/kanbanSettings'
import authUserStore from '@/stores/authUserStore'
import cn from '@/utils/cn'
import { parseUtcDate } from '@/utils/utcDate'
import {
  buildKanbanColumns,
  findMoveRule,
  getKanbanMissingRequiredFields,
  isKanbanReturnAction,
  itemActivityId,
  itemInstanceId,
  itemStageLabel,
  type KanbanColumnRole,
  matchKanbanColumnIndex,
  normalizeKanbanLabel,
  resolveKanbanActivityId,
} from '../helpers/kanbanBoard'
import {
  extractGenericRequestNumber,
  readPreviewChipText,
  resolvePreviewFieldColumns,
} from './columns/useDynamicColumns'
import HoverExpandableText from './HoverExpandableText'

const formatRunningTime = (date: unknown): string => {
  if (!date) return ''
  const parsed = parseUtcDate(date)
  if (!parsed) return ''
  const ms = Math.abs(Date.now() - parsed.getTime())
  if (Number.isNaN(ms)) return ''
  const secs = Math.floor(ms / 1000)
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ${mins % 60}m ago`
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h ago`
}

const splitItemsByStage = (column: {
  items: any[]
  stages?: { id: string; name: string; terminal: boolean }[]
}) => {
  const stages = column.stages?.length
    ? column.stages
    : [{ id: '', name: '', terminal: false }]
  const buckets = stages.map((stage) => ({ ...stage, items: [] as any[] }))
  if (buckets.length <= 1) {
    if (buckets[0]) buckets[0].items = column.items
    return buckets
  }

  column.items.forEach((item) => {
    const activityId = itemActivityId(item)
    let index = activityId
      ? buckets.findIndex((stage) => stage.id === activityId)
      : -1
    if (index < 0) {
      const label = normalizeKanbanLabel(itemStageLabel(item))
      index = buckets.findIndex(
        (stage) => normalizeKanbanLabel(stage.name) === label,
      )
    }
    buckets[index < 0 ? 0 : index].items.push(item)
  })
  return buckets
}

const roleDotClass: Record<KanbanColumnRole, string> = {
  neutral: 'bg-gray-8',
  review: 'bg-primary-9',
  success: 'bg-green-9',
}

const rolePillClass: Record<KanbanColumnRole, string> = {
  neutral: 'border-gray-3 bg-gray-2 text-gray-11',
  review: 'border-purple-3 bg-purple-1 text-primary-9',
  success: 'border-green-3 bg-green-1 text-green-9',
}

const roleIconWrapClass: Record<KanbanColumnRole, string> = {
  neutral: 'bg-gray-2 text-gray-11',
  review: 'bg-primary-3 text-primary-9',
  success: 'bg-green-2 text-green-9',
}

const getColumnThemeClasses = (color?: string, role?: KanbanColumnRole) => {
  const base =
    color ||
    (role === 'success' ? 'green' : role === 'review' ? 'primary' : 'gray')
  switch (base) {
    case 'green':
      return { bg: 'bg-green-2', count: 'bg-green-9 text-white' }
    case 'blue':
      return { bg: 'bg-blue-2', count: 'bg-blue-9 text-white' }
    case 'orange':
      return { bg: 'bg-orange-2', count: 'bg-orange-9 text-white' }
    case 'red':
      return { bg: 'bg-red-2', count: 'bg-red-9 text-white' }
    case 'primary':
    case 'purple':
      return { bg: 'bg-primary-2', count: 'bg-primary-9 text-white' }
    case 'gray':
    default:
      return { bg: 'bg-gray-2', count: 'bg-gray-8 text-white' }
  }
}

const getInitials = (nameOrEmail: string): string => {
  if (!nameOrEmail) return ''
  const parts = nameOrEmail.split(/[@.\s_-]/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return nameOrEmail.substring(0, 2).toUpperCase()
}

type KanbanViewProps = {
  isLoading?: boolean
  items: any[]
  table?: TanstackTable<any>
  workflow: WorkflowOption | null
  onNewRequest?: () => void
  onRefresh?: () => void
  onRowClick: (item: any, tab: string, missingFieldIds?: string[]) => void
}

export default function KanbanView({
  isLoading = false,
  items,
  table,
  workflow,
  onNewRequest,
  onRefresh,
  onRowClick,
}: KanbanViewProps) {
  const { t } = useLingui()
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [dropAllowed, setDropAllowed] = useState(true)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [hoveredRequestCard, setHoveredRequestCard] = useState(false)
  const [hoveredColumnId, setHoveredColumnId] = useState<string | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({})
  const dragItemRef = useRef<any>(null)
  const didDragRef = useRef(false)

  const columns = useMemo(() => buildKanbanColumns(workflow), [workflow])
  const isAp = isAccountsPayableWorkflow(workflow)
  const rawWorkflowData = requestStore((state) => state.rawWorkflowData)

  const { columns: dynamicFields, previewValues } = useMemo(
    () => resolvePreviewFieldColumns(workflow, rawWorkflowData),
    [rawWorkflowData, workflow],
  )

  const grouped = useMemo(() => {
    const buckets: any[][] = columns.map(() => [])
    const leftover: any[] = []

    items.forEach((item) => {
      const index = matchKanbanColumnIndex(item, columns)
      if (index >= 0) buckets[index].push(item)
      else leftover.push(item)
    })

    const result = columns.map((column, index) => ({
      ...column,
      items: buckets[index],
    }))

    if (leftover.length && columns.length) {
      result.push({
        id: 'kanban-other',
        items: leftover,
        name: t`Other`,
        role: 'review' as KanbanColumnRole,
        stages: [
          {
            id: 'kanban-other',
            name: t`Other`,
            terminal: false,
          },
        ],
        terminal: false,
      })
    } else if (leftover.length) {
      const byStage = new Map<string, any[]>()
      leftover.forEach((item) => {
        const stage = itemStageLabel(item) || t`In Progress`
        const list = byStage.get(stage) || []
        list.push(item)
        byStage.set(stage, list)
      })
      byStage.forEach((stageItems, name) => {
        result.push({
          id: name,
          items: stageItems,
          name,
          role: 'review',
          stages: [{ id: name, name, terminal: false }],
          terminal: false,
        })
      })
    }

    return result
  }, [columns, items, t])

  const handleDropOnColumn = async (targetColumnId: string) => {
    const item = dragItemRef.current
    setDropTargetId(null)
    setDraggingId(null)
    dragItemRef.current = null
    if (!item || item._canMove !== true) return

    const fromId = resolveKanbanActivityId(item, workflow)
    if (!fromId) return

    const rule = findMoveRule(workflow, fromId, targetColumnId)
    if (!rule) {
      showToast({
        message: t`This request can’t be moved to this stage from its current stage.`,
        toastTitle: t`Stage unavailable`,
        variant: 'error',
      })
      return
    }

    const action = String(rule.proceedAction || rule.action || 'Submit')
    if (fromId === String(rule.toBlockId || rule.to || targetColumnId)) return

    const missing = isKanbanReturnAction(action)
      ? []
      : getKanbanMissingRequiredFields(item, workflow, fromId)
    if (missing.length) {
      const missingIds = [
        ...new Set(
          missing.flatMap((field) => [field.id, field.label].filter(Boolean)),
        ),
      ]
      const displayedFields = missing.slice(0, 2)
      const remainingCount = missing.length - displayedFields.length

      const toastId = showToast({
        autoClose: 15_000,
        message: (
          <div className='space-y-2.5'>
            <p className='text-13 text-gray-12'>
              {t`This request is missing a few required details to move forward.`}
            </p>
            <ul className='space-y-1 text-13 text-gray-13'>
              {displayedFields.map((field) => (
                <li className='flex items-start gap-2' key={field.id}>
                  <span className='mt-1.5 size-1.5 shrink-0 rounded-full bg-orange-9' />
                  <span className='truncate'>{field.label}</span>
                </li>
              ))}
              {remainingCount > 0 ? (
                <li className='flex items-center gap-2 pt-0.5 text-12 text-gray-11'>
                  <span className='size-1.5 shrink-0 rounded-full bg-orange-9' />
                  <span className='inline-flex items-center rounded-full bg-orange-2 px-2 py-0.5 text-11 font-semibold text-orange-11'>
                    +{remainingCount} {t`more`}
                  </span>
                </li>
              ) : null}
            </ul>
            <button
              className='inline-flex items-center gap-1.5 pt-1 text-13 font-semibold text-primary-9 hover:underline'
              type='button'
              onClick={() => {
                notifications.hide(toastId)
                onRowClick(item, 'Overview', missingIds)
              }}
            >
              {t`Open request`}
              <Icon className='size-3.5' name='lucide:arrow-right' />
            </button>
          </div>
        ),
        toastTitle: t`Action needed`,
        variant: 'warning',
      })
      return
    }

    const instanceId = itemInstanceId(item)
    if (!instanceId) {
      showToast({
        message: t`We couldn’t identify this request, so it couldn’t be moved.`,
        toastTitle: t`Move unavailable`,
        variant: 'error',
      })
      return
    }

    const requestNo = extractGenericRequestNumber(item)
    const itemKey = String(item.id || item.processId || instanceId)
    setMovingId(itemKey)

    try {
      const formData =
        typeof item.formData === 'string'
          ? item.formData
          : JSON.stringify(item.formData?.fields || item.formData || {})
      const payload = {
        activityid: fromId,
        activityUserId:
          authUserStore.getState().session?.id || item.userId || null,
        AIAGENTHtml: item.agentHtml || '',
        AIAGENTResponse:
          typeof item.agentResponse === 'string'
            ? item.agentResponse
            : JSON.stringify(item.agentResponse || {}),
        comments: '',
        formData,
        formEntryId: Number(item.formEntryId || 0),
        formId: item.formId || workflow?.wFormId || null,
        instanceId,
        isItemTable: true,
        itemId: item.itemId || null,
        processId: item.processId || item.id || null,
        repositoryId: item.repositoryId || null,
        review: action,
        transactionId: item.transactionId || null,
        workflowId: item.workflowId || workflow?.id || null,
      }
      const response = await workflowsApiV6.moveNext(
        String(instanceId),
        payload,
      )
      if (response?.error) {
        showToast({
          message: t`We couldn’t move request ${requestNo}. ${response.error}`,
          toastTitle: t`Move unsuccessful`,
          variant: 'error',
        })
        return
      }
      showToast({
        message: t`Request ${requestNo} has been moved successfully.`,
        toastTitle: t`Request moved`,
        variant: 'success',
      })
      await Promise.resolve(onRefresh?.())
    } catch {
      showToast({
        message: t`We couldn’t move this request right now. Please try again.`,
        toastTitle: t`Move unsuccessful`,
        variant: 'error',
      })
    } finally {
      setMovingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className='flex h-full min-h-0 gap-4 overflow-hidden px-2 pt-1 pb-2'>
        {[0, 1, 2, 3].map((index) => (
          <div
            className='flex h-full w-80 shrink-0 flex-col rounded-xl border border-gray-3 bg-surface'
            key={index}
          >
            <div className='flex items-center gap-2 border-b border-gray-3 px-3.5 py-3.5'>
              <div className='size-2 rounded-full bg-gray-4' />
              <div className='h-3.5 flex-1 rounded bg-gray-3' />
              <div className='h-5 w-7 rounded-full bg-gray-2' />
            </div>
            <div className='flex flex-col gap-2 p-3'>
              <div className='h-32 rounded-xl border border-gray-3 bg-gray-2' />
              <div className='h-32 rounded-xl border border-gray-3 bg-gray-2' />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!items.length) {
    return (
      <ListEmptyState
        containerClassName='py-12'
        page='requests'
        table={table}
        onPrimaryAction={onNewRequest}
      />
    )
  }

  return (
    <div className='flex h-full min-h-0 w-full min-w-0 pt-0.5 pb-2'>
      <div className='min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-visible [scrollbar-color:var(--gray-8)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-8 [&::-webkit-scrollbar-track]:bg-transparent'>
        <div className='flex h-full min-h-0 w-max items-stretch gap-4 px-1'>
          {grouped.map((column) => {
            const stageBuckets = splitItemsByStage(column)
            const isGrouped = stageBuckets.length > 1
            const defaultDropId = stageBuckets[0]?.id || column.id
            const columnDropId = isGrouped ? column.id : defaultDropId
            const isColumnDropTarget = dropTargetId === columnDropId
            const showColumnHover =
              hoveredColumnId === column.id &&
              !hoveredRequestCard &&
              !isColumnDropTarget
            const bindDrop = (targetId: string) => ({
              onDragLeave: (event: {
                currentTarget: HTMLElement
                relatedTarget: EventTarget | null
              }) => {
                if (
                  !event.currentTarget.contains(event.relatedTarget as Node)
                ) {
                  setDropTargetId((current) =>
                    current === targetId ? null : current,
                  )
                }
              },
              onDragOver: (event: {
                dataTransfer: DataTransfer
                preventDefault: () => void
                stopPropagation: () => void
              }) => {
                event.preventDefault()
                event.stopPropagation()
                const fromId = resolveKanbanActivityId(
                  dragItemRef.current || {},
                  workflow,
                )
                const allowed = Boolean(
                  fromId && findMoveRule(workflow, fromId, targetId),
                )
                setDropTargetId(targetId)
                setDropAllowed(allowed)
                event.dataTransfer.dropEffect = allowed ? 'move' : 'none'
              },
              onDrop: (event: {
                preventDefault: () => void
                stopPropagation: () => void
              }) => {
                event.preventDefault()
                event.stopPropagation()
                void handleDropOnColumn(targetId)
              },
            })
            const renderCards = (
              items: any[],
              stageName: string,
              locked: boolean,
            ) =>
              items.length ? (
                items.map((item, index) => (
                  <div
                    className='relative z-0 overflow-visible py-1 hover:z-50'
                    key={
                      item?.id ||
                      item?.processId ||
                      `${column.id}-${stageName}-${index}`
                    }
                  >
                    <KanbanCard
                      columnId={column.id}
                      didDragRef={didDragRef}
                      dragItemRef={dragItemRef}
                      dynamicFields={dynamicFields}
                      isAp={isAp}
                      item={item}
                      locked={locked}
                      previewValues={previewValues}
                      role={column.role}
                      stageName={stageName}
                      workflow={workflow}
                      isDragging={
                        draggingId ===
                        String(item.id || item.processId || index)
                      }
                      isMoving={
                        movingId ===
                        String(
                          item.id || item.processId || itemInstanceId(item),
                        )
                      }
                      setDraggingId={setDraggingId}
                      setDropTargetId={setDropTargetId}
                      onHoverChange={setHoveredRequestCard}
                      onRowClick={onRowClick}
                    />
                  </div>
                ))
              ) : (
                <div className='rounded-[5px] border border-dashed border-gray-8 px-2.5 py-4 text-center text-[11.5px] text-gray-10'>
                  {t`No requests in this stage`}
                </div>
              )

            const theme = getColumnThemeClasses(column.color, column.role)

            return (
              <div className='relative h-full shrink-0 py-0.5' key={column.id}>
                <motion.section
                  initial={false}
                  animate={
                    showColumnHover
                      ? {
                          boxShadow:
                            '0 18px 36px rgba(15, 23, 42, 0.14), 0 0 0 3px color-mix(in srgb, var(--primary-9) 20%, transparent)',
                          scale: 1.02,
                          y: -8,
                        }
                      : {
                          boxShadow: '0 0 0 0px transparent',
                          scale: 1,
                          y: 0,
                        }
                  }
                  className={cn(
                    'flex h-full min-h-0 w-80 flex-col overflow-visible rounded-xl border bg-surface',
                    isColumnDropTarget &&
                      dropAllowed &&
                      'border-primary-9 bg-primary-2 shadow-[0_0_0_3px_var(--primary-4)]',
                    isColumnDropTarget &&
                      !dropAllowed &&
                      'border-red-8 bg-red-1 shadow-[0_0_0_3px_var(--red-4)]',
                    !isColumnDropTarget && 'border-gray-3',
                  )}
                  transition={{
                    damping: 26,
                    mass: 0.55,
                    stiffness: 380,
                    type: 'spring',
                  }}
                  onHoverEnd={() => {
                    setHoveredColumnId((current) =>
                      current === column.id ? null : current,
                    )
                  }}
                  onHoverStart={() => setHoveredColumnId(column.id)}
                  {...bindDrop(columnDropId)}
                >
                  <header
                    className={cn(
                      'flex shrink-0 items-center gap-2.5 rounded-t-[11px] border-b border-gray-3 px-3.5 py-3.5',
                      theme.bg,
                    )}
                  >
                    <h3 className='min-w-0 flex-1 truncate text-[13.5px] font-semibold tracking-tight text-gray-13'>
                      {column.name}
                    </h3>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-11 font-semibold',
                        theme.count,
                      )}
                    >
                      {column.items.length}
                    </span>
                  </header>

                  {isGrouped ? (
                    <div className='flex min-h-0 flex-1 flex-col gap-0.5 overflow-x-visible overflow-y-auto px-2.5 py-1.5 [scrollbar-color:var(--gray-8)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-8 [&::-webkit-scrollbar-track]:bg-transparent'>
                      {stageBuckets.map((stage) => {
                        const groupKey = `${column.id}:${stage.id}`
                        const collapsed = Boolean(collapsedGroups[groupKey])
                        const isDropTarget = dropTargetId === stage.id
                        return (
                          <div
                            key={stage.id}
                            className={cn(
                              'rounded-lg transition-all',
                              isDropTarget &&
                                dropAllowed &&
                                'bg-primary-2 shadow-[0_0_0_2px_var(--primary-4)]',
                              isDropTarget &&
                                !dropAllowed &&
                                'bg-red-1 shadow-[0_0_0_2px_var(--red-4)]',
                            )}
                            {...bindDrop(stage.id)}
                          >
                            <button
                              className='flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-gray-2 active:scale-[0.99]'
                              type='button'
                              onClick={() =>
                                setCollapsedGroups((current) => ({
                                  ...current,
                                  [groupKey]: !current[groupKey],
                                }))
                              }
                            >
                              <Icon
                                name='lucide:chevron-right'
                                className={cn(
                                  'size-3.5 shrink-0 text-gray-10 transition-transform',
                                  !collapsed && 'rotate-90',
                                )}
                              />
                              <span
                                className={cn(
                                  'size-1.5 shrink-0 rounded-full',
                                  stage.terminal
                                    ? roleDotClass.success
                                    : column.color
                                      ? kanbanColorDotClass(column.color)
                                      : roleDotClass[column.role],
                                )}
                              />
                              <span className='min-w-0 flex-1 truncate text-[10px] font-semibold tracking-wide text-gray-11 uppercase'>
                                {stage.name}
                              </span>
                              <span className='shrink-0 text-11 font-semibold text-gray-10'>
                                {stage.items.length}
                              </span>
                            </button>
                            {!collapsed ? (
                              <div className='flex flex-col gap-0.5 px-1 pb-1.5'>
                                {renderCards(
                                  stage.items,
                                  stage.name,
                                  stage.terminal || column.terminal,
                                )}
                              </div>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className='flex min-h-0 flex-1 flex-col gap-0.5 overflow-x-visible overflow-y-auto px-2.5 pt-1 pb-2 [scrollbar-color:var(--gray-8)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-8 [&::-webkit-scrollbar-track]:bg-transparent'>
                      {renderCards(column.items, column.name, column.terminal)}
                    </div>
                  )}
                </motion.section>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function KanbanCard({
  columnId,
  didDragRef,
  dragItemRef,
  dynamicFields,
  isAp,
  isDragging,
  isMoving,
  item,
  locked,
  role,
  stageName,
  workflow,
  setDraggingId,
  setDropTargetId,
  onHoverChange,
  onRowClick,
  previewValues,
}: {
  columnId: string
  didDragRef: MutableRefObject<boolean>
  dragItemRef: MutableRefObject<any>
  dynamicFields: { id: string; label: string }[]
  isAp: boolean
  isDragging: boolean
  isMoving: boolean
  item: any
  locked: boolean
  role: KanbanColumnRole
  stageName: string
  workflow: WorkflowOption | null
  onHoverChange?: (hovered: boolean) => void
  onRowClick: (item: any, tab: string, missingFieldIds?: string[]) => void
  previewValues: string[]
  setDraggingId: (id: string | null) => void
  setDropTargetId: (id: string | null) => void
}) {
  const { t } = useLingui()
  const [blockCardDrag, setBlockCardDrag] = useState(false)
  const [isCardHovered, setIsCardHovered] = useState(false)
  const requestNo = extractGenericRequestNumber(item)
  const { currentLabel, isTerminal } = getGenericStageInfo(workflow, item)
  const pillLabel = currentLabel || stageName
  const cardRole: KanbanColumnRole = isTerminal || locked ? 'success' : role
  const itemKey = String(item.id || item.processId || columnId)
  const canDrag = !locked && !isMoving && item._canMove === true

  const raisedBy =
    item?.activityUserEmail ||
    item?.createdByEmail ||
    item?.transactionCreatedByEmail ||
    item?.raisedBy ||
    item?.createdByName ||
    item?.createdBy ||
    item?.userName ||
    ''
  const startedAt =
    item?.startedAtUtc ||
    item?.createdAtUtc ||
    item?.createdAt ||
    item?.raisedAt ||
    item?.createdOn
  const lastActionAt =
    item?.transactionCreatedAt ||
    item?.lastActionDate ||
    item?.lastAction?.date ||
    item?.lastAction?.createdAt ||
    item?.lastActionAt ||
    item?.updatedAt ||
    item?.actionDate ||
    startedAt

  const fieldLines = (() => {
    if (!isAp) return []
    const invoice = findInvoiceNumber(item)
    const supplier = findSupplierName(item)
    const lines: { primary?: boolean; text: string }[] = []
    if (supplier) lines.push({ primary: true, text: supplier })
    if (invoice) lines.push({ text: invoice })
    return lines
  })()

  const previewFieldTexts = (() => {
    if (isAp) return []
    const texts: string[] = []
    const seen = new Set<string>()
    for (const col of dynamicFields) {
      const text = readPreviewChipText(item, col.id, col.label)
      if (!text || seen.has(text)) continue
      seen.add(text)
      texts.push(text)
    }
    for (const label of previewValues) {
      const text = readPreviewChipText(item, label, label)
      if (!text || seen.has(text)) continue
      seen.add(text)
      texts.push(text)
    }
    return texts
  })()

  return (
    <div
      draggable={canDrag && !blockCardDrag}
      role='button'
      tabIndex={0}
      className={cn(
        'relative z-0 w-full rounded-xl border bg-surface p-3 text-left',
        'duration-200 ease-out',
        isCardHovered ? 'z-20 border-primary-6' : 'border-gray-3',
        canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-default',
        (isDragging || isMoving) && 'opacity-40',
      )}
      style={{
        boxShadow: isCardHovered
          ? '0 0 0 3px var(--primary-4), 0 10px 24px rgba(15, 23, 42, 0.16)'
          : '0 1px 2px rgba(15, 23, 42, 0.06)',
        transition: 'border-color 200ms ease-out, box-shadow 200ms ease-out',
      }}
      onClick={() => {
        if (didDragRef.current) {
          didDragRef.current = false
          return
        }
        onRowClick(item, 'Overview')
      }}
      onDragEnd={() => {
        setDraggingId(null)
        dragItemRef.current = null
        setDropTargetId(null)
        setIsCardHovered(false)
      }}
      onDragStart={(event) => {
        if (
          !canDrag ||
          (event.target as HTMLElement | null)?.closest?.('[data-no-drag]')
        ) {
          event.preventDefault()
          return
        }
        didDragRef.current = true
        dragItemRef.current = item
        setDraggingId(itemKey)
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', itemKey)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onRowClick(item, 'Overview')
        }
      }}
      onMouseEnter={() => {
        setIsCardHovered(true)
        onHoverChange?.(true)
      }}
      onMouseLeave={() => {
        setIsCardHovered(false)
        setBlockCardDrag(false)
        onHoverChange?.(false)
      }}
    >
      <div className='mb-2 flex items-center gap-2'>
        {raisedBy ? (
          <Tooltip content={raisedBy} position='top'>
            <span
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full',
                roleIconWrapClass[cardRole],
              )}
            >
              <Avatar
                className='shrink-0'
                initials={getInitials(raisedBy)}
                size={24}
              />
            </span>
          </Tooltip>
        ) : (
          <span
            className={cn(
              'flex size-6 shrink-0 items-center justify-center rounded-full',
              roleIconWrapClass[cardRole],
            )}
          >
            <Icon
              className='size-3.5'
              name={cardRole === 'success' ? 'tabler:check' : 'tabler:clock'}
            />
          </span>
        )}
        <span
          className='flex min-w-0 flex-1 !cursor-pointer items-center'
          data-no-drag=''
          onMouseEnter={() => setBlockCardDrag(true)}
          onMouseLeave={() => setBlockCardDrag(false)}
        >
          <HoverExpandableText
            className='text-13 font-bold tracking-tight text-gray-13'
            expandStyle='stack'
            maxLines={1}
            normalMaxWidthClass='min-w-0 max-w-full'
            text={requestNo}
            hoverAccent
          />
        </span>
        <span
          className={cn(
            'max-w-[150px] shrink-0 truncate rounded-full border px-2.5 py-0.5 text-[10px] font-semibold',
            rolePillClass[cardRole],
          )}
        >
          {pillLabel}
        </span>
      </div>

      {fieldLines.length > 0 && (
        <div className='mb-2 flex min-w-0 flex-col gap-0.5'>
          {fieldLines.map((line) => (
            <div
              className='flex min-w-0 items-start gap-1.5 rounded-md px-0.5 py-0.5 transition-colors duration-200 hover:bg-gray-2/80'
              key={line.text}
            >
              <Icon
                className='mt-1 size-3 shrink-0 text-gray-8'
                name='lucide:dot'
              />
              <HoverExpandableText
                expandStyle='stack'
                maxLines={1}
                normalMaxWidthClass='max-w-full'
                text={line.text}
                className={cn(
                  'min-w-0 flex-1 text-12 leading-snug text-gray-11',
                  line.primary && 'text-[13.5px] font-semibold text-gray-13',
                )}
              />
            </div>
          ))}
        </div>
      )}

      {previewFieldTexts.length > 0 && (
        <div className='mb-2 flex min-w-0 flex-col gap-0.5'>
          {previewFieldTexts.map((text, index) => (
            <div
              className='flex min-w-0 items-start gap-1.5 rounded-md px-0.5 py-0.5 transition-colors duration-200 hover:bg-gray-2/80'
              key={`${index}-${text}`}
            >
              <Icon
                className='mt-1 size-3 shrink-0 text-gray-8'
                name='lucide:dot'
              />
              <HoverExpandableText
                className='min-w-0 flex-1 text-11 font-medium text-gray-10'
                expandStyle='stack'
                maxLines={1}
                normalMaxWidthClass='max-w-full'
                text={text}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
