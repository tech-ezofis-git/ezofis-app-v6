import type { Node } from '@xyflow/react'
import { useQuery } from '@tanstack/react-query'
import { useNodes, useReactFlow } from '@xyflow/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Option } from '@/types/option'
import { getConnectionQueryOptions } from '@/api/connectorQueries'
import formApi from '@/api/form/form'
import { getMasterFormsQueryOptions } from '@/api/form/queries'
import { requestApi } from '@/api/requests/requests'
import { suggestFieldMapping } from '@/api/v6/fieldMapping'
import Icon from '@/components/base/icon/Icon'
import InputCheckbox from '@/components/base/inputs/InputCheckbox'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import Tooltip from '@/components/base/Tooltip'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import cn from '@/utils/cn'
import useWorkflowStore from '../../../stores/useWorkflowStore'
import {
  areTypesCompatible,
  buildFieldMappingPayload,
  type DataSyncSettings,
  extractFormFields,
  type FieldMappingRow,
  type IntegrationField,
  mergeSuggestedMappings,
  resolveSuggestedMappings,
  type SyncTarget,
  toStoredDataSync,
  validateDataSync,
} from '../../../utils/dataIntegrationMapping'
import SettingsSection from './SettingsSection'

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

const toOptions = (fields: IntegrationField[]): Option[] =>
  fields.map((field) => ({ id: field.id, name: field.label }))

const EMPTY_ROW: FieldMappingRow = {
  IsMainField: false,
  masterFieldId: '',
  workflowFieldId: '',
}

/** Compact select with the full selected label on hover (narrow panel). */
const MappingSelect = ({
  error,
  options,
  placeholder,
  value,
  onChange,
}: {
  error?: boolean
  options: Option[]
  placeholder: string
  value: Option | null
  onChange: (value: Option | null) => void
}) => (
  <Tooltip
    className='w-full'
    content={value?.name || ''}
    disabled={!value}
    position='top'
  >
    <InputSelect
      className={cn('w-full min-w-0', error && '[&_input]:border-red-7')}
      options={options}
      placeholder={placeholder}
      rightSectionIcon='lucide:chevrons-up-down'
      value={value}
      searchable
      wrapOptions
      onChange={onChange}
    />
  </Tooltip>
)

/**
 * "Data Integration" for any workflow block: sync the request's data to a
 * Master Form (matched on a main field, with a workflow → master field
 * mapping), QuickBooks or SAP. Saved per block on `node.data.endSync`.
 */
export default function DataIntegrationSection({ node }: { node: Node }) {
  const { setNodes } = useReactFlow()
  const liveNodes = useNodes()
  const currentNode = liveNodes.find((n) => n.id === node.id) || node
  const [isOpen, setIsOpen] = useState(false)
  const sync: DataSyncSettings = (currentNode.data as any)?.endSync || {
    enabled: false,
  }
  const target: SyncTarget = sync.target || 'MASTER_FORM'
  const isMasterSync = sync.enabled && target === 'MASTER_FORM'
  const mappings = useMemo(() => sync.fieldMappings || [], [sync.fieldMappings])

  // Latest settings for async callbacks (auto-map resolves after edits).
  const syncRef = useRef(sync)
  syncRef.current = sync

  const update = useCallback(
    (patch: Partial<DataSyncSettings>) =>
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === node.id
            ? {
                ...n,
                data: {
                  ...n.data,
                  // Ids only in the saved JSON (labels come from the forms).
                  endSync: toStoredDataSync({
                    ...((n.data as any)?.endSync || { enabled: false }),
                    ...patch,
                  }),
                },
              }
            : n,
        ),
      ),
    [node.id, setNodes],
  )

  const { data: masterForms = [] } = useQuery({
    ...getMasterFormsQueryOptions(),
    enabled: sync.enabled,
  })
  const { data: qbRaw = [] } = useQuery({
    ...getConnectionQueryOptions('QUICKBOOKS'),
    enabled: sync.enabled && target === 'QUICKBOOKS',
  })
  const { data: sapRaw = [] } = useQuery({
    ...getConnectionQueryOptions('SAP'),
    enabled: sync.enabled && target === 'SAP',
  })
  const connectionOptions = useMemo(
    () =>
      target === 'QUICKBOOKS'
        ? toConnectionOptions(qbRaw, 'QuickBooks')
        : toConnectionOptions(sapRaw, 'SAP'),
    [qbRaw, sapRaw, target],
  )

  // Workflow form controls (left column) and master form controls (right).
  const workflowFormId = useWorkflowStore((state) => state.form)
  const workflowFieldsQuery = useQuery({
    enabled: isMasterSync && Boolean(workflowFormId),
    queryKey: ['data-integration-workflow-fields', workflowFormId],
    staleTime: 60_000,
    queryFn: async () =>
      extractFormFields((await requestApi.getForm(workflowFormId!))?.formJson),
  })
  const masterFieldsQuery = useQuery({
    enabled: isMasterSync && Boolean(sync.masterFormId),
    queryKey: ['data-integration-master-fields', sync.masterFormId],
    staleTime: 60_000,
    queryFn: async () => {
      const response = await formApi.getFormDataById(String(sync.masterFormId))
      if (response?.error) throw new Error(response.error)
      const data = response?.data || {}
      return extractFormFields(data.formJson || data._json)
    },
  })
  const workflowFields = useMemo(
    () => workflowFieldsQuery.data || [],
    [workflowFieldsQuery.data],
  )
  const masterFields = useMemo(
    () => masterFieldsQuery.data || [],
    [masterFieldsQuery.data],
  )
  const fieldsReady =
    workflowFieldsQuery.isSuccess && masterFieldsQuery.isSuccess

  // --- Auto map (POST /field-mapping) -----------------------------------
  const [isMapping, setIsMapping] = useState(false)
  const [mapMessage, setMapMessage] = useState<{
    text: string
    tone: 'error' | 'info'
  } | null>(null)
  const requestSeqRef = useRef(0)
  const autoMappedKeyRef = useRef('')

  const runAutoMap = useCallback(async () => {
    const current = syncRef.current
    const masterFormId = current.masterFormId
    if (!masterFormId) return
    if (!workflowFields.length) {
      setMapMessage({
        text: 'The workflow form has no fields to map.',
        tone: 'info',
      })
      return
    }
    const payload = buildFieldMappingPayload(workflowFields, masterFields)
    if (!payload.headerFields.length) {
      setMapMessage({
        text: 'The master form has no other fields to map.',
        tone: 'info',
      })
      return
    }
    const seq = ++requestSeqRef.current
    setIsMapping(true)
    setMapMessage(null)
    const { data, error } = await suggestFieldMapping(payload)
    // A newer request, or a different master form since: drop this result.
    if (seq !== requestSeqRef.current) return
    setIsMapping(false)
    if (syncRef.current.masterFormId !== masterFormId) return
    if (error || !data) {
      setMapMessage({
        text: `${error || 'No suggestions returned.'} Existing mappings were kept.`,
        tone: 'error',
      })
      return
    }
    const suggested = resolveSuggestedMappings(
      data,
      workflowFields,
      masterFields,
    )
    const { added, rows } = mergeSuggestedMappings(
      syncRef.current.fieldMappings || [],
      suggested,
    )
    if (added > 0) update({ fieldMappings: rows })
    setMapMessage({
      text:
        added > 0
          ? `Added ${added} suggested mapping${added === 1 ? '' : 's'}. Your existing rows were kept.`
          : 'No new matches found. Add rows to map the remaining fields.',
      tone: 'info',
    })
  }, [masterFields, update, workflowFields])

  // Auto map once per master form / field set while nothing is mapped yet,
  // never on every render or dropdown change.
  const autoMapKey = `${sync.masterFormId}|${workflowFields.map((f) => f.id).join(',')}|${masterFields.map((f) => f.id).join(',')}`
  useEffect(() => {
    if (!isMasterSync || !sync.masterFormId || !fieldsReady) return
    if (mappings.length > 0) return
    if (autoMappedKeyRef.current === autoMapKey) return
    autoMappedKeyRef.current = autoMapKey
    void runAutoMap()
  }, [
    autoMapKey,
    fieldsReady,
    isMasterSync,
    mappings.length,
    runAutoMap,
    sync.masterFormId,
  ])

  // --- Handlers ------------------------------------------------------------
  const handleTargetChange = (next: SyncTarget) =>
    // Switching target clears the previous target's selections.
    update({
      connectorId: '',
      fieldMappings: [],
      masterFormId: '',
      target: next,
    })

  const handleMasterFormChange = (value: Option | null) => {
    // Field ids belong to the old form: clear the mappings.
    requestSeqRef.current += 1
    setIsMapping(false)
    setMapMessage(null)
    update({
      connectorId: '',
      fieldMappings: [],
      masterFormId: value ? String(value.id) : '',
    })
  }

  const updateRow = (index: number, patch: Partial<FieldMappingRow>) =>
    update({
      fieldMappings: mappings.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    })

  const removeRow = (index: number) =>
    update({ fieldMappings: mappings.filter((_, i) => i !== index) })

  const addRow = () =>
    update({ fieldMappings: [...mappings, { ...EMPTY_ROW }] })

  // --- Derived view state --------------------------------------------------
  const workflowById = useMemo(
    () => new Map(workflowFields.map((field) => [field.id, field])),
    [workflowFields],
  )
  const masterById = useMemo(
    () => new Map(masterFields.map((field) => [field.id, field])),
    [masterFields],
  )
  const workflowOptions = useMemo(
    () => toOptions(workflowFields),
    [workflowFields],
  )
  const mappedCount = mappings.filter(
    (row) => row.workflowFieldId && row.masterFieldId,
  ).length
  const mainCount = mappings.filter((row) => row.IsMainField).length
  const errors = validateDataSync(sync, (id) => masterById.get(id)?.label)

  const selectedForm = masterForms.find(
    (form: any) => String(form.id) === String(sync.masterFormId),
  )
  const selectedConnection = connectionOptions.find(
    (option) => option.id === String(sync.connectorId),
  )

  return (
    <SettingsSection
      icon='lucide:database'
      isOpen={isOpen}
      title='Data Integration'
      variant='premium'
      onToggle={() => setIsOpen((open) => !open)}
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
                Send this step's data to SAP, QuickBooks or a Master Form
              </span>
            </div>
          </div>
          <InputSwitch
            checked={!!sync.enabled}
            onChange={(checked) =>
              update({ enabled: checked, target: sync.target || 'MASTER_FORM' })
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
                onChange={(val) =>
                  val && handleTargetChange(val.id as SyncTarget)
                }
              />
            </div>

            {target === 'MASTER_FORM' ? (
              <>
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
                    onChange={handleMasterFormChange}
                  />
                </div>

                {sync.masterFormId ? (
                  <div className='space-y-2 border-t border-gray-3 pt-3'>
                    <div className='flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5'>
                      <div className='flex items-center gap-1.5 whitespace-nowrap'>
                        <span className='text-13 font-semibold text-gray-12'>
                          Field Mapping
                        </span>
                        <span className='rounded-full bg-primary-2 px-1.5 py-0.5 text-[10px] leading-none font-semibold text-primary-11'>
                          {mappedCount} mapped
                        </span>
                      </div>
                      <button
                        className='inline-flex shrink-0 items-center gap-1 rounded-md border border-primary-5 bg-surface px-2 py-1 text-11 font-semibold whitespace-nowrap text-primary-11 transition-all hover:bg-primary-2 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50'
                        disabled={isMapping || !fieldsReady}
                        type='button'
                        onClick={() => void runAutoMap()}
                      >
                        {isMapping ? (
                          <Icon
                            className='size-3.5 animate-spin'
                            name='lucide:loader-2'
                          />
                        ) : (
                          <AiBrandIcon className='size-3.5' />
                        )}
                        {isMapping ? 'Mapping…' : 'Auto Map'}
                      </button>
                    </div>
                    <p className='text-11 leading-snug text-gray-9'>
                      Tick <span className='font-semibold'>Main field</span> on
                      the mapping(s) that identify the master record to update
                      {mainCount > 0 ? ` (${mainCount} selected)` : ''}.
                    </p>

                    {workflowFieldsQuery.isError ||
                    masterFieldsQuery.isError ? (
                      <p className='rounded-md bg-red-2 px-2.5 py-1.5 text-11 text-red-11'>
                        Could not load form fields. Close and reopen this panel
                        to retry.
                      </p>
                    ) : !workflowFormId ? (
                      <p className='rounded-md bg-orange-2 px-2.5 py-1.5 text-11 text-orange-11'>
                        Select the workflow form in Workflow Settings to map its
                        fields.
                      </p>
                    ) : null}

                    {mapMessage ? (
                      <p
                        className={cn(
                          'rounded-md px-2.5 py-1.5 text-11',
                          mapMessage.tone === 'error'
                            ? 'bg-red-2 text-red-11'
                            : 'bg-primary-1 text-primary-11',
                        )}
                      >
                        {mapMessage.text}
                      </p>
                    ) : null}

                    {mappings.length === 0 ? (
                      <div className='flex flex-col items-center gap-1 rounded-lg border border-dashed border-gray-5 px-3 py-4 text-center'>
                        <Icon
                          className='size-4 text-gray-8'
                          name='lucide:git-compare-arrows'
                        />
                        <p className='text-12 font-medium text-gray-11'>
                          {isMapping
                            ? 'Matching fields…'
                            : 'No field mappings yet'}
                        </p>
                        <p className='text-11 text-gray-9'>
                          Use Auto Map Fields or add a row.
                        </p>
                      </div>
                    ) : (
                      // One card per mapping: full-width selects stacked so
                      // field names stay readable in the narrow panel.
                      <div className='space-y-2'>
                        {mappings.map((row, index) => {
                          const workflowField = workflowById.get(
                            row.workflowFieldId,
                          )
                          const masterField = masterById.get(row.masterFieldId)
                          const takenByOthers = new Set(
                            mappings
                              .filter((_, i) => i !== index)
                              .map((other) => other.masterFieldId),
                          )
                          const masterOptions = toOptions(
                            masterFields.filter(
                              (field) =>
                                !takenByOthers.has(field.id) ||
                                field.id === row.masterFieldId,
                            ),
                          )
                          const workflowMissing =
                            workflowFieldsQuery.isSuccess &&
                            Boolean(row.workflowFieldId) &&
                            !workflowField
                          const masterMissing =
                            masterFieldsQuery.isSuccess &&
                            Boolean(row.masterFieldId) &&
                            !masterField
                          const isDuplicate =
                            Boolean(row.masterFieldId) &&
                            takenByOthers.has(row.masterFieldId)
                          const incompatible =
                            workflowField &&
                            masterField &&
                            !areTypesCompatible(
                              workflowField.dataType,
                              masterField.dataType,
                            )
                          return (
                            <div
                              key={`${index}-${row.workflowFieldId}-${row.masterFieldId}`}
                              className={cn(
                                'animate-in fade-in space-y-1.5 rounded-lg border p-2 transition-colors duration-150',
                                row.IsMainField
                                  ? 'border-primary-6 bg-primary-1'
                                  : 'border-gray-3 bg-gray-1 hover:border-gray-5',
                              )}
                            >
                              <div className='flex items-center justify-between gap-2'>
                                <span className='text-11 font-semibold text-gray-10'>
                                  Mapping {index + 1}
                                </span>
                                <div className='flex items-center gap-1'>
                                  {/* Several mappings can be main fields. */}
                                  <Tooltip
                                    content='Use this field to find the master record'
                                    position='top'
                                  >
                                    <InputCheckbox
                                      checked={Boolean(row.IsMainField)}
                                      label='Main field'
                                      labelClassName='pl-1.5 text-11 font-medium text-gray-11 whitespace-nowrap'
                                      onChange={(checked) =>
                                        updateRow(index, {
                                          IsMainField: checked,
                                        })
                                      }
                                    />
                                  </Tooltip>
                                  <Tooltip
                                    content='Remove mapping'
                                    position='top'
                                  >
                                    <button
                                      aria-label='Remove mapping'
                                      className='inline-flex size-6 items-center justify-center rounded-md text-gray-9 transition-all hover:bg-red-2 hover:text-red-10 active:scale-95'
                                      type='button'
                                      onClick={() => removeRow(index)}
                                    >
                                      <Icon
                                        className='size-3.5'
                                        name='lucide:trash-2'
                                      />
                                    </button>
                                  </Tooltip>
                                </div>
                              </div>
                              <div className='grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-x-2 gap-y-1.5'>
                                <span className='text-11 whitespace-nowrap text-gray-10'>
                                  Workflow
                                </span>
                                <MappingSelect
                                  options={workflowOptions}
                                  placeholder='Workflow form field'
                                  error={
                                    workflowMissing || !row.workflowFieldId
                                  }
                                  value={
                                    workflowField
                                      ? {
                                          id: workflowField.id,
                                          name: workflowField.label,
                                        }
                                      : null
                                  }
                                  onChange={(value) =>
                                    updateRow(index, {
                                      workflowFieldId: value
                                        ? String(value.id)
                                        : '',
                                    })
                                  }
                                />
                                <span className='text-11 whitespace-nowrap text-gray-10'>
                                  Master
                                </span>
                                <MappingSelect
                                  options={masterOptions}
                                  placeholder='Master form field'
                                  error={
                                    masterMissing ||
                                    isDuplicate ||
                                    !row.masterFieldId
                                  }
                                  value={
                                    masterField
                                      ? {
                                          id: masterField.id,
                                          name: masterField.label,
                                        }
                                      : null
                                  }
                                  onChange={(value) =>
                                    updateRow(index, {
                                      masterFieldId: value
                                        ? String(value.id)
                                        : '',
                                    })
                                  }
                                />
                              </div>
                              {workflowMissing || masterMissing ? (
                                <p className='text-[10px] text-red-11'>
                                  {workflowMissing
                                    ? 'The workflow field was removed from the form.'
                                    : 'The master field was removed from the form.'}
                                </p>
                              ) : isDuplicate ? (
                                <p className='text-[10px] text-red-11'>
                                  This master field is already mapped.
                                </p>
                              ) : incompatible ? (
                                <p className='text-[10px] text-orange-11'>
                                  Type mismatch: {workflowField.dataType} →{' '}
                                  {masterField.dataType}.
                                </p>
                              ) : null}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    <button
                      className='inline-flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-primary-5 py-1.5 text-11 font-semibold text-primary-11 transition-all hover:bg-primary-1 active:scale-[0.99]'
                      type='button'
                      onClick={addRow}
                    >
                      <Icon className='size-3.5' name='lucide:plus' />
                      Add Mapping Row
                    </button>
                  </div>
                ) : null}
              </>
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
                    })
                  }
                />
              </div>
            )}

            {errors.length > 0 ? (
              <ul className='space-y-0.5 rounded-md bg-orange-2 px-2.5 py-1.5 text-11 text-orange-11'>
                {errors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
      </div>
    </SettingsSection>
  )
}
