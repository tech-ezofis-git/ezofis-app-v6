import type { Node } from '@xyflow/react'
import { useQuery } from '@tanstack/react-query'
import { useNodes, useReactFlow } from '@xyflow/react'
import { useEffect, useState } from 'react'
import { getWorkflowFormsQueryOptions } from '@/api/form/queries'
import { requestApi } from '@/api/requests/requests'
import Icon from '@/components/base/icon/Icon'
import InputLabel from '@/components/base/inputs/InputLabel'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import Input from '@/components/base/inputs/InputText'
import cn from '@/utils/cn'
import useWorkflowStore from '../../stores/useWorkflowStore'
import { generateId } from '../../utils/generateId'
import ConnectionsRouting from './common/ConnectionsRouting'
import SettingsSection from './common/SettingsSection'

interface ConditionRow {
  field: string
  id: string
  logic: string
  value: string
  isAction?: boolean
}

export default function ConditionSettingsPanel({
  node: initialNode,
}: {
  node?: Node
}) {
  const { setNodes } = useReactFlow()
  const liveNodes = useNodes()

  const currentNode = initialNode
    ? liveNodes.find((n: Node) => n.id === initialNode.id) || initialNode
    : null
  const nodeData = (currentNode?.data?.settings ||
    currentNode?.data ||
    {}) as any

  const safeParse = (data: any) => {
    if (!data) return null
    if (typeof data === 'string') {
      try {
        return JSON.parse(data)
      } catch (e) {
        return null
      }
    }
    return data
  }

  const [mode, setMode] = useState<'standard' | 'advanced'>(
    nodeData.standardCondition === false ? 'advanced' : 'standard',
  )

  const initialConditions = safeParse(nodeData.conditions)
  const initialMasterConditions = safeParse(nodeData.masterConditions)

  const [logicCombine, setLogicCombine] = useState<'ALL' | 'ANY'>(
    initialConditions?.groupLogic === 'ANY' ? 'ANY' : 'ALL',
  )
  const [conditions, setConditions] = useState<ConditionRow[]>(() => {
    const raw = initialConditions?.condition
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((c: any) => ({
        field: c.name || '',
        id: c.id || generateId(),
        isAction: !!c.fieldValue,
        logic: c.logic || 'IS_EQUALS_TO',
        value: c.value || '',
      }))
    }
    return [{ field: '', id: generateId(), logic: 'IS_EQUALS_TO', value: '' }]
  })
  const [masterFormId, setMasterFormId] = useState(
    initialMasterConditions?.masterFormId || '',
  )
  const [masterMappings, setMasterMappings] = useState<
    { field: string; id: string; masterColumn: string }[]
  >(() => {
    const raw = initialMasterConditions?.condition
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((m: any) => ({
        field: m.field || '',
        id: m.id || generateId(),
        masterColumn: m.masterColumn || '',
      }))
    }
    return [{ field: '', id: generateId(), masterColumn: '' }]
  })

  const { data: workflowForms = [] } = useQuery(getWorkflowFormsQueryOptions())

  const [openBasic, setOpenBasic] = useState(true)

  const updateNodeData = (key: string, value: any) => {
    setNodes((nds: any[]) =>
      nds.map((n: any) => {
        if (n.id === currentNode?.id) {
          const newData = { ...n.data }
          if (newData.settings) {
            newData.settings = { ...newData.settings, [key]: value }
          } else {
            newData[key] = value
          }
          return {
            ...n,
            data: newData,
          }
        }
        return n
      }),
    )
  }

  // Keep state in sync with external changes (e.g. undo/redo)
  useEffect(() => {
    const targetMode =
      nodeData.standardCondition === false ? 'advanced' : 'standard'
    if (targetMode !== mode) setMode(targetMode)

    const currentConditions = safeParse(nodeData.conditions)
    const currentMasterConditions = safeParse(nodeData.masterConditions)

    const targetLogic = currentConditions?.groupLogic === 'ANY' ? 'ANY' : 'ALL'
    if (targetLogic !== logicCombine) setLogicCombine(targetLogic)

    const rawConditions = currentConditions?.condition
    if (Array.isArray(rawConditions)) {
      setConditions(
        rawConditions.map((c: any) => ({
          field: c.name || '',
          id: c.id || generateId(),
          isAction: !!c.fieldValue,
          logic: c.logic || 'IS_EQUALS_TO',
          value: c.value || '',
        })),
      )
    }

    if (currentMasterConditions?.masterFormId !== masterFormId) {
      setMasterFormId(currentMasterConditions?.masterFormId || '')
    }

    const rawMappings = currentMasterConditions?.condition
    if (Array.isArray(rawMappings)) {
      setMasterMappings(
        rawMappings.map((m: any) => ({
          field: m.field || '',
          id: m.id || generateId(),
          masterColumn: m.masterColumn || '',
        })),
      )
    }
  }, [nodeData])

  const addCondition = () => {
    const newConditions = [
      ...conditions,
      { field: '', id: generateId(), logic: 'EQUALS', value: '' },
    ]
    setConditions(newConditions)
    updateNodeData('conditions', {
      condition: newConditions.map((c) => ({
        fieldValue: !!c.isAction,
        id: c.id,
        logic: c.logic,
        name: c.field,
        value: c.value,
      })),
      groupLogic: logicCombine.toUpperCase(),
    })
  }

  const removeCondition = (id: string) => {
    const newConditions = conditions.filter((c: any) => c.id !== id)
    setConditions(newConditions)
    updateNodeData('conditions', {
      condition: newConditions.map((c) => ({
        fieldValue: !!c.isAction,
        id: c.id,
        logic: c.logic,
        name: c.field,
        value: c.value,
      })),
      groupLogic: logicCombine.toUpperCase(),
    })
  }

  const updateConditionRow = (
    id: string,
    key: keyof ConditionRow,
    val: any,
  ) => {
    const newConditions = conditions.map((c: any) =>
      c.id === id ? { ...c, [key]: val } : c,
    )
    setConditions(newConditions)
    updateNodeData('conditions', {
      condition: newConditions.map((c) => ({
        fieldValue: !!c.isAction,
        id: c.id,
        logic: c.logic,
        name: c.field,
        value: c.value,
      })),
      groupLogic: logicCombine.toUpperCase(),
    })
  }

  const addMapping = () => {
    const newMappings = [
      ...masterMappings,
      { field: '', id: generateId(), masterColumn: '' },
    ]
    setMasterMappings(newMappings)
    updateNodeData('masterConditions', {
      condition: newMappings,
      masterFormId: masterFormId,
    })
  }

  const removeMapping = (id: string) => {
    const newMappings = masterMappings.filter((m: any) => m.id !== id)
    setMasterMappings(newMappings)
    updateNodeData('masterConditions', {
      condition: newMappings,
      masterFormId: masterFormId,
    })
  }

  const updateMappingRow = (
    id: string,
    key: 'field' | 'masterColumn',
    val: any,
  ) => {
    const newMappings = masterMappings.map((m: any) =>
      m.id === id ? { ...m, [key]: val } : m,
    )
    setMasterMappings(newMappings)
    updateNodeData('masterConditions', {
      condition: newMappings,
      masterFormId: masterFormId,
    })
  }

  const formId = useWorkflowStore((state) => state.form)
  const [fieldOptions, setFieldOptions] = useState<any[]>([])

  useEffect(() => {
    if (!formId) return

    const getFormFields = async () => {
      try {
        const response = await requestApi.getForm(formId)
        if (response && response.formJson) {
          const form =
            typeof response.formJson === 'string'
              ? JSON.parse(response.formJson)
              : response.formJson
          const allOptions: any[] = []
          const panels = [
            ...(form.panels || []),
            ...(form.secondaryPanels || []),
          ]

          panels.forEach((panel: any) => {
            if (panel.fields && panel.fields.length) {
              panel.fields.forEach((field: any) => {
                if (field.type !== 'DIVIDER') {
                  const fieldIdentifier = String(field.name || field.id)
                  if (field.type === 'TABLE') {
                    allOptions.push({
                      id: fieldIdentifier,
                      name: field.label ? `${field.label} (TABLE)` : field.type,
                    })

                    if (field.settings?.specific?.tableColumns) {
                      field.settings.specific.tableColumns.forEach(
                        (column: any) => {
                          allOptions.push({
                            id: String(column.name || column.id),
                            name: column.label
                              ? `${column.label} (TABLE - COLUMN)`
                              : column.type,
                          })
                        },
                      )
                    }
                  } else {
                    allOptions.push({
                      id: fieldIdentifier,
                      name: field.label
                        ? `${field.label} (Control)`
                        : field.type,
                    })
                  }
                }
              })
            }
          })
          if (allOptions.length > 0) {
            setFieldOptions(allOptions)
          }
        }
      } catch (e) {
        console.error('Error loading form fields for condition:', e)
      }
    }

    getFormFields()
  }, [formId])

  const logicOptions = [
    { id: 'IS_EQUALS_TO', name: 'Is Equals To (==)' },
    { id: 'IS_NOT_EQUALS_TO', name: 'Is Not Equals To (!=)' },
    { id: 'IS_GREATER_THAN', name: 'Greater Than (>)' },
    { id: 'IS_GREATER_THAN_OR_EQUALS_TO', name: 'Greater or Equals (>=)' },
    { id: 'IS_LESSER_THAN', name: 'Lesser Than (<)' },
    { id: 'IS_LESSER_THAN_OR_EQUALS_TO', name: 'Lesser or Equals (<=)' },
    { id: 'IS_EMPTY', name: 'Is Empty' },
    { id: 'IS_NOT_EMPTY', name: 'Is Not Empty' },
    { id: 'IS_ANY_OF', name: 'Is Any Of' },
    { id: 'IS_NOT_ANY_OF', name: 'Is Not Any Of' },
    { id: 'CONTAINS', name: 'Contains' },
    { id: 'NOT_CONTAINS', name: 'Not Contains' },
    { id: 'STARTS_WITH', name: 'Starts With' },
    { id: 'NOT_STARTS_WITH', name: 'Not Starts With' },
    { id: 'ENDS_WITH', name: 'Ends With' },
    { id: 'NOT_ENDS_WITH', name: 'Not Ends With' },
    { id: 'DATE_RANGE', name: 'Date Range' },
  ]

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
          <div className='space-y-4 py-2'>
            {/* Mode Switcher */}
            <div className='flex flex-col gap-2'>
              <InputLabel label='Condition Type' />
              <div className='flex gap-2 rounded-lg border border-gray-3 bg-gray-1 p-1'>
                <button
                  className={cn(
                    'flex-1 rounded-md py-1.5 text-12 font-semibold transition-all',
                    mode === 'standard'
                      ? 'ring-gray-200 bg-white text-primary-9 shadow-sm ring-1'
                      : 'hover:bg-gray-100 text-gray-9',
                  )}
                  onClick={() => {
                    setMode('standard')
                    updateNodeData('standardCondition', true)
                  }}
                >
                  Standard
                </button>
                <button
                  className={cn(
                    'flex-1 rounded-md py-1.5 text-12 font-semibold transition-all',
                    mode === 'advanced'
                      ? 'ring-gray-200 bg-white text-primary-9 shadow-sm ring-1'
                      : 'hover:bg-gray-100 text-gray-9',
                  )}
                  onClick={() => {
                    setMode('advanced')
                    updateNodeData('standardCondition', false)
                  }}
                >
                  Advanced
                </button>
              </div>
            </div>

            {mode === 'standard' ? (
              <div className='animate-in fade-in slide-in-from-top-2 duration-300'>
                {/* Combination Logic Section */}
                <div className='mb-2 flex items-center gap-3 px-1'>
                  <span className='text-13 text-gray-11'>If</span>
                  <div className='w-24'>
                    <InputSelect
                      options={[
                        { id: 'ALL', name: 'All' },
                        { id: 'ANY', name: 'Any' },
                      ]}
                      value={{
                        id: logicCombine,
                        name: logicCombine === 'ALL' ? 'All' : 'Any',
                      }}
                      onChange={(val: any) => {
                        setLogicCombine(val.id)
                        updateNodeData('logicCombine', val.id)
                        updateNodeData('conditions', {
                          ...nodeData.conditions,
                          groupLogic: val.id.toUpperCase(),
                        })
                      }}
                    />
                  </div>
                  <span className='text-13 text-gray-11'>
                    of the following conditions are met
                  </span>
                </div>

                <div className='animate-in fade-in slide-in-from-top-2 mt-4 flex flex-col gap-2 duration-400'>
                  <InputLabel label='Condition Rules' />

                  <div className='space-y-4 py-0.5'>
                    <div className='space-y-4'>
                      {conditions.map((row, index) => (
                        <div key={row.id}>
                          {/* Logic Divider */}
                          {index > 0 && (
                            <div className='relative my-4 flex items-center justify-center'>
                              <div className='bg-slate-100 absolute h-px w-full' />
                              <span className='bg-slate-50 text-slate-400 relative rounded-full px-3 py-1 text-[10px] font-bold uppercase shadow-sm'>
                                {logicCombine === 'ALL' ? 'AND' : 'OR'}
                              </span>
                            </div>
                          )}

                          {/* Individual Rule Card */}
                          <div className='group hover:border-slate-100/60 relative flex items-center justify-between gap-4 rounded-xl border border-transparent bg-white p-4 shadow-sm transition-all hover:shadow-md'>
                            <div className='flex flex-1 flex-col gap-3'>
                              {/* Field Selection */}
                              <InputSelect
                                options={fieldOptions}
                                placeholder='Select Field'
                                value={
                                  fieldOptions.find(
                                    (o: any) =>
                                      String(o.id) === String(row.field),
                                  ) || null
                                }
                                onChange={(val: any) =>
                                  updateConditionRow(row.id, 'field', val.id)
                                }
                              />

                              {/* Operator Selection */}
                              <InputSelect
                                options={logicOptions}
                                placeholder='Select Operator'
                                value={
                                  logicOptions.find(
                                    (o: any) => o.id === row.logic,
                                  ) || null
                                }
                                onChange={(val: any) =>
                                  updateConditionRow(row.id, 'logic', val.id)
                                }
                              />

                              {/* Value Input */}
                              <Input
                                placeholder='Value'
                                rightSectionPointerEvents='auto'
                                rightSectionWidth={60}
                                value={row.value || ''}
                                classNames={{
                                  input: 'h-10 bg-white px-3 text-13',
                                }}
                                rightSection={
                                  <div className='border-slate-100 flex h-full items-center border-l px-2.5'>
                                    <InputSwitch
                                      checked={!!row.isAction}
                                      onChange={(v: boolean) =>
                                        updateConditionRow(
                                          row.id,
                                          'isAction',
                                          v,
                                        )
                                      }
                                    />
                                  </div>
                                }
                                onChange={(val: string) =>
                                  updateConditionRow(row.id, 'value', val)
                                }
                              />
                            </div>

                            {/* Removal Action */}
                            <button
                              className='text-slate-300 hover:text-red-500 hover:bg-red-50 shrink-0 rounded-lg p-2 transition-colors'
                              title='Remove Condition'
                              onClick={() => removeCondition(row.id)}
                            >
                              <Icon
                                className='h-4.5 w-4.5'
                                name='lucide:trash-2'
                              />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className='pt-1'>
                      <button
                        className='border-gray-300 text-slate-500 hover:bg-blue-50 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-2.5 text-13 font-medium transition-all duration-300 hover:border-[#1677ff] hover:text-[#1677ff] active:scale-[0.99]'
                        onClick={addCondition}
                      >
                        <Icon className='h-4 w-4' name='lucide:plus' />
                        <span>Add Condition</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className='animate-in fade-in slide-in-from-top-2 space-y-6 duration-300'>
                {/* Master Form Selection */}
                <div className='flex flex-col gap-2'>
                  <InputLabel label='Master Form' required />
                  <InputSelect
                    placeholder='Select Master Form'
                    options={workflowForms.map((f: any) => ({
                      id: f.id,
                      name: f.name,
                    }))}
                    value={
                      workflowForms.find(
                        (f: any) => String(f.id) === String(masterFormId),
                      ) || null
                    }
                    onChange={(val: any) => {
                      setMasterFormId(val.id)
                      updateNodeData('masterFormId', val.id)
                    }}
                  />
                </div>

                {/* Mappings Table */}
                <div className='mt-8 flex flex-col gap-2'>
                  <div className='flex items-center justify-between px-0.5'>
                    <InputLabel label='Master Mappings' />
                    <button
                      className='hover:bg-primary-50 rounded p-1 text-primary-9 transition-colors'
                      title='Add Mapping'
                      onClick={addMapping}
                    >
                      <Icon className='h-5 w-5' name='lucide:plus' />
                    </button>
                  </div>

                  <div className='space-y-4 py-0.5'>
                    <div className='grid grid-cols-2 gap-4 px-1 pr-10'>
                      <span className='text-11 font-medium text-gray-9'>
                        Field
                      </span>
                      <span className='text-11 font-medium text-gray-9'>
                        Master Column
                      </span>
                    </div>

                    <div className='space-y-2'>
                      {masterMappings.map((row) => (
                        <div className='flex items-center gap-2' key={row.id}>
                          <div className='grid flex-1 grid-cols-2 gap-2'>
                            <InputSelect
                              options={fieldOptions}
                              placeholder='Select'
                              value={
                                fieldOptions.find(
                                  (o: any) =>
                                    String(o.id) === String(row.field),
                                ) || null
                              }
                              onChange={(val: any) =>
                                updateMappingRow(row.id, 'field', val.id)
                              }
                            />
                            <InputSelect
                              placeholder='Select'
                              options={[
                                { id: 'col1', name: 'Column 1' },
                                { id: 'col2', name: 'Column 2' },
                                { id: 'col3', name: 'Column 3' },
                              ]}
                              value={
                                [
                                  { id: 'col1', name: 'Column 1' },
                                  { id: 'col2', name: 'Column 2' },
                                  { id: 'col3', name: 'Column 3' },
                                ].find((o: any) => o.id === row.masterColumn) ||
                                null
                              }
                              onChange={(val: any) =>
                                updateMappingRow(row.id, 'masterColumn', val.id)
                              }
                            />
                          </div>
                          <button
                            className='text-gray-400 hover:text-red-500 p-1.5 transition-colors'
                            title='Remove Mapping'
                            onClick={() => removeMapping(row.id)}
                          >
                            <Icon className='h-4.5 w-4.5' name='lucide:x' />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </SettingsSection>

        <ConnectionsRouting node={currentNode as any} />
      </div>
    </div>
  )
}
