import { useReactFlow } from '@xyflow/react'
import { useEffect, useRef, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import Input from '@/components/base/inputs/InputText'
import useWorkflowStore from '../stores/useWorkflowStore'

interface IntegrationItem {
  bgColor: string
  category: TabType | 'utility' // keeping utility for type safety if needed, but mainly mapping to new tabs
  description: string
  icon: string
  iconColor: string
  label: string
  type: 'popular' | 'highlight'
  actions?: string[]
}

type TabType = 'explore' | 'apps' | 'agents' | 'triggers'

const AddNodeMenu = () => {
  const { addMenu, closeAddMenu, selectedNode, selectNode } = useWorkflowStore(
    (state) => state,
  )
  const { position } = addMenu
  const { getEdge, getEdges, getNodes, getViewport, setEdges, setNodes } =
    useReactFlow()
  const menuRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('explore')

  const { edgeId, nodeId } = addMenu

  // Reset scroll on open/tab change
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0
    }
  }, [addMenu.isOpen, activeTab, search])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as globalThis.Node)
      ) {
        closeAddMenu()
      }
    }
    window.addEventListener('mousedown', handleClickOutside, { capture: true })
    return () =>
      window.removeEventListener('mousedown', handleClickOutside, {
        capture: true,
      })
  }, [closeAddMenu])

  const handleItemSelect = (item: IntegrationItem) => {
    if (nodeId) {
      // Change existing node
      const nodes = getNodes()
      const updatedNodes = nodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              icon: item.icon,
              iconColor: item.iconColor,
              label: item.label,
              subLabel: item.description,
              toolType: item.label,
              type: item.category === 'triggers' ? 'trigger' : 'action',
            },
          }
        }
        return node
      })

      setNodes(updatedNodes)

      // Update selected node in store if it matches
      const updatedNode = updatedNodes.find((n) => n.id === nodeId)
      if (updatedNode && selectedNode?.id === nodeId) {
        selectNode(updatedNode)
      }
    } else if (edgeId && position) {
      // Add new node on edge with Auto-Layout
      const edge = getEdge(edgeId)
      const allNodes = getNodes()
      const allEdges = getEdges() // Ensure we have latest edges for traversal

      if (edge) {
        const sourceNode = allNodes.find((n) => n.id === edge.source)
        const targetNode = allNodes.find((n) => n.id === edge.target)

        if (sourceNode && targetNode) {
          const GAP = 250 // Vertical spacing matches initial nodes (50 -> 300)

          const newNodeId = `node-${Date.now()}`
          const newNode = {
            data: {
              icon: item.icon,
              iconColor: item.iconColor,
              label: item.label,
              subLabel: item.description,
              toolType: item.label,
              type: item.category === 'triggers' ? 'trigger' : 'action',
            },
            id: newNodeId,
            // Align X with source, Place Y at source Y + GAP
            position: {
              x: sourceNode.position.x,
              y: sourceNode.position.y + GAP,
            },
            type: 'custom',
          }

          // 1. Identify all downstream nodes starting from the current target
          // We need to shift these down to make room for the new node
          const downstreamNodeIds = new Set<string>()
          const queue = [edge.target]

          while (queue.length > 0) {
            const currentId = queue.shift()!
            if (!downstreamNodeIds.has(currentId)) {
              downstreamNodeIds.add(currentId)
              // Find all nodes connected to outgoing edges of currentId
              const outgoingEdges = allEdges.filter(
                (e) => e.source === currentId,
              )
              outgoingEdges.forEach((e) => {
                if (!downstreamNodeIds.has(e.target)) {
                  queue.push(e.target)
                }
              })
            }
          }

          // 2. Create updated nodes arrays
          const shiftedNodes = allNodes.map((n) => {
            if (downstreamNodeIds.has(n.id)) {
              return {
                ...n,
                position: {
                  ...n.position,
                  y: n.position.y + GAP, // Shift down by one gap unit
                },
              }
            }
            return n
          })

          const sourceHandle = 's-bottom'
          const targetHandle = 't-top'

          const newEdges = [
            {
              id: `${edge.source}->${newNodeId}`,
              source: edge.source,
              sourceHandle: sourceHandle,
              target: newNodeId,
              targetHandle: targetHandle,
              type: 'custom',
            },
            {
              id: `${newNodeId}->${edge.target}`,
              source: newNodeId,
              sourceHandle: sourceHandle,
              target: edge.target,
              targetHandle: targetHandle,
              type: 'custom',
            },
          ]

          // Add new node to the shifted nodes
          setNodes(shiftedNodes.concat(newNode))
          setEdges((eds) => eds.filter((e) => e.id !== edgeId).concat(newEdges))

          // Select the new node
          selectNode(newNode as any)
        }
      }
    }
    closeAddMenu()
  }

  if (!addMenu.isOpen || !position) return null

  const { x: flowX, y: flowY } = position
  const { x: viewX, y: viewY, zoom } = getViewport()

  const screenX = flowX * zoom + viewX
  const screenY = flowY * zoom + viewY

  // Smart Positioning: Best Fit Logic
  const PADDING = 20
  const DEFAULT_HEIGHT = 450
  const actualHeight = menuRef.current?.offsetHeight || DEFAULT_HEIGHT

  // Calculate available space
  const spaceBelow = window.innerHeight - screenY - PADDING
  const spaceAbove = screenY - PADDING

  let top: number
  let maxHeight: number
  let transformOrigin: string

  // Prefer placing below if it fits, or if there's more space below than above
  if (spaceBelow >= actualHeight || spaceBelow >= spaceAbove) {
    top = screenY + PADDING
    maxHeight = Math.min(spaceBelow - PADDING, 450)
    transformOrigin = 'top center'
  } else {
    maxHeight = Math.min(spaceAbove - PADDING, 450)
    top = screenY - PADDING - maxHeight
    transformOrigin = 'bottom center'
  }

  const integrations: IntegrationItem[] = [
    // Apps
    {
      actions: ['New Email', 'New Label'],
      bgColor: 'bg-transparent',
      category: 'apps',
      description: 'Send or receive emails',
      icon: 'logos:google-gmail',
      iconColor: '',
      label: 'Gmail',
      type: 'popular',
    },
    {
      actions: ['New Email'],
      bgColor: 'bg-transparent',
      category: 'apps',
      description: 'Microsoft Outlook integration',
      icon: 'vscode-icons:file-type-outlook',
      iconColor: '',
      label: 'Outlook',
      type: 'popular',
    },
    {
      bgColor: 'bg-transparent',
      category: 'apps',
      description: 'Send channel messages',
      icon: 'logos:slack-icon',
      iconColor: '',
      label: 'Slack',
      type: 'popular',
    },
    {
      bgColor: 'bg-transparent',
      category: 'apps',
      description: 'Microsoft Teams integration',
      icon: 'logos:microsoft-teams',
      iconColor: '',
      label: 'Teams',
      type: 'popular',
    },

    // Agents
    {
      bgColor: 'bg-blue-50',
      category: 'agents',
      description: 'Extract text from images/PDFs',
      icon: 'lucide:scan-text',
      iconColor: '#2563eb',
      label: 'OCR Agent',
      type: 'popular',
    },
    {
      bgColor: 'bg-emerald-50',
      category: 'agents',
      description: 'Accounts Payable automation',
      icon: 'lucide:receipt-text',
      iconColor: '#059669',
      label: 'AP Agent',
      type: 'popular',
    },
    {
      bgColor: 'bg-violet-50',
      category: 'agents',
      description: 'File Transfer Protocol',
      icon: 'lucide:server',
      iconColor: '#7c3aed',
      label: 'FTP Agent',
      type: 'popular',
    },
    {
      bgColor: 'bg-transparent',
      category: 'apps',
      description: 'Store or collect files from Google Drive',
      icon: 'logos:google-drive',
      iconColor: '',
      label: 'Google Drive',
      type: 'popular',
    },
    {
      bgColor: 'bg-transparent',
      category: 'apps',
      description: 'Microsoft OneDrive integration',
      icon: 'logos:microsoft-onedrive',
      iconColor: '',
      label: 'OneDrive',
      type: 'popular',
    },

    // Triggers
    {
      bgColor: 'bg-orange-50',
      category: 'triggers',
      description: 'Trigger on new form entry',
      icon: 'lucide:file-input',
      iconColor: '#ea580c',
      label: 'Form Submission',
      type: 'highlight',
    },
    {
      bgColor: 'bg-pink-50',
      category: 'triggers',
      description: 'Trigger manually by user',
      icon: 'lucide:user',
      iconColor: '#ec4899',
      label: 'Manual User',
      type: 'highlight',
    },
  ]

  const filteredIntegrations = integrations.filter((item) => {
    const matchesSearch = item.label
      .toLowerCase()
      .includes(search.toLowerCase())
    const matchesTab = activeTab === 'explore' || item.category === activeTab
    return matchesSearch && matchesTab
  })

  const appsAndAgents = filteredIntegrations.filter(
    (i) =>
      (i.category === 'apps' || i.category === 'agents') &&
      activeTab === 'explore',
  )
  const triggerItems = filteredIntegrations.filter(
    (i) => i.category === 'triggers' && activeTab === 'explore',
  )

  return (
    <div
      className='animate-in fade-in zoom-in-95 flex w-[420px] flex-col overflow-hidden rounded-xl bg-white font-sans shadow-2xl ring-1 ring-black/5 duration-200'
      ref={menuRef}
      style={{
        left: screenX,
        maxHeight: maxHeight,
        position: 'absolute',
        top: top,
        transform: 'translateX(-50%)',
        transformOrigin: transformOrigin,
        zIndex: 1000,
      }}
    >
      {/* Search Header */}
      <div className='shrink-0 p-4 pb-2'>
        <div className='relative'>
          <Input
            className='bg-gray-50 focus:border-primary-500 focus:ring-primary-100 w-full rounded-xl border-transparent py-2.5 text-sm transition-all focus:bg-white focus:ring-2'
            placeholder='Search apps, tools, or logic...'
            value={search}
            leftSection={
              <Icon
                className='text-gray-400 h-4.5 w-4.5'
                name='lucide:search'
              />
            }
            onChange={(val) => setSearch(val)}
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className='no-scrollbar flex shrink-0 items-center gap-2 overflow-x-auto px-4 py-2'>
        {[
          { icon: 'lucide:layout-grid', id: 'explore', label: 'All' },
          { icon: 'lucide:puzzle', id: 'apps', label: 'Apps' },
          { icon: 'lucide:bot', id: 'agents', label: 'Agents' },
          { icon: 'lucide:zap', id: 'triggers', label: 'Triggers' },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`group flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${activeTab === tab.id
                ? 'bg-[var(--primary-3)] text-[var(--primary-9)]'
                : 'text-gray-600 hover:bg-[var(--primary-1)] hover:text-[var(--primary-9)]'
              }`}
            onClick={() => setActiveTab(tab.id as TabType)}
          >
            {/* Icon - keeping it as requested "Mainly icon with text" */}
            <Icon
              name={tab.icon}
              className={`h-4 w-4 transition-colors ${activeTab === tab.id
                  ? 'text-[var(--primary-9)]'
                  : 'text-gray-500 group-hover:text-[var(--primary-9)]'
                }`}
            />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content View */}
      <div className='min-h-0 flex-1 overflow-y-auto p-4' ref={listRef}>
        {activeTab === 'explore' && !search ? (
          <div className='grid grid-cols-2 gap-8'>
            {/* Integrations Column */}
            <div className='flex flex-col gap-2'>
              <h3 className='text-gray-400 mb-2 pl-2 text-xs font-medium tracking-wider uppercase'>
                Integrations
              </h3>
              {appsAndAgents.map((item, i) => (
                <button
                  className='group flex items-center gap-3 rounded-xl p-2.5 text-left transition-all duration-200 hover:scale-[1.02] hover:bg-[var(--primary-1)] active:scale-[0.98]'
                  key={i}
                  onClick={() => handleItemSelect(item)}
                >
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${item.bgColor === 'bg-transparent' ? '' : item.bgColor}`}
                  >
                    <Icon
                      name={item.icon}
                      style={{ color: item.iconColor }}
                      className={
                        item.bgColor === 'bg-transparent'
                          ? 'h-5 w-5'
                          : 'h-4 w-4'
                      }
                    />
                  </div>
                  <span className='text-gray-700 text-sm font-medium group-hover:text-[var(--primary-9)]'>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Triggers Column */}
            <div className='flex flex-col gap-2'>
              <h3 className='text-gray-400 mb-2 pl-2 text-xs font-medium tracking-wider uppercase'>
                Triggers
              </h3>
              {triggerItems.map((item, i) => (
                <button
                  className='group flex items-center gap-3 rounded-xl p-2.5 text-left transition-all duration-200 hover:scale-[1.02] hover:bg-[var(--primary-1)] active:scale-[0.98]'
                  key={i}
                  onClick={() => handleItemSelect(item)}
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${item.bgColor}`}
                  >
                    <Icon
                      className='h-4 w-4'
                      name={item.icon}
                      style={{ color: item.iconColor }}
                    />
                  </div>
                  <span className='text-gray-700 text-sm font-medium group-hover:text-[var(--primary-9)]'>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          // Standard List View for Search or Specific Tabs
          <div className='flex flex-col gap-1'>
            {filteredIntegrations.map((item, i) => (
              <button
                className='group flex items-center gap-3 rounded-xl p-2 text-left transition-all duration-200 hover:scale-[1.01] hover:bg-[var(--primary-1)] active:scale-[0.99]'
                key={i}
                onClick={() => handleItemSelect(item)}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.bgColor === 'bg-transparent' ? '' : item.bgColor}`}
                >
                  <Icon
                    name={item.icon}
                    style={{ color: item.iconColor }}
                    className={
                      item.bgColor === 'bg-transparent' ? 'h-6 w-6' : 'h-5 w-5'
                    }
                  />
                </div>
                <div className='flex flex-col'>
                  <span className='text-gray-900 text-sm font-medium group-hover:text-[var(--primary-9)]'>
                    {item.label}
                  </span>
                  {search && (
                    <span className='text-gray-500 text-xs'>
                      {item.description}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AddNodeMenu
