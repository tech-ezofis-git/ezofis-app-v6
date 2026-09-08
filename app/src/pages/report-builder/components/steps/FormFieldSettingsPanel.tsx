import { useLingui } from '@lingui/react/macro'
import type { Question } from '@/pages/form-builder/store/formStore'
import InputNumber from '@/components/base/inputs/InputNumber'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputText from '@/components/base/inputs/InputText'
import FormulaBuilder from '@/pages/form-builder/components/build/components/settings/sections/FormulaBuilder'
import type { ReportFieldSetting } from '../../types'
import { CALC_OPTIONS } from '../../constants'
import StatusRulesEditor from './StatusRulesEditor'

const NUMERIC_TYPES = new Set(['NUMBER', 'CURRENCY_AMOUNT', 'COUNTER'])
const CHOICE_TYPES = new Set([
  'SINGLE_SELECT',
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
  'MULTI_SELECT',
])

interface Props {
  field: Question
  otherFields: Question[]
  setting: ReportFieldSetting
  onChange: (patch: Partial<ReportFieldSetting>) => void
}

/**
 * Question-driven counterpart to FieldSettingsPanel (which operates on the
 * legacy DomainField shape) — used on the FieldsStep's form-source path, so
 * field type/config comes straight from the selected form's real fields.
 */
const FormFieldSettingsPanel = ({
  field,
  otherFields,
  setting,
  onChange,
}: Props) => {
  const { t } = useLingui()

  return (
    <div className='grid grid-cols-1 gap-4 rounded-lg border border-gray-3 bg-gray-1/50 p-4 sm:grid-cols-2'>
      <InputText
        label={t`Column Label`}
        value={setting.label}
        onChange={(value) => onChange({ label: value })}
      />

      <InputNumber
        label={t`Column Width (px)`}
        value={setting.width}
        onChange={(value) => onChange({ width: Number(value) || 120 })}
      />

      {NUMERIC_TYPES.has(field.type) && (
        <InputSelect
          label={t`Calculation`}
          options={CALC_OPTIONS.map((o) => ({ id: o.value, name: o.label }))}
          value={{ id: setting.calc, name: setting.calc }}
          onChange={(option) =>
            onChange({
              calc: (option?.id as ReportFieldSetting['calc']) || 'None',
            })
          }
        />
      )}

      {field.type === 'CALCULATED' && (
        <div className='col-span-1 sm:col-span-2'>
          <p className='mb-2 text-13 font-medium text-gray-12'>{t`Formula`}</p>
          <FormulaBuilder
            fields={otherFields}
            activeQuestion={{
              ...field,
              settings: {
                ...field.settings,
                specific: {
                  ...field.settings.specific,
                  formulaTokens: setting.formulaTokens || [],
                },
              },
            }}
            onChange={(tokens) =>
              onChange({ formulaTokens: tokens, isCalculated: true })
            }
          />
        </div>
      )}

      {CHOICE_TYPES.has(field.type) && (
        <InputSelect
          label={t`Column Type`}
          options={[
            { id: 'value', name: t`Plain Value` },
            { id: 'status', name: t`Computed Status` },
          ]}
          value={{
            id: setting.colType,
            name:
              setting.colType === 'status'
                ? t`Computed Status`
                : t`Plain Value`,
          }}
          onChange={(option) =>
            onChange({
              colType: (option?.id as ReportFieldSetting['colType']) || 'value',
              statusBase: setting.statusBase || field.id,
            })
          }
        />
      )}

      {setting.colType === 'status' && (
        <StatusRulesEditor
          statusDefault={setting.statusDefault}
          statusRules={setting.statusRules || []}
          onChange={onChange}
        />
      )}
    </div>
  )
}

FormFieldSettingsPanel.displayName = 'FormFieldSettingsPanel'
export default FormFieldSettingsPanel
