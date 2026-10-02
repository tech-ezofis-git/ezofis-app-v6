import type { Node } from '@xyflow/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNodes, useReactFlow } from '@xyflow/react'
import { useEffect, useMemo, useState } from 'react'
import { getConnectionQueryOptions } from '@/api/connectorQueries'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import Input from '@/components/base/inputs/InputText'
import showToast from '@/components/base/toast/showToast'
import {
  openWorkflowOAuthAuthorize,
  parseOAuthConnectionSuccess,
} from '@/pages/workflows/utils/oauthAuthorize'
import cn from '@/utils/cn'
import ConnectionsRouting from './common/ConnectionsRouting'
import SettingsSection from './common/SettingsSection'

const CONNECTOR_TYPE = 'GOOGLE_DRIVE'

export default function GoogleDriveSettingsPanel({
  node: initialNode,
}: {
  node: Node
}) {
  const { setNodes } = useReactFlow()
  const liveNodes = useNodes()
  const queryClient = useQueryClient()

  // Find matching node in the live nodes array to ensure reactivity
  const currentNode =
    liveNodes.find((n) => n.id === initialNode?.id) || initialNode
  const nodeData = (currentNode?.data || {}) as any

  const updateNodeData = (key: string, value: any) => {
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === currentNode?.id
          ? { ...n, data: { ...n.data, [key]: value } }
          : n,
      ),
    )
  }

  const [openBasic, setOpenBasic] = useState(true)
  const [path, setPath] = useState(nodeData.path || '')

  // Connection States
  const [isConnectionOpen, setIsConnectionOpen] = useState(false)
  const [isCreatingConnection, setIsCreatingConnection] = useState(false)
  const [newConnectionName, setNewConnectionName] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [pendingConnectionName, setPendingConnectionName] = useState<
    string | null
  >(null)

  // Fetch connections from API
  const { data: apiConnections } = useQuery(
    getConnectionQueryOptions(CONNECTOR_TYPE),
  )

  const allConnectionOptions = useMemo(() => {
    const options: { label: string; value: string }[] = []
    const seenValues = new Set<string>()

    // 1. Add current connection first if it exists
    if (nodeData.connection && nodeData.connectionLabel) {
      const val = String(nodeData.connection)
      options.push({
        label: nodeData.connectionLabel,
        value: val,
      })
      seenValues.add(val)
    }

    // 2. Add API connections
    if (apiConnections && Array.isArray(apiConnections)) {
      apiConnections.forEach((item: any) => {
        const val = String(item.id)
        if (!seenValues.has(val)) {
          options.push({
            label: item.name || item.externalAccountEmail || val,
            value: val,
          })
          seenValues.add(val)
        }
      })
    }

    return options
  }, [nodeData.connection, nodeData.connectionLabel, apiConnections])

  // Handle selecting a newly created connection once it appears in apiConnections
  useEffect(() => {
    if (
      pendingConnectionName &&
      apiConnections &&
      Array.isArray(apiConnections)
    ) {
      const found = apiConnections.find(
        (c: any) => c.name === pendingConnectionName,
      )
      if (found) {
        const label =
          found.externalAccountEmail || found.name || pendingConnectionName
        updateNodeData('connection', String(found.id))
        updateNodeData('connectorId', String(found.id))
        updateNodeData('connectionLabel', label)
        updateNodeData('externalAccountEmail', found.externalAccountEmail || '')
        updateNodeData('account', found.externalAccountEmail || found.name)
        setPendingConnectionName(null)
        setIsConnecting(false)
        setIsCreatingConnection(false)
        setIsConnectionOpen(false)
        setNewConnectionName('')
      }
    }
  }, [apiConnections, pendingConnectionName])

  // Connection Success Listener — same payload as AP onboarding
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data.type !== 'CONNECTION_SUCCESS') return

      const { connector, connectorId, email, label } =
        parseOAuthConnectionSuccess(event.data)

      if (connectorId) {
        updateNodeData('connection', connectorId)
        updateNodeData('connectorId', connectorId)
        updateNodeData('connectionLabel', label || newConnectionName)
        updateNodeData('externalAccountEmail', email)
        updateNodeData('account', email || connector)
        setIsConnecting(false)
        setIsCreatingConnection(false)
        setIsConnectionOpen(false)
        setNewConnectionName('')
        setPendingConnectionName(null)
      } else if (connector) {
        setPendingConnectionName(connector)
      }

      queryClient.invalidateQueries({
        queryKey: ['connections', CONNECTOR_TYPE],
      })
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [newConnectionName, queryClient])

  const handleConnect = async () => {
    if (!newConnectionName.trim() || isConnecting) return
    setIsConnecting(true)
    const { error } = await openWorkflowOAuthAuthorize(
      CONNECTOR_TYPE,
      newConnectionName.trim(),
    )
    if (error) {
      showToast({ message: error, variant: 'error' })
      setIsConnecting(false)
    }
  }

  const handlePathChange = (newVal: string) => {
    setPath(newVal)
    updateNodeData('path', newVal)
  }

  return (
    <div className='flex h-full flex-col overflow-hidden bg-surface font-inter text-gray-12'>
      <div className='flex-1 space-y-1 overflow-y-auto px-4 pt-2 pb-4'>
        <SettingsSection
          icon='logos:google-drive'
          isOpen={openBasic}
          title='Google Drive Setup'
          variant='premium'
          onToggle={() => setOpenBasic(!openBasic)}
        >
          <div className='flex flex-col gap-2.5 py-1'>
            <div className='flex items-center gap-2.5 px-1 pb-1'>
              <Icon className='text-blue-10 h-4 w-4' name='lucide:cloud' />
              <div className='flex flex-col space-y-1'>
                <span className='text-13 font-medium text-gray-12'>
                  Storage Settings
                </span>
                <span className='text-11 leading-tight text-gray-9'>
                  Select connection and target folder
                </span>
              </div>
            </div>

            {/* Connection Select */}
            <div className='space-y-3 rounded-xl bg-surface p-4 shadow-sm'>
              <div className='space-y-1.5'>
                <label className='flex items-center gap-1 text-[13px] font-medium text-gray-11'>
                  Connection <span className='text-red-11'>*</span>
                </label>
                <div className='relative'>
                  <button
                    className={cn(
                      'flex h-10 w-full items-center justify-between rounded-md border bg-surface px-3 text-sm transition-all duration-200 outline-none focus:border-primary-9 focus:ring-2 focus:ring-primary-4',
                      isConnectionOpen
                        ? 'border-primary-9 ring-2 ring-primary-4'
                        : 'border-gray-3 hover:border-primary-5',
                    )}
                    onClick={() => setIsConnectionOpen(!isConnectionOpen)}
                  >
                    <span
                      className={
                        !nodeData.connection
                          ? 'text-gray-9'
                          : 'font-normal text-gray-13'
                      }
                    >
                      {allConnectionOptions.find(
                        (o) => o.value === String(nodeData.connection),
                      )?.label ||
                        nodeData.connectionLabel ||
                        'Select a connection'}
                    </span>
                    <Icon
                      className='pointer-events-none h-4 w-4 text-gray-7'
                      name='lucide:chevrons-up-down'
                    />
                  </button>

                  {isConnectionOpen && (
                    <>
                      <div
                        className='fixed inset-0 z-40'
                        onClick={() => {
                          setIsConnectionOpen(false)
                          setIsCreatingConnection(false)
                        }}
                      />
                      <div
                        className={cn(
                          'animate-in fade-in zoom-in-95 absolute top-full left-0 z-50 mt-1 flex w-full flex-col rounded-lg border border-gray-3 bg-surface py-1 shadow-xl duration-100',
                          isCreatingConnection ? 'p-3' : 'overflow-hidden',
                        )}
                      >
                        {!isCreatingConnection ? (
                          <>
                            {allConnectionOptions.map((option) => (
                              <button
                                key={option.value}
                                className={cn(
                                  'w-full px-3 py-2 text-left text-sm transition-colors',
                                  String(nodeData.connection) === option.value
                                    ? 'bg-primary-1 font-normal text-primary-9'
                                    : 'font-normal text-gray-13 hover:bg-gray-2',
                                )}
                                onClick={() => {
                                  updateNodeData('connection', option.value)
                                  updateNodeData(
                                    'connectionLabel',
                                    option.label,
                                  )
                                  setIsConnectionOpen(false)
                                }}
                              >
                                {option.label}
                              </button>
                            ))}
                            <div className='my-1 h-px bg-gray-2' />
                            <button
                              className='flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-normal text-primary-9 transition-colors hover:bg-primary-1'
                              onClick={() => setIsCreatingConnection(true)}
                            >
                              <Icon className='h-4 w-4' name='lucide:plus' />
                              Create Connection
                            </button>
                          </>
                        ) : (
                          <div className='flex flex-col gap-3'>
                            <div className='flex flex-col gap-1.5'>
                              <label className='text-xs font-medium text-gray-11'>
                                Connection Name
                              </label>
                              <Input
                                placeholder='e.g. My Google Drive'
                                value={newConnectionName}
                                onChange={setNewConnectionName}
                              />
                            </div>
                            <div className='flex items-center justify-end gap-2'>
                              <Button
                                size='sm'
                                variant='ghost'
                                onClick={() => setIsCreatingConnection(false)}
                              >
                                Cancel
                              </Button>
                              <Button
                                size='sm'
                                disabled={
                                  isConnecting || !newConnectionName.trim()
                                }
                                onClick={handleConnect}
                              >
                                {isConnecting ? 'Waiting...' : 'Connect'}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Folder path */}
            <div className='rounded-xl bg-surface p-4 shadow-sm'>
              <Input
                className='bg-surface'
                label='Target Folder'
                placeholder='e.g. /Documents/Invoices'
                value={path}
                required
                onChange={handlePathChange}
              />
              <p className='text-10 mt-2 leading-tight text-gray-8'>
                Specify the path where documents will be stored or collected
                from.
              </p>
            </div>
          </div>
        </SettingsSection>

        <ConnectionsRouting node={currentNode as any} />
      </div>
    </div>
  )
}
