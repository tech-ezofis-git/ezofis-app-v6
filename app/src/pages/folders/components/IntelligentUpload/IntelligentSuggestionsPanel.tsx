import { useLingui } from '@lingui/react/macro'
import { useMemo, useState } from 'react'
import type { Option } from '@/types/option'
import Badge from '@/components/base/Badge'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import InputRadioCard from '@/components/base/inputs/InputRadioCard'
import InputRadioIndicator from '@/components/base/inputs/InputRadioIndicator'
import InputSelect from '@/components/base/inputs/InputSelect'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import { AnimateFadeIn } from '@/components/common/animations'
import cn from '@/utils/cn'
import type { CandidateRepository, ClassificationSuggestion } from './types'

interface IntelligentSuggestionsPanelProps {
  candidateRepositories: CandidateRepository[]
  suggestions: ClassificationSuggestion[]
  documentType?: string
  keywords?: string[]
  selectedRepositoryId?: string
  onSelectRepository: (repositoryId: string) => void
}

export default function IntelligentSuggestionsPanel({
  candidateRepositories,
  documentType = 'Document',
  keywords = [],
  selectedRepositoryId,
  suggestions,
  onSelectRepository,
}: IntelligentSuggestionsPanelProps) {
  const { t } = useLingui()
  const [showAll, setShowAll] = useState(false)

  const visibleSuggestions = showAll ? suggestions : suggestions.slice(0, 3)

  const selectOptions: Option[] = useMemo(
    () =>
      candidateRepositories.map((repo) => ({
        id: repo.id,
        name: repo.name,
      })),
    [candidateRepositories],
  )

  const isManualOverride = useMemo(() => {
    if (!selectedRepositoryId) return false
    return !suggestions.some((s) => s.repositoryId === selectedRepositoryId)
  }, [selectedRepositoryId, suggestions])

  const manualOverrideOption: Option | null = useMemo(() => {
    if (!isManualOverride || !selectedRepositoryId) return null
    const found = candidateRepositories.find(
      (r) => r.id === selectedRepositoryId,
    )
    return found ? { id: found.id, name: found.name } : null
  }, [candidateRepositories, isManualOverride, selectedRepositoryId])

  return (
    <AnimateFadeIn className='mt-3.5 space-y-3.5 rounded-xl border border-border-default bg-surface-secondary/60 p-3.5'>
      {/* Header bar */}
      <div className='space-y-2 border-b border-border-default pb-3'>
        <div className='flex items-center gap-2.5'>
          <div className='flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-primary'>
            <AiBrandIcon className='size-4' variant='outline-purple' />
          </div>
          <div className='min-w-0'>
            <div className='flex items-center gap-2'>
              <span className='text-13 font-semibold text-text-primary'>
                {t`AI Suggestions`}
              </span>
            </div>
            <p className='text-11 text-text-secondary'>
              {t`Predicted folder routing based on detected document semantics.`}
            </p>
          </div>
        </div>

        {keywords.length > 0 && (
          <div className='flex flex-wrap items-center gap-1.5 pt-0.5'>
            <span className='text-11 font-medium text-text-muted'>
              {t`Detected keywords:`}
            </span>
            {keywords.map((kw) => (
              <Badge
                className='text-[10px]'
                color='purple'
                key={kw}
                label={kw}
              />
            ))}
          </div>
        )}
      </div>

      {/* Suggestion Cards Grid - equal height via items-stretch */}
      <div className='grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 lg:grid-cols-3'>
        {visibleSuggestions.map((suggestion) => {
          const isSelected = selectedRepositoryId === suggestion.repositoryId
          const percentage = Math.round(suggestion.confidence * 100)

          return (
            <InputRadioCard
              checked={isSelected}
              key={suggestion.repositoryId}
              value={suggestion.repositoryId}
              className={cn(
                'group relative flex h-full cursor-pointer flex-col justify-between border p-3 transition-all duration-200',
                'hover:-translate-y-0.5 hover:border-accent-primary hover:shadow-md active:scale-[0.99]',
                isSelected
                  ? 'ring-1.5 border-accent-primary bg-accent-soft/30 shadow-xs ring-accent-primary'
                  : 'border-border-default bg-surface-primary hover:bg-surface-hover',
              )}
              onClick={() => onSelectRepository(suggestion.repositoryId)}
            >
              <div className='flex h-full flex-col justify-between gap-3'>
                {/* Top Section */}
                <div className='space-y-2'>
                  <div className='flex items-start justify-between gap-2'>
                    <div className='flex min-w-0 flex-1 items-start gap-2'>
                      <div className='pt-0.5'>
                        <InputRadioIndicator checked={isSelected} />
                      </div>
                      <div className='min-w-0 flex-1'>
                        <span
                          className='line-clamp-2 text-13 font-semibold text-text-primary group-hover:text-accent-primary'
                          title={suggestion.repositoryName}
                        >
                          {suggestion.repositoryName}
                        </span>
                      </div>
                    </div>

                    <div className='flex shrink-0 items-center pt-0.5'>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-11 font-semibold tabular-nums',
                          percentage >= 80
                            ? 'bg-green-3 text-green-11'
                            : percentage >= 50
                              ? 'bg-orange-3 text-orange-11'
                              : 'bg-gray-3 text-gray-11',
                        )}
                      >
                        <span
                          className={cn(
                            'size-1.5 rounded-full',
                            percentage >= 80
                              ? 'bg-green-9'
                              : percentage >= 50
                                ? 'bg-orange-9'
                                : 'bg-gray-8',
                          )}
                        />
                        <span>{percentage}%</span>
                      </span>
                    </div>
                  </div>

                  {/* Reason */}
                  <p className='line-clamp-2 min-h-[2rem] text-11 leading-relaxed text-text-secondary'>
                    {suggestion.reason}
                  </p>
                </div>

                {/* Bottom: Keywords pinned to baseline */}
                <div className='mt-auto flex min-h-[20px] flex-wrap items-end gap-1'>
                  {suggestion.keywords.map((kw) => (
                    <span
                      className='rounded bg-surface-secondary px-1.5 py-0.5 text-[10px] font-normal text-text-secondary'
                      key={kw}
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            </InputRadioCard>
          )
        })}
      </div>

      {/* Toggle more suggestions if >3 */}
      {suggestions.length > 3 && (
        <div className='flex justify-center pt-1'>
          {(() => {
            const remainingCount = suggestions.length - 3
            return (
              <Button
                color='gray'
                icon={showAll ? 'lucide:chevron-up' : 'lucide:chevron-down'}
                size='sm'
                variant='ghost'
                label={
                  showAll
                    ? t`Show fewer suggestions`
                    : t`View ${remainingCount} more suggestions`
                }
                onClick={() => setShowAll(!showAll)}
              />
            )
          })()}
        </div>
      )}

      {/* Manual Override Section */}
      <div className='border-t border-border-default pt-3'>
        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex items-center gap-1.5'>
            <Icon
              className='size-3.5 text-text-muted'
              name='lucide:corner-down-right'
            />
            <span className='text-12 font-medium text-text-secondary'>
              {t`Route to a different folder:`}
            </span>
          </div>

          <div className='w-full sm:w-80'>
            <InputSelect
              aria-label={t`Select folder`}
              className='w-full bg-surface-primary [&_.mantine-Input-placeholder]:truncate [&_.mantine-Input-placeholder]:whitespace-nowrap'
              options={selectOptions}
              placeholder={t`Select folder...`}
              value={manualOverrideOption}
              searchable
              onChange={(opt) => {
                if (opt?.id) {
                  onSelectRepository(String(opt.id))
                }
              }}
            />
          </div>
        </div>

        {isManualOverride && manualOverrideOption && (
          <div className='mt-2 flex items-center gap-1.5 text-11 font-medium text-accent-primary'>
            <Icon className='size-3.5 shrink-0' name='lucide:info' />
            <span>
              {t`Manually routed to`}{' '}
              <strong>{manualOverrideOption.name}</strong>
            </span>
          </div>
        )}
      </div>
    </AnimateFadeIn>
  )
}
