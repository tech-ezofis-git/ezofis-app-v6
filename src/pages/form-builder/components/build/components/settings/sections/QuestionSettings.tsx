import { Divider, SegmentedControl, NumberInput, Button } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'
import { useFormStore } from '@/pages/form-builder/store/formStore'
import type { Question } from '@/pages/form-builder/store/formStore'
import IconButton from '@/components/base/button/IconButton'
import InputText from '@/components/base/inputs/InputText'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import SettingsSection from '../../../../common/SettingsSection'
import { useState, useEffect } from 'react'

interface QuestionSettingsProps {
  activeQuestion: Question
}

const QuestionSettings = ({ activeQuestion }: QuestionSettingsProps) => {
  const updateQuestion = useFormStore((state) => state.updateQuestion)
  const panels = useFormStore((state) => state.panels)
  const allQuestions = panels.flatMap(p => p.fields)

  const [openSetup, setOpenSetup] = useState(false)
  const [openValidation, setOpenValidation] = useState(false)
  const [openAppearance, setOpenAppearance] = useState(false)
  const [openAdvanced, setOpenAdvanced] = useState(false)
  const [openLogic, setOpenLogic] = useState(false)
  const [openLookup, setOpenLookup] = useState(false)
  const [openSpecific, setOpenSpecific] = useState(false)

  const [localLabel, setLocalLabel] = useState(activeQuestion.label || '')
  const [localDesc, setLocalDesc] = useState(activeQuestion.settings.general.description || '')
  const [localPlaceholder, setLocalPlaceholder] = useState(activeQuestion.settings.general.placeholder || '')
  const [localDefaultValue, setLocalDefaultValue] = useState(activeQuestion.settings.specific.defaultValue || '')

  useEffect(() => {
    setLocalLabel(activeQuestion.label || '')
    setLocalDesc(activeQuestion.settings.general.description || '')
    setLocalPlaceholder(activeQuestion.settings.general.placeholder || '')
    setLocalDefaultValue(activeQuestion.settings.specific.defaultValue || '')
  }, [activeQuestion.id])

  const updateNested = (path: 'general' | 'validation' | 'specific' | 'lookupSettings', updates: any) => {
    updateQuestion(activeQuestion.id, (q: Question) => ({
      ...q,
      settings: {
        ...q.settings,
        [path]: { ...(q.settings[path] as any), ...updates }
      }
    }))
  }

  const isShortText = activeQuestion.type === 'SHORT_TEXT'
  const isLongText = activeQuestion.type === 'LONG_TEXT'
  const isNumber = activeQuestion.type === 'NUMBER' || activeQuestion.type === 'COUNTER'
  const isCounter = activeQuestion.type === 'COUNTER'
  const isCurrency = activeQuestion.type === 'CURRENCY_AMOUNT'
  const isCalculated = activeQuestion.type === 'CALCULATED'
  const isCountryCode = activeQuestion.type === 'COUNTRY_CODE'
  const isDivider = activeQuestion.type === 'DIVIDER'
  const isPassword = activeQuestion.type === 'PASSWORD'
  const isFileUpload = activeQuestion.type === 'FILE_UPLOAD' || activeQuestion.type === 'IMAGE_UPLOAD'
  const isTextBuilder = activeQuestion.type === 'TEXT_BUILDER'
  const isTable = activeQuestion.type === 'TABLE'
  const isRating = activeQuestion.type === 'RATING'
  const isOpinionScale = activeQuestion.type === 'OPINION_SCALE'
  const isSignature = activeQuestion.type === 'SIGNATURE'
  const isMatrix = activeQuestion.type === 'MATRIX'
  const isYesNoToggle = activeQuestion.type === 'YES_NO_TOGGLE'
  const isAddress = activeQuestion.type === 'ADDRESS'
  const isFIB = activeQuestion.type === 'FILL_IN_THE_BLANKS'
  const isFullName = activeQuestion.type === 'FULL_NAME'
  const isDate = activeQuestion.type === 'DATE'
  const isTime = activeQuestion.type === 'TIME'
  const isSelect = ['SINGLE_SELECT', 'MULTI_SELECT', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'CURRENCY_AMOUNT'].includes(activeQuestion.type)
  const isChoiceField = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE'].includes(activeQuestion.type)
  const isMulti = ['MULTI_SELECT', 'MULTIPLE_CHOICE'].includes(activeQuestion.type)
  const isChoice = isChoiceField

  const optionsPerLineOptions = [
    { id: '1', name: 'Vertical (1)' },
    { id: '2', name: '2 Columns' },
    { id: '3', name: '3 Columns' },
    { id: '4', name: '4 Columns' },
    { id: '6', name: '6 Columns' },
  ]

  const validationOptions = isLongText
    ? [
      { id: 'TEXT', name: 'Text (Allows any character)' },
      { id: 'ALPHA', name: 'Alpha (Letters only)' },
      { id: 'ALPHA_SPACES', name: 'Alpha Spaces (Letters & Spaces)' },
      { id: 'ALPHA_DASH', name: 'Alpha Dash (Alphanumeric, - , _)' },
      { id: 'ALPHA_NUMERIC', name: 'Alpha Numeric (Letters & Numbers)' },
    ]
    : isNumber
      ? [
        { id: 'INTEGER', name: 'Integer (Whole numbers)' },
        { id: 'DECIMAL', name: 'Decimal (Allows decimal points)' },
        { id: 'COMMAS', name: 'Commas (Format with commas)' },
        { id: 'BOTH', name: 'Both (Commas & Decimals)' },
      ]
      : [
        { id: 'TEXT', name: 'Text (Allows any character)' },
        { id: 'ALPHA', name: 'Alpha (Letters only)' },
        { id: 'ALPHA_SPACES', name: 'Alpha Spaces (Letters & Spaces)' },
        { id: 'ALPHA_DASH', name: 'Alpha Dash (Alphanumeric, - , _)' },
        { id: 'ALPHA_NUMERIC', name: 'Alpha Numeric (Letters & Numbers)' },
        { id: 'EMAIL', name: 'Email (Valid email format)' },
        { id: 'WEB', name: 'Web (Valid URL format)' },
      ]

  const visibilityOptions = [
    { id: 'NORMAL', name: 'Normal (Editable)' },
    { id: 'READ_ONLY', name: 'Read Only (Visible but locked)' },
    { id: 'HIDDEN', name: 'Disable (Hidden from UI)' },
  ]

  const sizeOptions = [
    { id: 'col-4', name: 'Small (33%)' },
    { id: 'col-6', name: 'Medium (50%)' },
    { id: 'col-12', name: 'Large (100%)' },
  ]

  const rangeOptions = [
    { id: 'CUSTOM', name: 'Custom (Manual Range)' },
    { id: 'MIN_FIXED_MAX_FLEX', name: 'Min Fixed, Max Flexible' },
    { id: 'MIN_FLEX_MAX_FIXED', name: 'Min Flexible, Max Fixed' },
  ]

  const dateDefaultOptions = [
    { id: 'CUSTOM', name: 'Fixed Date (Calendar)' },
    { id: 'TODAY', name: 'Current / Request Date' },
    { id: 'PARENT_FIELD', name: 'Inherit from Parent Field' },
  ]

  const dateLimitOptions = [
    { id: 'NONE', name: 'No Restrictions' },
    { id: 'MIN_DATE', name: 'Minimum Date (Earliest)' },
    { id: 'MAX_DATE', name: 'Maximum Date (Latest)' },
    { id: 'RANGE', name: 'Fixed Date Range' },
  ]

  const timeDefaultOptions = [
    { id: 'CUSTOM', name: 'Fixed Time (Clock)' },
    { id: 'NOW', name: 'Current / Request Time' },
    { id: 'NONE', name: 'None (Start Empty)' },
  ]

  const timeLimitOptions = [
    { id: 'NONE', name: 'No Restrictions' },
    { id: 'MIN_TIME', name: 'Minimum Time (Current)' },
    { id: 'MAX_TIME', name: 'Maximum Time (Current)' },
    { id: 'RANGE', name: 'Select Time Range' },
  ]

  const timeFormatOptions = [
    { label: '12 Hour', value: '12' },
    { label: '24 Hour', value: '24' },
  ]

  const currencyOptionsTypeOptions = [
    { id: 'ALL', name: 'All Currencies (Global List)' },
    { id: 'SPECIFIC', name: 'Specific Currencies (Restricted)' },
  ]
  
  const optionsTypeOptions = [
    { id: 'CUSTOM', name: 'Custom List (Manual)' },
    { id: 'MASTER_TABLE', name: 'Master Table (Dynamic)' },
    { id: 'REPOSITORY', name: 'Data Repository' },
    { id: 'PREDEFINED', name: 'Predefined Lists' },
  ]

  const separatorOptions = [
    { label: 'Newline', value: 'NEWLINE' },
    { label: 'Comma', value: 'COMMA' },
  ]

  const selectDefaultValueOptions = [
    { id: 'STATIC', name: 'Fixed Option' },
    { id: 'DYNAMIC', name: 'Dynamic (e.g. Current User)' },
    { id: 'NONE', name: 'None' },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar content-scrollbar bg-white animate-in fade-in duration-500">
      {/* 1. GENERAL SETUP SECTION */}
      <SettingsSection
        icon="lucide:settings-2"
        isOpen={openSetup}
        onToggle={() => setOpenSetup(!openSetup)}
        title="Field Setup"
        variant="premium"
      >
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <InputText
            label='Field Label'
            value={localLabel}
            onChange={(val: string) => setLocalLabel(val)}
            onBlur={() => updateQuestion(activeQuestion.id, { label: localLabel })}
            placeholder="e.g. What is your name?"
          />

          <div className="flex flex-col gap-1">
            <div className="text-[11px] font-bold text-gray-9 uppercase tracking-tighter px-1">System Field ID</div>
            <div className="py-2 px-3 bg-gray-50 rounded-lg border border-gray-1 font-mono text-[11px] text-gray-12 select-all cursor-help" title="Click to select">
              {activeQuestion.id}
            </div>
          </div>

          {(isLongText || isNumber || isDate || isTime || isSelect) && (
            <InputText
              label='Display Label (Internal)'
              value={activeQuestion.displayLabel || ''}
              onChange={(val: string) => updateQuestion(activeQuestion.id, { displayLabel: val })}
              placeholder="Alternative visual name"
            />
          )}

          <div className="flex items-center justify-between py-2 px-1 bg-gray-50/50 rounded-lg border border-gray-1">
            <div className="text-xs font-semibold text-gray-7">Hide Label</div>
            <InputSwitch
              checked={activeQuestion.settings.general.hideLabel || false}
              onChange={(checked: boolean) => updateNested('general', { hideLabel: checked })}
            />
          </div>

          <InputText
            label='Placeholder'
            value={localPlaceholder}
            onChange={(val: string) => setLocalPlaceholder(val)}
            onBlur={() => updateNested('general', { placeholder: localPlaceholder })}
            placeholder={isNumber ? "0" : isDate ? "YYYY-MM-DD" : isTime ? "HH:MM" : "e.g. Type here..."}
          />

          {!isNumber && !isDate && !isSelect && (
            <InputText
              label='Default Value'
              value={localDefaultValue}
              onChange={(val: string) => setLocalDefaultValue(val)}
              onBlur={() => updateNested('specific', { defaultValue: localDefaultValue })}
              placeholder="Pre-defined answer"
            />
          )}

          <div>
            <label className='mb-2 block text-13 font-medium text-gray-11'>
              Help Text / Description
            </label>
            <div className='relative'>
              <textarea
                className='min-h-[80px] w-full resize-none rounded-md border border-gray-1 bg-white px-3 py-2 text-13 font-medium text-gray-12 outline-none placeholder:font-normal placeholder:text-gray-8 focus:border-primary-8 focus:ring-2 focus:ring-primary-6 transition-all'
                value={localDesc}
                onChange={(e) => setLocalDesc(e.target.value)}
                onBlur={() => updateNested('general', { description: localDesc })}
                placeholder="Add extra instructions..."
              />
            </div>
          </div>

          {(isLongText || isNumber || isDate || isTime) && (
            <InputText
              label='Tooltip (Hover Text)'
              value={activeQuestion.settings.general.tooltip || ''}
              onChange={(val: string) => updateNested('general', { tooltip: val })}
              placeholder="Explanation on hover"
            />
          )}

          {(isShortText || isLongText || isNumber || isDate || isTime || isSelect) && (
            <div className="flex items-center justify-between py-2 px-3 bg-primary-subtle/20 rounded-lg border border-primary-subtle/30">
              <div>
                <div className="text-xs font-bold text-primary-9">Answer Status Indicator</div>
                <div className="text-[10px] text-gray-9">Track progress for this field</div>
              </div>
              <InputSwitch
                checked={activeQuestion.settings.specific.showStatusIndicator || false}
                onChange={(checked) => updateNested('specific', { showStatusIndicator: checked })}
              />
            </div>
          )}

          <Divider className="border-gray-1" />

          <div className="space-y-3">
            <div>
              <label className='mb-2 block text-13 font-medium text-gray-11'>
                Field Width
              </label>
              <InputSelect
                options={(isLongText || isNumber || isDate || isTime || isSelect) ? sizeOptions : [{ id: 'col-12', name: '100% Full Width' }, { id: 'col-6', name: '50% Half Width' }, { id: 'col-4', name: '33% Column' }]}
                placeholder="Select width"
                value={
                  ((isLongText || isNumber || isDate || isTime || isSelect) ? sizeOptions : [{ id: 'col-12', name: '100% Full Width' }, { id: 'col-6', name: '50% Half Width' }, { id: 'col-4', name: '33% Column' }])
                    .find(o => o.id === activeQuestion.settings.general.size) || { id: 'col-12', name: '100% Full Width' }
                }
                onChange={(val) => val && updateNested('general', { size: val.id })}
              />
            </div>

            {(isLongText || isNumber || isDate || isTime || isSelect) && (
              <div>
                <label className='mb-2 block text-13 font-medium text-gray-11'>
                  Visibility State
                </label>
                <InputSelect
                  options={visibilityOptions}
                  placeholder="Normal, Read Only..."
                  value={visibilityOptions.find(o => o.id === activeQuestion.settings.general.visibility) || visibilityOptions[0]}
                  onChange={(val) => val && updateNested('general', { visibility: val.id })}
                />
              </div>
            )}

            {!isLongText && !isNumber && !isDate && !isTime && !isSelect && (
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-2 p-3 rounded-xl border border-gray-1 bg-gray-50/30">
                  <div className="text-xs font-bold text-gray-13">Read Only</div>
                  <InputSwitch
                    checked={activeQuestion.settings.general.readOnly || false}
                    onChange={(checked) => updateNested('general', { readOnly: checked })}
                  />
                </div>
                <div className="flex flex-col gap-2 p-3 rounded-xl border border-gray-1 bg-gray-50/30">
                  <div className="text-xs font-bold text-gray-13">Hidden Field</div>
                  <InputSwitch
                    checked={activeQuestion.settings.general.hidden || false}
                    onChange={(checked) => updateNested('general', { hidden: checked })}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </SettingsSection>

      {/* 2. SPECIFIC SETTINGS */}
      {(isNumber || isDate || isTime || isSelect || isCurrency || isCalculated || isCountryCode || isTextBuilder || isTable || isRating || isOpinionScale || isSignature || isMatrix || isYesNoToggle || isAddress || isFIB || isFullName || isFileUpload || isPassword) && (
        <SettingsSection
          icon={isDate ? "lucide:calendar" : isTime ? "lucide:clock" : isSelect ? "lucide:list-todo" : isCurrency ? "lucide:banknote" : isCalculated ? "lucide:calculator" : isCountryCode ? "lucide:globe" : "lucide:sliders"}
          isOpen={openSpecific}
          onToggle={() => setOpenSpecific(!openSpecific)}
          title={isDate ? "Date Config" : isTime ? "Time Config" : (isSelect && !isCurrency) ? "Select Config" : isCurrency ? "Currency Config" : isCalculated ? "Formula Builder" : isCountryCode ? "Country Config" : "Field Configuration"}
          variant="premium"
        >
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
             {isCountryCode && (
               <div className="space-y-4">
                  <InputText
                    label="Default Dialing Prefix"
                    placeholder="e.g. +971"
                    value={activeQuestion.settings.specific.defaultCountryCode || ''}
                    onChange={(val: string) => updateNested('specific', { defaultCountryCode: val })}
                  />
                  <div className="flex items-center justify-between py-2 px-1">
                    <div>
                      <div className="text-xs font-bold text-gray-13">Enable Search</div>
                      <div className="text-[10px] text-gray-6">Allow users to search by name/code</div>
                    </div>
                    <InputSwitch
                      checked={activeQuestion.settings.specific.countryCodeSearchEnabled ?? true}
                      onChange={(checked) => updateNested('specific', { countryCodeSearchEnabled: checked })}
                    />
                  </div>
               </div>
             )}

             {isCalculated && (
               <div className="space-y-4">
                  <div className="p-3 bg-amber-50/30 rounded-xl border border-amber-200/50 space-y-3">
                    <label className='block text-[11px] font-bold text-amber-9 uppercase tracking-wider'>Formula Tokens</label>
                    <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-white rounded-lg border border-gray-1">
                      {(activeQuestion.settings.specific.formulaTokens || []).length === 0 && (
                        <span className="text-[11px] text-gray-4 italic self-center">No formula defined yet...</span>
                      )}
                      {(activeQuestion.settings.specific.formulaTokens || []).map((token: any, idx: number) => (
                        <div key={idx} className={cn(
                          "flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-bold shadow-sm",
                          token.type === 'FIELD' ? "bg-blue-50 text-blue-700 border border-blue-200" :
                          token.type === 'OPERATOR' ? "bg-amber-100 text-amber-800 border border-amber-300" :
                          "bg-gray-1 text-gray-7 border border-gray-2"
                        )}>
                          {token.type === 'FIELD' ? (panels.flatMap((p: any) => p.fields).find((f: any) => f.id === token.value)?.label || 'Deleted Field') : token.value}
                          <button 
                            onClick={() => {
                              const newTokens = [...(activeQuestion.settings.specific.formulaTokens || [])];
                              newTokens.splice(idx, 1);
                              updateNested('specific', { formulaTokens: newTokens });
                            }}
                            className="hover:text-red-500 transition-colors"
                          >
                            <Icon name="lucide:x" width={10} height={10} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-4 gap-1">
                      {['+', '-', '*', '/'].map(op => (
                        <button 
                          key={op}
                          onClick={() => updateNested('specific', { formulaTokens: [...(activeQuestion.settings.specific.formulaTokens || []), { type: 'OPERATOR', value: op }] })}
                          className="py-1 bg-amber-100/50 hover:bg-amber-100 text-amber-700 rounded border border-amber-200/30 font-bold transition-colors"
                        >
                          {op}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-2">
                       <label className='block text-[10px] font-bold text-gray-5 uppercase'>Add Variable</label>
                       <InputSelect
                         options={panels.flatMap((p: any) => p.fields).filter((f: any) => f.id !== activeQuestion.id && ['NUMBER', 'COUNTER', 'CURRENCY_AMOUNT'].includes(f.type)).map((f: any) => ({ id: f.id, name: f.label }))}
                         placeholder="Select field..."
                         value={null}
                         onChange={(val) => val && updateNested('specific', { formulaTokens: [...(activeQuestion.settings.specific.formulaTokens || []), { type: 'FIELD', value: val.id }] })}
                       />
                    </div>
                  </div>
               </div>
             )}

             {isCurrency && (
               <div className="space-y-4">
                  <div>
                    <label className='mb-2 block text-13 font-medium text-gray-11'>
                      Currency Options Type
                    </label>
                    <InputSelect
                      options={currencyOptionsTypeOptions}
                      placeholder="Select mode"
                      value={currencyOptionsTypeOptions.find(o => o.id === activeQuestion.settings.specific.currencyOptionsType) || currencyOptionsTypeOptions[0]}
                      onChange={(val) => val && updateNested('specific', { currencyOptionsType: val.id })}
                    />
                  </div>

                  {activeQuestion.settings.specific.currencyOptionsType === 'SPECIFIC' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                      <label className='block text-13 font-medium text-gray-11'>Restricted List</label>
                      <InputText
                        placeholder="e.g. USD, EUR, GBP (Comma separated)"
                        value={(activeQuestion.settings.specific.specificCurrencies || []).join(', ')}
                        onChange={(val: string) => updateNested('specific', { specificCurrencies: val.split(',').map(s => s.trim()).filter(Boolean) })}
                      />
                    </div>
                  )}

                  <Divider className="border-gray-1 border-dashed" />

                  <div>
                    <label className='mb-2 block text-13 font-medium text-gray-11'>
                      Currency Parent Field
                    </label>
                    <InputSelect
                      options={[{ id: 'none', name: 'No Link' }, ...panels.flatMap((p: any) => p.fields).filter((f: any) => f.id !== activeQuestion.id && f.type === 'CURRENCY_AMOUNT').map((f: any) => ({ id: f.id, name: f.label }))]}
                      placeholder="Inherit currency from..."
                      value={null}
                      onChange={(val) => val && updateNested('specific', { currencyParentFieldId: val.id })}
                    />
                    <div className="text-[10px] mt-1 text-gray-6 italic">Automatically match units with the parent field.</div>
                  </div>
               </div>
             )}

             {isSelect && !isCurrency && (
               <div className="space-y-4">
                  <div>
                    <label className='mb-2 block text-13 font-medium text-gray-11'>
                      Options Source
                    </label>
                    <InputSelect
                      options={optionsTypeOptions}
                      placeholder="Select source type"
                      value={optionsTypeOptions.find(o => o.id === activeQuestion.settings.specific.optionsType) || optionsTypeOptions[0]}
                      onChange={(val) => val && updateNested('specific', { optionsType: val.id })}
                    />
                  </div>

                  {activeQuestion.settings.specific.optionsType === 'MASTER_TABLE' && (
                    <div className="p-3 bg-primary-subtle/5 rounded-lg border border-primary-subtle/10 space-y-3">
                       <label className='block text-[11px] font-bold text-primary-9 uppercase'>
                        Dynamic Source Builder
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <InputSelect
                          options={[{ id: 't1', name: 'Employees' }, { id: 't2', name: 'Departments' }]}
                          placeholder="Table"
                          value={null}
                          onChange={() => {}}
                        />
                        <InputSelect
                          options={[{ id: 'c1', name: 'Name' }, { id: 'c2', name: 'Code' }]}
                          placeholder="Column"
                          value={null}
                          onChange={() => {}}
                        />
                      </div>
                    </div>
                  )}

                  {(activeQuestion.settings.specific.optionsType === 'CUSTOM' || !activeQuestion.settings.specific.optionsType) && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className='block text-13 font-medium text-gray-11'>
                          Manual Options entry
                        </label>
                        <SegmentedControl
                          size="xs"
                          value={activeQuestion.settings.specific.separateOptionsUsing || 'NEWLINE'}
                          onChange={(v) => updateNested('specific', { separateOptionsUsing: v })}
                          data={separatorOptions}
                        />
                      </div>
                      <textarea
                        className='min-h-[100px] w-full resize-none rounded-md border border-gray-1 bg-white px-3 py-2 text-13 font-medium text-gray-12 outline-none placeholder:font-normal placeholder:text-gray-8 focus:border-primary-8 focus:ring-2 focus:ring-primary-6 transition-all'
                        value={activeQuestion.settings.specific.customOptions || ''}
                        onChange={(e) => updateNested('specific', { customOptions: e.target.value })}
                        placeholder={activeQuestion.settings.specific.separateOptionsUsing === 'COMMA' ? "Option 1, Option 2, Option 3..." : "Option 1\nOption 2\nOption 3..."}
                      />
                    </div>
                  )}

                  {isMulti && (
                    <div className="p-3 bg-gray-50/50 rounded-xl border border-gray-1 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-gray-8">Bulk Actions</div>
                          <div className="text-[10px] text-gray-6">Select All / Unselect All</div>
                        </div>
                        <InputSwitch
                          checked={activeQuestion.settings.specific.bulkActionsEnabled || false}
                          onChange={(checked) => updateNested('specific', { bulkActionsEnabled: checked })}
                        />
                      </div>

                      {activeQuestion.type === 'MULTI_SELECT' && (
                        <>
                          <Divider className="border-gray-1 border-dashed" />

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-xs font-bold text-gray-13">Allow Custom Entries</div>
                                <div className="text-[10px] text-gray-6">Users can type in new options</div>
                              </div>
                              <InputSwitch
                                checked={activeQuestion.settings.specific.allowCustomEntries || false}
                                onChange={(checked) => updateNested('specific', { allowCustomEntries: checked })}
                              />
                            </div>

                            {activeQuestion.settings.specific.allowCustomEntries && (
                              <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                <label className='block text-[10px] font-bold text-gray-8 uppercase tracking-wider'>Entry Validation</label>
                                <InputSelect
                                  options={validationOptions}
                                  placeholder="Format for custom entry"
                                  value={validationOptions.find(o => o.id === activeQuestion.settings.validation.contentRule) || validationOptions[0]}
                                  onChange={(val) => val && updateNested('validation', { contentRule: val.id })}
                                />
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {isChoice && (
                    <div className="p-3 bg-secondary-subtle/10 rounded-xl border border-secondary-subtle/20 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-gray-13">Show Options Wrapper</div>
                          <div className="text-[10px] text-gray-6">Add border and padding to group</div>
                        </div>
                        <InputSwitch
                          checked={activeQuestion.settings.specific.showOptionsWrapper || false}
                          onChange={(checked) => updateNested('specific', { showOptionsWrapper: checked })}
                        />
                      </div>

                      <Divider className="border-gray-1 border-dashed" />

                      <div className="space-y-2">
                        <label className='block text-13 font-medium text-gray-11'>Options Layout</label>
                        <InputSelect
                          options={optionsPerLineOptions}
                          placeholder="Items per row"
                          value={optionsPerLineOptions.find(o => Number(o.id) === activeQuestion.settings.specific.optionsPerLine) || optionsPerLineOptions[0]}
                          onChange={(val) => val && updateNested('specific', { optionsPerLine: Number(val.id) })}
                        />
                        <div className="text-[10px] text-gray-6 italic">Control grid columns (1 = Vertical List).</div>
                      </div>
                    </div>
                  )}

                  <Divider className="border-gray-1 border-dashed" />

                  <div>
                    <label className='mb-2 block text-13 font-medium text-gray-11'>
                      Cascading Filter (Parent)
                    </label>
                    <InputSelect
                      options={[{ id: 'none', name: 'No Filter' }, ...panels.flatMap((p: any) => p.fields).filter((f: any) => f.id !== activeQuestion.id && ['SINGLE_SELECT', 'SINGLE_CHOICE'].includes(f.type)).map((f: any) => ({ id: f.id, name: f.label }))]}
                      placeholder="Filter by another field"
                      value={null}
                      onChange={(val) => val && updateNested('specific', { parentFieldId: val.id })}
                    />
                    <div className="text-[10px] mt-1 text-gray-6 italic">Options will change based on parent selection.</div>
                  </div>

                  <div>
                    <label className='mb-2 block text-13 font-medium text-gray-11'>
                      Default Selection Mode
                    </label>
                    <InputSelect
                      options={selectDefaultValueOptions}
                      placeholder="Initial value mode"
                      value={selectDefaultValueOptions.find(o => o.id === activeQuestion.settings.specific.defaultValueType) || selectDefaultValueOptions[2]}
                      onChange={(val) => val && updateNested('specific', { defaultValueType: val.id })}
                    />
                  </div>

                  {activeQuestion.settings.specific.defaultValueType === 'STATIC' && (
                    <div className="animate-in fade-in slide-in-from-top-1 duration-200 space-y-3">
                      {isCurrency ? (
                        <div className="grid grid-cols-2 gap-2">
                          <InputText
                            label="Default Currency"
                            placeholder="USD"
                            value={(activeQuestion.settings.specific.defaultValue as any)?.currency || ''}
                            onChange={(val: string) => updateNested('specific', { 
                              defaultValue: { ...((activeQuestion.settings.specific.defaultValue as any) || {}), currency: val.toUpperCase() } 
                            })}
                          />
                          <NumberInput
                            label="Default Amount"
                            placeholder="0.00"
                            value={(activeQuestion.settings.specific.defaultValue as any)?.amount || undefined}
                            onChange={(val) => updateNested('specific', { 
                              defaultValue: { ...((activeQuestion.settings.specific.defaultValue as any) || {}), amount: val } 
                            })}
                          />
                        </div>
                      ) : (
                        <InputText
                          label={isMulti ? 'Static Default Values (Comma separated)' : 'Static Default Value'}
                          value={localDefaultValue}
                          onChange={(val: string) => setLocalDefaultValue(val)}
                          onBlur={() => updateNested('specific', { defaultValue: localDefaultValue })}
                          placeholder={isMulti ? "Option A, Option B" : "Option A"}
                        />
                      )}
                    </div>
                  )}
               </div>
             )}

              {isNumber && (
                <div className="space-y-4">
                  <div className="p-3 bg-gray-50/50 rounded-xl border border-gray-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-gray-13">Enforce Integer</div>
                        <div className="text-[10px] text-gray-6">Discard decimals</div>
                      </div>
                      <InputSwitch
                        checked={activeQuestion.settings.specific.isInteger || (isCounter ? true : false)}
                        onChange={(checked) => updateNested('specific', { isInteger: checked })}
                      />
                    </div>

                    {isCounter && (
                      <>
                        <Divider className="border-gray-1 border-dashed" />
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-gray-13">Prevent Negative</div>
                            <div className="text-[10px] text-gray-6">Safety check for 0</div>
                          </div>
                          <InputSwitch
                            checked={activeQuestion.settings.specific.preventNegative || true}
                            onChange={(checked) => updateNested('specific', { preventNegative: checked })}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="p-3 bg-primary-subtle/10 rounded-lg border border-primary-subtle/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-primary-9">Auto-Generate Number</div>
                      <InputSwitch
                        checked={activeQuestion.settings.specific.autoGenerateValue?.enabled || false}
                        onChange={(checked) => updateNested('specific', { 
                          autoGenerateValue: { ...(activeQuestion.settings.specific.autoGenerateValue || { prefix: '', suffix: '' }), enabled: checked } 
                        })}
                      />
                    </div>
                    {activeQuestion.settings.specific.autoGenerateValue?.enabled ? (
                       <div className="grid grid-cols-2 gap-2 mt-2">
                        <InputText
                          label="Prefix"
                          value={activeQuestion.settings.specific.autoGenerateValue?.prefix || ''}
                          onChange={(v) => updateNested('specific', { 
                            autoGenerateValue: { ...activeQuestion.settings.specific.autoGenerateValue, prefix: v } 
                          })}
                          placeholder="e.g. INV-"
                        />
                        <InputText
                          label="Suffix"
                          value={activeQuestion.settings.specific.autoGenerateValue?.suffix || ''}
                          onChange={(v) => updateNested('specific', { 
                            autoGenerateValue: { ...activeQuestion.settings.specific.autoGenerateValue, suffix: v } 
                          })}
                          placeholder="e.g. -2024"
                        />
                      </div>
                    ) : (
                      <NumberInput
                        label="Default Value"
                        size="xs"
                        value={activeQuestion.settings.specific.customDefaultValue || undefined}
                        onChange={(v) => updateNested('specific', { customDefaultValue: v })}
                        placeholder="Enter starting value"
                      />
                    )}
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                    <InputText
                      label='Prefix Label'
                      value={activeQuestion.settings.specific.prefixLabel || ''}
                      onChange={(val: string) => updateNested('specific', { prefixLabel: val })}
                      placeholder="e.g. $"
                    />
                    <InputText
                      label='Suffix Label'
                      value={activeQuestion.settings.specific.suffixLabel || ''}
                      onChange={(val: string) => updateNested('specific', { suffixLabel: val })}
                      placeholder="e.g. kg"
                    />
                  </div>
               </div>
             )}

             {isDate && (
               <div className="space-y-4">
                  <div>
                    <label className='mb-2 block text-13 font-medium text-gray-11'>
                      Default Value Mode
                    </label>
                    <InputSelect
                      options={dateDefaultOptions}
                      placeholder="Select mode"
                      value={dateDefaultOptions.find(o => o.id === activeQuestion.settings.specific.dateDefaultValueType) || dateDefaultOptions[0]}
                      onChange={(val) => val && updateNested('specific', { dateDefaultValueType: val.id })}
                    />
                  </div>

                  {activeQuestion.settings.specific.dateDefaultValueType === 'CUSTOM' && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-1">
                      <label className='mb-2 block text-[11px] font-bold text-gray-8 uppercase'>
                        Pick Fixed Date
                      </label>
                      <input 
                        type="date" 
                        className="w-full bg-white border border-gray-1 rounded px-2 py-1 text-sm outline-none focus:border-primary-8"
                        value={activeQuestion.settings.specific.defaultValue || ''}
                        onChange={(e) => updateNested('specific', { defaultValue: e.target.value })}
                      />
                    </div>
                  )}

                  {activeQuestion.settings.specific.dateDefaultValueType === 'PARENT_FIELD' && (
                    <div className="p-3 bg-primary-subtle/5 rounded-lg border border-primary-subtle/10 space-y-3">
                       <label className='block text-[11px] font-bold text-primary-9 uppercase'>
                        Parent Date Link
                      </label>
                      <InputSelect
                        options={[{ id: '1', name: 'Field: Request Date' }, { id: '2', name: 'Field: Submission Date' }]}
                        placeholder="Select source field"
                        value={null}
                        onChange={() => {}}
                      />
                      <div className="flex items-center gap-2">
                        <NumberInput
                          label="Days Offset"
                          size="xs"
                          className="flex-1"
                          placeholder="0"
                          value={activeQuestion.settings.specific.parentDateOffset || 0}
                          onChange={(v) => updateNested('specific', { parentDateOffset: v })}
                        />
                        <div className="text-xs mt-5 text-gray-6 italic">(+ For Future, - For Past)</div>
                      </div>
                    </div>
                  )}
               </div>
             )}

             {isTime && (
               <div className="space-y-4">
                  <div>
                    <label className='mb-2 block text-13 font-medium text-gray-11'>
                      Default Value Mode
                    </label>
                    <InputSelect
                      options={timeDefaultOptions}
                      placeholder="Select mode"
                      value={timeDefaultOptions.find(o => o.id === activeQuestion.settings.specific.timeDefaultValueType) || timeDefaultOptions[0]}
                      onChange={(val) => val && updateNested('specific', { timeDefaultValueType: val.id })}
                    />
                  </div>

                  {activeQuestion.settings.specific.timeDefaultValueType === 'CUSTOM' && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-1">
                      <label className='mb-2 block text-[11px] font-bold text-gray-8 uppercase'>
                        Pick Fixed Time
                      </label>
                      <input 
                        type="time" 
                        className="w-full bg-white border border-gray-1 rounded px-2 py-1 text-sm outline-none focus:border-primary-8"
                        value={activeQuestion.settings.specific.defaultValue || ''}
                        onChange={(e) => updateNested('specific', { defaultValue: e.target.value })}
                      />
                    </div>
                  )}
               </div>
             )}

              {isFileUpload && (
                <div className="space-y-4">
                  <InputSwitch
                    label="Allow Multiple Files"
                    checked={activeQuestion.settings.specific.allowMultipleFiles}
                    onChange={(v) => updateNested('specific', { allowMultipleFiles: v })}
                  />
                  <InputSwitch
                    label="Enable QR Upload"
                    checked={activeQuestion.settings.specific.qrCodeEnabled !== false}
                    onChange={(v) => updateNested('specific', { qrCodeEnabled: v })}
                  />
                  <InputSwitch
                    label="File in Stage Only"
                    checked={activeQuestion.settings.specific.fileInStageOnly}
                    onChange={(v) => updateNested('specific', { fileInStageOnly: v })}
                  />
                </div>
              )}

              {isTextBuilder && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className='block text-13 font-medium text-gray-11'>Default Content</label>
                    <div className="border rounded-lg bg-white overflow-hidden">
                      <div className="flex items-center gap-1 p-1 bg-gray-50 border-b border-gray-1">
                        <Icon name="lucide:bold" width={14} height={14} className="p-1 rounded hover:bg-white text-gray-4" />
                        <Icon name="lucide:italic" width={14} height={14} className="p-1 rounded hover:bg-white text-gray-4" />
                        <div className="w-px h-3 bg-gray-2 mx-1" />
                        <Icon name="lucide:list" width={14} height={14} className="p-1 rounded hover:bg-white text-gray-4" />
                        <div className="flex items-center gap-1 ml-auto px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold cursor-pointer hover:bg-blue-100 transition-colors">
                          <Icon name="lucide:plus" width={10} height={10} />
                          Insert Field
                        </div>
                      </div>
                      <textarea
                        className="w-full p-3 text-sm outline-none resize-none min-h-[120px]"
                        placeholder="Configure your template here..."
                        value={activeQuestion.settings.specific.defaultValue || ''}
                        onChange={(e) => updateNested('specific', { defaultValue: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {isTable && (
                <div className="space-y-6">
                  {/* Columns Builder Simulation */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className='block text-13 font-bold text-gray-12'>Table Columns</label>
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-accent-soft/10 text-accent-primary text-[10px] font-bold cursor-pointer hover:bg-accent-soft/20 transition-colors border border-accent-soft/20">
                        <Icon name="lucide:plus" width={10} height={10} />
                        Add Column
                      </div>
                    </div>
                    <div className="space-y-2">
                      {(activeQuestion.settings.specific.tableColumns || [
                        { id: '1', name: 'Item Name', type: 'SHORT_TEXT', size: 'MEDIUM' },
                        { id: '2', name: 'Qty', type: 'NUMBER', size: 'SMALL' },
                        { id: '3', name: 'Price', type: 'CURRENCY_AMOUNT', size: 'SMALL' }
                      ]).map((col: any) => (
                        <div key={col.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-1 group/col">
                          <div className="flex items-center gap-2">
                            <Icon name="lucide:grip-vertical" width={12} height={12} className="text-gray-3 cursor-grab" />
                            <div className="flex flex-col">
                              <span className="text-[11px] font-bold text-gray-12">{col.name}</span>
                              <span className="text-[9px] text-gray-5 uppercase font-medium">{col.type.replace('_', ' ')} • {col.size}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover/col:opacity-100 transition-opacity">
                            <IconButton icon="lucide:settings" size="xs" variant="ghost" color="gray" />
                            <IconButton icon="lucide:trash-2" size="xs" variant="ghost" color="red" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Divider className="border-gray-1 border-dashed" />

                  {/* Row Management */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className='block text-13 font-medium text-gray-11'>Table Entry Type</label>
                      <SegmentedControl
                        fullWidth
                        size="xs"
                        value={activeQuestion.settings.specific.rowsType || 'ON_DEMAND'}
                        onChange={(v) => updateNested('specific', { rowsType: v })}
                        data={[
                          { label: 'On Demand', value: 'ON_DEMAND' },
                          { label: 'Fixed Rows', value: 'FIXED' }
                        ]}
                        className="bg-gray-50"
                      />
                    </div>

                    {activeQuestion.settings.specific.rowsType === 'FIXED' && (
                      <NumberInput
                        label="Fixed Row Count"
                        size="xs"
                        min={1}
                        max={100}
                        value={activeQuestion.settings.specific.fixedRowCount || 5}
                        onChange={(v) => updateNested('specific', { fixedRowCount: v })}
                      />
                    )}

                    <InputSelect
                      label="Row Selection"
                      options={[
                        { id: 'NONE', name: 'None' },
                        { id: 'SINGLE', name: 'Single Row' },
                        { id: 'MULTIPLE', name: 'Multiple Rows' }
                      ]}
                      value={{
                        id: activeQuestion.settings.specific.rowSelection || 'NONE',
                        name: activeQuestion.settings.specific.rowSelection === 'MULTIPLE' ? 'Multiple Rows' : activeQuestion.settings.specific.rowSelection === 'SINGLE' ? 'Single Row' : 'None'
                      }}
                      onChange={(v) => v && updateNested('specific', { rowSelection: v.id })}
                    />
                  </div>

                  <Divider className="border-gray-1 border-dashed" />

                  {/* Bulk Actions & View */}
                  <div className="space-y-3">
                    <InputSwitch
                      label="Enable Import/Export"
                      checked={activeQuestion.settings.specific.importExportEnabled || false}
                      onChange={(v) => updateNested('specific', { importExportEnabled: v })}
                    />
                    <InputSwitch
                      label="Show Summary Totals"
                      checked={activeQuestion.settings.specific.showSummaryRow || false}
                      onChange={(v) => updateNested('specific', { showSummaryRow: v })}
                    />
                  </div>
                </div>
              )}

              {isRating && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className='block text-13 font-medium text-gray-11'>Icon Type</label>
                    <SegmentedControl
                      fullWidth
                      size="xs"
                      value={activeQuestion.settings.specific.iconType || 'STAR'}
                      onChange={(v) => updateNested('specific', { iconType: v })}
                      data={[
                        { label: 'Star', value: 'STAR' },
                        { label: 'Heart', value: 'HEART' },
                        { label: 'Smiley', value: 'SMILEY' }
                      ]}
                      className="bg-gray-50 drop-shadow-sm"
                    />
                  </div>
                  <NumberInput
                    label="Icon Count"
                    size="xs"
                    min={3}
                    max={10}
                    value={activeQuestion.settings.specific.iconCount || 5}
                    onChange={(v) => updateNested('specific', { iconCount: v })}
                  />
                  <InputSwitch
                    label="Allow Half Rating"
                    checked={activeQuestion.settings.specific.allowHalfRating || false}
                    onChange={(v) => updateNested('specific', { allowHalfRating: v })}
                  />
                </div>
              )}

              {isOpinionScale && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-5 uppercase tracking-wider">Min Label</label>
                      <input
                        type="text"
                        className="w-full bg-gray-50 border border-gray-1 rounded px-2 py-1 text-xs outline-none focus:border-accent-primary transition-all"
                        value={activeQuestion.settings.specific.opinionLabels?.min || 'Not Likely'}
                        onChange={(e: any) => updateNested('specific', { opinionLabels: { ...activeQuestion.settings.specific.opinionLabels, min: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-5 uppercase tracking-wider">Mid Label</label>
                      <input
                        type="text"
                        className="w-full bg-gray-50 border border-gray-1 rounded px-2 py-1 text-xs outline-none focus:border-accent-primary transition-all"
                        value={activeQuestion.settings.specific.opinionLabels?.mid || ''}
                        onChange={(e: any) => updateNested('specific', { opinionLabels: { ...activeQuestion.settings.specific.opinionLabels, mid: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-5 uppercase tracking-wider">Max Label</label>
                      <input
                        type="text"
                        className="w-full bg-gray-50 border border-gray-1 rounded px-2 py-1 text-xs outline-none focus:border-accent-primary transition-all"
                        value={activeQuestion.settings.specific.opinionLabels?.max || 'Extremely Likely'}
                        onChange={(e: any) => updateNested('specific', { opinionLabels: { ...activeQuestion.settings.specific.opinionLabels, max: e.target.value } })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className='block text-13 font-medium text-gray-11'>Scale Range</label>
                    <SegmentedControl
                      fullWidth
                      size="xs"
                      value={(activeQuestion.settings.specific.maxLevel || 10).toString()}
                      onChange={(v) => updateNested('specific', { maxLevel: parseInt(v) })}
                      data={[
                        { label: '0 to 5', value: '5' },
                        { label: '0 to 10', value: '10' }
                      ]}
                      className="bg-gray-50 drop-shadow-sm"
                    />
                  </div>
                </div>
              )}

              {isSignature && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className='block text-13 font-medium text-gray-11'>Pen Color</label>
                    <div className="flex items-center gap-3 p-1">
                      {['#000000', '#0000FF', '#FF0000'].map((color) => (
                        <div
                          key={color}
                          onClick={() => updateNested('specific', { signaturePenColor: color })}
                          style={{ backgroundColor: color }}
                          className={cn(
                            "w-8 h-8 rounded-full cursor-pointer border-2 transition-all hover:scale-105",
                            activeQuestion.settings.specific.signaturePenColor === color ? "border-accent-primary shadow-md scale-110" : "border-white shadow-sm"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                  <InputSwitch
                    label="Allow Multiple Signatures"
                    checked={activeQuestion.settings.specific.allowMultipleSignatures || false}
                    onChange={(v) => updateNested('specific', { allowMultipleSignatures: v })}
                  />
                </div>
              )}

              {isMatrix && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-13 font-medium text-gray-11">Matrix Columns (One per line)</label>
                    <textarea
                      className="w-full min-h-[80px] p-3 text-sm border border-gray-1 rounded-lg outline-none focus:border-accent-primary transition-all resize-none"
                      placeholder="Column 1\nColumn 2"
                      value={activeQuestion.settings.specific.matrixColumns?.join('\n') || ''}
                      onChange={(e) => updateNested('specific', { matrixColumns: e.target.value.split('\n').filter(Boolean) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-13 font-medium text-gray-11">Matrix Rows (One per line)</label>
                    <textarea
                      className="w-full min-h-[80px] p-3 text-sm border border-gray-1 rounded-lg outline-none focus:border-accent-primary transition-all resize-none"
                      placeholder="Row 1\nRow 2"
                      value={activeQuestion.settings.specific.matrixRows?.join('\n') || ''}
                      onChange={(e) => updateNested('specific', { matrixRows: e.target.value.split('\n').filter(Boolean) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-13 font-medium text-gray-11">Selection Type</label>
                    <InputSelect
                      options={[
                        { id: 'SINGLE', name: 'Single Selection (Radio)' },
                        { id: 'MULTIPLE', name: 'Multiple Selection (Checkbox)' }
                      ]}
                      value={{
                        id: activeQuestion.settings.specific.matrixSelectionType || 'SINGLE',
                        name: activeQuestion.settings.specific.matrixSelectionType === 'MULTIPLE' ? 'Multiple Selection (Checkbox)' : 'Single Selection (Radio)'
                      }}
                      onChange={(v) => v && updateNested('specific', { matrixSelectionType: v.id })}
                    />
                  </div>
                </div>
              )}

              {isYesNoToggle && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <InputText
                      label="Yes Label"
                      placeholder="Yes"
                      value={activeQuestion.settings.specific.yesLabel || ''}
                      onChange={(val: string) => updateNested('specific', { yesLabel: val })}
                    />
                    <InputText
                      label="No Label"
                      placeholder="No"
                      value={activeQuestion.settings.specific.noLabel || ''}
                      onChange={(val: string) => updateNested('specific', { noLabel: val })}
                    />
                  </div>
                  <InputSwitch
                    label="Show icons (Check/Cross)"
                    checked={activeQuestion.settings.specific.showYesNoIcons !== false}
                    onChange={(v) => updateNested('specific', { showYesNoIcons: v })}
                  />
                </div>
              )}

              {isFullName && (
                <div className="space-y-4">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-1 space-y-3">
                    <div className="text-xs font-bold text-gray-8 uppercase tracking-wider">Field Options</div>
                    <div className="grid grid-cols-2 gap-2">
                       <InputSwitch 
                        label="First Name Required" 
                        checked={activeQuestion.settings.specific.requireFirst !== false} 
                        onChange={(v) => updateNested('specific', { requireFirst: v })}
                       />
                       <InputSwitch 
                        label="Last Name Required" 
                        checked={activeQuestion.settings.specific.requireLast !== false} 
                        onChange={(v) => updateNested('specific', { requireLast: v })}
                       />
                       <InputSwitch 
                        label="Show Middle Name" 
                        checked={activeQuestion.settings.specific.showMiddle || false} 
                        onChange={(v) => updateNested('specific', { showMiddle: v })}
                       />
                    </div>
                  </div>
                </div>
              )}

              {isFIB && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-13 font-medium text-gray-11">Blanks Mapping (e.g. {1})</label>
                    <textarea
                      className="w-full min-h-[100px] p-3 text-sm border border-gray-1 rounded-lg outline-none focus:border-accent-primary transition-all resize-none font-mono"
                      placeholder="{1}: field_id_1\n{2}: field_id_2"
                      value={activeQuestion.settings.specific.fibMapping || ''}
                      onChange={(e) => updateNested('specific', { fibMapping: e.target.value })}
                    />
                    <div className="text-[10px] text-gray-6">Map bracketed numbers to other form fields for dynamic substitution.</div>
                  </div>
                </div>
              )}

              {isAddress && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-13 font-medium text-gray-11">Address Mode</label>
                    <InputSelect
                      options={[
                        { id: 'INTERNATIONAL', name: 'International (Freeform)' },
                        { id: 'SPECIFIC', name: 'Specific Country Format' }
                      ]}
                      value={{
                        id: activeQuestion.settings.specific.addressMode || 'INTERNATIONAL',
                        name: activeQuestion.settings.specific.addressMode === 'SPECIFIC' ? 'Specific Country Format' : 'International (Freeform)'
                      }}
                      onChange={(v) => v && updateNested('specific', { addressMode: v.id })}
                    />
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-1 space-y-3">
                    <div className="text-xs font-bold text-gray-8 uppercase tracking-wider">Required Fields</div>
                    <div className="grid grid-cols-2 gap-2">
                       <InputSwitch label="Street" checked={true} disabled />
                       <InputSwitch label="City" checked={true} disabled />
                       <InputSwitch 
                        label="State" 
                        checked={activeQuestion.settings.specific.requireState !== false} 
                        onChange={(v) => updateNested('specific', { requireState: v })}
                       />
                       <InputSwitch 
                        label="Postal Code" 
                        checked={activeQuestion.settings.specific.requirePostalCode !== false} 
                        onChange={(v) => updateNested('specific', { requirePostalCode: v })}
                       />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </SettingsSection>
        )}

      {/* 3. VALIDATION SECTION */}
      {!isDivider && (isShortText || isLongText || isNumber || isDate || isTime || isSelect || isCurrency || isCalculated || isCountryCode || isFileUpload || isPassword || isTable || isRating || isOpinionScale || isSignature || isMatrix || isYesNoToggle || isAddress || isFIB || isFullName) && (
        <SettingsSection
          icon="lucide:shield-check"
          isOpen={openValidation}
          onToggle={() => setOpenValidation(!openValidation)}
          title="Validation Rules"
          variant="premium"
        >
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="p-2 bg-accent-soft/5 rounded-lg border border-accent-soft/10 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-gray-8">Mandatory</div>
                <div className="text-[10px] text-gray-6">Field cannot be empty</div>
              </div>
              <InputSwitch
                checked={activeQuestion.settings.validation.fieldRule === 'REQUIRED'}
                onChange={(checked) => updateNested('validation', { fieldRule: checked ? 'REQUIRED' : 'OPTIONAL' })}
              />
            </div>

            {isCurrency && (
              <>
                <Divider className="border-gray-1 border-dashed" />
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-gray-8">Require Currency Unit</div>
                    <div className="text-[10px] text-gray-6">Both currency and amount are needed</div>
                  </div>
                  <InputSwitch
                    checked={activeQuestion.settings.validation.requireCurrencyUnit || false}
                    onChange={(checked) => updateNested('validation', { requireCurrencyUnit: checked })}
                  />
                </div>
              </>
            )}

            {isCalculated && (
              <>
                <Divider className="border-gray-1 border-dashed" />
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-gray-8">Set Calculated Field</div>
                    <div className="text-[10px] text-gray-6">Enable automatic formula engine</div>
                  </div>
                  <InputSwitch
                    checked={activeQuestion.settings.validation.isCalculationEnabled || false}
                    onChange={(checked) => updateNested('validation', { isCalculationEnabled: checked })}
                  />
                </div>
              </>
            )}
          </div>

          {(isShortText || isLongText || isNumber || isTime) && (
            <div>
              <label className='mb-2 block text-13 font-medium text-gray-11'>
                {isNumber ? 'Number Format' : isTime ? 'Time Format' : 'Validation Type'}
              </label>
              <InputSelect
                 options={isTime ? timeFormatOptions.map(o => ({ id: o.value, name: o.label })) : validationOptions}
                 placeholder={isNumber ? "Select numeric format" : isTime ? "Select display format" : "e.g. Email, Alpha..."}
                 value={isTime 
                   ? (timeFormatOptions.find(o => o.value === activeQuestion.settings.validation.timeFormat) 
                      ? { id: activeQuestion.settings.validation.timeFormat!, name: timeFormatOptions.find(o => o.value === activeQuestion.settings.validation.timeFormat)!.label }
                      : { id: '12', name: '12 Hour' })
                   : (validationOptions.find(o => o.id === activeQuestion.settings.validation.contentRule) || validationOptions[0])
                 }
                 onChange={(val) => val && updateNested('validation', isTime ? { timeFormat: val.id } : { contentRule: val.id })}
              />
            </div>
          )}

          {isNumber && (activeQuestion.settings.validation.contentRule === 'DECIMAL' || activeQuestion.settings.validation.contentRule === 'BOTH') && (
            <NumberInput
              label="Decimal Digits"
              size="xs"
              min={0}
              max={10}
              value={activeQuestion.settings.validation.decimalDigits || 0}
              onChange={(v) => updateNested('validation', { decimalDigits: v })}
            />
          )}
          {isDate && (
             <div className="space-y-4">
                <div>
                  <label className='mb-2 block text-13 font-medium text-gray-11'>
                    Date Limits
                  </label>
                  <InputSelect
                    options={dateLimitOptions}
                    value={dateLimitOptions.find(o => o.id === activeQuestion.settings.validation.dateLimitType) || dateLimitOptions[0]}
                    onChange={(val) => val && updateNested('validation', { dateLimitType: val.id })}
                  />
                </div>

                {activeQuestion.settings.validation.dateLimitType === 'MIN_DATE' && (
                  <div className="grid grid-cols-2 gap-3 items-end">
                    <NumberInput
                      label="Years from Current"
                      size="xs"
                      placeholder="0"
                      value={activeQuestion.settings.validation.minDateOffset || 0}
                      onChange={(v) => updateNested('validation', { minDateOffset: v })}
                    />
                    <div className="pb-2 text-[10px] text-gray-6 italic">Current date is default min.</div>
                  </div>
                )}

                {activeQuestion.settings.validation.dateLimitType === 'MAX_DATE' && (
                  <div className="grid grid-cols-2 gap-3 items-end">
                    <NumberInput
                      label="Years from Current"
                      size="xs"
                      placeholder="0"
                      value={activeQuestion.settings.validation.maxDateOffset || 0}
                      onChange={(v) => updateNested('validation', { maxDateOffset: v })}
                    />
                    <div className="pb-2 text-[10px] text-gray-6 italic">Current date is default max.</div>
                  </div>
                )}

                {activeQuestion.settings.validation.dateLimitType === 'RANGE' && (
                   <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-1">
                      <div>
                        <label className='block text-[10px] font-bold text-gray-8 mb-1 uppercase'>Start Date</label>
                        <input 
                          type="date" 
                          className="w-full text-xs p-1 border rounded" 
                          value={activeQuestion.settings.validation.fixedStartDate || ''}
                          onChange={(e) => updateNested('validation', { fixedStartDate: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className='block text-[10px] font-bold text-gray-8 mb-1 uppercase'>End Date</label>
                        <input 
                          type="date" 
                          className="w-full text-xs p-1 border rounded" 
                          value={activeQuestion.settings.validation.fixedEndDate || ''}
                          onChange={(e) => updateNested('validation', { fixedEndDate: e.target.value })}
                        />
                      </div>
                   </div>
                )}
             </div>
          )}

          {isTime && (
             <div className="space-y-4">
                <div>
                  <label className='mb-2 block text-13 font-medium text-gray-11'>
                    Time Limits
                  </label>
                  <InputSelect
                    options={timeLimitOptions}
                    value={timeLimitOptions.find(o => o.id === activeQuestion.settings.validation.timeLimitType) || timeLimitOptions[0]}
                    onChange={(val) => val && updateNested('validation', { timeLimitType: val.id })}
                  />
                </div>

                {activeQuestion.settings.validation.timeLimitType === 'MIN_TIME' && (
                  <div className="grid grid-cols-2 gap-3 items-end">
                    <NumberInput
                      label="Max Hours from Now"
                      size="xs"
                      placeholder="0"
                      value={activeQuestion.settings.validation.maxTimeOffset || 0}
                      onChange={(v) => updateNested('validation', { maxTimeOffset: v })}
                    />
                    <div className="pb-2 text-[10px] text-gray-6 italic">Current time is default min.</div>
                  </div>
                )}

                {activeQuestion.settings.validation.timeLimitType === 'MAX_TIME' && (
                  <div className="grid grid-cols-2 gap-3 items-end">
                    <NumberInput
                      label="Min Hours from Now"
                      size="xs"
                      placeholder="0"
                      value={activeQuestion.settings.validation.minTimeOffset || 0}
                      onChange={(v) => updateNested('validation', { minTimeOffset: v })}
                    />
                    <div className="pb-2 text-[10px] text-gray-6 italic">Current time is default max.</div>
                  </div>
                )}

                {activeQuestion.settings.validation.timeLimitType === 'RANGE' && (
                   <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-1">
                      <div>
                        <label className='block text-[10px] font-bold text-gray-8 mb-1 uppercase'>Start Time</label>
                        <input 
                          type="time" 
                          className="w-full text-xs p-1 border rounded" 
                          value={activeQuestion.settings.validation.fixedStartTime || ''}
                          onChange={(e) => updateNested('validation', { fixedStartTime: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className='block text-[10px] font-bold text-gray-8 mb-1 uppercase'>End Time</label>
                        <input 
                          type="time" 
                          className="w-full text-xs p-1 border rounded" 
                          value={activeQuestion.settings.validation.fixedEndTime || ''}
                          onChange={(e) => updateNested('validation', { fixedEndTime: e.target.value })}
                        />
                      </div>
                   </div>
                )}
             </div>
          )}

          {(isNumber && !isDate) ? (
            <div className="space-y-3">
               <div>
                <label className='mb-2 block text-13 font-medium text-gray-11'>
                  Value Range Mode
                </label>
                <InputSelect
                  options={rangeOptions}
                  value={rangeOptions.find(o => o.id === activeQuestion.settings.validation.rangeType) || rangeOptions[0]}
                  onChange={(val) => val && updateNested('validation', { rangeType: val.id })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <NumberInput
                  label="Minimum"
                  size="xs"
                  disabled={activeQuestion.settings.validation.rangeType === 'MIN_FLEX_MAX_FIXED'}
                  placeholder={activeQuestion.settings.validation.rangeType === 'MIN_FLEX_MAX_FIXED' ? "Flexible" : "0"}
                  value={Number(activeQuestion.settings.validation.minimum) || undefined}
                  onChange={(v) => updateNested('validation', { minimum: v })}
                />
                <NumberInput
                  label="Maximum"
                  size="xs"
                  disabled={activeQuestion.settings.validation.rangeType === 'MIN_FIXED_MAX_FLEX'}
                  placeholder={activeQuestion.settings.validation.rangeType === 'MIN_FIXED_MAX_FLEX' ? "Flexible" : "100"}
                  value={Number(activeQuestion.settings.validation.maximum) || undefined}
                  onChange={(v) => updateNested('validation', { maximum: v })}
                />
              </div>
            </div>
          ) : (isNumber || isCurrency) ? (
            <div className="grid grid-cols-2 gap-3">
              <NumberInput
                label="Min Value"
                size="xs"
                placeholder="0"
                value={Number(activeQuestion.settings.validation.minimum) || undefined}
                onChange={(v) => updateNested('validation', { minimum: v })}
              />
              <NumberInput
                label="Max Value"
                size="xs"
                placeholder="1000000"
                value={Number(activeQuestion.settings.validation.maximum) || undefined}
                onChange={(v) => updateNested('validation', { maximum: v })}
              />
              {isCurrency && (
                <div className="col-span-2">
                  <NumberInput
                    label="Decimal Precision"
                    size="xs"
                    description="Number of decimal places (e.g. 2 for 0.00)"
                    min={0}
                    max={4}
                    value={activeQuestion.settings.specific.decimalPrecision || 2}
                    onChange={(v) => updateNested('specific', { decimalPrecision: v })}
                  />
                </div>
              )}
            </div>
          ) : (isShortText || isLongText || isNumber || isTime || isCountryCode || isPassword || isTextBuilder) && (
            <div className="grid grid-cols-2 gap-3">
              <NumberInput
                label={isCountryCode ? "Min Code Length" : isMulti ? "Min Selections" : "Min Length"}
                size="xs"
                placeholder={isPassword ? "8" : "0"}
                value={Number(activeQuestion.settings.validation.minimum) || undefined}
                onChange={(v) => updateNested('validation', { minimum: v })}
              />
              <NumberInput
                label={isCountryCode ? "Max Code Length" : isMulti ? "Max Selections" : "Max Length"}
                size="xs"
                placeholder={isPassword ? "16" : isCountryCode ? "5" : isMulti ? "10" : "2000"}
                value={Number(activeQuestion.settings.validation.maximum) || undefined}
                onChange={(v) => updateNested('validation', { maximum: v })}
              />
            </div>
          )}

          {isFileUpload && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-gray-7">Allowed File Types</div>
                <div className="flex flex-wrap gap-2">
                  {['pdf', 'jpg', 'png', 'docx', 'xlsx'].map(ext => (
                    <div 
                      key={ext}
                      onClick={() => {
                        const current = activeQuestion.settings.validation.allowedFileTypes || []
                        const next = current.includes(ext) ? current.filter(t => t !== ext) : [...current, ext]
                        updateNested('validation', { allowedFileTypes: next })
                      }}
                      className={cn(
                        "px-2 py-1 rounded border text-[10px] font-bold uppercase cursor-pointer transition-colors",
                        (activeQuestion.settings.validation.allowedFileTypes || []).includes(ext)
                          ? "bg-accent-soft border-accent-primary text-accent-primary"
                          : "bg-gray-50 border-gray-1 text-gray-4 hover:border-gray-3"
                      )}
                    >
                      {ext}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <NumberInput
                  label="Max File Size (MB)"
                  size="xs"
                  placeholder="5"
                  value={Number(activeQuestion.settings.validation.maxFileSize) || undefined}
                  onChange={(v) => updateNested('validation', { maxFileSize: v })}
                />
                <InputSelect
                  label="Expiry Field"
                  placeholder="Select Date Field"
                  options={allQuestions
                    .filter(q => q.type === 'DATE' && q.id !== activeQuestion.id)
                    .map(q => ({ id: q.id, name: q.label }))
                  }
                  value={activeQuestion.settings.validation.expiryFieldId ? { id: activeQuestion.settings.validation.expiryFieldId, name: allQuestions.find(q => q.id === activeQuestion.settings.validation.expiryFieldId)?.label || 'Selected Field' } : null}
                  onChange={(v) => updateNested('validation', { expiryFieldId: v?.id || null })}
                />
              </div>

              <div className="p-3 rounded-lg bg-gray-50 border border-gray-1 border-dashed space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-gray-8">Auto-Fill Mapping</div>
                  <IconButton icon="lucide:settings-2" size="xs" variant="ghost" />
                </div>
                <div className="text-[11px] text-gray-5">Map document data to form fields via AI OCR.</div>
              </div>
            </div>
          )}
        </div>
      </SettingsSection>
      )}

      {/* 4. DATA LOOKUP SECTION */}
      {!isDivider && (isLongText || isNumber || isDate || isTime || isSelect) && (
        <SettingsSection
          icon="lucide:database"
          isOpen={openLookup}
          onToggle={() => setOpenLookup(!openLookup)}
          title="Data Lookup (Integration)"
          variant="premium"
        >
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
              <label className='mb-2 block text-13 font-medium text-gray-11'>
                Connection Type
              </label>
              <InputSelect
                options={[
                  { id: 'GOOGLE_SHEETS', name: 'Google Sheets API' },
                  { id: 'SQL', name: 'Internal SQL Database' },
                  { id: 'API', name: 'RESTful API' },
                  { id: 'ORACLE', name: 'Oracle DB' }
                ]}
                placeholder="Select protocol"
                value={[
                  { id: 'GOOGLE_SHEETS', name: 'Google Sheets API' },
                  { id: 'SQL', name: 'Internal SQL Database' },
                  { id: 'API', name: 'RESTful API' },
                  { id: 'ORACLE', name: 'Oracle DB' }
                ].find(o => o.id === activeQuestion.settings.lookupSettings?.connectionType) || null}
                onChange={(val) => val && updateNested('lookupSettings', { connectionType: val.id })}
              />
            </div>

            <div>
              <label className='mb-2 block text-13 font-medium text-gray-11'>
                Lookup Connection
              </label>
              <InputSelect
                options={[{ id: '1', name: 'Main Prod Cluster' }, { id: '2', name: 'Staging Sheet v2' }]}
                placeholder="Select source connection"
                value={[{ id: '1', name: 'Main Prod Cluster' }, { id: '2', name: 'Staging Sheet v2' }].find(o => o.id === String(activeQuestion.settings.lookupSettings?.connectionId)) || null}
                onChange={(val) => val && updateNested('lookupSettings', { connectionId: Number(val.id) })}
              />
            </div>

            <InputText
              label='Hub Name / Collection'
              value={activeQuestion.settings.lookupSettings?.hubName || ''}
              onChange={(val: string) => updateNested('lookupSettings', { hubName: val })}
              placeholder="e.g. users_collection"
            />

            {(isNumber || isDate || isTime || isSelect) && (
              <InputText
                label={isDate ? 'Target Column (Date)' : isTime ? 'Target Column (Time)' : isSelect ? 'Selector Data Source' : 'Target Column (Number)'}
                value={activeQuestion.settings.lookupSettings?.columnName || ''}
                onChange={(val: string) => updateNested('lookupSettings', { columnName: val })}
                placeholder={isDate ? "e.g. birth_date" : isTime ? "e.g. checkin_time" : isSelect ? "e.g. items_list" : "e.g. age, quantity..."}
              />
            )}

            <div className="space-y-2">
              <div className="text-xs font-bold text-gray-11 uppercase tracking-wider">Mapping Configuration</div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-1 border-dashed space-y-2">
                <div className="grid grid-cols-2 gap-2">
                   <div className="text-[10px] font-semibold text-gray-8">External Field</div>
                  <div className="text-[10px] font-semibold text-gray-8">Local Prop</div>
                </div>
                <div className="flex items-center gap-2">
                  <InputText value="" onChange={(v: any) => { console.log(v) }} placeholder="Source Column" readOnly />
                  <Icon name="lucide:arrow-right" width={12} className="text-gray-5" />
                  <InputText value={isSelect ? "Display Label" : "Field Value"} onChange={(v: any) => { console.log(v) }} readOnly />
                </div>
                {isSelect && (
                   <div className="flex items-center gap-2">
                    <InputText value="" onChange={(v: any) => { console.log(v) }} placeholder="ID Column" readOnly />
                    <Icon name="lucide:arrow-right" width={12} className="text-gray-5" />
                    <InputText value="Option Value" onChange={(v: any) => { console.log(v) }} readOnly />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-gray-11 uppercase tracking-wider">Condition Mapping</div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-1 border-dashed">
                <div className="text-[11px] text-gray-6 italic">Define when this lookup should be triggered based on other field values.</div>
                <Button variant="subtle" size="compact-xs" color="gray" fullWidth className="mt-3 border border-gray-1 bg-white">
                  + Add Condition Rule
                </Button>
              </div>
            </div>
          </div>
        </SettingsSection>
      )}

      {/* 5. APPEARANCE & STYLING */}
      {!isLongText && (
        <SettingsSection
          icon="lucide:palette"
          isOpen={openAppearance}
          onToggle={() => setOpenAppearance(!openAppearance)}
          title="Appearance & Icons"
          variant="premium"
        >
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-2 gap-3">
              <InputText
                label='Prefix Icon'
                value={activeQuestion.settings.specific.prefixIcon || ''}
                onChange={(val: string) => updateNested('specific', { prefixIcon: val })}
                placeholder="lucide:user"
                leftSection={activeQuestion.settings.specific.prefixIcon ? <Icon name={activeQuestion.settings.specific.prefixIcon} width={14} height={14} /> : null}
              />
              <InputText
                label='Suffix Icon'
                value={activeQuestion.settings.specific.suffixIcon || ''}
                onChange={(val: string) => updateNested('specific', { suffixIcon: val })}
                placeholder="lucide:info"
                rightSection={activeQuestion.settings.specific.suffixIcon ? <Icon name={activeQuestion.settings.specific.suffixIcon} width={14} height={14} /> : null}
              />
            </div>

            {!isNumber && !isDate && !isSelect && (
              <InputText
                label='Input Mask'
                value={activeQuestion.settings.specific.inputMask || ''}
                onChange={(val: string) => updateNested('specific', { inputMask: val })}
                placeholder="e.g. (###) ###-####"
              />
            )}

            <div>
              <label className='mb-2 block text-13 font-medium text-gray-11'>
                Visual Style
              </label>
              <SegmentedControl
                className="w-full bg-gray-50 border border-gray-1"
                size="xs"
                value={activeQuestion.settings.specific.variant || 'default'}
                onChange={(v) => updateNested('specific', { variant: v })}
                data={[
                  { label: 'Outlined', value: 'default' },
                  { label: 'Filled', value: 'filled' },
                  { label: 'Minimal', value: 'unstyled' },
                ]}
              />
            </div>

            {isDivider && (
               <div className="space-y-4 pt-2">
                 <Divider className="border-gray-1" />
                 <div>
                    <label className='mb-2 block text-13 font-medium text-gray-11 uppercase tracking-tight'>Divider Style</label>
                    <SegmentedControl
                      fullWidth
                      size="xs"
                      data={[
                        { label: 'Solid', value: 'SOLID' },
                        { label: 'Dashed', value: 'DASHED' },
                        { label: 'Dotted', value: 'DOTTED' },
                        { label: 'Double', value: 'DOUBLE' }
                      ]}
                      value={activeQuestion.settings.specific.dividerType || 'SOLID'}
                      onChange={(val) => updateNested('specific', { dividerType: val })}
                      className="bg-gray-50 border border-gray-1"
                    />
                 </div>
               </div>
            )}

            {!isDivider && (
              <div className="flex items-center justify-between py-2 px-1">
                <div>
                  <div className="text-xs font-bold text-gray-13">Read Only</div>
                  <div className="text-[10px] text-gray-6">User cannot edit this field</div>
                </div>
                <InputSwitch
                  checked={activeQuestion.settings.general.readOnly || false}
                  onChange={(checked) => updateNested('general', { readOnly: checked })}
                />
              </div>
            )}
          </div>
        </SettingsSection>
      )}

      {/* 6. ADVANCED SECTION */}
      <SettingsSection
        icon="lucide:zap"
        isOpen={openAdvanced}
        onToggle={() => setOpenAdvanced(!openAdvanced)}
        title="Developer & Advanced"
        variant="premium"
      >
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-1">
            <div className="text-xs font-bold text-gray-11 mb-1 uppercase tracking-wider">Field ID / Key</div>
            <div className="text-xs text-gray-6 font-mono break-all">{activeQuestion.id}</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between py-1">
              <div className="text-xs font-semibold text-gray-11">Pre-fill from URL</div>
              <InputSwitch
                checked={activeQuestion.settings.specific.prefillFromUrl || false}
                onChange={(checked) => updateNested('specific', { prefillFromUrl: checked })}
              />
            </div>

            <div className="flex items-center justify-between py-1">
              <div className="text-xs font-semibold text-gray-11">Unique Value Check</div>
              <InputSwitch
                checked={activeQuestion.settings.specific.uniqueCheck || false}
                onChange={(checked) => updateNested('specific', { uniqueCheck: checked })}
              />
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* 7. LOGIC SECTION */}
      {(!isShortText && !isDate && !isTime) && (
        <SettingsSection
          icon="lucide:split"
          isOpen={openLogic}
          onToggle={() => setOpenLogic(!openLogic)}
          title="Field Logic"
          variant="premium"
        >
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-2 text-center">
              <div className="text-sm font-semibold text-gray-9 mb-1">Visibility Logic</div>
              <div className="text-[11px] text-gray-5 mb-3">
                Set rules to show or hide this field based on other responses.
              </div>
              <Button variant="subtle" color="primary" size="xs">
                + Add Rule
              </Button>
            </div>
          </div>
        </SettingsSection>
      )}
    </div>
  )
}

export default QuestionSettings
