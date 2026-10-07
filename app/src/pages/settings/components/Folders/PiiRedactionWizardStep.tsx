import { useLingui } from '@lingui/react/macro'
import { useMemo } from 'react'
import type { FolderPiiSettings } from '@/pages/folders/utils/folderPiiSettings'
import type { Option } from '@/types/option'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import { AnimateFadeIn } from '@/components/common/animations'
import cn from '@/utils/cn'
import SettingsFormSection from '../SettingsFormSection'

type PiiFieldOption = {
  fieldName: string
  id: string
}

type PiiRedactionWizardStepProps = {
  fields: PiiFieldOption[]
  settings: FolderPiiSettings
  onChange: (next: FolderPiiSettings) => void
}

const PiiRedactionWizardStep = ({
  fields,
  settings,
  onChange,
}: PiiRedactionWizardStepProps) => {
  const { t } = useLingui()

  const fieldOptions: Option[] = useMemo(
    () =>
      fields
        .filter((field) => field.id && field.fieldName.trim())
        .map((field) => ({
          id: field.id,
          name: field.fieldName,
          value: field.id,
        })),
    [fields],
  )

  const selectedOptions = useMemo(
    () =>
      fieldOptions.filter((option) =>
        settings.fieldIds.includes(String(option.value || option.id)),
      ),
    [fieldOptions, settings.fieldIds],
  )

  const yesNoOptions = [
    {
      id: 'yes',
      subtitle: t`Scan documents in this folder and mask PII in the preview.`,
      title: t`Yes`,
    },
    {
      id: 'no',
      subtitle: t`Show the original file without PII masking.`,
      title: t`No`,
    },
  ] as const

  return (
    <SettingsFormSection>
      <div className='flex flex-col gap-6'>
        <AnimateFadeIn delay={0.1}>
          <div>
            <h3 className='text-14/5 font-semibold text-gray-12'>
              {t`Enable PII Redaction`}
            </h3>
            <p className='mt-1 text-13 text-gray-11'>
              {t`Choose whether documents in this folder are scanned and redacted when opened.`}
            </p>

            <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
              {yesNoOptions.map((item) => {
                const isSelected =
                  item.id === 'yes' ? settings.enabled : !settings.enabled
                return (
                  <button
                    key={item.id}
                    type='button'
                    className={cn(
                      'flex w-full items-start gap-3 rounded-[12px] border p-3.5 text-left transition',
                      isSelected
                        ? 'border-primary-8 bg-primary-2 shadow-sm ring-1 ring-primary-8'
                        : 'border-gray-3 bg-surface hover:border-primary-5',
                    )}
                    onClick={() =>
                      onChange({
                        ...settings,
                        enabled: item.id === 'yes',
                        fieldIds: item.id === 'yes' ? settings.fieldIds : [],
                      })
                    }
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition',
                        isSelected
                          ? 'border-primary-9 bg-surface'
                          : 'border-gray-7 bg-surface',
                      )}
                    >
                      {isSelected ? (
                        <span className='h-2 w-2 rounded-full bg-primary-9' />
                      ) : null}
                    </span>
                    <div className='min-w-0 flex-1'>
                      <div className='text-13 font-medium text-gray-12'>
                        {item.title}
                      </div>
                      <div className='mt-0.5 text-13 text-gray-11'>
                        {item.subtitle}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </AnimateFadeIn>

        {settings.enabled ? (
          <AnimateFadeIn delay={0.15}>
            <div className='rounded-[12px] border border-gray-3 bg-surface p-4'>
              <h3 className='text-14/5 font-semibold text-gray-12'>
                {t`Fields to redact`}
              </h3>
              <p className='mt-1 text-13 text-gray-11'>
                {t`Choose fields from the Fields step. Only the values of these fields are masked on files in this folder.`}
              </p>
              <div className='mt-3 max-w-xl'>
                <InputSelectMultiple
                  disabled={fieldOptions.length === 0}
                  options={fieldOptions}
                  searchPlaceholder={t`Search fields`}
                  value={selectedOptions}
                  width='target'
                  clearable
                  searchable
                  placeholder={
                    fieldOptions.length === 0
                      ? t`Add fields in the Fields step first`
                      : t`Select fields`
                  }
                  onChange={(selected) =>
                    onChange({
                      ...settings,
                      fieldIds: selected.map((option) =>
                        String(option.value || option.id),
                      ),
                    })
                  }
                />
              </div>
            </div>
          </AnimateFadeIn>
        ) : null}
      </div>
    </SettingsFormSection>
  )
}

export default PiiRedactionWizardStep
