import { useQuery } from '@tanstack/react-query'
import type { Node } from '@xyflow/react'
import { useMemo, useState } from 'react'
import type { Option } from '@/types/option'
import { getRepositoriesQueryOptions } from '@/api/folders/queries'
import { getWorkflowFormsQueryOptions } from '@/api/form/queries'
import { requestApi } from '@/api/requests/requests'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import InputNumber from '@/components/base/inputs/InputNumber'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import Input from '@/components/base/inputs/InputText'
import { folderApi } from '@/pages/folders/api/folderApi'
import { normalizeFieldKey } from '@/pages/folders/utils/repositoryFieldUtils'
import type { PrefixSegment } from '../stores/useWorkflowStore'
import useWorkflowStore from '../stores/useWorkflowStore'
import { generateId } from '../utils/generateId'
import {
  CURRENT_DATE_OPTIONS,
  getFormatPreview,
  getResetCycle,
  getSeparator,
  MONTH_OPTIONS,
  RESET_CYCLE_OPTIONS,
  SEPARATOR_OPTIONS,
  TOKEN_TYPE_OPTIONS,
  YEAR_OPTIONS,
} from '../utils/prefixFormat'
import KanbanViewSettingsSection from './settings/KanbanViewSettingsSection'
import SettingsSection from './settings/common/SettingsSection'

type PreviewField = {
  key: string
  label: string
  source: 'form' | 'repository'
}

type WorkflowSettingsProps = {
  nodes?: Node[]
}

const WorkflowSettings = ({ nodes = [] }: WorkflowSettingsProps) => {
  const [openGeneral, setOpenGeneral] = useState(true)
  const [openConfiguration, setOpenConfiguration] = useState(false)
  const [openRequestNumber, setOpenRequestNumber] = useState(false)
  const [openKanban, setOpenKanban] = useState(false)

  const {
    closeSettings,
    folder,
    form,
    initiateUsing,
    isSettingsOpen,
    kanbanSettings,
    prefixSegments,
    previewValues,
    workflowDescription,
    workflowName,
    workflowStatus,
    setFolder,
    setForm,
    setInitiateUsing,
    setKanbanSettings,
    setPrefixSegments,
    setPreviewValues,
    setWorkflowDescription,
    setWorkflowName,
    setWorkflowStatus,
  } = useWorkflowStore((state) => state)

  // Options
  const initiateOptions = [
    {
      description: 'Process document workflows',
      id: 'DOCUMENT',
      name: 'Document',
    },
    { description: 'Use an input form to start', id: 'FORM', name: 'Form' },
    {
      description: 'Use document and form to start',
      id: 'DOCUMENT_FORM',
      name: 'Document & Form',
    },
  ]

  const { data: workflowFormsData } = useQuery(getWorkflowFormsQueryOptions())
  const { data: folderOptionsData } = useQuery(getRepositoriesQueryOptions())
  const workflowForms = Array.isArray(workflowFormsData)
    ? workflowFormsData
    : []
  const folderOptions = Array.isArray(folderOptionsData)
    ? folderOptionsData
    : []

  // Document-only initiation previews from the repository/folder fields;
  // Form and Document & Form previews come from the selected form's fields.
  const showFormFields = initiateUsing !== 'DOCUMENT'
  const showRepositoryFields = initiateUsing === 'DOCUMENT'

  // Form fields (for the selected initiation form)
  const { data: formFields = [] } = useQuery<PreviewField[]>({
    enabled: !!form && showFormFields,
    queryKey: ['workflow-preview-form-fields', form],
    queryFn: async () => {
      const response = await requestApi.getForm(form as number)
      const parsedForm =
        typeof response?.formJson === 'string'
          ? JSON.parse(response.formJson)
          : response?.formJson
      const panels = [
        ...(parsedForm?.panels || []),
        ...(parsedForm?.secondaryPanels || []),
      ]

      const fields: PreviewField[] = []
      panels.forEach((panel: any) => {
        ;(panel?.fields || []).forEach((field: any) => {
          if (field.type === 'DIVIDER') return
          fields.push({
            key: String(field.name || field.id),
            label: field.label || field.type,
            source: 'form',
          })
        })
      })
      return fields
    },
  })

  // Repository fields (for the selected folder)
  const { data: repositoryFields = [] } = useQuery<PreviewField[]>({
    enabled: !!folder && showRepositoryFields,
    queryKey: ['workflow-preview-repository-fields', folder],
    queryFn: async () => {
      const fields = await folderApi.getItemFilterFields(String(folder))
      return fields.map((field) => ({
        key: String(field.sqlColumnName || field.name),
        label: String(field.name || field.sqlColumnName),
        source: 'repository' as const,
      }))
    },
  })

  // Document -> repository fields only; Form / Document & Form -> form fields only.
  // Skip duplicates by normalized label within the selected source.
  const previewFields = useMemo(() => {
    const source = showRepositoryFields ? repositoryFields : formFields
    const seen = new Set<string>()
    const combined: PreviewField[] = []

    source.forEach((field) => {
      const dedupeKey = normalizeFieldKey(field.label || field.key)
      if (!dedupeKey || seen.has(dedupeKey)) return
      seen.add(dedupeKey)
      combined.push(field)
    })

    return combined
  }, [formFields, repositoryFields, showRepositoryFields])

  const previewFieldOptions: Option[] = useMemo(
    () =>
      previewFields.map((field) => ({ id: field.label, name: field.label })),
    [previewFields],
  )

  const selectedPreviewOptions = useMemo(
    () =>
      previewFieldOptions.filter((option) =>
        previewValues.includes(String(option.id)),
      ),
    [previewFieldOptions, previewValues],
  )

  const handlePreviewValuesChange = (options: Option[]) => {
    setPreviewValues(options.map((option) => String(option.id)))
  }

  // Request Number Format
  const formFieldLabelsById = useMemo(() => {
    const map: Record<string, string> = {}
    previewFields.forEach((field) => {
      map[field.label] = field.label
    })
    return map
  }, [previewFields])

  const separator = getSeparator(prefixSegments)
  const resetCycle = getResetCycle(prefixSegments)
  const autoIncrementEnabled = prefixSegments.some((s) => s.key === 'reset')
  const tokenSegments = prefixSegments.filter(
    (s) => s.key !== 'seperator' && s.key !== 'reset',
  )
  const formatPreview = getFormatPreview(prefixSegments, formFieldLabelsById)

  const setSeparator = (value: string) => {
    const hasSeparator = prefixSegments.some((s) => s.key === 'seperator')
    setPrefixSegments(
      hasSeparator
        ? prefixSegments.map((s) =>
            s.key === 'seperator' ? { ...s, value } : s,
          )
        : [{ id: generateId(), key: 'seperator', value }, ...prefixSegments],
    )
  }

  const toggleAutoIncrement = (enabled: boolean) => {
    if (enabled) {
      setPrefixSegments([
        ...prefixSegments,
        { id: generateId(), key: 'reset', value: 'year' },
      ])
    } else {
      setPrefixSegments(prefixSegments.filter((s) => s.key !== 'reset'))
    }
  }

  const setResetCycleValue = (value: string) => {
    setPrefixSegments(
      prefixSegments.map((s) => (s.key === 'reset' ? { ...s, value } : s)),
    )
  }

  const addToken = () => {
    setPrefixSegments([
      ...prefixSegments,
      { id: generateId(), key: 'prefix', value: '' },
    ])
  }

  const removeToken = (id: string) => {
    setPrefixSegments(prefixSegments.filter((s) => s.id !== id))
  }

  const updateToken = (id: string, patch: Partial<PrefixSegment>) => {
    setPrefixSegments(
      prefixSegments.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    )
  }

  if (!isSettingsOpen) return null

  return (
    <div className='animate-slide-in-right flex h-full w-[400px] flex-col border-l border-gray-3 bg-white shadow-xl transition-all'>
      {/* Header */}
      <div className='flex items-center justify-between border-b border-gray-2 px-4 py-3'>
        <h2 className='text-15/5 font-semibold text-gray-13'>Settings</h2>
        <IconButton
          color='gray'
          icon='lucide:x'
          variant='ghost'
          onClick={closeSettings}
        />
      </div>

      {/* Status (common, applies regardless of which section is open) */}
      <div className='flex flex-col gap-1.5 border-b border-gray-2 px-4 py-3'>
        <label className='text-13 font-medium text-gray-11'>Status</label>
        <div className='bg-gray-50 flex rounded-lg border border-gray-3 p-1'>
          {[
            { id: 'draft', label: 'Draft' },
            { id: 'published', label: 'Published' },
          ].map((opt) => {
            const active = String(workflowStatus).toLowerCase() === opt.id
            return (
              <button
                key={opt.id}
                type='button'
                className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all duration-200 ${
                  active
                    ? 'bg-primary-9 text-white shadow-sm'
                    : 'text-gray-9 hover:bg-white/50 hover:text-gray-12'
                }`}
                onClick={() => setWorkflowStatus(opt.id as any)}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className='flex-1 space-y-1 overflow-y-auto px-4 pt-2 pb-4'>
        <SettingsSection
          icon='lucide:settings-2'
          isOpen={openGeneral}
          title='General'
          variant='premium'
          onToggle={() => setOpenGeneral(!openGeneral)}
        >
          {/* Name */}
          <Input
            label='Name'
            value={workflowName}
            clearable
            required
            onChange={setWorkflowName}
          />

          {/* Description */}
          <div>
            <label className='mb-2 block text-13 font-medium text-gray-11'>
              Description
            </label>
            <div className='relative'>
              <textarea
                className='min-h-[80px] w-full resize-none rounded-md border border-gray-6 bg-transparent px-3 py-2 text-13 font-medium text-gray-12 outline-none placeholder:font-normal placeholder:text-gray-8 focus:border-primary-8 focus:ring-2 focus:ring-primary-6'
                value={workflowDescription}
                onChange={(e) => setWorkflowDescription(e.target.value)}
              />
              <div
                className='absolute right-2 bottom-2 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-green-9 text-white'
                title='Save description'
              >
                <Icon className='h-3 w-3' name='lucide:save' />
              </div>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          icon='lucide:sliders-horizontal'
          isOpen={openConfiguration}
          title='Configuration'
          variant='premium'
          onToggle={() => setOpenConfiguration(!openConfiguration)}
        >
          {/* Initiate Using */}
          <InputSelect
            label='Initiate Using'
            options={initiateOptions as any}
            placeholder='Select'
            value={
              initiateUsing
                ? {
                    id: initiateUsing as any,
                    name:
                      initiateOptions.find((o: any) => o.id === initiateUsing)
                        ?.name || '',
                  }
                : null
            }
            onChange={(val: any) =>
              setInitiateUsing(val?.id || 'document-form')
            }
          />

          {/* Folder */}
          <InputSelect
            label='Folder'
            options={folderOptions}
            placeholder='Select'
            required
            value={
              folder
                ? {
                    id: folder,
                    name:
                      folderOptions.find((f: any) => f.id == folder)?.name ||
                      '',
                  }
                : null
            }
            onChange={(val: any) => setFolder(val?.id || null)}
          />

          {/* Form */}
          <InputSelect
            label='Form'
            options={workflowForms}
            placeholder='Select'
            required
            value={
              form
                ? {
                    id: form,
                    name:
                      workflowForms.find((f: any) => f.id == form)?.name || '',
                  }
                : null
            }
            onChange={(val: any) => setForm(val?.id || null)}
          />

          {/* Field Selection */}
          <InputSelectMultiple
            label='Field Selection'
            options={previewFieldOptions}
            placeholder='Search and select fields...'
            value={selectedPreviewOptions}
            clearable
            searchable
            description={
              showRepositoryFields
                ? !folder
                  ? 'Select a Folder to load available fields'
                  : undefined
                : !form
                  ? 'Select a Form to load available fields'
                  : undefined
            }
            onChange={handlePreviewValuesChange}
          />
        </SettingsSection>

        <SettingsSection
          icon='lucide:hash'
          isOpen={openRequestNumber}
          title='Request Number Format'
          variant='premium'
          onToggle={() => setOpenRequestNumber(!openRequestNumber)}
        >
          {/* Separator */}
          <InputSelect
            label='Separator'
            options={SEPARATOR_OPTIONS}
            placeholder='Select'
            value={
              SEPARATOR_OPTIONS.find((o) => o.id === separator) || null
            }
            onChange={(val) => setSeparator(String(val?.id || '-'))}
          />

          {/* Auto-increment toggle */}
          <div className='flex items-center justify-between'>
            <span className='text-13 font-medium text-gray-11'>
              Enable Auto-Increment
            </span>
            <InputSwitch
              checked={autoIncrementEnabled}
              onChange={toggleAutoIncrement}
            />
          </div>

          {/* Reset cycle */}
          {autoIncrementEnabled && (
            <InputSelect
              label='Reset Cycle'
              options={RESET_CYCLE_OPTIONS}
              placeholder='Select'
              value={
                RESET_CYCLE_OPTIONS.find((o) => o.id === resetCycle) || null
              }
              onChange={(val) => setResetCycleValue(String(val?.id || ''))}
            />
          )}

          {/* Token list */}
          <div className='space-y-2 rounded-xl bg-white p-3 shadow-sm'>
            <span className='text-13 font-medium text-gray-11'>
              Number Parts
            </span>
            <div className='space-y-2'>
              {tokenSegments.map((segment) => (
                <div
                  className='flex items-start gap-2 rounded-xl border border-gray-2 bg-[#F8FAFC] p-2'
                  key={segment.id}
                >
                  <div className='w-[120px] shrink-0'>
                    <InputSelect
                      options={TOKEN_TYPE_OPTIONS}
                      placeholder='Select'
                      value={
                        TOKEN_TYPE_OPTIONS.find(
                          (o) => o.id === segment.key,
                        ) || null
                      }
                      onChange={(val) =>
                        updateToken(segment.id, {
                          key: String(val?.id || 'prefix'),
                          value: '',
                        })
                      }
                    />
                  </div>

                  <div className='flex-1'>
                    {segment.key === 'prefix' && (
                      <Input
                        placeholder='Enter Prefix'
                        value={String(segment.value)}
                        onChange={(val) =>
                          updateToken(segment.id, { value: val })
                        }
                      />
                    )}
                    {segment.key === 'year' && (
                      <InputSelect
                        options={YEAR_OPTIONS}
                        placeholder='Select'
                        value={
                          YEAR_OPTIONS.find((o) => o.id === segment.value) ||
                          null
                        }
                        onChange={(val) =>
                          updateToken(segment.id, {
                            value: String(val?.id || 'yyyy'),
                          })
                        }
                      />
                    )}
                    {segment.key === 'month' && (
                      <InputSelect
                        options={MONTH_OPTIONS}
                        placeholder='Select'
                        value={
                          MONTH_OPTIONS.find((o) => o.id === segment.value) ||
                          null
                        }
                        onChange={(val) =>
                          updateToken(segment.id, {
                            value: String(val?.id || 'mm'),
                          })
                        }
                      />
                    )}
                    {segment.key === 'formColumn' && (
                      <InputSelectMultiple
                        options={previewFieldOptions}
                        placeholder='Select fields'
                        clearable
                        searchable
                        value={previewFieldOptions.filter((o) =>
                          String(segment.value)
                            .split(',')
                            .map((v) => v.trim())
                            .includes(String(o.id)),
                        )}
                        onChange={(options) =>
                          updateToken(segment.id, {
                            value: options
                              .map((o) => String(o.id))
                              .join(','),
                          })
                        }
                      />
                    )}
                    {segment.key === 'autoIncrement' && (
                      <InputNumber
                        max={7}
                        min={1}
                        placeholder='Enter no. of digits'
                        value={segment.value}
                        withControls
                        onChange={(val) =>
                          updateToken(segment.id, { value: Number(val) || 1 })
                        }
                      />
                    )}
                    {segment.key === 'currentDate' && (
                      <InputSelect
                        options={CURRENT_DATE_OPTIONS}
                        placeholder='Select'
                        value={
                          CURRENT_DATE_OPTIONS.find(
                            (o) => o.id === segment.value,
                          ) || null
                        }
                        onChange={(val) =>
                          updateToken(segment.id, {
                            value: String(val?.id || ''),
                          })
                        }
                      />
                    )}
                  </div>

                  <button
                    className='text-gray-400 hover:text-red-500 shrink-0 p-1.5 transition-colors'
                    title='Remove part'
                    onClick={() => removeToken(segment.id)}
                  >
                    <Icon className='h-4 w-4' name='lucide:x' />
                  </button>
                </div>
              ))}
            </div>

            <button
              className='border-gray-300 text-slate-500 hover:bg-blue-50 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-2 text-13 font-medium transition-all hover:border-[#1677ff] hover:text-[#1677ff] active:scale-[0.99]'
              onClick={addToken}
            >
              <Icon className='h-4 w-4' name='lucide:plus' />
              <span>Add Part</span>
            </button>
          </div>

          {/* Live preview */}
          <div className='rounded-xl bg-white p-3 text-13 font-medium text-gray-11 shadow-sm'>
            Format : <span className='text-primary-9'>{formatPreview}</span>
          </div>
        </SettingsSection>

        <SettingsSection
          icon='lucide:columns-3'
          isOpen={openKanban}
          title='Kanban View Settings'
          variant='premium'
          onToggle={() => setOpenKanban(!openKanban)}
        >
          <KanbanViewSettingsSection
            cards={kanbanSettings}
            nodes={nodes}
            onChange={setKanbanSettings}
          />
        </SettingsSection>
      </div>

      {/* Footer */}
      <div className='flex items-center justify-end gap-3 border-t border-gray-2 bg-gray-1 px-6 py-4'>
        <Button color='gray' variant='outline' onClick={closeSettings}>
          Cancel
        </Button>
        <Button onClick={closeSettings}>Save</Button>
      </div>
    </div>
  )
}

export { WorkflowSettings }
