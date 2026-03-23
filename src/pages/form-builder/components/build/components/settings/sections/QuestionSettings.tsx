import { Text, Divider, Button } from '@mantine/core'
import { useFormStore } from '@/pages/form-builder/store/formStore'
import type { Question } from '@/pages/form-builder/store/formStore'
// import Icon from '@/components/base/icon/Icon'
import Input from '@/components/base/inputs/InputText'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import SettingsSection from '../../../../common/SettingsSection'
import { useState, useEffect } from 'react'
// import cn from '@/utils/cn'

interface QuestionSettingsProps {
  activeQuestion: Question
}

const QuestionSettings = ({ activeQuestion }: QuestionSettingsProps) => {
  const updateQuestion = useFormStore((state) => state.updateQuestion)

  const [openSetup, setOpenSetup] = useState(true)
  const [openValidation, setOpenValidation] = useState(false)
  const [openLogic, setOpenLogic] = useState(false)

  const [localLabel, setLocalLabel] = useState(activeQuestion.label || '')
  const [localDesc, setLocalDesc] = useState(activeQuestion.settings.general.description || '')
  const [localPlaceholder, setLocalPlaceholder] = useState(activeQuestion.settings.general.placeholder || '')

  useEffect(() => {
    setLocalLabel(activeQuestion.label || '')
    setLocalDesc(activeQuestion.settings.general.description || '')
    setLocalPlaceholder(activeQuestion.settings.general.placeholder || '')
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

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar content-scrollbar bg-white animate-in fade-in duration-500">
      {/* SETUP SECTION */}
      <SettingsSection
        icon="lucide:settings-2"
        isOpen={openSetup}
        onToggle={() => setOpenSetup(!openSetup)}
        title="Field Setup"
        variant="premium"
      >
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Input
            label='Field Label'
            value={localLabel}
            onChange={(val: string) => setLocalLabel(val)}
            onBlur={() => updateQuestion(activeQuestion.id, { label: localLabel })}
            placeholder="e.g. What is your name?"
          />

          <div>
            <label className='mb-2 block text-13 font-medium text-gray-11'>
              Description
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

          <Input
            label='Placeholder'
            value={localPlaceholder}
            onChange={(val: string) => setLocalPlaceholder(val)}
            onBlur={() => updateNested('general', { placeholder: localPlaceholder })}
            placeholder="e.g. Type here..."
          />

          <Divider className="border-gray-1" />

          <div className="space-y-3">
            <div>
              <label className='mb-2 block text-13 font-medium text-gray-11'>
                Width Options
              </label>
              <InputSelect
                options={[{ id: 'col-12', name: '100% Width' }, { id: 'col-6', name: '50% Width' }, { id: 'col-4', name: '33% Width' }]}
                placeholder="Select width"
                value={
                  [{ id: 'col-12', name: '100% Width' }, { id: 'col-6', name: '50% Width' }, { id: 'col-4', name: '33% Width' }]
                    .find(o => o.id === activeQuestion.settings.general.size) || { id: 'col-12', name: '100% Width' }
                }
                onChange={(val) => val && updateNested('general', { size: val.id })}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-1">
                <Text size="sm" fw={600} className="text-gray-11">Hidden Field</Text>
                <InputSwitch
                  checked={activeQuestion.settings.general.hidden || false}
                  onChange={(checked) => updateNested('general', { hidden: checked })}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <Text size="sm" fw={600} className="text-gray-11">Read Only</Text>
                  <Text size="11px" className="text-gray-5">User cannot edit this field</Text>
                </div>
                <InputSwitch
                  checked={activeQuestion.settings.general.readOnly || false}
                  onChange={(checked) => updateNested('general', { readOnly: checked })}
                />
              </div>
            </div>
          </div>

          {/* Specific settings based on type */}
          <div className="p-4 bg-accent-soft/5 rounded-xl border border-accent-soft/10 text-center">
            <Text size="sm" fw={600} className="text-accent-primary mb-1">Specific Settings</Text>
            <Text size="11px" className="text-accent-primary/80">
              Settings specific to {activeQuestion.type.replace(/_/g, ' ')} are located here.
            </Text>
          </div>
        </div>
      </SettingsSection>

      {/* VALIDATION SECTION */}
      <SettingsSection
        icon="lucide:shield-check"
        isOpen={openValidation}
        onToggle={() => setOpenValidation(!openValidation)}
        title="Validation"
        variant="premium"
      >
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between py-2 border-b border-gray-1">
            <div>
              <Text size="sm" fw={600} className="text-gray-11">Required Field</Text>
              <Text size="11px" className="text-gray-5">User must fill this before submitting</Text>
            </div>
            <InputSwitch
              checked={activeQuestion.settings.validation.fieldRule === 'REQUIRED'}
              onChange={(checked) => updateNested('validation', { fieldRule: checked ? 'REQUIRED' : 'OPTIONAL' })}
            />
          </div>

          <div className="space-y-3">
            <Input label="Minimum Length" placeholder="e.g. 5" value="" onChange={() => { }} />
            <Input label="Maximum Length" placeholder="e.g. 100" value="" onChange={() => { }} />
            <Input label="Regex Pattern" placeholder="e.g. ^[a-zA-Z0-9]+$" value="" onChange={() => { }} />
          </div>
        </div>
      </SettingsSection>

      {/* LOGIC SECTION */}
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
    </div>
  )
}

export default QuestionSettings
