import type { ComponentProps } from 'react'
import { useQuery } from '@tanstack/react-query'
import formApi from '@/api/form/form'
import InputCheckboxGroup from '@/components/base/inputs/InputCheckboxGroup'
import InputRadioGroup from '@/components/base/inputs/InputRadioGroup'
import InputSelectBase from '@/components/base/inputs/InputSelect'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import InputText from '@/components/base/inputs/InputText'
import { isFileColumnType } from '@/pages/form-builder/helpers/tableColumnFiles'
import { extractFormFieldChoices } from '@/pages/form-builder/helpers/tableColumnOptions'
import type { TableColumn } from './TableColumnSettingsPanel'

type ColumnSettingsPatch = Partial<NonNullable<TableColumn['settings']>>

interface Props {
  column: TableColumn
  masterForms?: { id: string; name: string }[]
  siblingColumns?: TableColumn[]
  onUpdate: (patch: ColumnSettingsPatch) => void
}

// Radio / checkbox ids are numbers in the shared inputs (0 reads as "empty"),
// so each option keeps its stored value next to a 1-based id.
const FORM_CONTROL_MODES = [
  {
    description: 'Validate data against recognized master data for accuracy',
    id: 1,
    key: 'MASTER',
    name: 'Validate from master information',
  },
  {
    description: 'Verify data consistency using existing form fields',
    id: 2,
    key: 'EXISTING',
    name: 'Validate from Existing fields',
  },
  {
    description: 'Manually validate data against defined criteria',
    id: 3,
    key: 'DEFINED',
    name: 'Validate from defined information',
  },
]

const COMPARE_MODES = [
  {
    description: 'Analyze similarities between images and documents',
    id: 1,
    key: 'IMAGE',
    name: 'Compare image with documents',
  },
  {
    description: 'Compare specific data fields across multiple documents',
    id: 2,
    key: 'DATA',
    name: 'Compare data with documents',
  },
]

const FILE_DATA_CHECKS = [
  {
    description: 'Confirm data against a predefined date for validation',
    id: 1,
    key: 'PREDEFINED_DATE',
    name: 'Verify with Predefined date',
  },
  {
    description:
      'Check document expiry dates against the current date for validity',
    id: 2,
    key: 'DOCUMENT_EXPIRY',
    name: 'Validate Document Expiry Date',
  },
  {
    description: 'Validate data against a predefined set of criteria',
    id: 3,
    key: 'DOCUMENT_TYPE',
    name: 'Validate Document Type',
  },
]

function InputSelect(props: ComponentProps<typeof InputSelectBase>) {
  return <InputSelectBase searchable wrapOptions {...props} />
}

const SectionLabel = ({ children }: { children: string }) => (
  <label className='block text-[11px] font-bold tracking-wider text-gray-7 uppercase'>
    {children}
  </label>
)

/**
 * AI settings for file / image columns, shown as in V5: how the document's
 * data is validated, image / data comparison, and file-data checks.
 *
 * Stored with the column under `settings.aiSettings` (same shape as top-level
 * fields) plus `validation.verificationRequired` for manual verification.
 * These are saved for V5 parity: nothing in the form runtime enforces them
 * yet, at top level or in tables.
 */
const TableColumnAiSettings = ({
  column,
  masterForms = [],
  siblingColumns = [],
  onUpdate,
}: Props) => {
  const ai = column.settings?.aiSettings
  const fcv = ai?.formControlValidate
  const ifv = ai?.imageFileValidate
  const fileDataValidate = ai?.fileDataValidate || []
  const masterFormId = fcv?.masterFormId ? String(fcv.masterFormId) : ''
  const masterFormColumn = fcv?.masterFormColumn?.[0] || ''
  const isFile = isFileColumnType(column.type)

  const { data: masterColumns = [] } = useQuery({
    enabled: isFile && fcv?.optionsType === 'MASTER' && !!masterFormId,
    queryKey: ['tableColumnAiMasterFields', masterFormId],
    queryFn: async () => {
      const res = await formApi.getFormDataById(masterFormId)
      return extractFormFieldChoices(res.data)
    },
  })

  if (!isFile) return null

  const siblings = siblingColumns.map((c) => ({
    id: c.id,
    name: c.name || 'Column',
  }))
  const setFcv = (next: NonNullable<typeof fcv>) =>
    onUpdate({ aiSettings: { formControlValidate: next } })
  const setIfv = (next: NonNullable<typeof ifv>) =>
    onUpdate({ aiSettings: { imageFileValidate: next } })

  return (
    <div className='animate-in fade-in slide-in-from-top-1 space-y-3 rounded-lg border border-dashed border-gray-3 p-2.5 duration-200'>
      <SectionLabel>AI Settings</SectionLabel>
      <p className='text-[10px] text-gray-6 italic'>
        Saved with the column for V5 parity. Document checks are not enforced
        when the form is filled in yet.
      </p>

      <InputRadioGroup
        label='Form Controls Validate'
        options={FORM_CONTROL_MODES}
        value={
          FORM_CONTROL_MODES.find((m) => m.key === fcv?.optionsType)?.id ?? null
        }
        onChange={(id) =>
          setFcv({
            ...fcv,
            optionsType: FORM_CONTROL_MODES.find((m) => m.id === id)?.key ?? '',
          })
        }
      />
      {fcv?.optionsType === 'MASTER' && (
        <div className='space-y-2'>
          <InputSelect
            options={masterForms}
            placeholder='Select a master table'
            value={
              masterForms.find((f) => String(f.id) === masterFormId) || null
            }
            onChange={(opt) =>
              setFcv({
                ...fcv,
                masterFormColumn: [],
                masterFormId: opt?.id != null ? String(opt.id) : '',
              })
            }
          />
          <InputSelect
            disabled={!masterFormId}
            options={masterColumns}
            placeholder={
              masterFormId ? 'Select the column' : 'Select a master table first'
            }
            value={
              masterColumns.find(
                (c) =>
                  String(c.id) === masterFormColumn ||
                  c.name === masterFormColumn,
              ) || null
            }
            onChange={(opt) =>
              setFcv({
                ...fcv,
                masterFormColumn: opt?.id != null ? [String(opt.id)] : [],
              })
            }
          />
        </div>
      )}
      {fcv?.optionsType === 'EXISTING' && (
        <InputSelectMultiple
          options={siblings}
          placeholder='Select columns to validate against'
          value={siblings.filter((c) =>
            (fcv.existingFormFields || []).includes(c.id),
          )}
          onChange={(vals) =>
            setFcv({
              ...fcv,
              existingFormFields: vals.map((v) => String(v.id)),
            })
          }
        />
      )}
      {fcv?.optionsType === 'DEFINED' && (
        <InputText
          placeholder='Values or criteria to validate against'
          value={fcv.formFields || ''}
          onChange={(value: string) => setFcv({ ...fcv, formFields: value })}
        />
      )}

      <InputRadioGroup
        label='Compare With Documents'
        options={COMPARE_MODES}
        value={
          COMPARE_MODES.find((m) => m.key === ifv?.optionsType)?.id ?? null
        }
        onChange={(id) =>
          setIfv({
            ...ifv,
            optionsType: COMPARE_MODES.find((m) => m.id === id)?.key ?? '',
          })
        }
      />
      {ifv?.optionsType && siblings.length > 0 && (
        <InputSelectMultiple
          options={siblings}
          placeholder='Select columns to compare'
          value={siblings.filter((c) => (ifv.formFields || []).includes(c.id))}
          onChange={(vals) =>
            setIfv({ ...ifv, formFields: vals.map((v) => String(v.id)) })
          }
        />
      )}

      <InputCheckboxGroup
        label='File Data Validate'
        options={FILE_DATA_CHECKS}
        value={FILE_DATA_CHECKS.filter((c) =>
          fileDataValidate.includes(c.key),
        ).map((c) => c.id)}
        onChange={(ids) =>
          onUpdate({
            aiSettings: {
              fileDataValidate: FILE_DATA_CHECKS.filter((c) =>
                ids.includes(c.id),
              ).map((c) => c.key),
            },
          })
        }
      />
      {fileDataValidate.includes('DOCUMENT_TYPE') && (
        <InputText
          label='Document Type Keyword'
          placeholder='e.g. Invoice'
          value={ai?.validateTypeKeyword || ''}
          onChange={(value: string) =>
            onUpdate({ aiSettings: { validateTypeKeyword: value } })
          }
        />
      )}
      <InputSwitch
        checked={column.settings?.validation?.verificationRequired === true}
        description='Requires a manual review to ensure the accuracy of the provided information.'
        label='Manual Verification Required'
        onChange={(checked) =>
          onUpdate({ validation: { verificationRequired: checked } })
        }
      />
    </div>
  )
}

export default TableColumnAiSettings
