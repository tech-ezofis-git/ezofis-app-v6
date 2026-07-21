import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { getConnectionQueryOptions } from '@/api/connectorQueries'
import Alert from '@/components/base/Alert'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputText from '@/components/base/inputs/InputText'
import showToast from '@/components/base/toast/showToast'
import authUserStore from '@/stores/authUserStore'
import cn from '@/utils/cn'

export type CloudStorageOption = {
  connectorType: string
  description: string
  id: string
  logo?: string
  oauthProvider: string
  storageProviderCode: string
  subtitle: string
  title: string
}

type Props = {
  connectorId: string | null
  connectorLabel: string | null
  option: CloudStorageOption
  onConnectorChange: (
    connectorId: string | null,
    connectorLabel: string | null,
  ) => void
}

const buildConnectionName = (provider: string) => {
  const now = new Date()
  const day = now.getDate().toString().padStart(2, '0')
  const month = now.toLocaleString('default', { month: 'short' })
  const year = now.getFullYear()
  const hours = now.getHours().toString().padStart(2, '0')
  const minutes = now.getMinutes().toString().padStart(2, '0')

  return `${provider}-${day}${month}${year}-${hours}${minutes}`
}

export default function FolderStorageConnectorPanel({
  connectorId,
  connectorLabel,
  option,
  onConnectorChange,
}: Props) {
  const session = authUserStore((state) => state.session)
  const queryClient = useQueryClient()
  const [isConnecting, setIsConnecting] = useState(false)
  const [isCreatingConnection, setIsCreatingConnection] = useState(false)
  const [newConnectionName, setNewConnectionName] = useState('')
  const [pendingConnectionName, setPendingConnectionName] = useState<
    string | null
  >(null)

  const { data: apiConnections, isLoading } = useQuery(
    getConnectionQueryOptions(option.connectorType),
  )

  const connectionOptions = useMemo(() => {
    const options: Array<{ id: string | number; name: string; value: string }> =
      []
    const seen = new Set<string>()

    if (connectorId && connectorLabel) {
      options.push({
        id: connectorId,
        name: connectorLabel,
        value: connectorId,
      })
      seen.add(connectorId)
    }

    if (Array.isArray(apiConnections)) {
      apiConnections.forEach((item: { id: string | number; name: string }) => {
        const value = String(item.id)
        if (seen.has(value)) return
        options.push({
          id: item.id,
          name: item.name,
          value,
        })
        seen.add(value)
      })
    }

    return options
  }, [apiConnections, connectorId, connectorLabel])

  const selectedConnection =
    connectionOptions.find((item) => item.value === connectorId) || null

  useEffect(() => {
    if (!pendingConnectionName || !Array.isArray(apiConnections)) return

    const found = apiConnections.find(
      (item: { name: string }) => item.name === pendingConnectionName,
    )

    if (!found) return

    onConnectorChange(String(found.id), found.name)
    setPendingConnectionName(null)
    setIsConnecting(false)
    setIsCreatingConnection(false)
    setNewConnectionName('')
    showToast({
      message: `${option.title} connected successfully.`,
      variant: 'success',
    })
  }, [apiConnections, onConnectorChange, option.title, pendingConnectionName])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data.type !== 'CONNECTION_SUCCESS') return

      const connectorName =
        event.data.connector ||
        event.data.connectorName ||
        pendingConnectionName

      if (connectorName) setPendingConnectionName(String(connectorName))

      void queryClient.invalidateQueries({
        queryKey: ['connections', option.connectorType],
      })
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [option.connectorType, pendingConnectionName, queryClient])

  const handleConnect = () => {
    if (!session?.tenantId) {
      showToast({ message: 'Tenant ID is missing.', variant: 'error' })
      return
    }

    const connectionName =
      newConnectionName.trim() || buildConnectionName(option.oauthProvider)

    setIsConnecting(true)
    const url = `https://ezcloudauth.azurewebsites.net/api/authorize?tenantid=${session.tenantId}&envtype=trial&connectorname=${encodeURIComponent(connectionName)}&provider=${option.oauthProvider}&resulturl=${window.location.origin}/auth/`
    window.open(url, '_blank')
    setPendingConnectionName(connectionName)
  }

  return (
    <div className='mt-5 space-y-4 rounded-[12px] border border-[var(--border-default)] bg-surface p-5 shadow-sm'>
      <div className='flex items-start gap-4'>
        {option.logo ? (
          <span className='flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-gray-2'>
            <img
              alt={option.title}
              className='h-6 w-6 object-contain'
              src={option.logo}
            />
          </span>
        ) : null}

        <div className='min-w-0 flex-1'>
          <h3 className='text-base font-semibold text-gray-13'>
            {option.title}
          </h3>
          <p className='mt-1 text-sm text-gray-11'>{option.subtitle}</p>
          <p className='mt-3 text-sm leading-6 text-gray-11'>
            {option.description}
          </p>
        </div>
      </div>

      <Alert
        text={`${option.title} selected. Click Connect ${option.title} to link your account and choose a connector.`}
        variant='primary'
      />

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <InputSelect
          label='Connector'
          options={connectionOptions}
          value={selectedConnection}
          placeholder={
            isLoading ? 'Loading connectors...' : 'Select a connector'
          }
          onChange={(selected) => {
            if (!selected) {
              onConnectorChange(null, null)
              return
            }

            onConnectorChange(String(selected.value), selected.name)
          }}
        />

        <div className='flex items-end'>
          <Button
            className='w-full'
            color='primary'
            icon='lucide:plug'
            label={`Connect ${option.title}`}
            loading={isConnecting}
            variant='solid'
            onClick={() => setIsCreatingConnection((current) => !current)}
          />
        </div>
      </div>

      {isCreatingConnection ? (
        <div
          className={cn(
            'rounded-[10px] border border-gray-3 bg-[var(--gray-1)] p-4',
          )}
        >
          <div className='mb-3 flex items-center gap-2 text-sm font-semibold text-gray-13'>
            <Icon className='h-4 w-4 text-primary-9' name='lucide:link-2' />
            Create new connection
          </div>

          <div className='grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-end'>
            <InputText
              label='Connection name'
              placeholder={`e.g. My ${option.title}`}
              value={newConnectionName}
              onChange={setNewConnectionName}
            />

            <Button
              color='primary'
              icon='lucide:external-link'
              label='Authorize'
              loading={isConnecting}
              variant='solid'
              onClick={handleConnect}
            />
          </div>

          <p className='mt-3 text-xs leading-5 text-gray-11'>
            A sign-in window will open. After authorization, the connector ID
            will be saved with this folder when you complete setup.
          </p>
        </div>
      ) : null}

      {connectorId ? (
        <Alert
          text={`Connected to ${connectorLabel || 'selected connector'} (ID: ${connectorId}).`}
          variant='green'
        />
      ) : null}
    </div>
  )
}
