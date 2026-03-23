import { Text, Divider, Button, SegmentedControl, NumberInput } from '@mantine/core'
import { useFormStore } from '@/pages/form-builder/store/formStore'
import type { Question } from '@/pages/form-builder/store/formStore'
import Icon from '@/components/base/icon/Icon'
import Input from '@/components/base/inputs/InputText'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import SettingsSection from '../../../../common/SettingsSection'
import { useState, useEffect } from 'react'

interface QuestionSettingsProps {
  activeQuestion: Question
}

const QuestionSettings = ({ activeQuestion }: QuestionSettingsProps) => {
  const updateQuestion = useFormStore((state) => state.updateQuestion)

  const [openSetup, setOpenSetup] = useState(true)
  const [openValidation, setOpenValidation] = useState(false)
  const [openAppearance, setOpenAppearance] = useState(false)
  const [openAdvanced, setOpenAdvanced] = useState(false)
  const [openLogic, setOpenLogic] = useState(false)
  const [openLookup, setOpenLookup] = useState(true)
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
  const isNumber = activeQuestion.type === 'NUMBER'

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
          <Input
            label='Field Label'
            value={localLabel}
            onChange={(val: string) => setLocalLabel(val)}
            onBlur={() => updateQuestion(activeQuestion.id, { label: localLabel })}
            placeholder="e.g. What is your name?"
          />

          {(isLongText || isNumber) && (
            <Input
              label='Display Label (Internal)'
              value={activeQuestion.displayLabel || ''}
              onChange={(val: string) => updateQuestion(activeQuestion.id, { displayLabel: val })}
              placeholder="Alternative visual name"
            />
          )}

          <div className="flex items-center justify-between py-2 px-1 bg-gray-50/50 rounded-lg border border-gray-1">
            <Text size="xs" fw={600} className="text-gray-11">Hide Label</Text>
            <InputSwitch
              checked={activeQuestion.settings.general.hideLabel || false}
              onChange={(checked) => updateNested('general', { hideLabel: checked })}
            />
          </div>

          <Input
            label='Placeholder'
            value={localPlaceholder}
            onChange={(val: string) => setLocalPlaceholder(val)}
            onBlur={() => updateNested('general', { placeholder: localPlaceholder })}
            placeholder={isNumber ? "0" : "e.g. Type here..."}
          />

          {!isNumber && (
            <Input
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

          {(isLongText || isNumber) && (
            <Input
              label='Tooltip (Hover Text)'
              value={activeQuestion.settings.general.tooltip || ''}
              onChange={(val: string) => updateNested('general', { tooltip: val })}
              placeholder="Explanation on hover"
            />
          )}

          {(isShortText || isLongText || isNumber) && (
            <div className="flex items-center justify-between py-2 px-3 bg-primary-subtle/20 rounded-lg border border-primary-subtle/30">
              <div>
                <Text size="xs" fw={700} className="text-primary-9">Answer Status Indicator</Text>
                <Text size="10px" className="text-gray-9">Track progress for this field</Text>
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
                options={(isLongText || isNumber) ? sizeOptions : [{ id: 'col-12', name: '100% Full Width' }, { id: 'col-6', name: '50% Half Width' }, { id: 'col-4', name: '33% Column' }]}
                placeholder="Select width"
                value={
                  ((isLongText || isNumber) ? sizeOptions : [{ id: 'col-12', name: '100% Full Width' }, { id: 'col-6', name: '50% Half Width' }, { id: 'col-4', name: '33% Column' }])
                    .find(o => o.id === activeQuestion.settings.general.size) || { id: 'col-12', name: '100% Full Width' }
                }
                onChange={(val) => val && updateNested('general', { size: val.id })}
              />
            </div>

            {(isLongText || isNumber) && (
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

            {!isLongText && !isNumber && (
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-2 p-3 rounded-xl border border-gray-1 bg-gray-50/30">
                  <Text size="xs" fw={700} className="text-gray-13">Read Only</Text>
                  <InputSwitch
                    checked={activeQuestion.settings.general.readOnly || false}
                    onChange={(checked) => updateNested('general', { readOnly: checked })}
                  />
                </div>
                <div className="flex flex-col gap-2 p-3 rounded-xl border border-gray-1 bg-gray-50/30">
                  <Text size="xs" fw={700} className="text-gray-13">Hidden Field</Text>
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

      {/* 2. SPECIFIC SETTINGS (New for Number) */}
      {isNumber && (
        <SettingsSection
          icon="lucide:sliders"
          isOpen={openSpecific}
          onToggle={() => setOpenSpecific(!openSpecific)}
          title="Number Config"
          variant="premium"
        >
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="p-3 bg-primary-subtle/10 rounded-lg border border-primary-subtle/20 space-y-3">
                <div className="flex items-center justify-between">
                  <Text size="xs" fw={700} className="text-primary-9">Auto-Generate Number</Text>
                  <InputSwitch
                    checked={activeQuestion.settings.specific.autoGenerateValue?.enabled || false}
                    onChange={(checked) => updateNested('specific', { 
                      autoGenerateValue: { ...(activeQuestion.settings.specific.autoGenerateValue || { prefix: '', suffix: '' }), enabled: checked } 
                    })}
                  />
                </div>
                {activeQuestion.settings.specific.autoGenerateValue?.enabled ? (
                   <div className="grid grid-cols-2 gap-2 mt-2">
                    <Input
                      label="Prefix"
                      value={activeQuestion.settings.specific.autoGenerateValue?.prefix || ''}
                      onChange={(v) => updateNested('specific', { 
                        autoGenerateValue: { ...activeQuestion.settings.specific.autoGenerateValue, prefix: v } 
                      })}
                      placeholder="e.g. INV-"
                    />
                    <Input
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
                <Input
                  label='Prefix Label'
                  value={activeQuestion.settings.specific.prefixLabel || ''}
                  onChange={(val: string) => updateNested('specific', { prefixLabel: val })}
                  placeholder="e.g. $"
                />
                <Input
                  label='Suffix Label'
                  value={activeQuestion.settings.specific.suffixLabel || ''}
                  onChange={(val: string) => updateNested('specific', { suffixLabel: val })}
                  placeholder="e.g. kg"
                />
             </div>
          </div>
        </SettingsSection>
      )}

      {/* 3. VALIDATION SECTION */}
      <SettingsSection
        icon="lucide:shield-check"
        isOpen={openValidation}
        onToggle={() => setOpenValidation(!openValidation)}
        title="Validation Rules"
        variant="premium"
      >
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between py-2 px-1 bg-accent-soft/5 rounded-lg border border-accent-soft/10">
            <div>
              <Text size="xs" fw={700} className="text-accent-primary">Mandatory</Text>
              <Text size="10px" className="text-gray-9">User must fill this field</Text>
            </div>
            <InputSwitch
              checked={activeQuestion.settings.validation.fieldRule === 'REQUIRED'}
              onChange={(checked) => updateNested('validation', { fieldRule: checked ? 'REQUIRED' : 'OPTIONAL' })}
            />
          </div>

          {(isShortText || isLongText || isNumber) && (
            <div>
              <label className='mb-2 block text-13 font-medium text-gray-11'>
                {isNumber ? 'Number Format' : 'Validation Type'}
              </label>
              <InputSelect
                options={validationOptions}
                placeholder={isNumber ? "Select numeric format" : "e.g. Email, Alpha..."}
                value={validationOptions.find(o => o.id === activeQuestion.settings.validation.contentRule) || validationOptions[0]}
                onChange={(val) => val && updateNested('validation', { contentRule: val.id })}
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

          {isNumber ? (
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
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <NumberInput
                label="Min Length"
                size="xs"
                placeholder="0"
                value={Number(activeQuestion.settings.validation.minimum) || undefined}
                onChange={(v) => updateNested('validation', { minimum: v })}
              />
              <NumberInput
                label="Max Length"
                size="xs"
                placeholder="2000"
                value={Number(activeQuestion.settings.validation.maximum) || undefined}
                onChange={(v) => updateNested('validation', { maximum: v })}
              />
            </div>
          )}

          {!isShortText && !isLongText && !isNumber && (
            <>
              <Input
                label='Regex Pattern'
                value={activeQuestion.settings.validation.pattern || ''}
                onChange={(val: string) => updateNested('validation', { pattern: val })}
                placeholder="e.g. ^[0-9]+$"
              />

              <Input
                label='Custom Error Message'
                value={activeQuestion.settings.validation.errorMessage || ''}
                onChange={(val: string) => updateNested('validation', { errorMessage: val })}
                placeholder="Displayed on failure"
              />
            </>
          )}
        </div>
      </SettingsSection>

      {/* 4. DATA LOOKUP SECTION */}
      {(isLongText || isNumber) && (
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
                Lookup Connection
              </label>
              <InputSelect
                options={[{ id: '1', name: 'Google Sheets API' }, { id: '2', name: 'Internal SQL Database' }]}
                placeholder="Select source connection"
                value={[{ id: '1', name: 'Google Sheets API' }, { id: '2', name: 'Internal SQL Database' }].find(o => o.id === String(activeQuestion.settings.lookupSettings.connectionId)) || null}
                onChange={(val) => val && updateNested('lookupSettings', { connectionId: Number(val.id) })}
              />
            </div>

            <Input
              label='Hub Name / Collection'
              value={activeQuestion.settings.lookupSettings.hubName || ''}
              onChange={(val: string) => updateNested('lookupSettings', { hubName: val })}
              placeholder="e.g. users_collection"
            />

            {isNumber && (
              <Input
                label='Target Column (Number)'
                value={activeQuestion.settings.lookupSettings.columnName || ''}
                onChange={(val: string) => updateNested('lookupSettings', { columnName: val })}
                placeholder="e.g. age, quantity..."
              />
            )}

            <div className="space-y-2">
              <Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider">Value Mapping</Text>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-1 border-dashed space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Text size="10px" fw={600} className="text-gray-8">Source Column</Text>
                  <Text size="10px" fw={600} className="text-gray-8">Target Field</Text>
                </div>
                <div className="flex items-center gap-2">
                  <Input value="" onChange={(v) => { console.log(v) }} placeholder="Source Column" readOnly />
                  <Icon name="lucide:arrow-right" width={12} className="text-gray-5" />
                  <Input value="This Field" onChange={(v) => { console.log(v) }} readOnly />
                </div>
                {!isNumber && (
                  <Button variant="subtle" size="compact-xs" color="gray" fullWidth className="mt-2 border border-gray-1 bg-white">
                    + Add Mapping
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider">Condition Mapping</Text>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-1 border-dashed">
                <Text size="11px" className="text-gray-6 italic">Define when this lookup should be triggered based on other field values.</Text>
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
              <Input
                label='Prefix Icon'
                value={activeQuestion.settings.specific.prefixIcon || ''}
                onChange={(val: string) => updateNested('specific', { prefixIcon: val })}
                placeholder="lucide:user"
                leftSection={activeQuestion.settings.specific.prefixIcon ? <Icon name={activeQuestion.settings.specific.prefixIcon} width={14} height={14} /> : null}
              />
              <Input
                label='Suffix Icon'
                value={activeQuestion.settings.specific.suffixIcon || ''}
                onChange={(val: string) => updateNested('specific', { suffixIcon: val })}
                placeholder="lucide:info"
                rightSection={activeQuestion.settings.specific.suffixIcon ? <Icon name={activeQuestion.settings.specific.suffixIcon} width={14} height={14} /> : null}
              />
            </div>

            {!isNumber && (
              <Input
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

            <div className="flex items-center justify-between py-2 px-1">
              <Text size="xs" fw={600} className="text-gray-11">Compact / Dense Mode</Text>
              <InputSwitch
                checked={activeQuestion.settings.specific.dense || false}
                onChange={(checked) => updateNested('specific', { dense: checked })}
              />
            </div>
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
            <Text size="xs" fw={700} className="text-gray-11 mb-1 uppercase tracking-wider">Field ID / Key</Text>
            <Text size="xs" className="text-gray-6 font-mono break-all">{activeQuestion.id}</Text>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between py-1">
              <Text size="xs" fw={600} className="text-gray-11">Pre-fill from URL</Text>
              <InputSwitch
                checked={activeQuestion.settings.specific.prefillFromUrl || false}
                onChange={(checked) => updateNested('specific', { prefillFromUrl: checked })}
              />
            </div>

            <div className="flex items-center justify-between py-1">
              <Text size="xs" fw={600} className="text-gray-11">Unique Value Check</Text>
              <InputSwitch
                checked={activeQuestion.settings.specific.uniqueCheck || false}
                onChange={(checked) => updateNested('specific', { uniqueCheck: checked })}
              />
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* 7. LOGIC SECTION */}
      {!isShortText && (
        <SettingsSection
          icon="lucide:split"
          isOpen={openLogic}
          onToggle={() => setOpenLogic(!openLogic)}
          title="Field Logic"
          variant="premium"
        >
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-2 text-center">
              <Text size="sm" fw={600} className="text-gray-9 mb-1">Visibility Logic</Text>
              <Text size="11px" className="text-gray-5 mb-3">
                Set rules to show or hide this field based on other responses.
              </Text>
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
