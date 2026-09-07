import { useLingui } from '@lingui/react/macro'
import { useState } from 'react'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import type { ReportDomain } from '../../constants'
import { DOMAIN_FIELDS, REPORT_DOMAINS } from '../../constants'
import useReportBuilderDraftStore from '../../stores/useReportBuilderDraftStore'
import { createDefaultFieldSetting } from '../../types'

const PROMPT_EXAMPLES = [
  'Show me overdue invoices by vendor',
  'Track active workflow requests and their stage',
  'List documents uploaded this month by repository',
  'Report on failed or expired user sessions',
]

interface Suggestion {
  domain: ReportDomain
  fieldIds: string[]
  name: string
  summary: string
}

/** Mock keyword matcher — no backend calls, no chat model. Picks the domain
 * whose name/fields best match the prompt and proposes its first few
 * fields as a starting report plan. */
const buildSuggestion = (prompt: string): Suggestion => {
  const lower = prompt.toLowerCase()
  const scored = REPORT_DOMAINS.map((domain) => {
    const fields = DOMAIN_FIELDS[domain]
    const haystack =
      `${domain} ${fields.map((f) => f.label).join(' ')}`.toLowerCase()
    const score = lower
      .split(/\s+/)
      .filter((word) => word.length > 3 && haystack.includes(word)).length
    return { domain, score }
  })
  scored.sort((a, b) => b.score - a.score)
  const domain = scored[0]?.domain || REPORT_DOMAINS[0]
  const fields = DOMAIN_FIELDS[domain].slice(0, 5)

  return {
    domain,
    fieldIds: fields.map((f) => f.id),
    name: prompt.length > 48 ? `${prompt.slice(0, 45)}...` : prompt,
    summary: `Based on your request, I'd start with the ${domain} domain and these ${fields.length} fields.`,
  }
}

const AskAiStep = () => {
  const { t } = useLingui()
  const setDraft = useReportBuilderDraftStore((state) => state.setDraft)
  const [prompt, setPrompt] = useState('')
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null)
  const [isThinking, setIsThinking] = useState(false)

  const runPrompt = (value: string) => {
    const text = value.trim()
    if (!text) return
    setPrompt(text)
    setIsThinking(true)
    setSuggestion(null)
    window.setTimeout(() => {
      setSuggestion(buildSuggestion(text))
      setIsThinking(false)
    }, 700)
  }

  const applySuggestion = () => {
    if (!suggestion) return
    const fieldSettings = Object.fromEntries(
      suggestion.fieldIds.map((id) => {
        const field = DOMAIN_FIELDS[suggestion.domain].find((f) => f.id === id)
        return [id, createDefaultFieldSetting(field?.label || id)]
      }),
    )
    setDraft({
      description: suggestion.summary,
      domain: suggestion.domain,
      fields: suggestion.fieldIds,
      fieldSettings,
      name: suggestion.name || suggestion.domain,
    })
  }

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex items-center gap-3'>
        <AiBrandIcon className='size-6' variant='outline-purple' />
        <div>
          <h3 className='text-15 font-semibold text-gray-13'>{t`Describe the report you want`}</h3>
          <p className='text-13 text-gray-10'>{t`Optional — skip this and build it manually, or describe it here and we'll draft a starting point.`}</p>
        </div>
      </div>

      <div className='overflow-hidden rounded-xl border border-gray-3'>
        <textarea
          className='min-h-[92px] w-full resize-none bg-transparent px-4 py-3 text-13 text-gray-13 outline-none placeholder:text-gray-8'
          placeholder={t`e.g. Show me overdue invoices grouped by vendor`}
          value={prompt}
          autoFocus
          onChange={(e) => setPrompt(e.target.value)}
        />
        <div className='flex items-center justify-end gap-2 border-t border-gray-3 bg-gray-1/50 px-3 py-2'>
          <Button
            color='primary'
            disabled={!prompt.trim() || isThinking}
            icon='lucide:sparkles'
            label={isThinking ? t`Thinking...` : t`Generate plan`}
            loading={isThinking}
            size='sm'
            onClick={() => runPrompt(prompt)}
          />
        </div>
      </div>

      <div className='flex flex-wrap gap-2'>
        {PROMPT_EXAMPLES.map((example) => (
          <button
            className='inline-flex items-center gap-1.5 rounded-full border border-gray-3 bg-surface px-3 py-1.5 text-12 text-gray-11 transition-colors hover:border-primary-6 hover:text-primary-10'
            key={example}
            type='button'
            onClick={() => runPrompt(example)}
          >
            <Icon className='size-3.5' name='lucide:arrow-up-right' />
            {example}
          </button>
        ))}
      </div>

      {suggestion && (
        <div className='rounded-xl border border-primary-5 bg-primary-1 p-4'>
          <div className='mb-2 flex items-center gap-2'>
            <AiBrandIcon className='size-4' variant='outline-purple' />
            <p className='text-13 font-semibold text-gray-13'>{t`Suggested report plan`}</p>
          </div>
          <p className='mb-3 text-13 text-gray-11'>{suggestion.summary}</p>
          <div className='mb-3 flex flex-wrap gap-1.5'>
            <span className='rounded-full border border-gray-3 bg-surface px-2.5 py-1 text-11 font-medium text-gray-12'>
              {t`Domain:`} {suggestion.domain}
            </span>
            {suggestion.fieldIds.map((id) => {
              const field = DOMAIN_FIELDS[suggestion.domain].find(
                (f) => f.id === id,
              )
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
