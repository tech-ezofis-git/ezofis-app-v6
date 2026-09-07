import { useLingui } from '@lingui/react/macro'
import { type Table as TanstackTable } from '@tanstack/react-table'
import dayjs from 'dayjs'
import {
  type MutableRefObject,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { WorkflowOption } from '@/pages/requests/types'
import workflowsApiV6 from '@/api/v6/workflows'
import Icon from '@/components/base/icon/Icon'
import showToast from '@/components/base/toast/showToast'
import ListEmptyState from '@/components/common/ListEmptyState'
import { normalizeFieldKey } from '@/pages/folders/utils/repositoryFieldUtils'
import {
  findInvoiceNumber,
  findSupplierName,
} from '@/pages/requests/utils/inboxItemDisplay'
import {
  extractPreviewValues,
  getGenericStageInfo,
  isAccountsPayableWorkflow,
} from '@/pages/requests/utils/workflow.utils'
import { kanbanColorDotClass } from '@/pages/workflows/utils/kanbanSettings'
import authUserStore from '@/stores/authUserStore'
import cn from '@/utils/cn'
import { parseUtcDate } from '@/utils/utcDate'
import {
  type KanbanColumnRole,
  buildKanbanColumns,
  findMoveRule,
  getKanbanMissingRequiredFields,
  isKanbanReturnAction,
  itemActivityId,
  itemInstanceId,
  itemStageLabel,
  matchKanbanColumnIndex,
  normalizeKanbanLabel,
  resolveKanbanActivityId,
} from '../helpers/kanbanBoard'
import { buildTableMeta, toDisplayString } from '../utils/dynamicTable.utils'
import {
  buildDynamicColumns,
  extractGenericRequestNumber,
  getFormPanels,
  resolveFormJson,
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
  stages?: { id: string; name: string; terminal: boolean }[]
  items: any[]
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

type KanbanViewProps = {
  items: any[]
  workflow: WorkflowOption | null
  isLoading?: boolean
  table?: TanstackTable<any>
  onNewRequest?: () => void
  onRefresh?: () => void
  onRowClick: (item: any, tab: string, missingFieldIds?: string[]) => void
}

export default function KanbanView({
  items,
  isLoading = false,
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
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(
    {},
  )
  const dragItemRef = useRef<any>(null)
  const didDragRef = useRef(false)

  const columns = useMemo(() => buildKanbanColumns(workflow), [workflow])
  const isAp = isAccountsPayableWorkflow(workflow)

  const previewValues = useMemo(
    () => extractPreviewValues(workflow),
    [workflow],
  )

  const dynamicFields = useMemo(() => {
    if (!previewValues.length) return []
    const form = resolveFormJson(workflow)
    if (!form) return []
    const allPanels = getFormPanels(form)
    if (!allPanels.length) return []
    const tableMetaByParentId = buildTableMeta(allPanels)
    const allFields = buildDynamicColumns(allPanels, null, tableMetaByParentId)
    const wantedLabels = new Set(
      previewValues.map((label) => normalizeFieldKey(label)),
    )
    return allFields.filter((col) =>
      wantedLabels.has(normalizeFieldKey(col.label)),
    )
  }, [previewValues, workflow])

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
        message: t`This request can only move to a connected stage.`,
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
      const names = missing.map((field) => field.label).join(', ')
      showToast({
        message: t`Please fill required field(s): ${names}`,
        variant: 'error',
      })
      onRowClick(item, 'Overview', [
        ...new Set(
          missing.flatMap((field) => [field.id, field.label].filter(Boolean)),
        ),
      ])
      return
    }

    const instanceId = itemInstanceId(item)
    if (!instanceId) {
      showToast({
        message: t`Unable to move this request.`,
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
        activityUserId: authUserStore.getState().session?.id || item.userId || null,
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
      const response = await workflowsApiV6.moveNext(String(instanceId), payload)
      if (response?.error) {
        showToast({
          message: t`Failed to proceed request: ${response.error}`,
          variant: 'error',
        })
        return
      }
      showToast({
        message: t`Request ${requestNo} moved successfully`,
        variant: 'success',
      })
      await Promise.resolve(onRefresh?.())
    } catch {
      showToast({
        message: t`Failed to move this request.`,
        variant: 'error',
      })
    } finally {
      setMovingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className='flex h-full min-h-0 gap-4 overflow-hidden px-2 pt-3 pb-4'>
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
            <div className='flex flex-col gap-3 p-3'>
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
    <div className='flex h-full min-h-0 w-full min-w-0 py-3'>
      <div className='min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-hidden [scrollbar-color:var(--gray-8)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-8 [&::-webkit-scrollbar-track]:bg-transparent'>
        <div className='flex h-full min-h-0 w-max gap-4'>
          {grouped.map((column) => {
            const stageBuckets = splitItemsByStage(column)
            const isGrouped = stageBuckets.length > 1
            const defaultDropId = stageBuckets[0]?.id || column.id
            const columnDropId = isGrouped ? column.id : defaultDropId
            const isColumnDropTarget = dropTargetId === columnDropId
            const bindDrop = (targetId: string) => ({
              onDragLeave: (event: { currentTarget: HTMLElement; relatedTarget: EventTarget | null }) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
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
                  <KanbanCard
                    columnId={column.id}
                    didDragRef={didDragRef}
                    dragItemRef={dragItemRef}
                    dynamicFields={dynamicFields}
                    isAp={isAp}
                    isDragging={
                      draggingId === String(item.id || item.processId || index)
                    }
                    isMoving={
                      movingId ===
                      String(
                        item.id || item.processId || itemInstanceId(item),
                      )
                    }
                    item={item}
                    key={item?.id || item?.processId || `${column.id}-${stageName}-${index}`}
                    locked={locked}
                    role={column.role}
                    setDraggingId={setDraggingId}
                    setDropTargetId={setDropTargetId}
                    stageName={stageName}
                    workflow={workflow}
                    onRowClick={onRowClick}
                  />
                ))
              ) : (
                <div className='rounded-[5px] border border-dashed border-gray-8 px-2.5 py-4 text-center text-[11.5px] text-gray-10'>
                  {t`No requests in this stage`}
                </div>
              )

            return (
              <section
                className={cn(
                  'flex h-full min-h-0 w-80 shrink-0 flex-col overflow-hidden rounded-xl border bg-surface transition-all',
                  isColumnDropTarget &&
                    dropAllowed &&
                    'border-primary-9 bg-primary-2 shadow-[0_0_0_3px_var(--primary-4)]',
                  isColumnDropTarget &&
                    !dropAllowed &&
                    'border-red-8 bg-red-1 shadow-[0_0_0_3px_var(--red-4)]',
                  !isColumnDropTarget && 'border-gray-3',
                )}
                key={column.id}
                {...bindDrop(columnDropId)}
              >
                <header className='flex shrink-0 items-center gap-2.5 border-b border-gray-3 px-3.5 py-3.5'>
                  <span
                    className={cn(
                      'size-2 shrink-0 rounded-full',
                      column.color
                        ? kanbanColorDotClass(column.color)
                        : roleDotClass[column.role],
                    )}
                  />
                  <h3 className='min-w-0 flex-1 truncate text-[13.5px] font-semibold tracking-tight text-gray-13'>
                    {column.name}
                  </h3>
                  <span className='shrink-0 rounded-full border border-gray-3 bg-gray-2 px-2 py-0.5 text-11 font-semibold text-gray-11'>
                    {column.items.length}
                  </span>
                </header>
                
                {isGrouped ? (
                  <div className='flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 py-2 [scrollbar-color:var(--gray-8)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-8 [&::-webkit-scrollbar-track]:bg-transparent'>
                    {stageBuckets.map((stage) => {
                      const groupKey = `${column.id}:${stage.id}`
                      const collapsed = Boolean(collapsedGroups[groupKey])
                      const isDropTarget = dropTargetId === stage.id
                      return (
                        <div
                          className={cn(
                            'rounded-lg transition-all',
                            isDropTarget &&
                              dropAllowed &&
                              'bg-primary-2 shadow-[0_0_0_2px_var(--primary-4)]',
                            isDropTarget &&
                              !dropAllowed &&
                              'bg-red-1 shadow-[0_0_0_2px_var(--red-4)]',
                          )}
                          key={stage.id}
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
                              className={cn(
                                'size-3.5 shrink-0 text-gray-10 transition-transform',
                                !collapsed && 'rotate-90',
                              )}
                              name='lucide:chevron-right'
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
                            <div className='flex flex-col gap-3 px-1 pb-3'>
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
                  <div className='flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3.5 [scrollbar-color:var(--gray-8)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-8 [&::-webkit-scrollbar-track]:bg-transparent'>
                    {renderCards(
                      column.items,
                      column.name,
                      column.terminal,
                    )}
                  </div>
                )}
              </section>
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
  setDraggingId,
  setDropTargetId,
  stageName,
  workflow,
  onRowClick,
}: {
  columnId: string
  didDragRef: MutableRefObject<boolean>
  dragItemRef: MutableRefObject<any>
  dynamicFields: ReturnType<typeof buildDynamicColumns>
  isAp: boolean
  isDragging: boolean
  isMoving: boolean
  item: any
  locked: boolean
  role: KanbanColumnRole
  setDraggingId: (id: string | null) => void
  setDropTargetId: (id: string | null) => void
  stageName: string
  workflow: WorkflowOption | null
  onRowClick: (item: any, tab: string, missingFieldIds?: string[]) => void
}) {
  const { t } = useLingui()
  const requestNo = extractGenericRequestNumber(item)
  const { currentLabel, isTerminal } = getGenericStageInfo(workflow, item)
  const pillLabel = currentLabel || stageName
  const cardRole: KanbanColumnRole = isTerminal || locked ? 'success' : role
  const itemKey = String(item.id || item.processId || columnId)
  const canDrag = !locked && !isMoving && item._canMove === true

  const raisedBy =
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
    return dynamicFields
      .map((col) => {
        const text = toDisplayString(
          item?.[col.id] ??
            item?.formData?.fields?.[col.id] ??
            item?.formData?.[col.id],
        )
        if (!text || text === '-') return ''
        return text
      })
      .filter(Boolean)
  })()

  return (
    <div
      className={cn(
        'w-full rounded-xl border border-gray-3 bg-surface p-3.5 text-left shadow-sm transition-all duration-200 hover:border-primary-6 hover:shadow-md',
        canDrag
          ? 'cursor-grab active:scale-[0.99] active:cursor-grabbing'
          : 'cursor-default',
        (isDragging || isMoving) && 'opacity-40',
      )}
      draggable={canDrag}
      role='button'
      tabIndex={0}
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
      }}
      onDragStart={(event) => {
        if (!canDrag) {
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
    >
      <div className='mb-2.5 flex items-center gap-2'>
       
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
        <span className='min-w-0 flex-1 truncate text-13 font-bold tracking-tight text-gray-13'>
          {requestNo}
        </span>
        <span
          className={cn(
            'max-w-[150px] truncate rounded-full border px-2.5 py-0.5 text-[10px] font-semibold',
            rolePillClass[cardRole],
          )}
        >
          {pillLabel}
        </span>
      </div>

      {fieldLines.length > 0 && (
        <div className='mb-2.5 flex min-w-0 flex-col gap-0.5'>
          {fieldLines.map((line) => (
            <div className='flex min-w-0 items-center gap-1.5' key={line.text}>
              <Icon
                className='size-3 shrink-0 text-gray-8'
                name='lucide:dot'
              />
              <HoverExpandableText
                className={cn(
                  'min-w-0 flex-1 text-12 leading-snug text-gray-11',
                  line.primary && 'text-[13.5px] font-semibold text-gray-13',
                )}
                expandStyle='inline'
                maxLines={1}
                normalMaxWidthClass='max-w-full'
                text={line.text}
              />
            </div>
          ))}
        </div>
      )}

      {previewFieldTexts.length > 0 && (
        <div className='mb-2.5 flex min-w-0 flex-col gap-0.5'>
          {previewFieldTexts.map((text, index) => (
            <div
              className='flex min-w-0 items-center gap-1.5'
              key={`${index}-${text}`}
            >
              <Icon
                className='size-3 shrink-0 text-gray-8'
                name='lucide:dot'
              />
              <HoverExpandableText
                className='min-w-0 flex-1 text-11 font-medium text-gray-10'
                expandStyle='inline'
                maxLines={1}
                normalMaxWidthClass='max-w-full'
                text={text}
              />
            </div>
          ))}
        </div>
      )}

      {raisedBy ? (
        <div className='mb-2.5 flex items-center gap-1.5 text-gray-8'>
          <Icon className='size-3.5 shrink-0' name='tabler:user' />
          <span className='truncate text-[11.5px] text-gray-11'>{raisedBy}</span>
        </div>
      ) : null}

      <div className='flex items-center justify-between gap-2 border-t border-gray-3 pt-2.5'>
        {startedAt ? (
          <div className='flex min-w-0 items-center gap-1 text-[10.5px] text-gray-10'>
            <Icon className='size-3 shrink-0' name='tabler:calendar' />
            <span className='truncate'>
              {dayjs(parseUtcDate(startedAt)).format('DD-MMM-YYYY hh:mm A')}
            </span>
          </div>
        ) : (
          <span />
        )}
        {lastActionAt ? (
          <span className='inline-flex shrink-0 items-center gap-1 rounded-full bg-orange-2 px-2 py-0.5 text-[10.5px] font-semibold text-orange-11'>
            <Icon className='size-3' name='tabler:clock' />
            {formatRunningTime(lastActionAt)}
          </span>
        ) : null}
      </div>
    </div>
  )
}
