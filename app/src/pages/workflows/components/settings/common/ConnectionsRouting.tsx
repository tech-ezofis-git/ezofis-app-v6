import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from '@dnd-kit/modifiers'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { type Node, useEdges, useNodes, useReactFlow } from '@xyflow/react'
import { type ReactNode, useEffect, useState } from 'react'
import type { ButtonColor } from '@/components/base/button/types'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import Tooltip from '@/components/base/Tooltip'
import {
  getNodeToolType,
  NODE_TOOL_TYPE,
} from '@/pages/workflows/utils/nodeToolTypes'
import cn from '@/utils/cn'
import useWorkflowStore from '../../../stores/useWorkflowStore'
import RequestPageVisibilitySetting from './RequestPageVisibilitySetting'
import SettingsSection from './SettingsSection'

/** Colors an action button can use on the request page (edge.data.buttonColor). */
export type ConnectionButtonColor = Extract<
  ButtonColor,
  'green' | 'orange' | 'primary' | 'red' | 'secondary'
>

interface ConnectionsRoutingProps {
  defaultOpen?: boolean
  node: Node
}

const BUTTON_COLOR_OPTIONS: Array<{
  id: ConnectionButtonColor
  label: string
  swatchClass: string
}> = [
  { id: 'primary', label: 'Primary', swatchClass: 'bg-primary-9' },
  { id: 'green', label: 'Green', swatchClass: 'bg-green-9' },
  { id: 'orange', label: 'Orange', swatchClass: 'bg-orange-9' },
  { id: 'red', label: 'Red', swatchClass: 'bg-red-9' },
  { id: 'secondary', label: 'Secondary', swatchClass: 'bg-secondary-9' },
]

const isConnectionButtonColor = (
  value: unknown,
): value is ConnectionButtonColor =>
  BUTTON_COLOR_OPTIONS.some((option) => option.id === value)

interface ConnectionWithData {
  action: string
  confirm: boolean
  edgeId: string
  passwordAccess: boolean
  remarks: boolean
  signature: boolean
  targetId: string
  targetLabel: string
  targetToolType: string
  /** Request-page button color; unset means Primary. */
  buttonColor?: ConnectionButtonColor
}

const routingActionOptions = [
  { id: 1, name: 'Submit' },
  { id: 2, name: 'Approve' },
  { id: 3, name: 'Reject' },
  { id: 4, name: 'Verify' },
]

const getRoutingAction = (data: Record<string, unknown> | undefined) =>
  String(data?.action || data?.proceedAction || '')

export default function ConnectionsRouting({
  defaultOpen = false,
  node,
}: ConnectionsRoutingProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [isAddingRoute, setIsAddingRoute] = useState(false)
  const [newAction, setNewAction] = useState('Submit')
  const [newTargetId, setNewTargetId] = useState('')

  const edges = useEdges()
  const nodes = useNodes()
  const { setEdges } = useReactFlow()

  useEffect(() => {
    if (defaultOpen) {
      setIsOpen(true)
    }
  }, [node.id, defaultOpen])

const computeHandlesForNodes = (sourceNode?: Node, targetNode?: Node) => {
  if (!sourceNode || !targetNode)
    return { sourceHandle: 's-bottom', targetHandle: 't-top' }
  const dx = targetNode.position.x - sourceNode.position.x
  const dy = targetNode.position.y - sourceNode.position.y
  const isHorizontal = Math.abs(dx) > Math.abs(dy) + 100
  if (isHorizontal) {
    return {
      sourceHandle: dx > 0 ? 's-right' : 's-left',
      targetHandle: dx > 0 ? 't-left' : 't-right',
    }
  }
  return {
    sourceHandle: dy > 0 ? 's-bottom' : 's-top',
    targetHandle: dy > 0 ? 't-top' : 't-bottom',
  }
}

  const updateEdgesAndStore = (updater: (eds: any[]) => any[]) => {
    setEdges((eds) => {
      const next = updater(eds)
      useWorkflowStore.setState({ loadedEdges: next })
      return next
    })
  }

  const onUpdateAction = (edgeId: string, action: string) => {
    updateEdgesAndStore((eds) =>
      eds.map((e) =>
        e.id === edgeId
          ? { ...e, data: { ...e.data, action, proceedAction: action } }
          : e,
      ),
    )
  }

  const onUpdateTarget = (edgeId: string, targetId: string) => {
    const targetNode = nodes.find((n) => n.id === targetId)
    const handles = computeHandlesForNodes(node, targetNode)
    updateEdgesAndStore((eds) =>
      eds.map((e) =>
        e.id === edgeId
          ? {
              ...e,
              sourceHandle: handles.sourceHandle,
              target: targetId,
              targetHandle: handles.targetHandle,
            }
          : e,
      ),
    )
  }

  const onDeleteEdge = (edgeId: string) => {
    updateEdgesAndStore((eds) => eds.filter((e) => e.id !== edgeId))
  }

  const onUpdateFlag = (
    edgeId: string,
    key: 'remarks' | 'confirm' | 'passwordAccess' | 'signature',
    value: boolean,
  ) => {
    updateEdgesAndStore((eds) =>
      eds.map((e) =>
        e.id === edgeId ? { ...e, data: { ...e.data, [key]: value } } : e,
      ),
    )
  }

  const onUpdateColor = (edgeId: string, buttonColor: ConnectionButtonColor) => {
    updateEdgesAndStore((eds) =>
      eds.map((e) =>
        e.id === edgeId ? { ...e, data: { ...e.data, buttonColor } } : e,
      ),
    )
  }

  // Reorder this node's outgoing edges in place. Edge order is saved as rule
  // order, which is the order of the action buttons on the request page.
  const onReorder = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    updateEdgesAndStore((eds) => {
      const ownIds = eds.filter((e) => e.source === node.id).map((e) => e.id)
      const from = ownIds.indexOf(String(active.id))
      const to = ownIds.indexOf(String(over.id))
      if (from === -1 || to === -1) return eds
      const reordered = arrayMove(ownIds, from, to)
      const byId = new Map(eds.map((e) => [e.id, e]))
      let next = 0
      return eds.map((e) =>
        e.source === node.id ? byId.get(reordered[next++]) || e : e,
      )
    })
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // Find all edges coming out of this node
  const outgoingEdges = edges.filter((e) => e.source === node.id)

  const nodeToolType = getNodeToolType(node.data)
  const isQualifyAgent = nodeToolType === NODE_TOOL_TYPE.QUALIFY_AGENT
  const isClassificationAgent =
    nodeToolType === NODE_TOOL_TYPE.CLASSIFICATION_AGENT
  const isConditionNode =
    nodeToolType === NODE_TOOL_TYPE.CONDITION ||
    nodeToolType === 'condition' ||
    String((node.data as any)?.type || '').toUpperCase() === 'CONDITION'
  const isApAgent = nodeToolType === NODE_TOOL_TYPE.AP_AGENT
  const isFtpAgent = nodeToolType === NODE_TOOL_TYPE.FTP_AGENT

  const isManualUser =
    nodeToolType === NODE_TOOL_TYPE.MANUAL_USER ||
    nodeToolType === NODE_TOOL_TYPE.FORM_SUBMISSION ||
    nodeToolType === 'manual_user' ||
    nodeToolType === 'user_task' ||
    nodeToolType === 'manual' ||
    String((node.data as any)?.type || '').toUpperCase() === 'MANUAL_USER' ||
    String((node.data as any)?.type || '').toUpperCase() === 'USER_TASK'

  const qualifyActionOptions = [
    { id: 1, name: 'QUALIFY' },
    { id: 2, name: 'DISQUALIFY' },
  ]

  const conditionActionOptions = [
    { id: 1, name: 'SATISFIED' },
    { id: 2, name: 'NOT SATISFIED' },
  ]

  const apActionOptions = [
    { id: 1, name: 'MATCHED' },
    { id: 2, name: 'NOT MATCHED' },
    { id: 3, name: 'PARTIALLY MATCHED' },
    { id: 4, name: 'NON-INVOICE' },
  ]

  const ftpActionOptions = [
    { id: 1, name: 'SUCCESS' },
    { id: 2, name: 'FAILED' },
  ]

  const classificationActionOptions = [
    { id: 1, name: 'Classified' },
    { id: 2, name: 'Unclassified' },
  ]

  // Dynamic options: Base defaults + any unique actions found across all workflow edges
  const dynamicActions = isQualifyAgent
    ? qualifyActionOptions
    : isConditionNode
      ? conditionActionOptions
      : isApAgent
        ? apActionOptions
        : isFtpAgent
          ? ftpActionOptions
          : isClassificationAgent
            ? Array.from(
                new Set([
                  ...classificationActionOptions.map((o) => o.name),
                  ...routingActionOptions.map((o) => o.name),
                  ...edges
                    .map((e) =>
                      getRoutingAction(e.data as Record<string, unknown>),
                    )
                    .filter(Boolean),
                ]),
              ).map((name, index) => ({ id: index + 1, name }))
            : Array.from(
                new Set([
                  ...routingActionOptions.map((o) => o.name),
                  ...edges
                    .map((e) =>
                      getRoutingAction(e.data as Record<string, unknown>),
                    )
                    .filter(Boolean),
                ]),
              ).map((name, index) => ({ id: index + 1, name }))

  const connections: ConnectionWithData[] = outgoingEdges
    .filter((edge) => nodes.some((n) => n.id === edge.target))
    .map((edge) => {
      const targetNode = nodes.find((n) => n.id === edge.target)
      const edgeData = (edge.data || {}) as Record<string, unknown>
      const rawAction = getRoutingAction(edgeData)
      let action = rawAction

      if (isQualifyAgent) {
        action = rawAction === 'DISQUALIFY' ? 'DISQUALIFY' : 'QUALIFY'
      } else if (isConditionNode) {
        const norm = String(rawAction).toUpperCase().replace(/_/g, ' ')
        action = norm.includes('NOT') ? 'NOT SATISFIED' : 'SATISFIED'
      } else if (isApAgent) {
        const norm = String(rawAction)
          .toUpperCase()
          .replace(/[\s_-]+/g, ' ')
        if (norm.includes('PARTIAL')) {
          action = 'PARTIALLY MATCHED'
        } else if (norm.includes('NOT') || norm.includes('UNMATCH')) {
          action = 'NOT MATCHED'
        } else if (norm.includes('NON')) {
          action = 'NON-INVOICE'
        } else {
          action = 'MATCHED'
        }
      } else if (isFtpAgent) {
        const norm = String(rawAction).toUpperCase()
        action =
          norm.includes('FAIL') || norm.includes('ERROR') ? 'FAILED' : 'SUCCESS'
      }

      return {
        action,
        buttonColor: isConnectionButtonColor(edgeData.buttonColor)
          ? edgeData.buttonColor
          : undefined,
        confirm: !!edgeData.confirm,
        edgeId: edge.id,
        passwordAccess: !!edgeData.passwordAccess,
        remarks: !!edgeData.remarks,
        signature: !!edgeData.signature,
        targetId: edge.target,
        targetLabel: (targetNode?.data?.label as string) || 'Next Step',
        targetToolType: getNodeToolType(targetNode?.data),
      }
    })

  const getTargetDescription = (conn: ConnectionWithData) => {
    if (conn.targetToolType === NODE_TOOL_TYPE.END)
      return 'Complete the workflow on this pathway'
    if (conn.targetToolType === NODE_TOOL_TYPE.AP_AGENT)
      return 'Route to AP Agent for processing'
    if (conn.targetToolType === NODE_TOOL_TYPE.OCR_AGENT)
      return 'Route to OCR Agent for extraction'
    if (conn.targetToolType === NODE_TOOL_TYPE.FTP_AGENT)
      return 'Route to FTP Agent for file transfer'
    if (conn.targetToolType === NODE_TOOL_TYPE.KYC_AGENT)
      return 'Route to KYC Agent for identity verification'
    if (conn.targetToolType === NODE_TOOL_TYPE.PROCUREMENT_AGENT)
      return 'Route to Procurement Agent for requisition processing'
    if (conn.targetToolType === NODE_TOOL_TYPE.DOCUMENT_GENERATE_AGENT)
      return 'Route to Document Generator for doc creation'
    if (conn.targetToolType === NODE_TOOL_TYPE.QUALIFY_AGENT)
      return 'Route to Qualifier for lead evaluation'
    if (conn.targetToolType === NODE_TOOL_TYPE.QUOTE_AGENT)
      return 'Route to Quote Estimator for pricing & quote generation'
    if (conn.targetToolType === NODE_TOOL_TYPE.CLASSIFICATION_AGENT)
      return 'Route to Classification Agent for category classification'
    if (conn.targetToolType === NODE_TOOL_TYPE.MANUAL_USER)
      return 'Route for manual user intervention'
    return `Define behavior when routing to ${conn.targetLabel}`
  }

  const targetNodeOptions = nodes
    .filter((n) => n.id !== node.id)
    .map((n) => ({
      id: String(n.id),
      name: String(
        (n.data as any)?.label || (n.data as any)?.name || `Step (${n.id})`,
      ),
    }))

  const isAgentNode = /agent/i.test(String(nodeToolType || ''))

  return (
    <>
    {isAgentNode ? <RequestPageVisibilitySetting node={node} /> : null}
    <SettingsSection
      icon='lucide:git-branch'
      isOpen={isOpen}
      title='Connections & Routing'
      variant='premium'
      onToggle={() => setIsOpen(!isOpen)}
    >
      <div className='flex flex-col gap-2.5 py-1'>
        {connections.length > 0 ? (
          <DndContext
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            sensors={sensors}
            onDragEnd={onReorder}
          >
          <SortableContext
            items={connections.map((conn) => conn.edgeId)}
            strategy={verticalListSortingStrategy}
          >
          <div className='flex flex-col gap-2.5'>
          {connections.map((conn) => (
            <SortableConnectionCard
              disabled={connections.length < 2}
              id={conn.edgeId}
              key={conn.edgeId}
            >
              {(dragHandle) => (
              <>
              <div className='flex items-start justify-between gap-2.5'>
                <div className='flex items-start gap-2.5'>
                  {dragHandle}
                  <Icon
                    className='mt-0.5 h-4 w-4 stroke-[2] text-purple-10'
                    name='lucide:link-2'
                  />
                  <div className='flex flex-col space-y-0.5'>
                    <span className='text-13 font-medium leading-none text-gray-12'>
                      {conn.action
                        ? `${conn.action} \u2192 ${conn.targetLabel}`
                        : conn.targetLabel}
                    </span>
                    <span className='text-11 leading-tight text-gray-9'>
                      {getTargetDescription(conn)}
                    </span>
                  </div>
                </div>
                <IconButton
                  ariaLabel='Delete connection route'
                  color='gray'
                  icon='lucide:trash-2'
                  size='xs'
                  tooltip='Remove this action route'
                  type='button'
                  variant='ghost'
                  onClick={() => onDeleteEdge(conn.edgeId)}
                />
              </div>

              <div className='animate-in fade-in slide-in-from-top-1 grid grid-cols-2 gap-3 pt-1 duration-300'>
                <div className='space-y-1.5'>
                  <div className='text-12 font-medium text-gray-12'>
                    Action Button Label
                  </div>
                  <InputSelect
                    className='bg-surface'
                    creatable={
                      !isQualifyAgent &&
                      !isConditionNode &&
                      !isApAgent &&
                      !isFtpAgent
                    }
                    options={dynamicActions}
                    placeholder='Select or type action...'
                    rightSectionIcon='lucide:chevrons-up-down'
                    searchable
                    value={
                      dynamicActions.find((o) => o.name === conn.action) ||
                      (conn.action ? { id: -1, name: conn.action } : null)
                    }
                    onChange={(val) => {
                      if (val) {
                        onUpdateAction(conn.edgeId, val.name)
                      }
                    }}
                  />
                </div>

                <div className='space-y-1.5'>
                  <div className='text-12 font-medium text-gray-12'>
                    Target Destination Step
                  </div>
                  <InputSelect
                    className='bg-surface'
                    options={targetNodeOptions}
                    placeholder='Select target step...'
                    rightSectionIcon='lucide:chevrons-up-down'
                    searchable
                    value={
                      targetNodeOptions.find(
                        (o) => String(o.id) === String(conn.targetId),
                      ) || null
                    }
                    onChange={(val) => {
                      if (val) {
                        onUpdateTarget(conn.edgeId, String(val.id))
                      }
                    }}
                  />
                </div>
              </div>

              <ButtonColorPicker
                action={conn.action}
                value={conn.buttonColor || 'primary'}
                onChange={(color) => onUpdateColor(conn.edgeId, color)}
              />

              {isManualUser && (
                <div className='grid grid-cols-2 gap-x-3 gap-y-2 pt-1 border-t border-gray-3'>
                  <div className='flex items-center justify-between'>
                    <span className='text-12 text-gray-11'>
                      Remarks required
                    </span>
                    <InputSwitch
                      checked={conn.remarks}
                      onChange={(checked) =>
                        onUpdateFlag(conn.edgeId, 'remarks', checked)
                      }
                    />
                  </div>
                  <div className='flex items-center justify-between'>
                    <span className='text-12 text-gray-11'>
                      Confirmation dialog
                    </span>
                    <InputSwitch
                      checked={conn.confirm}
                      onChange={(checked) =>
                        onUpdateFlag(conn.edgeId, 'confirm', checked)
                      }
                    />
                  </div>
                  <div className='flex items-center justify-between'>
                    <span className='text-12 text-gray-11'>
                      Password verification
                    </span>
                    <InputSwitch
                      checked={conn.passwordAccess}
                      onChange={(checked) =>
                        onUpdateFlag(conn.edgeId, 'passwordAccess', checked)
                      }
                    />
                  </div>
                  <div className='flex items-center justify-between'>
                    <span className='text-12 text-gray-11'>
                      Signature required
                    </span>
                    <InputSwitch
                      checked={conn.signature}
                      onChange={(checked) =>
                        onUpdateFlag(conn.edgeId, 'signature', checked)
                      }
                    />
                  </div>
                </div>
              )}
              </>
              )}
            </SortableConnectionCard>
          ))}
          </div>
          </SortableContext>
          </DndContext>
        ) : (
          <div className='py-4 text-center'>
            <p className='text-12 italic text-gray-8'>
              No outgoing connections from this node.
            </p>
          </div>
        )}

        <div className='mt-2 border-t border-gray-4 pt-3'>
          {!isAddingRoute ? (
            <Button
              className='w-full'
              color='primary'
              icon='lucide:plus'
              size='sm'
              variant='outline'
              onClick={() => setIsAddingRoute(true)}
            >
              Add Action Route
            </Button>
          ) : (
            <div className='animate-in fade-in space-y-3 rounded-xl border border-gray-4 bg-surface p-4 shadow-sm duration-200'>
              <div className='flex items-center justify-between text-13 font-medium text-gray-12'>
                <span>New Action Route</span>
                <IconButton
                  ariaLabel='Cancel'
                  color='gray'
                  icon='lucide:x'
                  size='xs'
                  type='button'
                  variant='ghost'
                  onClick={() => setIsAddingRoute(false)}
                />
              </div>

              <div className='space-y-1.5'>
                <div className='text-12 font-medium text-gray-12'>
                  Action Button Label
                </div>
                <InputSelect
                  className='bg-surface'
                  creatable
                  options={dynamicActions}
                  placeholder='Select or type action (e.g. Approve, Reject)...'
                  rightSectionIcon='lucide:chevrons-up-down'
                  searchable
                  value={
                    dynamicActions.find((o) => o.name === newAction) ||
                    (newAction ? { id: -1, name: newAction } : null)
                  }
                  onChange={(val) => {
                    if (val) setNewAction(val.name)
                  }}
                />
              </div>

              <div className='space-y-1.5'>
                <div className='text-12 font-medium text-gray-12'>
                  Target Step
                </div>
                <InputSelect
                  className='bg-surface'
                  options={targetNodeOptions}
                  placeholder='Select target step...'
                  rightSectionIcon='lucide:chevrons-up-down'
                  searchable
                  value={
                    targetNodeOptions.find(
                      (o) => String(o.id) === String(newTargetId),
                    ) || null
                  }
                  onChange={(val) => {
                    if (val) setNewTargetId(String(val.id))
                  }}
                />
              </div>

              <div className='flex items-center justify-end gap-2 pt-1'>
                <Button
                  color='gray'
                  size='sm'
                  variant='ghost'
                  onClick={() => setIsAddingRoute(false)}
                >
                  Cancel
                </Button>
                <Button
                  color='primary'
                  disabled={!newTargetId || !newAction}
                  size='sm'
                  variant='solid'
                  onClick={() => {
                    if (!newTargetId || !newAction) return
                    const targetNode = nodes.find((n) => n.id === newTargetId)
                    const handles = computeHandlesForNodes(node, targetNode)
                    const edgeId = `e-${node.id}-${newTargetId}-${Date.now()}`
                    updateEdgesAndStore((eds) => [
                      ...eds,
                      {
                        data: { action: newAction, proceedAction: newAction },
                        id: edgeId,
                        source: node.id,
                        sourceHandle: handles.sourceHandle,
                        target: newTargetId,
                        targetHandle: handles.targetHandle,
                        type: 'custom',
                      },
                    ])
                    setIsAddingRoute(false)
                    setNewAction('Submit')
                    setNewTargetId('')
                  }}
                >
                  Create Action Route
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </SettingsSection>
    </>
  )
}

/** Swatch picker for the request-page action button color, with a preview. */
function ButtonColorPicker({
  action,
  value,
  onChange,
}: {
  action: string
  value: ConnectionButtonColor
  onChange: (color: ConnectionButtonColor) => void
}) {
  return (
    <div className='flex items-center justify-between gap-3 border-t border-gray-3 pt-3'>
      <div className='flex flex-col gap-1.5'>
        <div aria-label='Button color' className='flex items-center gap-2' role='radiogroup'>
          {BUTTON_COLOR_OPTIONS.map((option) => {
            const selected = option.id === value
            return (
              <Tooltip content={option.label} key={option.id} position='top'>
                <button
                  aria-checked={selected}
                  aria-label={option.label}
                  role='radio'
                  type='button'
                  className={cn(
                    'inline-flex size-6 cursor-pointer items-center justify-center rounded-full text-white transition-all hover:scale-110 active:scale-95',
                    option.swatchClass,
                    selected
                      ? 'ring-2 ring-gray-12 ring-offset-2 ring-offset-surface'
                      : 'opacity-80 hover:opacity-100',
                  )}
                  onClick={() => onChange(option.id)}
                >
                  {selected ? (
                    <Icon className='size-3.5 stroke-[3]' name='lucide:check' />
                  ) : null}
                </button>
              </Tooltip>
            )
          })}
        </div>
      </div>
      {/* Live preview of the button as it appears on the request page. */}
      <Button
        className='pointer-events-none h-8 max-w-[45%] rounded-lg px-3.5 text-[13px] font-semibold'
        color={value}
        icon='lucide:arrow-right'
        iconClass='size-4 shrink-0'
        label={action || 'Action'}
        labelClass='truncate'
        size='md'
        tabIndex={-1}
        variant='subtle'
      />
    </div>
  )
}

/** A connection card that can be dragged by its grip to reorder routes. */
function SortableConnectionCard({
  children,
  disabled,
  id,
}: {
  disabled?: boolean
  id: string
  children: (dragHandle: ReactNode) => ReactNode
}) {
  const {
    attributes,
    isDragging,
    listeners,
    transform,
    transition,
    setActivatorNodeRef,
    setNodeRef,
  } = useSortable({ disabled, id })

  const dragHandle = disabled ? null : (
    <Tooltip content='Drag to reorder' position='left'>
      <button
        aria-label='Drag to reorder connection'
        ref={setActivatorNodeRef}
        type='button'
        className={cn(
          '-ml-1 inline-flex size-5 shrink-0 cursor-grab touch-none items-center justify-center rounded text-gray-8 transition-colors hover:bg-gray-3 hover:text-gray-11 active:cursor-grabbing',
          isDragging && 'bg-gray-3 text-gray-12',
        )}
        {...attributes}
        {...listeners}
      >
        <Icon className='size-4' name='lucide:grip-vertical' />
      </button>
    </Tooltip>
  )

  return (
    <div
      ref={setNodeRef}
      // dnd-kit drives the drag position through a transform.
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'space-y-4 rounded-xl border border-gray-4 bg-surface p-4 shadow-sm transition-shadow',
        isDragging && 'relative z-10 shadow-lg ring-2 ring-primary-6',
      )}
    >
      {children(dragHandle)}
    </div>
  )
}
