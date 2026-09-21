import type { Node } from '@xyflow/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNodes, useReactFlow } from '@xyflow/react'
import { useEffect, useMemo, useState } from 'react'
import { connectorApi } from '@/api/connector'
import { getConnectionQueryOptions } from '@/api/connectorQueries'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import Input from '@/components/base/inputs/InputText'
import showToast from '@/components/base/toast/showToast'
import cn from '@/utils/cn'
import ConnectionsRouting from './common/ConnectionsRouting'
import SettingsSection from './common/SettingsSection'

const protocolOptions = [
  { id: 1, name: 'SFTP' },
  { id: 2, name: 'FTP' },
  { id: 3, name: 'FTPS' },
]

const validateHost = (host: string) => {
  if (!host) return 'Please enter the server address.'
  const hostRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$|^(?:\d{1,3}\.){3}\d{1,3}$/
  if (!hostRegex.test(host)) return 'Please enter a valid server address.'
  return undefined
}

const buildConnectionOptions = (
  connection: any,
  connectionLabel: any,
  apiConnections: any,
) => {
  const options: { label: string; value: string }[] = []
  const seenValues = new Set<string>()

  if (connection && connectionLabel) {
    const val = String(connection)
    options.push({
      label: connectionLabel,
      value: val,
    })
    seenValues.add(val)
  }

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
}

const validateConnectForm = (formData: any) => {
  const newErrors: any = {}
  if (!formData.name.trim()) newErrors.name = 'Please enter a connection name.'
  const hostErr = validateHost(formData.host)
  if (hostErr) newErrors.host = hostErr
  if (!formData.port) {
    newErrors.port = 'Please enter the port number.'
  } else if (Number.parseInt(formData.port, 10) > 65535) {
    newErrors.port = 'Please enter a valid port number between 1 and 65535.'
  }
  if (!formData.username.trim())
    newErrors.username = 'Please enter your username.'
  if (!formData.password.trim())
    newErrors.password = 'Please enter your password.'
  return newErrors
}

export default function FTPAgentSettingsPanel({
  node: initialNode,
}: Readonly<{
  node: Node
}>) {
  const { setNodes } = useReactFlow()
  const liveNodes = useNodes()

  // Find matching node in the live nodes array to ensure reactivity
  const currentNode =
    liveNodes.find((n) => n.id === initialNode?.id) ?? initialNode
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

  const [isConnectionOpen, setIsConnectionOpen] = useState(false)
  const [isCreatingConnection, setIsCreatingConnection] = useState(false)
  const [path, setPath] = useState(nodeData.path || '')

  const queryClient = useQueryClient()

  // Fetch FTP connections from API
  const { data: apiConnections } = useQuery(getConnectionQueryOptions('FTP'))

  const allConnectionOptions = useMemo(() => {
    return buildConnectionOptions(
      nodeData.connection,
      nodeData.connectionLabel,
      apiConnections,
    )
  }, [nodeData.connection, nodeData.connectionLabel, apiConnections])

  // Keep path in sync with node data if it changes externally
  useEffect(() => {
    if (nodeData.path !== undefined && nodeData.path !== path) {
      setPath(nodeData.path)
    }
  }, [nodeData.path, path])

  // Connection form state
  const [formData, setFormData] = useState({
    host: '',
    name: '',
    password: '',
    port: '22',
    protocol: protocolOptions[0],
    username: '',
  })

  const [isConnecting, setIsConnecting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{
    host?: string
    name?: string
    password?: string
    port?: string
    username?: string
  }>({})

  const handleFieldChange = (field: keyof typeof formData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (value && typeof value === 'string' && value.trim()) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const handleHostBlur = () => {
    const error = validateHost(formData.host)
    setErrors((prev) => ({ ...prev, host: error }))
  }

  const handleHostChange = (val: string) => {
    setFormData((prev) => ({ ...prev, host: val }))
    if (val.trim()) {
      const error = validateHost(val)
      setErrors((prev) => ({ ...prev, host: error }))
    } else if (errors.host) {
      setErrors((prev) => ({ ...prev, host: undefined }))
    }
  }

  const handlePortChange = (val: string) => {
    if (/^\d*$/.test(val)) {
      setFormData((prev) => ({ ...prev, port: val }))
      if (val) {
        if (Number.parseInt(val, 10) > 65535) {
          setErrors((prev) => ({
            ...prev,
            port: 'Please enter a valid port number between 1 and 65535.',
          }))
        } else {
          setErrors((prev) => ({ ...prev, port: undefined }))
        }
      } else {
        setErrors((prev) => ({ ...prev, port: undefined }))
      }
    }
  }

  const handlePortBlur = () => {
    if (!formData.port) {
      setErrors((prev) => ({ ...prev, port: 'Please enter the port number.' }))
    } else if (Number.parseInt(formData.port, 10) > 65535) {
      setErrors((prev) => ({
        ...prev,
        port: 'Please enter a valid port number between 1 and 65535.',
      }))
    } else {
      setErrors((prev) => ({ ...prev, port: undefined }))
    }
  }

  const handlePathChange = (newVal: string) => {
    setPath(newVal)
    updateNodeData('path', newVal)
  }

  const resetForm = () => {
    setFormData({
      host: '',
      name: '',
      password: '',
      port: '22',
      protocol: protocolOptions[0],
      username: '',
    })
    setErrors({})
  }

  const handleConnect = async () => {
    const newErrors = validateConnectForm(formData)

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    if (isConnecting) return
    setIsConnecting(true)

    const credentialJson = {
      host: formData.host,
      password: formData.password,
      port: formData.port,
      protocol: formData.protocol.name,
      username: formData.username,
    }

    const input = {
      connectorType: 'FTP',
      credentialJson: JSON.stringify(credentialJson),
      dynamicCredentialJson: '',
      name: formData.name,
      responseBody: '',
      responseStatus: '',
      responseStatusCode: '',
    }

    const { error, payload } = await connectorApi.addConnector(input)

    if (error) {
      showToast({ message: error, variant: 'error' })
      setIsConnecting(false)
      return
    }

    // Invalidate query to refresh list
    queryClient.invalidateQueries({ queryKey: ['connections', 'FTP'] })

    // Update current choice
    const newValue = payload?.id || payload || `ftp-${Date.now()}`
    updateNodeData('connection', String(newValue))
    updateNodeData('connectionLabel', formData.name)

    setIsCreatingConnection(false)
    setIsConnectionOpen(false)
    resetForm()
    setIsConnecting(false)
  }

  const [openBasic, setOpenBasic] = useState(false)

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
          <div className='flex flex-col gap-2.5 py-1'>
            <div className='flex items-center gap-2.5 px-1 pb-1'>
              <Icon className='text-blue-600 h-4 w-4' name='lucide:server' />
              <div className='flex flex-col space-y-1'>
                <span className='text-13 font-medium text-gray-12'>
                  Connection Details
                </span>
                <span className='text-11 leading-tight text-gray-9'>
                  Manage server connection settings
                </span>
              </div>
            </div>

            <div className='space-y-3 rounded-xl bg-white p-4 shadow-sm'>
              <div className='space-y-1.5'>
                <label
                  className='flex items-center gap-1 text-[13px] font-medium text-gray-11'
                  htmlFor='connection-select'
                >
                  Connection <span className='text-red-11'>*</span>
                </label>
                <div className='relative'>
                  <button
                    id='connection-select'
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
                        nodeData.connection
                          ? 'font-normal text-gray-13'
                          : 'text-gray-9'
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
                      <button
                        aria-label='Close dropdown'
                        className='fixed inset-0 z-40 h-full w-full cursor-default border-0 bg-transparent outline-none'
                        type='button'
                        onClick={() => {
                          setIsConnectionOpen(false)
                          setIsCreatingConnection(false)
                          resetForm()
                        }}
                      />
                      <div
                        className={cn(
                          'animate-in fade-in zoom-in-95 absolute top-full left-0 z-50 mt-1 flex w-full flex-col rounded-lg border border-gray-3 bg-white py-1 shadow-xl duration-100',
                          isCreatingConnection
                            ? 'max-h-[400px] overflow-y-auto'
                            : 'overflow-hidden',
                        )}
                      >
                        {isCreatingConnection ? (
                          <div className='space-y-4 p-4'>
                            <div className='flex flex-col gap-1.5'>
                              <label
                                className='text-xs font-medium text-gray-11'
                                htmlFor='connection-name'
                              >
                                Connection Name{' '}
                                <span className='text-red-11'>*</span>
                              </label>
                              <input
                                id='connection-name'
                                placeholder='e.g. Production SFTP'
                                type='text'
                                value={formData.name}
                                className={cn(
                                  'w-full rounded-md border px-2 py-1.5 text-sm transition-all focus:ring-2 focus:outline-none',
                                  errors.name
                                    ? 'border-red-9 focus:ring-red-4'
                                    : 'border-gray-3 focus:ring-primary-4',
                                )}
                                onChange={(e) =>
                                  handleFieldChange('name', e.target.value)
                                }
                              />
                            </div>

                            <div className='flex flex-col gap-1.5'>
                              <span
                                className='text-xs font-medium text-gray-11'
                                id='protocol-label'
                              >
                                Protocol <span className='text-red-11'>*</span>
                              </span>
                              <fieldset
                                aria-labelledby='protocol-label'
                                className='bg-gray-50/50 flex rounded-lg border border-gray-2/50 p-1 shadow-inner'
                              >
                                {protocolOptions.map((opt) => (
                                  <button
                                    key={opt.id}
                                    type='button'
                                    className={cn(
                                      'flex-1 rounded-md border border-transparent py-1.5 text-[11px] font-bold transition-all duration-300 outline-none',
                                      formData.protocol.id === opt.id
                                        ? 'bg-purple-9 text-white shadow-md'
                                        : 'text-gray-9 hover:text-purple-11',
                                    )}
                                    onClick={() =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        protocol: opt,
                                      }))
                                    }
                                  >
                                    {opt.name}
                                  </button>
                                ))}
                              </fieldset>
                            </div>

                            <div className='grid grid-cols-4 gap-3'>
                              <div className='col-span-3 flex flex-col gap-1.5'>
                                <label
                                  className='text-xs font-medium text-gray-11'
                                  htmlFor='connection-host'
                                >
                                  Host <span className='text-red-11'>*</span>
                                </label>
                                <input
                                  id='connection-host'
                                  type='text'
                                  value={formData.host}
                                  className={cn(
                                    'w-full rounded-md border px-2 py-1.5 text-sm focus:ring-2 focus:outline-none',
                                    errors.host
                                      ? 'border-red-9'
                                      : 'border-gray-3',
                                  )}
                                  onBlur={handleHostBlur}
                                  onChange={(e) =>
                                    handleHostChange(e.target.value)
                                  }
                                />
                              </div>
                              <div className='col-span-1 flex flex-col gap-1.5'>
                                <label
                                  className='text-xs font-medium text-gray-11'
                                  htmlFor='connection-port'
                                >
                                  Port <span className='text-red-11'>*</span>
                                </label>
                                <input
                                  id='connection-port'
                                  type='text'
                                  value={formData.port}
                                  className={cn(
                                    'w-full rounded-md border px-2 py-1.5 text-sm focus:ring-2 focus:outline-none',
                                    errors.port
                                      ? 'border-red-9'
                                      : 'border-gray-3',
                                  )}
                                  onBlur={handlePortBlur}
                                  onChange={(e) =>
                                    handlePortChange(e.target.value)
                                  }
                                />
                              </div>
                            </div>

                            <div className='flex flex-col gap-1.5'>
                              <label
                                className='text-xs font-medium text-gray-11'
                                htmlFor='connection-username'
                              >
                                Username <span className='text-red-11'>*</span>
                              </label>
                              <input
                                id='connection-username'
                                type='text'
                                value={formData.username}
                                className={cn(
                                  'w-full rounded-md border px-2 py-1.5 text-sm focus:ring-2 focus:outline-none',
                                  errors.username
                                    ? 'border-red-9'
                                    : 'border-gray-3',
                                )}
                                onChange={(e) =>
                                  handleFieldChange('username', e.target.value)
                                }
                              />
                            </div>

                            <div className='flex flex-col gap-1.5'>
                              <label
                                className='text-xs font-medium text-gray-11'
                                htmlFor='connection-password'
                              >
                                Password <span className='text-red-11'>*</span>
                              </label>
                              <div className='relative'>
                                <input
                                  id='connection-password'
                                  type={showPassword ? 'text' : 'password'}
                                  value={formData.password}
                                  className={cn(
                                    'w-full rounded-md border py-1.5 pr-9 pl-2 text-sm focus:ring-2 focus:outline-none',
                                    errors.password
                                      ? 'border-red-9'
                                      : 'border-gray-3',
                                  )}
                                  onChange={(e) =>
                                    handleFieldChange(
                                      'password',
                                      e.target.value,
                                    )
                                  }
                                />
                                <button
                                  className='absolute top-1/2 right-2 -translate-y-1/2'
                                  type='button'
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  <Icon
                                    className='h-4 w-4'
                                    name={
                                      showPassword
                                        ? 'lucide:eye-off'
                                        : 'lucide:eye'
                                    }
                                  />
                                </button>
                              </div>
                            </div>

                            <div className='flex items-center justify-end gap-2 pt-2'>
                              <Button
                                size='md'
                                variant='ghost'
                                onClick={() => setIsCreatingConnection(false)}
                              >
                                Cancel
                              </Button>
                              <Button
                                color='primary'
                                disabled={isConnecting}
                                size='md'
                                onClick={handleConnect}
                              >
                                {isConnecting ? 'Connecting...' : 'Connect'}
                              </Button>
                            </div>
                          </div>
                        ) : (
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
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className='rounded-xl bg-white p-4 shadow-sm'>
              <Input
                className='bg-white'
                label='Folder path'
                placeholder='e.g. /inbox/invoices'
                value={path}
                required
                onChange={handlePathChange}
              />
            </div>
          </div>
        </SettingsSection>

        <ConnectionsRouting node={currentNode as any} />
      </div>
    </div>
  )
}
