import type { Node } from '@xyflow/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNodes, useReactFlow } from '@xyflow/react'
import { useEffect, useMemo, useState } from 'react'
import type { Option } from '@/types/option'
import { getConnectionQueryOptions } from '@/api/connectorQueries'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import Input from '@/components/base/inputs/InputText'
import authUserStore from '@/stores/authUserStore'
import cn from '@/utils/cn'
import ConnectionsRouting from './common/ConnectionsRouting'
import SettingsSection from './common/SettingsSection'

const domainNameOptions: Option[] = [
  { id: 1, name: 'example.com' },
  { id: 2, name: 'gmail.com' },
  { id: 3, name: 'outlook.com' },
]

export default function EmailSettingsPanel({
  node: initialNode,
}: {
  node: Node
}) {
  const { setNodes } = useReactFlow()
  const liveNodes = useNodes()
  const session = authUserStore((state) => state.session)
  const queryClient = useQueryClient()

  // Find matching node in the live nodes array to ensure reactivity
  const currentNode =
    liveNodes.find((n) => n.id === initialNode?.id) || initialNode
  const nodeData = (currentNode?.data || {}) as any

  const [openBasic, setOpenBasic] = useState(true)
  const [openTrigger, setOpenTrigger] = useState(false)

  // Connection States
  const [isConnectionOpen, setIsConnectionOpen] = useState(false)
  const [isCreatingConnection, setIsCreatingConnection] = useState(false)
  const [newConnectionName, setNewConnectionName] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionOptions] = useState<{ label: string; value: string }[]>([])
  const [pendingConnectionName, setPendingConnectionName] = useState<
    string | null
  >(null)

  const nodeIcon = (currentNode.data.icon as string)?.toLowerCase() || ''
  const nodeLabel = (currentNode.data.label as string)?.toLowerCase() || ''
  const provider =
    nodeIcon.includes('outlook') || nodeLabel.includes('outlook')
      ? 'outlook'
      : 'gmail'

  // Fetch connections from API
  const { data: apiConnections } = useQuery(getConnectionQueryOptions(provider))

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

    // 2. Add local/manual connections (from success events)
    connectionOptions.forEach((opt) => {
      const val = String(opt.value)
      if (!seenValues.has(val)) {
        options.push(opt)
        seenValues.add(val)
      }
    })

    // 3. Add API connections
    if (apiConnections && Array.isArray(apiConnections)) {
      apiConnections.forEach((item: any) => {
        const val = String(item.id)
        if (!seenValues.has(val)) {
          options.push({
            label: item.name,
            value: val,
          })
          seenValues.add(val)
        }
      })
    }

    return options
  }, [
    nodeData.connection,
    nodeData.connectionLabel,
    connectionOptions,
    apiConnections,
  ])

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
        updateNodeData('connection', String(found.id))
        updateNodeData('connectionLabel', found.name)
        setPendingConnectionName(null)
        setIsConnecting(false)
        setIsCreatingConnection(false)
        setIsConnectionOpen(false)
        setNewConnectionName('')
      }
    }
  }, [apiConnections, pendingConnectionName])

  // Trigger States
  const [mailSubjectEnabled, setMailSubjectEnabled] = useState(
    nodeData.mailSubjectEnabled ?? false,
  )
  const [mailSubjectToMonitor, setMailSubjectToMonitor] = useState(
    nodeData.mailSubjectToMonitor || '',
  )
  const [hasAttachmentEnabled, setHasAttachmentEnabled] = useState(
    nodeData.hasAttachmentEnabled ?? false,
  )
  const [mailContentEnabled, setMailContentEnabled] = useState(
    nodeData.mailContentEnabled ?? false,
  )
  const [mailContentToMonitor, setMailContentToMonitor] = useState(
    nodeData.mailContentToMonitor || '',
  )
  const [fromMailAddressEnabled, setFromMailAddressEnabled] = useState(
    nodeData.fromMailAddressEnabled ?? false,
  )
  const [fromMailAddresses, setFromMailAddresses] = useState<Option[]>(
    nodeData.fromMailAddresses || [],
  )
  const [fromDomainNameEnabled, setFromDomainNameEnabled] = useState(
    nodeData.fromDomainNameEnabled ?? false,
  )
  const [fromDomainName, setFromDomainName] = useState<Option | null>(
    nodeData.fromDomainName || null,
  )

  const updateNodeData = (key: string, value: any) => {
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === currentNode?.id
          ? { ...n, data: { ...n.data, [key]: value } }
          : n,
      ),
    )
  }

  // Connection Success Listener
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data.type === 'CONNECTION_SUCCESS') {
        const { connector } = event.data

        // Set pending name to identify the new connection in the list
        setPendingConnectionName(connector)

        // Invalidate query to refresh the list from backend
        queryClient.invalidateQueries({ queryKey: ['connections', provider] })
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [currentNode?.id, provider])

  const handleConnect = () => {
    if (!newConnectionName.trim() || isConnecting) return
    setIsConnecting(true)
    const tenantId = session?.tenantId
    const url = `https://ezcloudauth.azurewebsites.net/api/authorize?tenantid=${tenantId}&envtype=trial&connectorname=${newConnectionName}&provider=${provider}&resulturl=${window.location.origin}/auth/`
    window.open(url, '_blank')
  }

  const isTrigger =
    currentNode.data.type === 'trigger' ||
    nodeIcon.includes('gmail') ||
    nodeIcon.includes('outlook') ||
    nodeLabel.includes('gmail') ||
    nodeLabel.includes('outlook')

  return (
    <div className='flex h-full flex-col overflow-hidden bg-white font-inter text-gray-12'>
      <div className='flex-1 space-y-1 overflow-y-auto px-4 pt-2 pb-4'>
        <SettingsSection
          icon='lucide:settings-2'
          isOpen={openBasic}
          title='Basic Setup'
          variant='premium'
          onToggle={() => setOpenBasic(!openBasic)}
        >
          <div className='space-y-4 pt-1'>
            <div className='space-y-3 rounded-xl bg-white p-4 shadow-sm'>
              <div className='space-y-1.5'>
                <label className='flex items-center gap-1 text-[13px] font-medium text-gray-11'>
                  Connection <span className='text-red-11'>*</span>
                </label>
                <div className='relative'>
                  <button
                    className={cn(
                      'flex h-10 w-full items-center justify-between rounded-md border bg-white px-3 text-sm transition-all duration-200 outline-none focus:border-primary-9 focus:ring-2 focus:ring-primary-4',
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
                          setNewConnectionName('')
                        }}
                      />
                      <div className='animate-in fade-in zoom-in-95 absolute top-full left-0 z-50 mt-1 flex w-full flex-col overflow-hidden rounded-lg border border-gray-3 bg-white py-1 shadow-xl duration-100'>
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

                            {allConnectionOptions.length > 0 && (
                              <div className='my-1 h-px bg-gray-2' />
                            )}

                            <button
                              className='flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-normal text-primary-9 transition-colors hover:bg-primary-1'
                              onClick={() => setIsCreatingConnection(true)}
                            >
                              <Icon className='h-4 w-4' name='lucide:plus' />
                              Create Connection
                            </button>
                          </>
                        ) : (
                          <div className='space-y-3 p-3'>
                            <div className='flex flex-col gap-1.5'>
                              <label className='text-xs font-medium text-gray-11'>
                                Connection Name
                              </label>
                              <input
                                className='w-full rounded-md border border-gray-3 px-2 py-1.5 text-sm focus:border-primary-9 focus:ring-2 focus:ring-primary-4 focus:outline-none'
                                type='text'
                                value={newConnectionName}
                                autoFocus
                                placeholder={
                                  nodeLabel.includes('gmail')
                                    ? 'e.g. My Gmail Connection'
                                    : 'e.g. My Outlook Connection'
                                }
                                onChange={(e) =>
                                  setNewConnectionName(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleConnect()
                                }}
                              />
                            </div>
                            <div className='flex items-center justify-end gap-2'>
                              <Button
                                className='text-gray-10 hover:bg-gray-2 hover:text-gray-13'
                                size='md'
                                variant='ghost'
                                onClick={() => setIsCreatingConnection(false)}
                              >
                                Cancel
                              </Button>
                              <Button
                                className='flex items-center justify-center gap-2'
                                color='primary'
                                size='md'
                                disabled={
                                  !newConnectionName.trim() || isConnecting
                                }
                                onClick={handleConnect}
                              >
                                {isConnecting && (
                                  <Icon
                                    className='h-3 w-3 animate-spin'
                                    name='lucide:loader-2'
                                  />
                                )}
                                {isConnecting ? 'Connecting...' : 'Connect'}
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
          </div>
        </SettingsSection>

        {isTrigger && (
          <SettingsSection
            icon='lucide:filter'
            isOpen={openTrigger}
            title='Trigger Conditions'
            variant='premium'
            onToggle={() => setOpenTrigger(!openTrigger)}
          >
            <div className='flex flex-col gap-2.5 py-1'>
              <div className='space-y-3 rounded-xl bg-white p-4 shadow-sm'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2.5'>
                    <Icon
                      className='text-purple-600 h-4 w-4 stroke-[2]'
                      name='lucide:type'
                    />
                    <div className='flex flex-col space-y-1'>
                      <span className='text-13 font-medium text-gray-12'>
                        Mail Subject
                      </span>
                      <span className='text-11 leading-tight text-gray-9'>
                        To check the mail subject
                      </span>
                    </div>
                  </div>
                  <InputSwitch
                    checked={mailSubjectEnabled}
                    onChange={(checked) => {
                      setMailSubjectEnabled(checked)
                      updateNodeData('mailSubjectEnabled', checked)
                    }}
                  />
                </div>
                {mailSubjectEnabled && (
                  <div className='animate-in fade-in slide-in-from-top-1 duration-200'>
                    <div className='space-y-1.5 pt-1'>
                      <div className='text-12 font-medium text-gray-12'>
                        Mail Subject To Monitor
                      </div>
                      <Input
                        className='bg-white'
                        placeholder='Enter subject to monitor...'
                        value={mailSubjectToMonitor}
                        onChange={(val) => {
                          setMailSubjectToMonitor(val)
                          updateNodeData('mailSubjectToMonitor', val)
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className='rounded-xl bg-white p-4 shadow-sm'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2.5'>
                    <Icon
                      className='text-blue-600 h-4 w-4 stroke-[2]'
                      name='lucide:paperclip'
                    />
                    <div className='flex flex-col space-y-1'>
                      <span className='text-13 font-medium text-gray-12'>
                        Has Attachment
                      </span>
                      <span className='text-11 leading-tight text-gray-9'>
                        To check the attachment included
                      </span>
                    </div>
                  </div>
                  <InputSwitch
                    checked={hasAttachmentEnabled}
                    onChange={(checked) => {
                      setHasAttachmentEnabled(checked)
                      updateNodeData('hasAttachmentEnabled', checked)
                    }}
                  />
                </div>
              </div>

              <div className='space-y-3 rounded-xl bg-white p-4 shadow-sm'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2.5'>
                    <Icon
                      className='text-amber-600 h-4 w-4 stroke-[2]'
                      name='lucide:file-text'
                    />
                    <div className='flex flex-col space-y-1'>
                      <span className='text-13 font-medium text-gray-12'>
                        Mail Content
                      </span>
                      <span className='text-11 leading-tight text-gray-9'>
                        To check the mail Content
                      </span>
                    </div>
                  </div>
                  <InputSwitch
                    checked={mailContentEnabled}
                    onChange={(checked) => {
                      setMailContentEnabled(checked)
                      updateNodeData('mailContentEnabled', checked)
                    }}
                  />
                </div>
                {mailContentEnabled && (
                  <div className='animate-in fade-in slide-in-from-top-1 duration-200'>
                    <div className='space-y-1.5 pt-1'>
                      <div className='text-12 font-medium text-gray-12'>
                        Specific Mail Content To Monitor
                      </div>
                      <Input
                        className='bg-white'
                        placeholder='Enter content to monitor...'
                        value={mailContentToMonitor}
                        onChange={(val) => {
                          setMailContentToMonitor(val)
                          updateNodeData('mailContentToMonitor', val)
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className='space-y-3 rounded-xl bg-white p-4 shadow-sm'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2.5'>
                    <Icon
                      className='text-rose-600 h-4 w-4 stroke-[2]'
                      name='lucide:mail'
                    />
                    <div className='flex flex-col space-y-1'>
                      <span className='text-13 font-medium text-gray-12'>
                        From Mail Address
                      </span>
                      <span className='text-11 leading-tight text-gray-9'>
                        To check specify the from email address
                      </span>
                    </div>
                  </div>
                  <InputSwitch
                    checked={fromMailAddressEnabled}
                    onChange={(checked) => {
                      setFromMailAddressEnabled(checked)
                      updateNodeData('fromMailAddressEnabled', checked)
                    }}
                  />
                </div>
                {fromMailAddressEnabled && (
                  <div className='animate-in fade-in slide-in-from-top-1 duration-200'>
                    <div className='space-y-1.5 pt-1'>
                      <div className='text-12 font-medium text-gray-12'>
                        Sender Email Addresses
                      </div>
                      <InputSelectMultiple
                        className='bg-white'
                        options={[]}
                        placeholder='Add email address...'
                        value={fromMailAddresses}
                        creatable
                        searchable
                        onChange={(vals) => {
                          setFromMailAddresses(vals)
                          updateNodeData('fromMailAddresses', vals)
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className='space-y-3 rounded-xl bg-white p-4 shadow-sm'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2.5'>
                    <Icon
                      className='text-emerald-600 h-4 w-4 stroke-[2]'
                      name='lucide:globe'
                    />
                    <div className='flex flex-col space-y-1'>
                      <span className='text-13 font-medium text-gray-12'>
                        From Domain Name
                      </span>
                      <span className='text-11 leading-tight text-gray-9'>
                        To check specify the from Domain Name
                      </span>
                    </div>
                  </div>
                  <InputSwitch
                    checked={fromDomainNameEnabled}
                    onChange={(checked) => {
                      setFromDomainNameEnabled(checked)
                      updateNodeData('fromDomainNameEnabled', checked)
                    }}
                  />
                </div>
                {fromDomainNameEnabled && (
                  <div className='animate-in fade-in slide-in-from-top-1 duration-200'>
                    <div className='space-y-1.5 pt-1'>
                      <div className='text-12 font-medium text-gray-12'>
                        Sender Domains
                      </div>
                      <InputSelect
                        className='bg-white'
                        options={domainNameOptions}
                        placeholder='Select or add domain...'
                        value={fromDomainName}
                        creatable
                        searchable
                        onChange={(val) => {
                          setFromDomainName(val)
                          updateNodeData('fromDomainName', val)
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </SettingsSection>
        )}

        <ConnectionsRouting node={currentNode as any} />
      </div>
    </div>
  )
}
