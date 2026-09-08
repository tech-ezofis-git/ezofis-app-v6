import { useLingui } from '@lingui/react/macro'
import InputNumber from '@/components/base/inputs/InputNumber'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputText from '@/components/base/inputs/InputText'
import type { DomainField, ReportFieldSetting } from '../../types'
import { CALC_OPTIONS } from '../../constants'
import StatusRulesEditor from './StatusRulesEditor'

interface Props {
  field: DomainField
  setting: ReportFieldSetting
  onChange: (patch: Partial<ReportFieldSetting>) => void
}

const FieldSettingsPanel = ({ field, setting, onChange }: Props) => {
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

      {field.type === 'Number' && (
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

      {field.type === 'Choice' && (
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

FieldSettingsPanel.displayName = 'FieldSettingsPanel'
export default FieldSettingsPanel
