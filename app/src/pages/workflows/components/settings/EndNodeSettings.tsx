import type { Node } from '@xyflow/react'
import { useQuery } from '@tanstack/react-query'
import { useNodes, useReactFlow } from '@xyflow/react'
import { useMemo, useState } from 'react'
import { getConnectionQueryOptions } from '@/api/connectorQueries'
import { getMasterFormsQueryOptions } from '@/api/form/queries'
import Icon from '@/components/base/icon/Icon'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import ConnectionsRouting from './common/ConnectionsRouting'
import SettingsSection from './common/SettingsSection'

type SyncTarget = 'MASTER_FORM' | 'QUICKBOOKS' | 'SAP'

export interface EndSyncSettings {
  enabled: boolean
  connectorId?: string
  masterFormId?: string
  name?: string
  target?: SyncTarget
}

const targetOptions = [
  { iconKey: 'lucide:database', id: 'MASTER_FORM', name: 'Master Form' },
  { iconKey: 'brand:quickbooks', id: 'QUICKBOOKS', name: 'QuickBooks' },
  { iconKey: 'brand:sap', id: 'SAP', name: 'SAP System' },
]

const toConnectionOptions = (raw: any, fallback: string) =>
  Array.isArray(raw)
    ? raw.map((item: any) => ({
        id: String(item.id),
        name:
          item.name ||
          item.externalAccountEmail ||
          item.email ||
          `${fallback} (${item.id})`,
      }))
    : []

export default function EndNodeSettings({ node: initialNode }: { node: Node }) {
  const { setNodes } = useReactFlow()
  const [openIntegration, setOpenIntegration] = useState(false)
  const liveNodes = useNodes()
  const currentNode =
    liveNodes.find((n) => n.id === initialNode.id) || initialNode
  const sync: EndSyncSettings = (currentNode.data as any)?.endSync || {
    enabled: false,
  }
  const target: SyncTarget = sync.target || 'MASTER_FORM'

  const { data: masterForms = [] } = useQuery(getMasterFormsQueryOptions())
  const { data: qbRaw = [] } = useQuery(getConnectionQueryOptions('QUICKBOOKS'))
  const { data: sapRaw = [] } = useQuery(getConnectionQueryOptions('SAP'))

  const qbOptions = useMemo(
    () => toConnectionOptions(qbRaw, 'QuickBooks'),
    [qbRaw],
  )
  const sapOptions = useMemo(() => toConnectionOptions(sapRaw, 'SAP'), [sapRaw])

  const update = (patch: Partial<EndSyncSettings>) =>
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === currentNode.id
          ? {
              ...n,
              data: { ...n.data, endSync: { ...sync, ...patch } },
            }
          : n,
      ),
    )

  const handleTargetChange = (next: SyncTarget) =>
    // Switching target clears the previous target's id so only one is ever saved
    update({ connectorId: '', masterFormId: '', name: '', target: next })

  const selectedForm = masterForms.find(
    (m: any) => String(m.id) === String(sync.masterFormId),
  )
  const connectionOptions = target === 'QUICKBOOKS' ? qbOptions : sapOptions
  const selectedConnection = connectionOptions.find(
    (c) => c.id === String(sync.connectorId),
  )

  return (
    <div className='h-full space-y-3 overflow-y-auto px-4 pt-3 pb-4'>
      <SettingsSection
        icon='lucide:database'
        isOpen={openIntegration}
        title='Data Integration'
        variant='premium'
        onToggle={() => setOpenIntegration((open) => !open)}
      >
        <div className='space-y-3 rounded-xl bg-surface p-4 shadow-sm'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2.5'>
              <Icon
                className='h-4 w-4 stroke-[2] text-primary-9'
                name='lucide:refresh-cw'
              />
              <div className='flex flex-col space-y-1'>
                <span className='text-13 font-medium text-gray-12'>
                  Enable Data Sync
                </span>
                <span className='text-11 leading-tight text-gray-9'>
                  Send completed data to SAP, QuickBooks or a Master Form
                </span>
              </div>
            </div>
            <InputSwitch
              checked={!!sync.enabled}
              onChange={(checked) =>
                update({
                  enabled: checked,
                  target: sync.target || 'MASTER_FORM',
                })
              }
            />
          </div>

          {sync.enabled && (
            <div className='animate-in fade-in slide-in-from-top-1 space-y-3 pt-1 duration-200'>
              <div className='space-y-1.5'>
                <div className='text-11 font-medium text-gray-10'>
                  Sync Destination
                </div>
                <InputSelect
                  options={targetOptions}
                  placeholder='Select destination'
                  rightSectionIcon='lucide:chevrons-up-down'
                  searchable={true}
                  value={targetOptions.find((o) => o.id === target) ?? null}
                  onChange={(val) => val && handleTargetChange(val.id as any)}
                />
              </div>

              {target === 'MASTER_FORM' ? (
                <div className='space-y-1.5'>
                  <div className='text-11 font-medium text-gray-10'>
                    Master Form
                  </div>
                  <InputSelect
                    options={masterForms}
                    placeholder='Select Master Form'
                    rightSectionIcon='lucide:chevrons-up-down'
                    searchable={true}
                    value={selectedForm ?? null}
                    onChange={(val) =>
                      update({
                        connectorId: '',
                        masterFormId: val ? String(val.id) : '',
                        name: val?.name || '',
                      })
                    }
                  />
                </div>
              ) : (
                <div className='space-y-1.5'>
                  <div className='text-11 font-medium text-gray-10'>
                    Connection
                  </div>
                  <InputSelect
                    options={connectionOptions}
                    placeholder='Select a connection'
                    rightSectionIcon='lucide:chevrons-up-down'
                    searchable={true}
                    value={selectedConnection ?? null}
                    onChange={(val) =>
                      update({
                        connectorId: val ? String(val.id) : '',
                        masterFormId: '',
                        name: val?.name || '',
                      })
                    }
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </SettingsSection>

      <ConnectionsRouting node={currentNode} />
    </div>
  )
}
