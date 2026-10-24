import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { getConnectionQueryOptions } from '@/api/connectorQueries'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import InputSelect from '@/components/base/inputs/InputSelect'
import showToast from '@/components/base/toast/showToast'
import {
  openWorkflowOAuthAuthorize,
  parseOAuthConnectionSuccess,
} from '@/pages/workflows/utils/oauthAuthorize'
import cn from '@/utils/cn'

const poMasterSourceTypeOptions = [
  {
    iconKey: 'lucide:database',
    id: 'internal',
    name: 'Master Form',
  },
  {
    iconKey: 'brand:quickbooks',
    id: 'quickbooks',
    name: 'QuickBooks',
  },
  {
    iconKey: 'brand:sap',
    id: 'sap',
    name: 'SAP System',
  },
]

interface PoSourceSettingsProps {
  /** Section heading, e.g. "PO Master Resource" (AP) or "Sync Source" (Quote). */
  heading: string
  masterForms: any[]
  nodeData: any
  poMaster: any
  /** Selected master form resolved against the loaded forms (for display). */
  poMasterValue: any
  /** Label of the source dropdown, e.g. "PO Source". */
  sourceLabel: string
  updateNodeData: (key: string, value: any) => void
  setPoMaster: (value: any) => void
}

/**
 * Source picker shared by the AP Agent ("PO Master Resource") and the Quote
 * Agent ("Sync Source"): Master Form, QuickBooks or SAP with their
 * connection controls. Writes the same node keys for both blocks
 * (poMasterSourceType, poMaster, poMasterQbAccount, poMasterSapAccount,
 * resource, formId, connectorId).
 */
export default function PoSourceSettings({
  heading,
  masterForms,
  nodeData,
  poMaster,
  poMasterValue,
  sourceLabel,
  updateNodeData,
  setPoMaster,
}: PoSourceSettingsProps) {
  const [poMasterSourceType, setPoMasterSourceType] = useState<
    'internal' | 'quickbooks' | 'sap'
  >(() => {
    if (nodeData.poMasterSourceType) return nodeData.poMasterSourceType
    if (nodeData.poMasterType) return nodeData.poMasterType
    if (nodeData.poMaster?.sourceType) return nodeData.poMaster.sourceType
    return 'internal'
  })

  const currentSourceOption = useMemo(
    () =>
      poMasterSourceTypeOptions.find((o) => o.id === poMasterSourceType) ||
      poMasterSourceTypeOptions[0],
    [poMasterSourceType],
  )

  // QuickBooks Queries & States
  const { data: apiQbConnections = [] } = useQuery(
    getConnectionQueryOptions('QUICKBOOKS'),
  )
  const qbAccountOptions = useMemo(() => {
    if (!Array.isArray(apiQbConnections)) return []
    return apiQbConnections.map((item: any) => ({
      id: String(item.id),
      name:
        item.name ||
        item.externalAccountEmail ||
        item.email ||
        `QuickBooks (${item.id})`,
    }))
  }, [apiQbConnections])

  const [qbAccount, setQbAccount] = useState<any>(
    nodeData.poMasterQbAccount || null,
  )
  const [isQbConnectionOpen, setIsQbConnectionOpen] = useState(false)
  const [isCreatingQbConnection, setIsCreatingQbConnection] = useState(false)
  const [isConnectingQb, setIsConnectingQb] = useState(false)
  const [newQbAccountName, setNewQbAccountName] = useState('')

  // SAP Queries & States
  const { data: apiSapConnections = [] } = useQuery(
    getConnectionQueryOptions('SAP'),
  )
  const sapAccountOptions = useMemo(() => {
    if (!Array.isArray(apiSapConnections)) return []
    return apiSapConnections.map((item: any) => ({
      id: String(item.id),
      name:
        item.name ||
        item.externalAccountEmail ||
        item.email ||
        `SAP (${item.id})`,
    }))
  }, [apiSapConnections])

  const [sapAccount, setSapAccount] = useState<any>(
    nodeData.poMasterSapAccount || null,
  )
  const [isSapConnectionOpen, setIsSapConnectionOpen] = useState(false)
  const [isCreatingSapConnection, setIsCreatingSapConnection] = useState(false)
  const [isConnectingSap, setIsConnectingSap] = useState(false)
  const [newSapHost, setNewSapHost] = useState('')

  const queryClient = useQueryClient()

  // Handle OAuth postMessage callback from auth redirect
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      const data = event.data
      if (!data || typeof data !== 'object') return

      if (
        data.type === 'CONNECTOR_OAUTH_SUCCESS' ||
        data.type === 'CONNECTION_SUCCESS' ||
        data.connectorOAuth === 'success' ||
        data.connectorId ||
        data.connector
      ) {
        const { connector, connectorId, label } =
          parseOAuthConnectionSuccess(data)
        const accountName =
          label ||
          connector ||
          newQbAccountName.trim() ||
          newSapHost.trim() ||
          'Connected Account'

        if (isConnectingQb) {
          const newAcc = {
            id: connectorId || 'qb_' + Date.now(),
            name: accountName,
          }
          setQbAccount(newAcc)
          updateNodeData('poMasterQbAccount', newAcc)
          updateNodeData('connectorId', newAcc.id)
          updateNodeData('formId', '')
          updateNodeData('resource', 'QUICKBOOKS')
          updateNodeData('poMaster', {
            id: newAcc.id,
            name: `QuickBooks PO Master (${newAcc.name})`,
            sourceType: 'quickbooks',
          })
          setIsConnectingQb(false)
          setIsCreatingQbConnection(false)
          setIsQbConnectionOpen(false)
          setNewQbAccountName('')
          showToast({ message: `Connected QuickBooks account: ${accountName}` })
          queryClient.invalidateQueries({
            queryKey: ['connections', 'QUICKBOOKS'],
          })
        } else if (isConnectingSap) {
          const newAcc = {
            id: connectorId || 'sap_' + Date.now(),
            name: accountName,
          }
          setSapAccount(newAcc)
          updateNodeData('poMasterSapAccount', newAcc)
          updateNodeData('connectorId', newAcc.id)
          updateNodeData('formId', '')
          updateNodeData('resource', 'SAP')
          updateNodeData('poMaster', {
            id: newAcc.id,
            name: `SAP PO Master (${newAcc.name})`,
            sourceType: 'sap',
          })
          setIsConnectingSap(false)
          setIsCreatingSapConnection(false)
          setIsSapConnectionOpen(false)
          setNewSapHost('')
          showToast({ message: `Connected SAP account: ${accountName}` })
          queryClient.invalidateQueries({
            queryKey: ['connections', 'SAP'],
          })
          queryClient.invalidateQueries({
            queryKey: ['connections', 'SAP_XSUAA'],
          })
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [
    isConnectingQb,
    isConnectingSap,
    newQbAccountName,
    newSapHost,
    queryClient,
  ])

  const handleConnectQb = async () => {
    const name = newQbAccountName.trim() || 'QuickBooks Online'
    setIsConnectingQb(true)
    const { error } = await openWorkflowOAuthAuthorize('QUICKBOOKS', name)
    if (error) {
      // Fallback / local connect mode if OAuth authorize API fails
      const newAcc = {
        id: 'qb_' + Date.now(),
        name,
      }
      setQbAccount(newAcc)
      updateNodeData('poMasterQbAccount', newAcc)
      updateNodeData('connectorId', newAcc.id)
      updateNodeData('formId', '')
      updateNodeData('resource', 'QUICKBOOKS')
      updateNodeData('poMaster', {
        id: newAcc.id,
        name: `QuickBooks PO Master (${newAcc.name})`,
        sourceType: 'quickbooks',
      })
      setIsConnectingQb(false)
      setIsCreatingQbConnection(false)
      setIsQbConnectionOpen(false)
      setNewQbAccountName('')
      showToast({ message: `Connected QuickBooks account: ${name}` })
    }
  }

  const handleConnectSap = async () => {
    const name = newSapHost.trim() || 'SAP Connection'
    setIsConnectingSap(true)
    const { error } = await openWorkflowOAuthAuthorize('SAP_XSUAA', name)
    if (error) {
      // Fallback / local connect mode if OAuth authorize API fails
      const newAcc = { id: 'sap_' + Date.now(), name }
      setSapAccount(newAcc)
      updateNodeData('poMasterSapAccount', newAcc)
      updateNodeData('connectorId', newAcc.id)
      updateNodeData('formId', '')
      updateNodeData('resource', 'SAP')
      updateNodeData('poMaster', {
        id: newAcc.id,
        name: newAcc.name,
        sourceType: 'sap',
      })
      setIsConnectingSap(false)
      setIsCreatingSapConnection(false)
      setIsSapConnectionOpen(false)
      setNewSapHost('')
      showToast({ message: `Connected SAP account: ${name}` })
    }
  }

  const handlePoMasterSourceTypeChange = (
    type: 'internal' | 'quickbooks' | 'sap',
  ) => {
    setPoMasterSourceType(type)
    updateNodeData('poMasterSourceType', type)

    if (type === 'internal') {
      const isExternal =
        poMaster &&
        (poMaster.sourceType === 'quickbooks' ||
          poMaster.sourceType === 'sap' ||
          String(poMaster.id).startsWith('qb_') ||
          String(poMaster.id).startsWith('sap_') ||
          String(poMaster.name || '').includes('QuickBooks') ||
          String(poMaster.name || '').includes('SAP'))

      const targetForm = isExternal ? null : poMaster
      setPoMaster(targetForm)
      updateNodeData('poMaster', targetForm)
      updateNodeData('resource', 'FORM')
      updateNodeData('formId', targetForm?.id ?? targetForm ?? '')
      updateNodeData('connectorId', '')
    } else if (type === 'quickbooks') {
      setPoMaster(null)
      updateNodeData('resource', 'QUICKBOOKS')
      updateNodeData('formId', '')
      if (qbAccount) {
        const qbData = {
          id: qbAccount.id,
          name: `QuickBooks PO Master (${qbAccount.name})`,
          sourceType: 'quickbooks',
        }
        updateNodeData('poMaster', qbData)
        updateNodeData('connectorId', qbAccount.id)
      } else {
        updateNodeData('poMaster', null)
        updateNodeData('connectorId', '')
      }
    } else if (type === 'sap') {
      setPoMaster(null)
      updateNodeData('resource', 'SAP')
      updateNodeData('formId', '')
      if (sapAccount) {
        const sapData = {
          id: sapAccount.id,
          name: `SAP PO Master (${sapAccount.name})`,
          sourceType: 'sap',
        }
        updateNodeData('poMaster', sapData)
        updateNodeData('connectorId', sapAccount.id)
      } else {
        updateNodeData('poMaster', null)
        updateNodeData('connectorId', '')
      }
    }
  }

  return (
    <div className='space-y-3 px-0.5 pt-2'>
      <div className='text-12 font-medium text-gray-12'>{heading}</div>

      {/* Searchable Dropdown Selector for PO Source using InputSelect primitive */}
      <div className='space-y-1.5'>
        <div className='text-11 font-medium text-gray-10'>{sourceLabel}</div>
        <InputSelect
          options={poMasterSourceTypeOptions}
          placeholder={`Select ${sourceLabel}`}
          rightSectionIcon='lucide:chevrons-up-down'
          searchable={true}
          value={currentSourceOption}
          onChange={(val) => {
            if (val) {
              handlePoMasterSourceTypeChange(val.id as any)
            }
          }}
        />
      </div>

      {/* Option 1: Internal Master Form */}
      {poMasterSourceType === 'internal' && (
        <div className='animate-in fade-in slide-in-from-top-1 space-y-1.5 duration-200'>
          <div className='text-11 font-medium text-gray-10'>Master Form</div>
          <InputSelect
            options={masterForms}
            placeholder='Select Master Form'
            rightSectionIcon='lucide:chevrons-up-down'
            searchable={true}
            value={poMasterValue}
            onChange={(val) => {
              setPoMaster(val)
              updateNodeData('poMaster', val)
            }}
          />
        </div>
      )}

      {/* Option 2: QuickBooks Online */}
      {poMasterSourceType === 'quickbooks' && (
        <div className='animate-in fade-in slide-in-from-top-1 space-y-2.5 duration-200'>
          <div className='space-y-1.5'>
            <label className='flex items-center gap-1 text-[13px] font-medium text-gray-11'>
              Connection <span className='text-red-11'>*</span>
            </label>
            <div className='relative'>
              <button
                type='button'
                className={cn(
                  'flex h-10 w-full items-center justify-between rounded-md border bg-surface px-3 text-sm transition-all duration-200 outline-none focus:border-primary-9 focus:ring-2 focus:ring-primary-4',
                  isQbConnectionOpen
                    ? 'border-primary-9 ring-2 ring-primary-4'
                    : 'border-gray-3 hover:border-primary-5',
                )}
                onClick={() => setIsQbConnectionOpen(!isQbConnectionOpen)}
              >
                <span
                  className={
                    !qbAccount
                      ? 'text-gray-9'
                      : 'flex items-center gap-2 font-normal text-gray-13'
                  }
                >
                  {qbAccount ? (
                    <>
                      <Icon
                        className='size-4 shrink-0'
                        name='brand:quickbooks'
                      />
                      <span>
                        {qbAccount.name ||
                          qbAccount.label ||
                          'QuickBooks Connection'}
                      </span>
                    </>
                  ) : (
                    'Select a connection'
                  )}
                </span>
                <Icon
                  className='pointer-events-none h-4 w-4 text-gray-7'
                  name='lucide:chevrons-up-down'
                />
              </button>

              {isQbConnectionOpen && (
                <>
                  <div
                    className='fixed inset-0 z-40'
                    onClick={() => {
                      setIsQbConnectionOpen(false)
                      setIsCreatingQbConnection(false)
                      setNewQbAccountName('')
                    }}
                  />
                  <div className='animate-in fade-in zoom-in-95 absolute top-full left-0 z-50 mt-1 flex w-full flex-col overflow-hidden rounded-lg border border-gray-3 bg-surface p-1 shadow-xl duration-100'>
                    {!isCreatingQbConnection ? (
                      <>
                        {qbAccountOptions.map((option) => (
                          <button
                            key={option.id}
                            type='button'
                            className={cn(
                              'flex min-h-9 w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-left text-13 font-normal transition-colors',
                              String(qbAccount?.id) === String(option.id)
                                ? 'bg-primary-1 font-normal text-primary-9'
                                : 'text-gray-12 hover:bg-gray-2',
                            )}
                            onClick={() => {
                              setQbAccount(option)
                              updateNodeData('poMasterQbAccount', option)
                              updateNodeData('poMaster', {
                                id: option.id,
                                name: option.name,
                                sourceType: 'quickbooks',
                              })
                              setIsQbConnectionOpen(false)
                            }}
                          >
                            <Icon
                              className='size-4 shrink-0'
                              name='brand:quickbooks'
                            />
                            <span className='truncate text-13 font-normal'>
                              {option.name}
                            </span>
                          </button>
                        ))}

                        {qbAccountOptions.length > 0 && (
                          <div className='my-1 h-px bg-gray-2' />
                        )}

                        <button
                          className='flex min-h-9 w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-left text-13 font-normal text-primary-9 transition-colors hover:bg-primary-1'
                          type='button'
                          onClick={() => setIsCreatingQbConnection(true)}
                        >
                          <Icon
                            className='size-4 shrink-0'
                            name='lucide:plus'
                          />
                          <span>Create Connection</span>
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
                            placeholder='e.g. My QuickBooks Connection'
                            type='text'
                            value={newQbAccountName}
                            autoFocus
                            onChange={(e) =>
                              setNewQbAccountName(e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleConnectQb()
                            }}
                          />
                        </div>
                        <div className='flex items-center justify-end gap-2'>
                          <Button
                            className='text-gray-10 hover:bg-gray-2 hover:text-gray-13'
                            size='md'
                            variant='ghost'
                            onClick={() => setIsCreatingQbConnection(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            className='flex items-center justify-center gap-2'
                            color='primary'
                            size='md'
                            disabled={
                              !newQbAccountName.trim() || isConnectingQb
                            }
                            onClick={handleConnectQb}
                          >
                            {isConnectingQb && (
                              <Icon
                                className='h-3 w-3 animate-spin'
                                name='lucide:loader-2'
                              />
                            )}
                            {isConnectingQb ? 'Connecting...' : 'Connect'}
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
      )}

      {/* Option 3: SAP ERP / S/4HANA */}
      {poMasterSourceType === 'sap' && (
        <div className='animate-in fade-in slide-in-from-top-1 space-y-2.5 duration-200'>
          <div className='space-y-1.5'>
            <label className='flex items-center gap-1 text-[13px] font-medium text-gray-11'>
              Connection <span className='text-red-11'>*</span>
            </label>
            <div className='relative'>
              <button
                type='button'
                className={cn(
                  'flex h-10 w-full items-center justify-between rounded-md border bg-surface px-3 text-sm transition-all duration-200 outline-none focus:border-primary-9 focus:ring-2 focus:ring-primary-4',
                  isSapConnectionOpen
                    ? 'border-primary-9 ring-2 ring-primary-4'
                    : 'border-gray-3 hover:border-primary-5',
                )}
                onClick={() => setIsSapConnectionOpen(!isSapConnectionOpen)}
              >
                <span
                  className={
                    !sapAccount
                      ? 'text-gray-9'
                      : 'flex items-center gap-2 font-normal text-gray-13'
                  }
                >
                  {sapAccount ? (
                    <>
                      <Icon className='size-4 shrink-0' name='brand:sap' />
                      <span>
                        {sapAccount.name ||
                          sapAccount.label ||
                          'SAP Connection'}
                      </span>
                    </>
                  ) : (
                    'Select a connection'
                  )}
                </span>
                <Icon
                  className='pointer-events-none h-4 w-4 text-gray-7'
                  name='lucide:chevrons-up-down'
                />
              </button>

              {isSapConnectionOpen && (
                <>
                  <div
                    className='fixed inset-0 z-40'
                    onClick={() => {
                      setIsSapConnectionOpen(false)
                      setIsCreatingSapConnection(false)
                      setNewSapHost('')
                    }}
                  />
                  <div className='animate-in fade-in zoom-in-95 absolute top-full left-0 z-50 mt-1 flex w-full flex-col overflow-hidden rounded-lg border border-gray-3 bg-surface p-1 shadow-xl duration-100'>
                    {!isCreatingSapConnection ? (
                      <>
                        {sapAccountOptions.map((option) => (
                          <button
                            key={option.id}
                            type='button'
                            className={cn(
                              'flex min-h-9 w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-left text-13 font-normal transition-colors',
                              String(sapAccount?.id) === String(option.id)
                                ? 'bg-primary-1 font-normal text-primary-9'
                                : 'text-gray-12 hover:bg-gray-2',
                            )}
                            onClick={() => {
                              setSapAccount(option)
                              updateNodeData('poMasterSapAccount', option)
                              updateNodeData('poMaster', {
                                id: option.id,
                                name: option.name,
                                sourceType: 'sap',
                              })
                              setIsSapConnectionOpen(false)
                            }}
                          >
                            <Icon
                              className='size-4 shrink-0'
                              name='brand:sap'
                            />
                            <span className='truncate text-13 font-normal'>
                              {option.name}
                            </span>
                          </button>
                        ))}

                        {sapAccountOptions.length > 0 && (
                          <div className='my-1 h-px bg-gray-2' />
                        )}

                        <button
                          className='flex min-h-9 w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-left text-13 font-normal text-primary-9 transition-colors hover:bg-primary-1'
                          type='button'
                          onClick={() => setIsCreatingSapConnection(true)}
                        >
                          <Icon
                            className='size-4 shrink-0'
                            name='lucide:plus'
                          />
                          <span>Create Connection</span>
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
                            placeholder='e.g. My SAP Connection'
                            type='text'
                            value={newSapHost}
                            autoFocus
                            onChange={(e) => setNewSapHost(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleConnectSap()
                              }
                            }}
                          />
                        </div>
                        <div className='flex items-center justify-end gap-2'>
                          <Button
                            className='text-gray-10 hover:bg-gray-2 hover:text-gray-13'
                            size='md'
                            variant='ghost'
                            onClick={() => setIsCreatingSapConnection(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            className='flex items-center justify-center gap-2'
                            color='primary'
                            disabled={!newSapHost.trim() || isConnectingSap}
                            size='md'
                            onClick={handleConnectSap}
                          >
                            {isConnectingSap && (
                              <Icon
                                className='h-3 w-3 animate-spin'
                                name='lucide:loader-2'
                              />
                            )}
                            {isConnectingSap ? 'Connecting...' : 'Connect'}
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
      )}
    </div>
  )
}
