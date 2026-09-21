import { useLingui } from '@lingui/react/macro'
import { motion, AnimatePresence } from 'motion/react'
import Icon from '@/components/base/icon/Icon'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import InputSelect from '@/components/base/inputs/InputSelect'
import { type FolderConfigField } from '@/services/ai/gemini'

type EditableField = FolderConfigField & {
  aiGenerated?: boolean
  id: string
}

interface Props {
  field: EditableField
  onUpdate: (patch: Partial<EditableField>) => void
  onClose: () => void
}

const COLUMN_DATA_TYPES = [
  { id: 'SHORT_TEXT', name: 'Short Text' },
  { id: 'LONG_TEXT', name: 'Long Text' },
  { id: 'NUMBER', name: 'Number' },
  { id: 'DATE', name: 'Date' },
  { id: 'TIME', name: 'Time' },
  { id: 'SINGLE_SELECT', name: 'Single Select' },
]

export default function FolderFieldSettingsPanel({ field, onUpdate, onClose }: Props) {
  const { t } = useLingui()
  const settings = field.settings || {}

  const handleSettingsUpdate = (patch: Record<string, any>) => {
    onUpdate({ settings: { ...settings, ...patch } })
  }

  const renderTableSettings = () => {
    const columns = (settings.columns as Array<{ id: string; name: string; type: string; isMandatory: boolean }>) || []

    const addColumn = () => {
      handleSettingsUpdate({
        columns: [
          ...columns,
          { id: crypto.randomUUID(), isMandatory: false, name: '', type: 'SHORT_TEXT' },
        ],
      })
    }

    const updateColumn = (id: string, patch: any) => {
      handleSettingsUpdate({
        columns: columns.map((col) => (col.id === id ? { ...col, ...patch } : col)),
      })
    }

    const removeColumn = (id: string) => {
      handleSettingsUpdate({
        columns: columns.filter((col) => col.id !== id),
      })
    }

    return (
      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <h4 className='text-xs font-semibold text-gray-13'>{t`Table Columns`}</h4>
          <button
            type='button'
            className='flex items-center gap-1 rounded bg-primary-10 px-2 py-1 text-[11px] font-medium text-white transition hover:bg-primary-9'
            onClick={addColumn}
          >
            <Icon name='lucide:plus' className='size-3' />
            {t`Add Column`}
          </button>
        </div>

        {columns.length === 0 ? (
          <div className='rounded-md border border-dashed border-gray-4 py-4 text-center text-xs text-gray-8'>
            {t`No columns added yet`}
          </div>
        ) : (
          <div className='space-y-2'>
            {columns.map((col, idx) => (
              <div key={col.id} className='flex items-center gap-2 rounded-md border border-gray-3 bg-white p-2'>
                <span className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-2 text-[10px] font-semibold text-gray-9'>
                  {idx + 1}
                </span>
                <input
                  className='min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1.5 text-xs font-medium text-gray-13 outline-none hover:border-gray-4 focus:border-primary-6'
                  placeholder={t`Column Name`}
                  value={col.name}
                  onChange={(e) => updateColumn(col.id, { name: e.target.value })}
                />
                <div className='w-32 shrink-0'>
                  <InputSelect
                    options={COLUMN_DATA_TYPES}
                    value={COLUMN_DATA_TYPES.find((t) => t.id === col.type) || COLUMN_DATA_TYPES[0]}
                    onChange={(val) => val && updateColumn(col.id, { type: val.id })}
                  />
                </div>
                <button
                  type='button'
                  aria-label={t`Mandatory column`}
                  className={`flex h-7 w-3.5 shrink-0 items-center justify-center text-[15px] font-semibold leading-none transition ${col.isMandatory ? 'text-red-10' : 'text-gray-6 hover:text-red-9'}`}
                  title={col.isMandatory ? t`Mandatory` : t`Optional`}
                  onClick={() => updateColumn(col.id, { isMandatory: !col.isMandatory })}
                >
                  *
                </button>
                <button
                  type='button'
                  className='flex size-6 shrink-0 items-center justify-center rounded text-gray-9 transition hover:bg-red-3 hover:text-red-11'
                  onClick={() => removeColumn(col.id)}
                >
                  <Icon name='lucide:trash-2' className='size-3.5' />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderSingleSelectSettings = () => {
    return (
      <div className='space-y-4'>
        <InputTextarea
          label={t`Dropdown Options`}
          description={t`Enter options separated by newlines or commas.`}
          placeholder='Option 1, Option 2, Option 3'
          rows={3}
          value={settings.customOptions || ''}
          onChange={(val: string) => handleSettingsUpdate({ customOptions: val })}
        />
      </div>
    )
  }

  const renderLinkSettings = () => {
    return (
      <div className='space-y-4'>
        <InputText
          label={t`Default URL`}
          placeholder='https://...'
          value={settings.defaultUrl || ''}
          onChange={(val: string) => handleSettingsUpdate({ defaultUrl: val })}
        />
      </div>
    )
  }

  const renderGenericSettings = () => {
    return (
      <div className='space-y-4'>
        <div className='rounded-md border border-gray-3 bg-gray-1 p-3 text-sm text-gray-11'>
          {t`No advanced settings available for this field type.`}
        </div>
      </div>
    )
  }

  const renderOmrSettings = () => {
    return (
      <div className='space-y-4'>
        <InputText
          label={t`OMR Template Reference`}
          placeholder={t`Enter template ID or reference`}
          value={settings.omrTemplateId || ''}
          onChange={(val: string) => handleSettingsUpdate({ omrTemplateId: val })}
        />
      </div>
    )
  }

  const renderBarcodeSettings = () => {
    const barcodeTypes = [
      { id: 'QR_CODE', name: 'QR Code' },
      { id: 'CODE_128', name: 'Code 128' },
      { id: 'EAN_13', name: 'EAN-13' },
    ]
    return (
      <div className='space-y-4'>
        <div className='w-full'>
          <label className='mb-2 block text-[13px] font-medium text-gray-11'>
            {t`Barcode Format`}
          </label>
          <InputSelect
            options={barcodeTypes}
            value={barcodeTypes.find((t) => t.id === settings.barcodeFormat) || barcodeTypes[0]}
            onChange={(val) => val && handleSettingsUpdate({ barcodeFormat: val.id })}
          />
        </div>
      </div>
    )
  }

  const renderContent = () => {
    switch (field.dataType) {
      case 'TABLE':
        return renderTableSettings()
      case 'SINGLE_SELECT':
      case 'MULTI_SELECT':
      case 'MULTIPLE_CHOICE':
      case 'SINGLE_CHOICE':
        return renderSingleSelectSettings()
      case 'LINK':
      case 'URL':
        return renderLinkSettings()
      case 'OMR':
        return renderOmrSettings()
      case 'BARCODE':
        return renderBarcodeSettings()
      default:
        return renderGenericSettings()
    }
  }

  return (
    <div className='mt-2 overflow-hidden rounded-xl border border-gray-4 bg-surface shadow-sm'>
      <div className='flex items-center justify-between border-b border-gray-4 bg-surface px-4 py-2.5'>
        <div className='flex items-center gap-2'>
          <Icon name='lucide:settings-2' className='size-4 text-gray-11' />
          <h3 className='text-sm font-semibold text-gray-12'>
            {field.fieldName} {t`Settings`}
          </h3>
        </div>
        <button
          type='button'
          className='flex size-6 items-center justify-center rounded-full text-gray-9 hover:bg-gray-4'
          onClick={onClose}
        >
          <Icon name='lucide:x' className='size-3.5' />
        </button>
      </div>
      <div className='p-4'>
        {renderContent()}
      </div>
    </div>
  )
}
