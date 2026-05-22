import { useEffect, useState } from 'react'
import type { MetadataSection } from '../types/folderTypes'
import { folderApi } from '../api/folderApi'
import { DynamicIcon } from './icons'
import { Button, Card, Input, PrimaryButton } from './Ui'

export function EditMetadataView({ onBack }: { onBack: () => void }) {
  const [sections, setSections] = useState<MetadataSection[]>([])

  useEffect(() => {
    folderApi.getMetadataSections().then(setSections)
  }, [])
  const updateFieldValue = (
    sectionId: string,
    fieldKey: string,
    value: string,
  ) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              fields: section.fields.map((field) =>
                field.key === fieldKey ? { ...field, value } : field,
              ),
            }
          : section,
      ),
    )
  }
  return (
    <div className='animate-in fade-in flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-surface-secondary duration-300'>
      <div className='flex h-[72px] shrink-0 items-center justify-between border-b border-gray-3 bg-white px-6'>
        <div className='flex items-center gap-4'>
          <button
            className='inline-flex h-9 items-center gap-2 rounded-lg px-2 text-[14px] font-semibold text-gray-13 hover:bg-gray-2'
            type='button'
            onClick={onBack}
          >
            <DynamicIcon className='h-4 w-4' name='arrowLeft' />
            Back
          </button>

          <div className='h-8 w-px bg-gray-4' />

          {/* <button
                        type="button"
                        className="inline-flex h-10 items-center gap-2 rounded-lg border border-violet-6 bg-white px-4 text-[14px] font-semibold text-violet-11 shadow-sm hover:bg-violet-2"
                    >
                        <DynamicIcon name="sparkles" className="h-4 w-4" />
                        AI Auto-fill
                    </button> */}
        </div>

        <div className='flex items-center gap-3'>
          <Button className='h-10 px-4 text-[14px] font-semibold'>
            <DynamicIcon className='h-4 w-4' name='refresh' />
            Reset
          </Button>

          <PrimaryButton className='h-10 px-4 text-[14px] font-semibold'>
            <DynamicIcon className='h-4 w-4' name='save' />
            Save Changes
          </PrimaryButton>
        </div>
      </div>
      <div className='min-h-0 flex-1 overflow-y-auto'>
        <div className='mx-auto w-full max-w-[1060px] space-y-5 px-6 py-6'>
          <div className='flex items-center justify-between gap-4 rounded-xl border border-violet-5 bg-violet-3 p-4 text-violet-11'>
            <p className='text-[13px] leading-5'>
              <b>AI Suggestion:</b> The OCR engine extracted all fields with 98%
              confidence. Review highlighted fields before saving.
            </p>

            {/* <Button className="shrink-0 border-violet-6 bg-violet-3 text-violet-11">
                            Apply All
                        </Button> */}
          </div>

          {sections.map((section) => (
            <Card
              className='rounded-xl border border-gray-3 bg-surface-primary p-5 shadow-sm'
              key={section.id}
            >
              <h2 className='border-b border-gray-3 pb-3 text-[15px] font-semibold text-gray-13'>
                {section.title}
              </h2>

              {section.id === 'tags' ? (
                <Tags value={section.fields[0]?.value || ''} />
              ) : (
                <div className='mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3'>
                  {section.fields.map((field) => (
                    <label className='block' key={field.key}>
                      <span className='mb-1.5 block text-[12px] font-semibold text-gray-12'>
                        {field.label}{' '}
                        {field.required ? (
                          <span className='text-red-9'>*</span>
                        ) : null}
                      </span>

                      {field.type === 'select' ? (
                        <select
                          className='h-9 w-full rounded-lg border border-gray-3 bg-white px-3 text-[13px]'
                          value={field.value}
                          onChange={(e) =>
                            updateFieldValue(
                              section.id,
                              field.key,
                              e.target.value,
                            )
                          }
                        >
                          {field.options?.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          className='h-9 text-[13px]'
                          type={field.type}
                          value={field.value}
                          onChange={(e) =>
                            updateFieldValue(
                              section.id,
                              field.key,
                              e.target.value,
                            )
                          }
                        />
                      )}
                    </label>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

function Tags({ value }: { value: string }) {
  const tags = value
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)

  return (
    <div className='mt-5'>
      <div className='mb-4 flex flex-wrap gap-2'>
        {tags.map((tag) => (
          <span
            className='rounded-lg bg-gray-2 px-3 py-1 text-[12px] font-medium text-gray-12'
            key={tag}
          >
            {tag} ×
          </span>
        ))}
      </div>

      <div className='flex gap-2'>
        <Input className='h-9 text-[13px]' placeholder='Add tag...' />
        <Button className='h-9 text-[13px]'>＋ Add</Button>
      </div>

      <div className='mt-4 flex flex-wrap gap-2'>
        {['approved', 'recurring', 'quarterly', 'review'].map((tag) => (
          <button
            className='rounded-md border border-dashed border-blue-8 px-3 py-1 text-[12px] text-blue-11 transition-all hover:bg-blue-3'
            key={tag}
            type='button'
          >
            + {tag}
          </button>
        ))}
      </div>
    </div>
  )
}
