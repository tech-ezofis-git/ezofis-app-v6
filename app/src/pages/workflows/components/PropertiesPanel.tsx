import type { Edge, Node } from '@xyflow/react'
import { useEdges, useNodes, useReactFlow } from '@xyflow/react'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'

// Lazy load APAgentNodeSettings at module scope (must be before PropertiesPanel)
const APAgentNodeSettings = lazy<React.ComponentType<{ node: Node }>>(
  () => import('./settings/APAgentNodeSettings'),
)
const FTPAgentNodeSettings = lazy<React.ComponentType<{ node: Node }>>(
  () => import('./settings/FTPAgentNodeSettings'),
)
const KYCAgentNodeSettings = lazy<React.ComponentType<{ node: Node }>>(
  () => import('./settings/KYCAgentNodeSettings'),
)
const ProcurementAgentNodeSettings = lazy<
  React.ComponentType<{ node: Node }>
>(() => import('./settings/ProcurementAgentNodeSettings'))
const DocumentGenerateAgentNodeSettings = lazy<
  React.ComponentType<{ node: Node }>
>(() => import('./settings/DocumentGenerateAgentNodeSettings'))
const OCRAgentNodeSettings = lazy<React.ComponentType<{ node: Node }>>(
  () => import('./settings/OCRAgentNodeSettings'),
)
const ManualUserNodeSettings = lazy<React.ComponentType<{ node: Node }>>(
  () => import('./settings/ManualUserNodeSettings'),
)
const EmailNodeSettings = lazy<React.ComponentType<{ node: Node }>>(
  () => import('./settings/EmailNodeSettings'),
)
const GoogleDriveNodeSettings = lazy<React.ComponentType<{ node: Node }>>(
  () => import('./settings/GoogleDriveNodeSettings'),
)
const OneDriveNodeSettings = lazy<React.ComponentType<{ node: Node }>>(
  () => import('./settings/OneDriveNodeSettings'),
)
const ConditionNodeSettings = lazy<React.ComponentType<{ node: Node }>>(
  () => import('./settings/ConditionSettingsPanel'),
)
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import { parseOAuthConnectionSuccess } from '@/pages/workflows/utils/oauthAuthorize'
import cn from '@/utils/cn'
import useWorkflowStore from '../stores/useWorkflowStore'
import { getNodeToolType, NODE_TOOL_TYPE } from '../utils/nodeToolTypes'
import ConnectionsRouting from './settings/common/ConnectionsRouting'

interface PropertiesPanelProps {
  node: Node | null
  edge?: Edge | null
  onClose: () => void
}

function PropertiesPanel({
  edge,
  node: selectedNode,
  onClose,
}: PropertiesPanelProps) {
  const { setEdges, setNodes } = useReactFlow()
  const selectNode = useWorkflowStore((state) => state.selectNode)
  const nodes = useNodes()
  const edges = useEdges()
  // Use the live node from React Flow state to ensure updates (like label changes) are reflected immediately
  const node = selectedNode
    ? nodes.find((n) => n.id === selectedNode.id) || selectedNode
    : null

  const sortedNodes = [...nodes].sort((a, b) => {
    if (Math.abs(a.position.y - b.position.y) < 10)
      return a.position.x - b.position.x
    return a.position.y - b.position.y
  })
  const currentIndex = node
    ? sortedNodes.findIndex((n) => n.id === node.id)
    : -1
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < sortedNodes.length - 1

  const handlePrev = () => {
    if (hasPrev) selectNode(sortedNodes[currentIndex - 1])
  }

  const handleNext = () => {
    if (hasNext) selectNode(sortedNodes[currentIndex + 1])
  }

  const [isEditingLabel, setIsEditingLabel] = useState(false)
  const [editedLabel, setEditedLabel] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (node) {
      setEditedLabel((node.data.label as string) || '')
    }
  }, [node?.id, node?.data?.label])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data.type === 'CONNECTION_SUCCESS') {
        const { connector, connectorId, email, label } =
          parseOAuthConnectionSuccess(event.data)
        if (!node) return

        setNodes((nodes) =>
          nodes.map((n) =>
            n.id === node.id
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    account: email || connector,
                    connection: connectorId || n.data.connection,
                    connectionLabel:
                      label || connector || n.data.connectionLabel,
                    connectorId: connectorId || n.data.connectorId,
                    externalAccountEmail: email,
                  },
                }
              : n,
          ),
        )
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [node, setNodes])

  useEffect(() => {
    if (isEditingLabel && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditingLabel])

  const handleLabelSave = () => {
    if (node && editedLabel.trim() !== '') {
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === node.id
            ? { ...n, data: { ...n.data, label: editedLabel } }
            : n,
        ),
      )
    }
    setIsEditingLabel(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLabelSave()
    }
  }

  if (!node && !edge) return null

  // --- EDGE VIEW ---
  if (edge) {
    const handleDeleteEdge = () => {
      setEdges((eds) => eds.filter((e) => e.id !== edge.id))
      onClose()
    }

    return (
      <div className='animate-slide-in-right flex h-full w-[400px] flex-col border-l border-gray-3 bg-white shadow-xl transition-all'>
        {/* Header */}
        <div className='flex items-center justify-between border-b border-gray-2 px-4 py-3'>
          <div className='flex items-center gap-2'>
            <div className='flex h-8 w-8 items-center justify-center rounded-lg border border-gray-2 bg-gray-1'>
              <Icon className='h-5 w-5 text-gray-11' name='lucide:workflow' />
            </div>
            <h2 className='text-15/5 font-semibold text-gray-13'>Connection</h2>
          </div>
          <button
            className='rounded-[4px] p-1 text-gray-8 transition-colors hover:bg-gray-2'
            onClick={onClose}
          >
            <Icon className='h-5 w-5' name='lucide:x' />
          </button>
        </div>

        {/* Content */}
        <div className='flex-1 space-y-5 overflow-y-auto p-4'>
          <div className='rounded-lg border border-gray-2 bg-gray-1 p-4'>
            <div className='mb-2 text-sm text-gray-11'>Connection ID</div>
            <div className='font-mono text-xs break-all text-gray-13'>
              {edge.id}
            </div>
            <div className='mt-4 flex items-center justify-center gap-2'>
              <div className='text-xs font-medium text-gray-10'>
                Source: {edge.source}
              </div>
              <Icon className='h-3 w-3 text-gray-8' name='lucide:arrow-right' />
              <div className='text-xs font-medium text-gray-10'>
                Target: {edge.target}
              </div>
            </div>
          </div>

          <Button
            className='w-full justify-start'
            color='red'
            icon='lucide:trash-2'
            label='Delete Connection'
            variant='outline'
            onClick={handleDeleteEdge}
          />
        </div>
      </div>
    )
  }

  // --- NODE VIEW ---
  if (!node) return null // Should be unreachable given first check, but safe

  // Common header for all nodes
  const NodeHeader = (
    <div className='flex items-center justify-between gap-2 border-b border-gray-2 px-4 py-3'>
      <div className='flex min-w-0 flex-1 items-center gap-2'>
        {/* Node Icon in Header - Adjusted for Logos */}
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            (node.data.icon as string)?.startsWith('logos:')
              ? 'bg-transparent'
              : 'border border-gray-2 bg-gray-1',
          )}
        >
          <Icon
            name={(node.data.icon as string) || 'lucide:settings-2'}
            className={
              (node.data.icon as string)?.startsWith('logos:')
                ? 'h-5 w-5'
                : 'h-4 w-4'
            }
            style={{
              color: (node.data.icon as string)?.startsWith('logos:')
                ? undefined
                : (node.data.iconColor as string) || 'var(--color-primary-9)',
            }}
          />
        </div>
        {isEditingLabel ? (
          <div className='flex flex-1 items-center gap-1'>
            <input
              className='min-w-0 flex-1 rounded border border-primary-5 bg-white px-1 text-15/5 font-semibold text-gray-13 focus:ring-1 focus:ring-primary-5 focus:outline-none'
              ref={inputRef}
              type='text'
              value={editedLabel}
              autoFocus
              onBlur={handleLabelSave}
              onChange={(e) => setEditedLabel(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              className='flex h-6 w-6 shrink-0 items-center justify-center rounded text-green-9 transition-colors hover:bg-green-1'
              title='Save'
              onClick={handleLabelSave}
              onMouseDown={(e) => e.preventDefault()}
            >
              <Icon className='h-4 w-4' name='lucide:check' />
            </button>
          </div>
        ) : (
          <>
            <h2
              className='cursor-pointer truncate text-15/5 font-semibold text-gray-13 hover:text-gray-11'
              title={node.data.label as string}
              onClick={() => setIsEditingLabel(true)}
            >
              {node.data.label as string}
            </h2>
            <Icon
              className='ml-1 h-4 w-4 shrink-0 cursor-pointer text-gray-8 hover:text-gray-11'
              name='lucide:pencil'
              onClick={() => setIsEditingLabel(true)}
            />
          </>
        )}
      </div>
      <div className='flex shrink-0 items-center gap-0.5'>
        {!isEditingLabel && (
          <>
            <div className='flex items-center gap-0.5'>
              <button
                disabled={!hasPrev}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                  hasPrev
                    ? 'text-gray-8 hover:bg-gray-2 hover:text-gray-11'
                    : 'cursor-not-allowed text-gray-4',
                )}
                onClick={handlePrev}
              >
                <Icon className='h-4 w-4' name='lucide:chevron-left' />
              </button>
              <button
                disabled={!hasNext}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                  hasNext
                    ? 'text-gray-8 hover:bg-gray-2 hover:text-gray-11'
                    : 'cursor-not-allowed text-gray-4',
                )}
                onClick={handleNext}
              >
                <Icon className='h-4 w-4' name='lucide:chevron-right' />
              </button>
            </div>
            {/* Delete Node Button */}
            {(() => {
              const hasIncoming = edges.some((e) => e.target === node.id)
              const isRootTrigger = !hasIncoming && node.data.type === 'trigger'
              const isSuccessNode = node.data.label === 'Workflow Success'
              if (isRootTrigger || isSuccessNode) return null
              return (
                <button
                  className='flex h-7 w-7 items-center justify-center rounded-md text-gray-8 transition-colors hover:bg-red-1 hover:text-red-9'
                  title='Delete Step'
                  onClick={() => {
                    setNodes((nodes) => nodes.filter((n) => n.id !== node.id))
                    onClose()
                  }}
                >
                  <Icon className='h-4 w-4' name='lucide:trash-2' />
                </button>
              )
            })()}
          </>
        )}
        <button
          className='flex h-7 w-7 items-center justify-center rounded-md text-gray-8 transition-colors hover:bg-gray-2'
          onClick={onClose}
        >
          <Icon className='h-4 w-4' name='lucide:x' />
        </button>
      </div>
    </div>
  )

  const CommonFooter = (
    <div className='flex items-center justify-end gap-3 border-t border-gray-3 bg-white px-6 py-4'>
      <Button
        className='text-gray-10 hover:bg-gray-2 hover:text-gray-13'
        variant='ghost'
        onClick={() => {
          setNodes((nodes) =>
            nodes.map((n) =>
              n.id === node.id ? { ...n, selected: false } : n,
            ),
          )
          onClose()
        }}
      >
        Cancel
      </Button>
      <Button
        className='px-6 shadow-sm transition-all active:scale-95'
        color='primary'
        onClick={() => {
          // Save logic would go here
          setNodes((nodes) =>
            nodes.map((n) =>
              n.id === node.id ? { ...n, selected: false } : n,
            ),
          )
          onClose()
        }}
      >
        Save
      </Button>
    </div>
  )

  const toolType = getNodeToolType(node.data)

  // Render AP Agent node settings panel
  if (toolType === NODE_TOOL_TYPE.AP_AGENT) {
    return (
      <div className='animate-slide-in-right flex h-full w-[400px] flex-col border-l border-gray-3 bg-white shadow-xl transition-all'>
        {NodeHeader}
        <div className='flex-1 overflow-hidden'>
          <Suspense
            fallback={
              <div className='p-6 text-gray-10'>Loading settings...</div>
            }
          >
            <APAgentNodeSettings node={node} />
          </Suspense>
        </div>
        {CommonFooter}
      </div>
    )
  }

  // Render FTP Agent node settings panel
  if (toolType === NODE_TOOL_TYPE.FTP_AGENT) {
    return (
      <div className='animate-slide-in-right flex h-full w-[400px] flex-col border-l border-gray-3 bg-white shadow-xl transition-all'>
        {NodeHeader}
        <div className='flex-1 overflow-hidden'>
          <Suspense
            fallback={
              <div className='p-6 text-gray-10'>Loading settings...</div>
            }
          >
            <FTPAgentNodeSettings node={node} />
          </Suspense>
        </div>
        {CommonFooter}
      </div>
    )
  }

  // Render Google Drive settings panel
  if (toolType === NODE_TOOL_TYPE.GOOGLE_DRIVE) {
    return (
      <div className='animate-slide-in-right flex h-full w-[400px] flex-col border-l border-gray-3 bg-white shadow-xl transition-all'>
        {NodeHeader}
        <div className='flex-1 overflow-hidden'>
          <Suspense
            fallback={
              <div className='p-6 text-gray-10'>Loading settings...</div>
            }
          >
            <GoogleDriveNodeSettings node={node!} />
          </Suspense>
        </div>
        {CommonFooter}
      </div>
    )
  }

  // Render OneDrive settings panel
  if (toolType === NODE_TOOL_TYPE.ONEDRIVE) {
    return (
      <div className='animate-slide-in-right flex h-full w-[400px] flex-col border-l border-gray-3 bg-white shadow-xl transition-all'>
        {NodeHeader}
        <div className='flex-1 overflow-hidden'>
          <Suspense
            fallback={
              <div className='p-6 text-gray-10'>Loading settings...</div>
            }
          >
            <OneDriveNodeSettings node={node!} />
          </Suspense>
        </div>
        {CommonFooter}
      </div>
    )
  }

  // Render OCR Agent node settings panel
  if (toolType === NODE_TOOL_TYPE.OCR_AGENT) {
    return (
      <div className='animate-slide-in-right flex h-full w-[400px] flex-col border-l border-gray-3 bg-white shadow-xl transition-all'>
        {NodeHeader}
        <div className='flex-1 overflow-hidden'>
          <Suspense
            fallback={
              <div className='p-6 text-gray-10'>Loading settings...</div>
            }
          >
            <OCRAgentNodeSettings node={node} />
          </Suspense>
        </div>
        {CommonFooter}
      </div>
    )
  }

  // Render KYC Agent node settings panel
  if (toolType === NODE_TOOL_TYPE.KYC_AGENT) {
    return (
      <div className='animate-slide-in-right flex h-full w-[400px] flex-col border-l border-gray-3 bg-white shadow-xl transition-all'>
        {NodeHeader}
        <div className='flex-1 overflow-hidden'>
          <Suspense
            fallback={
              <div className='p-6 text-gray-10'>Loading settings...</div>
            }
          >
            <KYCAgentNodeSettings node={node} />
          </Suspense>
        </div>
        {CommonFooter}
      </div>
    )
  }

  // Render Procurement Agent node settings panel
  if (toolType === NODE_TOOL_TYPE.PROCUREMENT_AGENT) {
    return (
      <div className='animate-slide-in-right flex h-full w-[400px] flex-col border-l border-gray-3 bg-white shadow-xl transition-all'>
        {NodeHeader}
        <div className='flex-1 overflow-hidden'>
          <Suspense
            fallback={
              <div className='p-6 text-gray-10'>Loading settings...</div>
            }
          >
            <ProcurementAgentNodeSettings node={node} />
          </Suspense>
        </div>
        {CommonFooter}
      </div>
    )
  }

  // Render Document Generate Agent node settings panel
  if (toolType === NODE_TOOL_TYPE.DOCUMENT_GENERATE_AGENT) {
    return (
      <div className='animate-slide-in-right flex h-full w-[400px] flex-col border-l border-gray-3 bg-white shadow-xl transition-all'>
        {NodeHeader}
        <div className='flex-1 overflow-hidden'>
          <Suspense
            fallback={
              <div className='p-6 text-gray-10'>Loading settings...</div>
            }
          >
            <DocumentGenerateAgentNodeSettings node={node} />
          </Suspense>
        </div>
        {CommonFooter}
      </div>
    )
  }

  // Render Condition node settings panel
  if (toolType === NODE_TOOL_TYPE.CONDITION) {
    return (
      <div className='animate-slide-in-right flex h-full w-[400px] flex-col border-l border-gray-3 bg-white shadow-xl transition-all'>
        {NodeHeader}
        <div className='flex-1 overflow-hidden'>
          <Suspense
            fallback={
              <div className='p-6 text-gray-10'>Loading settings...</div>
            }
          >
            <ConditionNodeSettings node={node} />
          </Suspense>
        </div>
        {CommonFooter}
      </div>
    )
  }

  // Render Manual User node settings panel
  if (
    toolType === NODE_TOOL_TYPE.MANUAL_USER ||
    toolType === NODE_TOOL_TYPE.FORM_SUBMISSION
  ) {
    return (
      <div className='animate-slide-in-right flex h-full w-[400px] flex-col border-l border-gray-3 bg-white shadow-xl transition-all'>
        {NodeHeader}
        <div className='flex-1 overflow-hidden'>
          <Suspense
            fallback={
              <div className='p-6 text-gray-10'>Loading settings...</div>
            }
          >
            <ManualUserNodeSettings node={node} />
          </Suspense>
        </div>
        {CommonFooter}
      </div>
    )
  }

  if (
    toolType === NODE_TOOL_TYPE.GMAIL ||
    toolType === NODE_TOOL_TYPE.OUTLOOK
  ) {
    return (
      <div className='animate-slide-in-right flex h-full w-[400px] flex-col border-l border-gray-3 bg-white shadow-xl transition-all'>
        {NodeHeader}
        <div className='flex-1 overflow-hidden'>
          <Suspense
            fallback={
              <div className='p-6 text-gray-10'>Loading settings...</div>
            }
          >
            <EmailNodeSettings node={node} />
          </Suspense>
        </div>
        {CommonFooter}
      </div>
    )
  }

  return (
    <div className='animate-slide-in-right flex h-full w-[400px] flex-col border-l border-gray-3 bg-white shadow-xl transition-all'>
      {NodeHeader}

      {/* Content */}
      <div className='flex-1 space-y-1 overflow-y-auto px-4 pt-2 pb-4'>
        <ConnectionsRouting node={node!} />
      </div>
      {CommonFooter}

      {/* Resize Handle (Visual) */}
      <div className='absolute top-1/2 left-0 h-8 w-1.5 -translate-x-1/2 -translate-y-1/2 cursor-col-resize rounded-full bg-gray-3 transition-colors hover:bg-gray-4' />
    </div>
  )
}

export default PropertiesPanel
