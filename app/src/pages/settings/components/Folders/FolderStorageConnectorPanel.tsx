import { useLingui } from '@lingui/react/macro'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { getConnectionQueryOptions } from '@/api/connectorQueries'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
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
  error?: string
  option: CloudStorageOption
  required?: boolean
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
  error,
  option,
  required,
  onConnectorChange,
}: Props) {
  const { t } = useLingui()
  const session = authUserStore((state) => state.session)
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [isCreatingConnection, setIsCreatingConnection] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [newConnectionName, setNewConnectionName] = useState('')
  const [pendingConnectionName, setPendingConnectionName] = useState<
    string | null
  >(null)

  const { data: apiConnections, isLoading } = useQuery(
    getConnectionQueryOptions(option.connectorType),
  )

  const connectionOptions = useMemo(() => {
    const options: Array<{ label: string; value: string }> = []
    const seen = new Set<string>()

    if (Array.isArray(apiConnections)) {
      apiConnections.forEach((item: { id: string | number; name: string }) => {
        const value = String(item.id || '').trim()
        const label = String(item.name || '').trim()
        if (!value || !label || seen.has(value)) return
        options.push({ label, value })
        seen.add(value)
      })
    }

    if (connectorId && connectorLabel && !seen.has(connectorId)) {
      options.unshift({ label: connectorLabel, value: connectorId })
    }

    return options
  }, [apiConnections, connectorId, connectorLabel])

  const selectedLabel =
    connectionOptions.find((item) => item.value === connectorId)?.label ||
    connectorLabel ||
    ''

  useEffect(() => {
    setIsOpen(false)
    setIsCreatingConnection(false)
    setIsConnecting(false)
    setNewConnectionName('')
    setPendingConnectionName(null)
  }, [option.connectorType])

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
    setIsOpen(false)
    setNewConnectionName('')
    showToast({
      message: t`${option.title} connected successfully.`,
      variant: 'success',
    })
  }, [
    apiConnections,
    onConnectorChange,
    option.title,
    pendingConnectionName,
    t,
  ])

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

  const handleAuthorize = () => {
    if (!session?.tenantId) {
      showToast({
        message: t`We couldn't connect to the service. Please try again or contact your administrator.`,
        variant: 'error',
      })
      return
    }

    const connectionName =
      newConnectionName.trim() || buildConnectionName(option.oauthProvider)

    setIsConnecting(true)
    setNewConnectionName(connectionName)
    const url = `https://ezcloudauth.azurewebsites.net/api/authorize?tenantid=${session.tenantId}&envtype=trial&connectorname=${encodeURIComponent(connectionName)}&provider=${option.oauthProvider}&resulturl=${window.location.origin}/auth/`
    window.open(url, '_blank')
    setPendingConnectionName(connectionName)
  }

  const closeDropdown = () => {
    setIsOpen(false)
    setIsCreatingConnection(false)
    setNewConnectionName('')
  }

  return (
    <div className='space-y-1.5'>
      <label className='mb-2 flex items-center gap-1 text-13 font-medium text-gray-11'>
        {t`Connector`}
        {required ? <span className='text-red-11'>*</span> : null}
      </label>
      <div className='relative'>
        <button
          type='button'
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-md border bg-surface px-3 text-13 font-medium transition outline-none',
            error
              ? 'border-red-8 ring-2 ring-red-5'
              : isOpen
                ? 'border-primary-9 ring-2 ring-primary-4'
                : 'border-gray-3 hover:border-primary-5',
          )}
          onClick={() => setIsOpen((open) => !open)}
        >
          <span
            className={cn(
              'truncate',
              selectedLabel ? 'text-gray-12' : 'font-normal text-gray-8',
            )}
          >
            {selectedLabel ||
              (isLoading ? t`Loading...` : t`Select ${option.title} connector`)}
          </span>
          <Icon
            className='size-4 shrink-0 text-gray-8'
            name='lucide:chevrons-up-down'
          />
        </button>

        {isOpen ? (
          <>
            <div className='fixed inset-0 z-40' onClick={closeDropdown} />
            <div
              className={cn(
                'absolute top-full left-0 z-50 mt-1 w-full rounded-lg border border-gray-3 bg-surface shadow-lg',
                isCreatingConnection ? 'p-3' : 'overflow-hidden py-1',
              )}
            >
              {!isCreatingConnection ? (
                <>
                  {connectionOptions.map((item) => (
                    <button
                      key={item.value}
                      type='button'
                      className={cn(
                        'w-full px-3 py-2 text-left text-sm transition-colors',
                        connectorId === item.value
                          ? 'bg-primary-1 font-medium text-primary-9'
                          : 'text-gray-13 hover:bg-gray-2',
                      )}
                      onClick={() => {
                        onConnectorChange(item.value, item.label)
                        closeDropdown()
                      }}
                    >
                      {item.label}
                    </button>
                  ))}

                  {connectionOptions.length > 0 ? (
                    <div className='my-1 h-px bg-gray-3' />
                  ) : null}

                  <button
                    className='flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-primary-9 transition-colors hover:bg-primary-1'
                    type='button'
                    onClick={() => {
                      setIsCreatingConnection(true)
                      setNewConnectionName(
                        buildConnectionName(option.oauthProvider),
                      )
                    }}
                  >
                    <Icon className='size-4' name='lucide:plus' />
                    {t`Add connection`}
                  </button>
                </>
              ) : (
                <div className='space-y-3'>
                  <InputText
                    label={t`Connection name`}
                    placeholder={option.title}
                    value={newConnectionName}
                    onChange={setNewConnectionName}
                  />
                  <div className='flex items-center justify-end gap-2'>
                    <Button
                      color='gray'
                      label={t`Cancel`}
                      size='sm'
                      variant='outline'
                      onClick={() => {
                        setIsCreatingConnection(false)
                        setIsConnecting(false)
                        setNewConnectionName('')
                        setPendingConnectionName(null)
                      }}
                    />
                    <Button
                      icon='lucide:plug'
                      label={t`Connect`}
                      loading={isConnecting}
                      size='sm'
                      onClick={handleAuthorize}
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
      {error ? <p className='mt-2 text-13 text-red-11'>{error}</p> : null}
    </div>
  )
}
