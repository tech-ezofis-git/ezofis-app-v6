import { useLingui } from '@lingui/react/macro'
import { useState } from 'react'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import useReportSourceFields from '../../hooks/useReportSourceFields'
import useReportBuilderDraftStore from '../../stores/useReportBuilderDraftStore'
import { createDefaultFieldSetting } from '../../types'

interface Suggestion {
  fieldIds: string[]
  name: string
  summary: string
}

const PROMPT_EXAMPLES_WORKFLOW = [
  {
    description: 'Track open requests, initiators, and current approval stages',
    icon: 'lucide:workflow',
    iconBg: 'bg-indigo-3',
    iconColor: 'text-indigo-9',
    query: 'Show active requests and current approval stage',
    title: 'Active workflow requests',
  },
  {
    description: 'Find requests that exceeded or are nearing SLA deadlines',
    icon: 'lucide:clock-alert',
    iconBg: 'bg-orange-3',
    iconColor: 'text-orange-9',
    query: 'Identify requests with SLA bottlenecks',
    title: 'SLA overdue & bottlenecks',
  },
]

const PROMPT_EXAMPLES_FOLDER = [
  {
    description: 'Break down files by repository, owner, and version',
    icon: 'lucide:file-text',
    iconBg: 'bg-teal-3',
    iconColor: 'text-teal-9',
    query: 'List documents grouped by repository and version',
    title: 'Document repository overview',
  },
  {
    description: 'Surface recent uploads and file size stats',
    icon: 'lucide:folder-up',
    iconBg: 'bg-blue-3',
    iconColor: 'text-blue-9',
    query: 'Show documents uploaded recently with file sizes',
    title: 'Recent document uploads',
  },
]

interface Props {
  onChangeSource?: () => void
}

const AskAiStep = ({ onChangeSource }: Props) => {
  const { t } = useLingui()
  const draft = useReportBuilderDraftStore((state) => state.draft)
  const setDraft = useReportBuilderDraftStore((state) => state.setDraft)

  const [prompt, setPrompt] = useState('')
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null)
  const [isThinking, setIsThinking] = useState(false)

  // Fetch real fields for selected source
  const { fields: sourceFields, isLoading: isFieldsLoading } =
    useReportSourceFields(
      draft.sourceFormId,
      draft.sourceType,
      draft.sourceId,
    )

  const runPrompt = (value: string) => {
    const text = value.trim()
    if (!text || sourceFields.length === 0) return
    setPrompt(text)
    setIsThinking(true)
    setSuggestion(null)

    window.setTimeout(() => {
      const lower = text.toLowerCase()
      const matchingFields = sourceFields.filter((f) =>
        lower.includes((f.label || '').toLowerCase()),
      )
      const selectedFieldList =
        matchingFields.length > 0
          ? matchingFields.slice(0, 6)
          : sourceFields.slice(0, 5)

      setSuggestion({
        fieldIds: selectedFieldList.map((f) => f.id),
        name: text.length > 48 ? `${text.slice(0, 45)}...` : text,
        summary: `Based on "${draft.domain}" (${draft.sourceType}), I've prepared a report plan with ${selectedFieldList.length} relevant fields.`,
      })
      setIsThinking(false)
    }, 700)
  }

  const applySuggestion = () => {
    if (!suggestion) return
    const fieldSettings = Object.fromEntries(
      suggestion.fieldIds.map((id) => {
        const field = sourceFields.find((f) => f.id === id)
        return [id, createDefaultFieldSetting(field?.label || id)]
      }),
    )
    setDraft({
      description: suggestion.summary,
      fields: suggestion.fieldIds,
      fieldSettings,
      name: suggestion.name || draft.domain,
    })
  }

  const promptExamples =
    draft.sourceType === 'Folder'
      ? PROMPT_EXAMPLES_FOLDER
      : PROMPT_EXAMPLES_WORKFLOW

  return (
    <div className='flex flex-col gap-6'>
      {/* Active Source Banner */}
      <div className='flex items-center justify-between rounded-xl border border-primary-4 bg-primary-1/30 px-4 py-3'>
        <div className='flex items-center gap-2 text-13'>
          <Icon className='size-4 text-primary-10' name='lucide:database' />
          <span className='font-medium text-gray-12'>{t`Active Source:`}</span>
          <span className='font-bold text-gray-13'>{draft.domain || t`Not selected`}</span>
          {draft.sourceType && (
            <span className='rounded-md bg-surface border border-gray-3 px-2 py-0.5 text-11 text-gray-10'>
              {draft.sourceType}
            </span>
          )}
        </div>
        {onChangeSource && (
          <button
            className='text-12 font-medium text-primary-10 hover:underline'
            type='button'
            onClick={onChangeSource}
          >
            {t`Change Source`}
          </button>
        )}
      </div>

      <div className='flex items-center gap-3'>
        <AiBrandIcon className='size-6' variant='outline-purple' />
        <div>
          <h3 className='text-15 font-semibold text-gray-13'>
            {t`Describe your report for "${draft.domain}"`}
          </h3>
          <p className='text-13 text-gray-10'>
            {t`Describe what insights or columns you want, and AI will configure a starting plan based on this ${draft.sourceType.toLowerCase() || 'source'}.`}
          </p>
        </div>
      </div>

      <div className='overflow-hidden rounded-xl border border-gray-3 bg-surface'>
        <textarea
          autoFocus
          className='min-h-[92px] w-full resize-none bg-transparent px-4 py-3 text-13 text-gray-13 outline-none placeholder:text-gray-8'
          placeholder={t`e.g. Show me open requests and their current stage`}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <div className='flex items-center justify-between border-t border-gray-3 bg-gray-1/50 px-3 py-2'>
          <span className='text-12 text-gray-9'>
            {isFieldsLoading
              ? t`Loading schema fields...`
              : t`${sourceFields.length} fields available in "${draft.domain}"`}
          </span>
          <Button
            color='primary'
            disabled={!prompt.trim() || isThinking || isFieldsLoading}
            leftSection={
              <AiBrandIcon className='size-4' variant='outline-white' />
            }
            label={isThinking ? t`Thinking...` : t`Generate plan`}
            loading={isThinking}
            size='sm'
            onClick={() => runPrompt(prompt)}
          />
        </div>
      </div>

      <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
        {promptExamples.map((example) => (
          <button
            className='flex items-start gap-3 rounded-xl border border-gray-3 bg-surface p-4 text-left transition-colors hover:border-primary-6 hover:bg-gray-1/50'
            key={example.title}
            type='button'
            onClick={() => runPrompt(example.query)}
          >
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${example.iconBg}`}
            >
              <Icon
                className={`size-5 ${example.iconColor}`}
                name={example.icon}
              />
            </div>
            <div>
              <h4 className='text-14 font-semibold text-gray-12'>
                {example.title}
              </h4>
              <p className='mt-1 text-13 text-gray-10'>
                {example.description}
              </p>
            </div>
          </button>
        ))}
      </div>

      {suggestion && (
        <div className='animate-in fade-in slide-in-from-top-2 rounded-xl border border-primary-5 bg-primary-1 p-4 duration-300'>
          <div className='mb-2 flex items-center gap-2'>
            <AiBrandIcon className='size-4' variant='outline-purple' />
            <p className='text-13 font-semibold text-gray-13'>{t`Suggested report plan`}</p>
          </div>
          <p className='mb-3 text-13 text-gray-11'>{suggestion.summary}</p>
          <div className='mb-3 flex flex-wrap gap-1.5'>
            <span className='rounded-full border border-primary-4 bg-surface px-2.5 py-1 text-11 font-medium text-gray-12'>
              {t`Source:`} {draft.domain} ({draft.sourceType})
            </span>
            {suggestion.fieldIds.map((id) => {
              const field = sourceFields.find((f) => f.id === id)
              return (
                <span
                  className='rounded-full border border-gray-3 bg-surface px-2.5 py-1 text-11 text-gray-11'
                  key={id}
                >
                  {field?.label || id}
                </span>
              )
            })}
          </div>
          <Button
            color='primary'
            icon='lucide:check'
            label={t`Use this plan`}
            size='sm'
            onClick={applySuggestion}
          />
        </div>
      )}
    </div>
  )
}

AskAiStep.displayName = 'AskAiStep'
export default AskAiStep
