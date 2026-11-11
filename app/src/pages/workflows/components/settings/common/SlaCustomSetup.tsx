import { Radio } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import type { Option } from '@/types/option'
import formApi from '@/api/form/form'
import { getFormFieldsQueryOptions } from '@/api/form/queries'
import InputNumber from '@/components/base/inputs/InputNumber'
import InputRadioCard from '@/components/base/inputs/InputRadioCard'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputText from '@/components/base/inputs/InputText'
import {
  fetchMasterFormColumnOptions,
  getConfiguredFieldOptions,
  getMasterFormInfo,
} from '@/pages/requests/components/workflow-request/utils/fieldRendering'
import cn from '@/utils/cn'
import useWorkflowStore from '../../../stores/useWorkflowStore'
import {
  entryKey,
  entryList,
  fieldValue,
  findRuleForValue,
  normalizeLabel,
  readLevels,
  selectionStatus,
} from '../../../utils/slaCustomSetup'
import {
  createAfterLast,
  createSlaMasterRow,
  createSlaSelection,
  SLA_DURATION_UNITS,
  type SlaAfterLast,
  type SlaAfterLastType,
  type SlaSelection,
  type SlaSelectionMethod,
  type SlaSettings,
  type SlaValidationErrors,
} from '../../../utils/slaSettings'
import SlaMasterEntryPicker from './SlaMasterEntryPicker'

interface SlaCustomSetupProps {
  errors: SlaValidationErrors
  groupOptions: Option[]
  isBlock: boolean
  isMasterLoading: boolean
  masterOptions: Option[]
  userOptions: Option[]
  value: SlaSettings
  onChange: (value: SlaSettings) => void
}

const SELECT_TYPES = new Set([
  'MULTI_SELECT',
  'MULTIPLE_CHOICE',
  'SINGLE_CHOICE',
  'SINGLE_SELECT',
])
const SEARCH_FROM = 20
const MAX_ROWS = 50
const ENTRY_LIMIT = 5000

const AFTER_LABELS: Record<SlaAfterLastType, { name: string; then: string }> = {
  group: { name: 'Move to a Group', then: 'Move to the chosen group' },
  manager: {
    name: 'Move to the Reporting Manager',
    then: 'Move to the reporting manager',
  },
  none: { name: 'Do Nothing Else', then: 'Nothing else happens' },
  remind: { name: 'Send a Daily Reminder', then: 'Send a daily reminder' },
  user: { name: 'Move to a User', then: 'Move to the chosen user' },
}

const Card = ({
  children,
  id,
  step,
}: {
  children: React.ReactNode
  id?: string
  step?: boolean
}) => (
  <div
    className='animate-in fade-in flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-sm duration-200 data-[step=true]:[counter-increment:sla-step]'
    data-step={step ? 'true' : undefined}
    id={id}
  >
    {step && (
      <span className="text-11 font-semibold tracking-wide text-primary-9 uppercase before:content-['Step_'_counter(sla-step)]" />
    )}
    {children}
  </div>
)

const Chip = ({
  end,
  label,
  value,
}: {
  end?: boolean
  label: string
  value: string
}) => (
  <div
    className={cn(
      'min-w-0 rounded-lg border px-2.5 py-1.5',
      end ? 'border-primary-9 bg-primary-2' : 'border-gray-3',
    )}
  >
    <span className='block text-[10px] font-semibold tracking-wide text-gray-9 uppercase'>
      {label}
    </span>
    <span
      className={cn(
        'block text-13 font-semibold break-words',
        end ? 'text-primary-9' : 'text-gray-12',
      )}
    >
      {value}
    </span>
  </div>
)

const Help = ({ children }: { children: React.ReactNode }) => (
  <span className='text-11 leading-tight text-gray-9'>{children}</span>
)

/** Custom Setup: where the rules are, how a request gets one, what happens when it is late. */
export default function SlaCustomSetup({
  errors,
  groupOptions,
  isBlock,
  isMasterLoading,
  masterOptions,
  userOptions,
  value,
  onChange,
}: SlaCustomSetupProps) {
  const config = errors._config ?? {}
  const afterErrors = errors._after ?? {}
  const selection = value.selection ?? null
  const after: SlaAfterLast = value.afterLastLevel ?? createAfterLast('none')

  const update = (patch: Partial<SlaSettings>) =>
    onChange({ ...value, ...patch })
  const updateSelection = (patch: Partial<SlaSelection>) =>
    selection && update({ selection: { ...selection, ...patch } })

  // ---- The request form's fields -------------------------------------------
  const requestFormId = useWorkflowStore((state) => state.form)
  const { data: requestFields = [] } = useQuery({
    ...getFormFieldsQueryOptions(String(requestFormId ?? '')),
    enabled: Boolean(requestFormId),
  })
  const fieldChoices = useMemo(
    () =>
      requestFields
        .map((field) => ({
          field,
          id: String(field.id),
          label: String(field.label || field.displayLabel || field.id),
          master: getMasterFormInfo(field),
          options: getConfiguredFieldOptions(field).map((o) => o.name),
        }))
        .filter(
          (c) =>
            SELECT_TYPES.has(String(c.field.type)) &&
            (c.master.enabled || c.options.length > 0),
        ),
    [requestFields],
  )
  const chosenField =
    fieldChoices.find((c) => c.id === selection?.fieldId) ?? null
  const isRecordField = Boolean(chosenField?.master.enabled)

  const { data: masterValues = [] } = useQuery({
    enabled: isRecordField,
    queryKey: [
      'sla-field-options',
      chosenField?.master.masterFormId,
      chosenField?.master.masterFormColumn,
    ],
    queryFn: () =>
      fetchMasterFormColumnOptions(
        chosenField!.master.masterFormId,
        chosenField!.master.masterFormColumn,
        undefined,
        undefined,
        true,
      ),
  })
  const fieldValues = useMemo(() => {
    if (!chosenField) return []
    const list = isRecordField
      ? masterValues.map((o) => String(o.name))
      : chosenField.options
    return [...new Set(list.filter(Boolean))]
  }, [chosenField, isRecordField, masterValues])

  // ---- The SLA form --------------------------------------------------------
  const slaFormId = value.slaMasterId
  const { data: rawSlaFields = [] } = useQuery({
    ...getFormFieldsQueryOptions(String(slaFormId ?? '')),
    enabled: Boolean(slaFormId),
  })
  const { data: slaEntries = [], isLoading: isEntriesLoading } = useQuery({
    enabled: Boolean(slaFormId),
    queryKey: ['sla-master-entries', slaFormId],
    queryFn: async () => {
      const response = await formApi.getFormEntries(String(slaFormId), 1, 1000)
      return entryList(response?.data)
    },
  })
  const slaFields = useMemo(
    () =>
      rawSlaFields.map((f) => ({
        ...f,
        id: String(f.id),
        label: String(f.label || f.displayLabel || f.id),
      })),
    [rawSlaFields],
  )
  const nameField =
    slaFields.find(
      (f) => normalizeLabel(f.label) === normalizeLabel('Policy Name'),
    ) ??
    slaFields.find((f) => normalizeLabel(f.label) === normalizeLabel('Name')) ??
    slaFields.find((f) => f.id === value.masterFieldId) ??
    slaFields[0]
  const ruleOptions: Option[] = useMemo(() => {
    if (!nameField) return []
    return slaEntries
      .map((entry) => ({
        id: entryKey(entry),
        name: fieldValue(entry, nameField),
      }))
      .filter((o) => o.id && o.name)
  }, [slaEntries, nameField])

  // Saved so the API names entries the same way.
  useEffect(() => {
    if (selection && nameField && value.masterFieldId !== nameField.id)
      update({ masterFieldId: nameField.id })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameField?.id, Boolean(selection)])

  // ---- The records behind the field (column method) ------------------------
  const recordFormId = selection?.recordFormId ?? ''
  const useColumn = selection?.method === 'column' && Boolean(recordFormId)
  const { data: rawRecordFields = [] } = useQuery({
    ...getFormFieldsQueryOptions(String(recordFormId)),
    enabled: useColumn,
  })
  const recordColumns: Option[] = useMemo(
    () =>
      rawRecordFields
        .filter(
          (f) =>
            !['DIVIDER', 'HEADING', 'LABEL', 'PARAGRAPH', 'TABLE'].includes(
              f.type,
            ),
        )
        .map((f) => ({
          id: String(f.id),
          name: String(f.label || f.displayLabel || f.id),
        })),
    [rawRecordFields],
  )
  const { data: records = [] } = useQuery({
    enabled: useColumn,
    queryKey: ['sla-record-entries', recordFormId],
    queryFn: async () => {
      const response = await formApi.getFormEntries(
        String(recordFormId),
        1,
        ENTRY_LIMIT,
      )
      return entryList(response?.data)
    },
  })
  const recordRule = useMemo(() => {
    if (!selection?.ruleColumn) return () => undefined
    const shown = rawRecordFields.find(
      (f) =>
        String(f.id) === selection.recordValueColumn ||
        normalizeLabel(f.label) === normalizeLabel(selection.recordValueColumn),
    )
    const valueColumn = {
      id: String(shown?.id ?? selection.recordValueColumn ?? ''),
      label: String(shown?.label ?? selection.recordValueColumn ?? ''),
    }
    const ruleColumn = {
      id: selection.ruleColumn,
      label: String(
        recordColumns.find((c) => c.id === selection.ruleColumn)?.name ?? '',
      ),
    }
    const rules = new Map<string, string>()
    records.forEach((row) => {
      const key = fieldValue(row, valueColumn)
      const rule = fieldValue(row, ruleColumn)
      if (key && rule && !rules.has(key)) rules.set(key, rule)
    })
    return (text: string) => rules.get(text)
  }, [
    selection?.ruleColumn,
    selection?.recordValueColumn,
    rawRecordFields,
    recordColumns,
    records,
  ])

  // ---- What each option gets -----------------------------------------------
  const pickFor = (text: string) =>
    selection
      ? findRuleForValue(selection, text, ruleOptions, recordRule)
      : { entryId: null, source: 'none' as const }
  const withRule = fieldValues.filter(
    (v) => pickFor(v).source === 'value',
  ).length
  const status =
    selection && chosenField
      ? selectionStatus(
          fieldValues.length,
          withRule,
          Boolean(selection.defaultEntryId),
        )
      : null

  const [search, setSearch] = useState('')
  const matching = useMemo(() => {
    const text = search.trim().toLowerCase()
    return text
      ? fieldValues.filter((v) => v.toLowerCase().includes(text))
      : fieldValues
  }, [fieldValues, search])

  // ---- Example -------------------------------------------------------------
  const [exampleChoice, setExampleChoice] = useState<null | string>(null)
  const exampleValue =
    exampleChoice && fieldValues.includes(exampleChoice)
      ? exampleChoice
      : (fieldValues[0] ?? null)
  const fixedRow = value.masterEntries?.[0]
  const examplePick = selection
    ? exampleValue
      ? pickFor(exampleValue)
      : { entryId: null, source: 'none' as const }
    : {
        entryId: fixedRow?.entryId ?? null,
        source: fixedRow?.entryId ? ('value' as const) : ('none' as const),
      }
  const exampleEntry = slaEntries.find(
    (e) => entryKey(e) === examplePick.entryId,
  )
  const exampleRule = ruleOptions.find((o) => o.id === examplePick.entryId)
  const userName = (id: string) =>
    userOptions.find((o) => String(o.id) === id)?.name ?? id
  const levels = useMemo(
    () => readLevels(exampleEntry, slaFields, isBlock, userName),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exampleEntry, slaFields, isBlock, userOptions],
  )
  const afterThen = AFTER_LABELS[after.type].then
  const start = selection ? exampleValue : 'Any request'
  const exampleLine = exampleRule
    ? [
        start,
        `${exampleRule.name} rule`,
        ...levels.map((l) => `${l.what} ${l.when.toLowerCase()}`),
        afterThen,
      ]
        .filter(Boolean)
        .join(' → ')
    : ''
  const exampleWhy =
    !exampleRule && selection && exampleValue
      ? 'No rule was found, and no default is set.'
      : !exampleRule
        ? 'Choose a rule above to see its details and steps.'
        : !selection
          ? 'Every request uses this time limit rule.'
          : examplePick.source === 'default'
            ? 'No rule was found, so the default rule is used.'
            : selection.method === 'map'
              ? 'You chose this rule for this option.'
              : selection.method === 'sameName'
                ? 'This rule has the same name.'
                : 'The selected record names this rule.'

  // ---- Changes -------------------------------------------------------------
  const setDepends = (depends: boolean) => {
    if (depends === Boolean(selection)) return
    if (depends)
      update({
        masterEntries: [],
        masterFieldId: nameField?.id ?? value.masterFieldId ?? null,
        selection: createSlaSelection(),
      })
    else
      update({
        masterEntries: slaFormId ? [createSlaMasterRow()] : [],
        selection: null,
      })
  }

  const chooseField = (id: string) => {
    const next = fieldChoices.find((c) => c.id === id)
    const master = next?.master
    const toRecord = Boolean(master?.enabled)
    let method: SlaSelectionMethod = selection?.method ?? 'map'
    if (toRecord) method = 'column'
    else if (method === 'column') method = 'map'
    updateSelection({
      fieldId: id,
      method,
      recordFormId: toRecord ? (master?.masterFormId ?? null) : null,
      recordValueColumn: toRecord ? (master?.masterFormColumn ?? null) : null,
      ruleColumn: null,
    })
  }

  const setValueRule = (text: string, entryId: null | string) => {
    if (!selection) return
    const others = selection.valueRules.filter((r) => r.value !== text)
    updateSelection({
      valueRules: entryId ? [...others, { entryId, value: text }] : others,
    })
  }

  const chooseSlaForm = (id: null | string) =>
    update({
      masterEntries: id && !selection ? [createSlaMasterRow()] : [],
      masterFieldId: null,
      slaMasterId: id,
      ...(selection
        ? {
            selection: {
              ...selection,
              defaultEntryId: null,
              valueRules: [],
            },
          }
        : {}),
    })

  const setAfterType = (type: SlaAfterLastType) =>
    update({
      afterLastLevel:
        type === 'none'
          ? null
          : {
              ...createAfterLast(type),
              wait: after.wait ?? 1,
              waitUnit: after.waitUnit,
            },
    })
  const patchAfter = (patch: Partial<SlaAfterLast>) =>
    update({ afterLastLevel: { ...after, ...patch } })

  const afterChoices: { id: SlaAfterLastType; name: string }[] = (
    isBlock
      ? (['none', 'remind', 'group', 'user', 'manager'] as const)
      : (['none', 'remind'] as const)
  ).map((id) => ({ id, name: AFTER_LABELS[id].name }))

  // ---- Flow ----------------------------------------------------------------
  const formName =
    masterOptions.find((o) => o.id === slaFormId)?.name ?? 'Not chosen'
  const fixedName =
    ruleOptions.find((o) => o.id === fixedRow?.entryId)?.name ?? 'Not chosen'
  const fieldName = chosenField?.label ?? 'Not chosen'
  const chips: { label: string; value: string }[] = !selection
    ? [
        { label: 'Applies to', value: 'All requests' },
        { label: 'Time limit rule', value: fixedName },
      ]
    : selection.method === 'column'
      ? [
          { label: 'Request field', value: fieldName },
          {
            label: 'Column',
            value:
              recordColumns.find((c) => c.id === selection.ruleColumn)?.name ??
              'Not chosen',
          },
        ]
      : selection.method === 'map'
        ? [
            { label: 'Request field', value: fieldName },
            { label: 'Rule chosen by', value: 'You, for each option' },
          ]
        : [
            { label: 'Request field', value: fieldName },
            { label: 'Rule found by', value: 'Same name' },
          ]
  const flowLines = !selection
    ? [
        'Every request uses the rule you choose.',
        'That rule sets the times and the people.',
      ]
    : !chosenField
      ? ['Choose a field to see how this works.']
      : [
          `Someone fills in ${fieldName} in the request.`,
          selection.method === 'column'
            ? 'The record they pick names the rule to use.'
            : selection.method === 'map'
              ? 'The rule you chose for that option is used.'
              : 'The rule with the same name is used.',
        ]

  return (
    <div className='flex flex-col gap-3 [counter-reset:sla-step]'>
      <Card>
        <span className='text-13 font-semibold text-gray-12'>
          How This Works
        </span>
        <div className='flex flex-wrap items-center gap-1.5'>
          {chips.map((chip) => (
            <div className='flex items-center gap-1.5' key={chip.label}>
              <Chip label={chip.label} value={chip.value} />
              <span className='text-gray-8' aria-hidden>
                ›
              </span>
            </div>
          ))}
          <Chip label='Times and people from' value={formName} end />
        </div>
        <div className='flex flex-col gap-0.5'>
          {flowLines.map((line) => (
            <Help key={line}>{line}</Help>
          ))}
        </div>
      </Card>

      <Card step>
        <span className='text-13 font-medium text-gray-12'>
          Should every request get the same time limit?
          <span className='ml-0.5 text-red-11'>*</span>
        </span>
        <Radio.Group value={selection ? 'depends' : 'same'}>
          <div className='flex flex-col gap-2'>
            <InputRadioCard
              checked={Boolean(selection)}
              description='A choice in the request picks the rule.'
              label='No, It Depends on the Request'
              size='sm'
              value='depends'
              onClick={() => setDepends(true)}
            />
            <InputRadioCard
              checked={!selection}
              description='Every request uses one time limit rule.'
              label='Yes, Same for Every Request'
              size='sm'
              value='same'
              onClick={() => setDepends(false)}
            />
          </div>
        </Radio.Group>
      </Card>

      <Card step>
        {selection && (
          <InputSelect
            error={config.fieldId}
            label='Which request field decides the time limit?'
            options={fieldChoices.map((c) => ({ id: c.id, name: c.label }))}
            required
            searchable
            description={
              chosenField
                ? isRecordField
                  ? 'People choose from a list in another form.'
                  : "People choose from this field's own list."
                : 'Only dropdown and choice fields are listed.'
            }
            placeholder={
              requestFormId
                ? 'Select a field...'
                : 'Add a form to this workflow first'
            }
            value={
              chosenField
                ? { id: chosenField.id, name: chosenField.label }
                : null
            }
            onChange={(opt) => opt && chooseField(String(opt.id))}
          />
        )}
        <InputSelect
          description='Holds the times and people for each rule.'
          error={config.slaMasterId}
          label='Which form has your time limit rules?'
          loading={isMasterLoading}
          options={masterOptions}
          placeholder='Select an SLA form...'
          clearable
          required
          searchable
          value={
            masterOptions.find((o) => o.id === slaFormId) ??
            (slaFormId ? { id: slaFormId, name: `Form ${slaFormId}` } : null)
          }
          onChange={(opt) => chooseSlaForm(opt ? String(opt.id) : null)}
        />
        {!selection && slaFormId && (
          <SlaMasterEntryPicker
            errors={errors}
            isBlock={isBlock}
            value={value}
            onChange={onChange}
          />
        )}
      </Card>

      {selection && chosenField && slaFormId && (
        <Card step>
          <span className='text-13 font-medium text-gray-12'>
            How do we find the right rule?
            <span className='ml-0.5 text-red-11'>*</span>
          </span>
          <Radio.Group value={selection.method}>
            <div className='flex flex-col gap-2'>
              <InputRadioCard
                checked={selection.method === 'column'}
                disabled={!isRecordField}
                label='Read It from the Selected Record'
                size='sm'
                value='column'
                description={
                  isRecordField
                    ? 'The selected record names its rule.'
                    : 'Only for options from another form.'
                }
                onClick={() =>
                  isRecordField && updateSelection({ method: 'column' })
                }
              />
              <InputRadioCard
                checked={selection.method === 'map'}
                description='Pick a rule yourself for each option.'
                label='Let Me Choose for Each Option'
                size='sm'
                value='map'
                onClick={() => updateSelection({ method: 'map' })}
              />
              <InputRadioCard
                checked={selection.method === 'sameName'}
                description="Use the rule with the option's name."
                label='Match by Same Name'
                size='sm'
                value='sameName'
                onClick={() => updateSelection({ method: 'sameName' })}
              />
            </div>
          </Radio.Group>

          {selection.method === 'column' && (
            <InputSelect
              description='The column that holds the rule.'
              error={config.ruleColumn}
              label='Which column names the rule?'
              options={recordColumns}
              placeholder='Select a column...'
              required
              searchable
              value={
                recordColumns.find((c) => c.id === selection.ruleColumn) ?? null
              }
              onChange={(opt) =>
                updateSelection({ ruleColumn: opt ? String(opt.id) : null })
              }
            />
          )}

          {selection.method === 'map' && (
            <div className='flex flex-col gap-2'>
              <div className='flex flex-col gap-0.5'>
                <span className='text-13 font-medium text-gray-12'>
                  Choose a Rule for Each Option
                </span>
                <Help>Choose the rule to use for each option.</Help>
              </div>
              {fieldValues.length > SEARCH_FROM && (
                <InputText
                  placeholder='Search options...'
                  value={search}
                  onChange={setSearch}
                />
              )}
              <div className='overflow-x-auto rounded-lg border border-gray-3'>
                <table className='w-full text-13'>
                  <thead>
                    <tr className='bg-surface-muted text-left text-12 text-gray-10'>
                      <th className='px-2.5 py-1.5 font-medium'>
                        {chosenField.label}
                      </th>
                      <th className='px-2.5 py-1.5 font-medium'>
                        Time Limit Rule
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {matching.slice(0, MAX_ROWS).map((text) => {
                      const entryId =
                        selection.valueRules.find((r) => r.value === text)
                          ?.entryId ?? null
                      return (
                        <tr className='border-t border-gray-3' key={text}>
                          <td className='px-2.5 py-1.5 text-gray-12'>{text}</td>
                          <td className='px-2.5 py-1.5'>
                            <InputSelect
                              aria-label={`Time limit rule for ${text}`}
                              options={ruleOptions}
                              placeholder='Use Default Rule'
                              clearable
                              searchable
                              value={
                                ruleOptions.find((o) => o.id === entryId) ??
                                null
                              }
                              onChange={(opt) =>
                                setValueRule(text, opt ? String(opt.id) : null)
                              }
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {matching.length > MAX_ROWS && (
                <Help>
                  Showing {MAX_ROWS} of {matching.length}. Search to find the
                  others.
                </Help>
              )}
              {config.valueRules && (
                <span className='text-12 text-red-11'>{config.valueRules}</span>
              )}
            </div>
          )}

          {status && (
            <div
              className={cn(
                'rounded-lg px-2.5 py-2 text-12',
                status.tone === 'ok'
                  ? 'bg-green-2 text-green-11'
                  : 'bg-orange-2 text-orange-11',
              )}
            >
              {status.text}
            </div>
          )}
        </Card>
      )}

      {selection && slaFormId && (
        <Card step>
          <InputSelect
            description='Used when an option has no rule of its own.'
            label='If no rule is found, which rule should we use?'
            loading={isEntriesLoading}
            options={ruleOptions}
            placeholder='None, no time limit'
            clearable
            searchable
            value={
              ruleOptions.find((o) => o.id === selection.defaultEntryId) ?? null
            }
            onChange={(opt) =>
              updateSelection({ defaultEntryId: opt ? String(opt.id) : null })
            }
          />
        </Card>
      )}

      {slaFormId && (
        <Card>
          <div className='flex flex-col gap-0.5'>
            <div className='flex items-center justify-between gap-2'>
              <span className='text-13 font-semibold text-gray-12'>
                Escalation Levels
              </span>
              <span className='rounded-full bg-green-2 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-green-11 uppercase'>
                From the rule
              </span>
            </div>
            <Help>Who is told, and when, if it is still not done.</Help>
          </div>
          {selection && chosenField && (
            <InputSelect
              label='Show an example for'
              options={fieldValues.map((v) => ({ id: v, name: v }))}
              searchable
              value={
                exampleValue ? { id: exampleValue, name: exampleValue } : null
              }
              onChange={(opt) => opt && setExampleChoice(String(opt.id))}
            />
          )}
          {levels.length > 0 ? (
            <div className='overflow-x-auto rounded-lg border border-gray-3'>
              <table className='w-full text-13'>
                <tbody>
                  {levels.map((level, index) => (
                    <tr
                      className='border-t border-gray-3 first:border-t-0'
                      key={`${level.what}-${index}`}
                    >
                      <td className='w-px px-2.5 py-1.5 font-semibold text-gray-10'>
                        {index + 1}
                      </td>
                      <td className='px-2.5 py-1.5 text-gray-12'>
                        {level.what}
                      </td>
                      <td className='px-2.5 py-1.5 text-right text-12 whitespace-nowrap text-gray-10'>
                        {level.when}
                      </td>
                    </tr>
                  ))}
                  <tr className='border-t border-gray-3'>
                    <td className='w-px px-2.5 py-1.5 font-semibold text-gray-10'>
                      Then
                    </td>
                    <td className='px-2.5 py-1.5 text-gray-12' colSpan={2}>
                      {afterThen}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <Help>
              {exampleRule
                ? 'This rule has no levels yet.'
                : 'Nothing to show until a rule applies.'}
            </Help>
          )}
          <Help>To change these, edit the rule in the SLA form.</Help>
          <div className='flex flex-col gap-0.5 rounded-lg border border-primary-5 bg-primary-2 px-3 py-2'>
            <span className='text-[10px] font-semibold tracking-wide text-primary-9 uppercase'>
              Example
            </span>
            <span className='text-13 font-semibold text-gray-12'>
              {exampleRule?.name ?? 'No Time Limit Rule Selected'}
            </span>
            {exampleLine && <Help>{exampleLine}</Help>}
            <Help>{exampleWhy}</Help>
          </div>
        </Card>
      )}

      {slaFormId && (
        <Card step>
          <InputSelect
            description='Choose what happens if it is still not done.'
            error={afterErrors.type}
            label='After the last level, what should happen?'
            options={afterChoices}
            value={afterChoices.find((c) => c.id === after.type) ?? null}
            onChange={(opt) =>
              opt && setAfterType(String(opt.id) as SlaAfterLastType)
            }
          />
          {after.type !== 'none' && (
            <div className='grid grid-cols-2 gap-2'>
              <InputNumber
                allowDecimal={false}
                error={afterErrors.wait}
                label='How long should we wait first?'
                min={1}
                value={after.wait ?? ''}
                required
                onChange={(v) =>
                  patchAfter({
                    wait: v === '' || v === null ? null : Number(v),
                  })
                }
              />
              <InputSelect
                label='Time Unit'
                options={SLA_DURATION_UNITS}
                required
                value={
                  SLA_DURATION_UNITS.find((u) => u.id === after.waitUnit) ??
                  null
                }
                onChange={(opt) =>
                  opt &&
                  patchAfter({
                    waitUnit: opt.id as SlaAfterLast['waitUnit'],
                  })
                }
              />
            </div>
          )}
          {after.type === 'group' && (
            <InputSelect
              error={afterErrors.groupId}
              label='Which group?'
              options={groupOptions}
              placeholder='Select a group...'
              required
              searchable
              value={
                groupOptions.find((o) => String(o.id) === after.groupId) ?? null
              }
              onChange={(opt) =>
                patchAfter({ groupId: opt ? String(opt.id) : null })
              }
            />
          )}
          {after.type === 'user' && (
            <InputSelect
              error={afterErrors.userId}
              label='Which user?'
              options={userOptions}
              placeholder='Select a user...'
              required
              searchable
              value={
                userOptions.find((o) => String(o.id) === after.userId) ?? null
              }
              onChange={(opt) =>
                patchAfter({ userId: opt ? String(opt.id) : null })
              }
            />
          )}
        </Card>
      )}
    </div>
  )
}
