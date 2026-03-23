import { Text, Divider, Button, Switch, SegmentedControl, NumberInput } from '@mantine/core'
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

  const updateNested = (path: 'general' | 'validation' | 'specific', updates: any) => {
    updateQuestion(activeQuestion.id, (q: Question) => ({
      ...q,
      settings: {
        ...q.settings,
        [path]: { ...(q.settings[path] as any), ...updates }
      }
    }))
  }

  const isShortText = activeQuestion.type === 'SHORT_TEXT'

  const validationOptions = [
    { id: 'TEXT', name: 'Text (Allows any character)' },
    { id: 'ALPHA', name: 'Alpha (Letters only)' },
    { id: 'ALPHA_SPACES', name: 'Alpha Spaces (Letters & Spaces)' },
    { id: 'ALPHA_DASH', name: 'Alpha Dash (Alphanumeric, - , _)' },
    { id: 'ALPHA_NUMERIC', name: 'Alpha Numeric (Letters & Numbers)' },
    { id: 'EMAIL', name: 'Email (Valid email format)' },
    { id: 'WEB', name: 'Web (Valid URL format)' },
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

          <div className="flex items-center justify-between py-2 px-1 bg-gray-50/50 rounded-lg border border-gray-1">
             <Text size="xs" fw={600} className="text-gray-11">Hide Label</Text>
             <Switch
                size="xs"
                checked={activeQuestion.settings.general.hideLabel || false}
                onChange={(e) => updateNested('general', { hideLabel: e.currentTarget.checked })}
              />
          </div>

          <Input
            label='Placeholder'
            value={localPlaceholder}
            onChange={(val: string) => setLocalPlaceholder(val)}
            onBlur={() => updateNested('general', { placeholder: localPlaceholder })}
            placeholder="e.g. Type here..."
          />

          <Input
            label='Default Value'
            value={localDefaultValue}
            onChange={(val: string) => setLocalDefaultValue(val)}
            onBlur={() => updateNested('specific', { defaultValue: localDefaultValue })}
            placeholder="Pre-defined answer"
          />

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

          {isShortText && (
            <div className="flex items-center justify-between py-2 px-3 bg-primary-subtle/20 rounded-lg border border-primary-subtle/30">
              <div>
                <Text size="xs" fw={700} className="text-primary-9">Answer Status Indicator</Text>
                <Text size="10px" className="text-gray-9">Track progress for this field</Text>
              </div>
              <Switch
                size="xs"
                color="primary"
                checked={activeQuestion.settings.specific.showStatusIndicator || false}
                onChange={(e) => updateNested('specific', { showStatusIndicator: e.currentTarget.checked })}
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
                options={[{ id: 'col-12', name: '100% Full Width' }, { id: 'col-6', name: '50% Half Width' }, { id: 'col-4', name: '33% Column' }]}
                placeholder="Select width"
                value={
                  [{ id: 'col-12', name: '100% Full Width' }, { id: 'col-6', name: '50% Half Width' }, { id: 'col-4', name: '33% Column' }]
                    .find(o => o.id === activeQuestion.settings.general.size) || { id: 'col-12', name: '100% Full Width' }
                }
                onChange={(val) => val && updateNested('general', { size: val.id })}
              />
            </div>

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
          </div>
        </div>
      </SettingsSection>

      {/* 2. VALIDATION SECTION */}
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

          {isShortText && (
            <div>
               <label className='mb-2 block text-13 font-medium text-gray-11'>
                Validation Type
              </label>
              <InputSelect
                options={validationOptions}
                placeholder="e.g. Email, Alpha..."
                value={validationOptions.find(o => o.id === activeQuestion.settings.validation.contentRule) || validationOptions[0]}
                onChange={(val) => val && updateNested('validation', { contentRule: val.id })}
              />
            </div>
          )}

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
              placeholder="255"
              value={Number(activeQuestion.settings.validation.maximum) || undefined}
              onChange={(v) => updateNested('validation', { maximum: v })}
            />
          </div>

          {!isShortText && (
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

      {/* 3. APPEARANCE & STYLING (New) */}
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

          <Input
            label='Input Mask'
            value={activeQuestion.settings.specific.inputMask || ''}
            onChange={(val: string) => updateNested('specific', { inputMask: val })}
            placeholder="e.g. (###) ###-####"
          />

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
             <Switch
                size="xs"
                checked={activeQuestion.settings.specific.dense || false}
                onChange={(e) => updateNested('specific', { dense: e.currentTarget.checked })}
              />
          </div>
        </div>
      </SettingsSection>

      {/* 4. ADVANCED SECTION (New) */}
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
              <Switch
                size="xs"
                checked={activeQuestion.settings.specific.prefillFromUrl || false}
                onChange={(e) => updateNested('specific', { prefillFromUrl: e.currentTarget.checked })}
              />
            </div>

            <div className="flex items-center justify-between py-1">
              <Text size="xs" fw={600} className="text-gray-11">Unique Value Check</Text>
              <Switch
                size="xs"
                checked={activeQuestion.settings.specific.uniqueCheck || false}
                onChange={(e) => updateNested('specific', { uniqueCheck: e.currentTarget.checked })}
              />
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* 5. LOGIC SECTION */}
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
