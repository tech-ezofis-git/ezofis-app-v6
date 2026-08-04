import Button from '@/components/base/button/Button'
import Divider from '@/components/base/Divider'
import Icon from '@/components/base/icon/Icon'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import showToast from '@/components/base/toast/showToast'
import {
  StepFooter,
  StepLayout,
} from '@/pages/dashboard/workflows/accounts-payable/components/setup/components/steps/components/StepLayout'
import { generateFolderConfig } from '@/services/ai/gemini'
import cn from '@/utils/cn'
import useDmsSetupStore from '../../stores/useDmsSetupStore'

const commonFolderSuggestions = [
  {
    label: 'Accounts Payable',
    prompt:
      'Create an Accounts Payable folder for invoices, purchase orders, and vendor bills',
  },
  {
    label: 'Accounts Receivable',
    prompt:
      'Create an Accounts Receivable folder for customer invoices, receipts, and payment records',
  },
  {
    label: 'HR Documents',
    prompt:
      'Create an HR folder for employee records, payslips, and HR documents',
  },
  {
    label: 'Legal Contracts',
    prompt:
      'Create a Legal folder for contracts, agreements, and compliance documents',
  },
  {
    label: 'Vendor Contracts',
    prompt:
      'Create a folder to store signed vendor contracts with renewal dates and contract values',
  },
]

const FolderSetupStep = () => {
  const prompt = useDmsSetupStore((state) => state.prompt)
  const folderName = useDmsSetupStore((state) => state.folderName)
  const description = useDmsSetupStore((state) => state.description)
  const isGenerating = useDmsSetupStore((state) => state.isGenerating)
  const setPrompt = useDmsSetupStore((state) => state.setPrompt)
  const setFolderName = useDmsSetupStore((state) => state.setFolderName)
  const setDescription = useDmsSetupStore((state) => state.setDescription)
  const setFields = useDmsSetupStore((state) => state.setFields)
  const setIsGenerating = useDmsSetupStore((state) => state.setIsGenerating)
  const setStep = useDmsSetupStore((state) => state.setStep)

  const canGenerate = Boolean(prompt.trim()) && !isGenerating

  const handleGenerate = async (overridePrompt?: string) => {
    const trimmed = (overridePrompt ?? prompt).trim()
    if (!trimmed) {
      showToast({
        message: 'Describe your folder first so we can generate a setup.',
        variant: 'error',
      })
      return
    }

    if (overridePrompt !== undefined) {
      setPrompt(trimmed)
    }

    setIsGenerating(true)
    try {
      const suggestion = await generateFolderConfig(trimmed)
      setFolderName(suggestion.folderName)
      setDescription(suggestion.description)
      const generatedFields = suggestion.fields.map((field, index) => ({
        ...field,
        id: `${field.fieldName}-${index}`,
        level: 0,
        orderId: index + 1,
      }))
      const folderFields = generatedFields.filter(
        (field) => field.includeInFolderStructure,
      )
      const metadataFields = generatedFields.filter(
        (field) => !field.includeInFolderStructure,
      )
      let folderLevel = 0
      setFields(
        [...folderFields, ...metadataFields].map((field, index) => {
          if (field.includeInFolderStructure) {
            folderLevel += 1
            return { ...field, level: folderLevel, orderId: index + 1 }
          }
          return { ...field, level: 0, orderId: index + 1 }
        }),
      )
    } catch (error: any) {
      showToast({
        message:
          error?.message ?? 'Could not generate folder setup. Try again.',
        variant: 'error',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSuggestionClick = (suggestion: (typeof commonFolderSuggestions)[number]) => {
    if (isGenerating) return
    void handleGenerate(suggestion.prompt)
  }

  const canContinue = Boolean(folderName.trim())
  const showGeneratedDetails = Boolean(folderName.trim() || description.trim())

  return (
    <StepLayout
      description="Describe what this folder is for, and we'll suggest a name and description. You can edit them before continuing."
      title='What is this folder for?'
      footer={
        <StepFooter align='end'>
          <Button
            disabled={!canContinue}
            label='Continue'
            suffixIcon='lucide:arrow-right'
            onClick={() => setStep(1)}
          />
        </StepFooter>
      }
    >
      <div className='flex flex-col gap-3'>
        <div className='flex flex-wrap items-center gap-2'>
          {commonFolderSuggestions.map((suggestion) => (
            <button
              className='inline-flex items-center rounded-full border border-primary-4 bg-primary-2 px-3.5 py-1.5 text-12 font-semibold text-primary-11 transition hover:border-primary-9 hover:bg-primary-3 hover:text-primary-9 disabled:opacity-50'
              disabled={isGenerating}
              key={suggestion.label}
              type='button'
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion.label}
            </button>
          ))}
        </div>

        <div className='relative rounded-lg border border-gray-4 bg-surface transition focus-within:border-primary-7'>
          <textarea
            className='min-h-[88px] w-full resize-none rounded-lg bg-transparent py-3 pr-12 pl-3.5 text-13 text-gray-13 outline-none placeholder:text-gray-8 disabled:opacity-60'
            disabled={isGenerating}
            placeholder='e.g. A folder to store signed vendor contracts with renewal dates and contract values'
            rows={3}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                if (canGenerate) void handleGenerate()
              }
            }}
          />
          <div className='absolute right-2 bottom-2'>
            <button
              aria-label={isGenerating ? 'Generating setup' : 'Generate setup'}
              className={cn(
                'flex size-8 items-center justify-center rounded-full text-white transition',
                canGenerate
                  ? 'bg-primary-9 hover:bg-primary-10'
                  : 'bg-gray-6 opacity-50',
              )}
              disabled={!canGenerate}
              type='button'
              onClick={() => {
                void handleGenerate()
              }}
            >
              <Icon
                className={cn('size-3.5', isGenerating && 'animate-spin')}
                name={isGenerating ? 'lucide:loader-2' : 'lucide:send'}
              />
            </button>
          </div>
        </div>
      </div>

      {showGeneratedDetails ? (
        <>
          <Divider />
          <div className='flex flex-col gap-5'>
            <InputText
              label='Folder Name'
              placeholder='e.g. Vendor Contracts'
              value={folderName}
              required
              onChange={setFolderName}
            />
            <InputTextarea
              label='Description'
              minRows={3}
              placeholder='Describe the purpose of this folder...'
              value={description}
              onChange={setDescription}
            />
          </div>
        </>
      ) : null}
    </StepLayout>
  )
}

FolderSetupStep.displayName = 'FolderSetupStep'
export default FolderSetupStep
