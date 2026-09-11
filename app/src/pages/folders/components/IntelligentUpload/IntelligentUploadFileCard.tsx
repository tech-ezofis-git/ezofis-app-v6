import { useLingui } from '@lingui/react/macro'
import { useMemo, useState } from 'react'
import Alert from '@/components/base/Alert'
import Badge from '@/components/base/Badge'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Card from '@/components/base/Card'
import Icon from '@/components/base/icon/Icon'
import Tooltip from '@/components/base/Tooltip'
import { AnimateFadeIn } from '@/components/common/animations'
import cn from '@/utils/cn'
import type { CandidateRepository, ClassifiedFile } from './types'
import IntelligentSuggestionsPanel from './IntelligentSuggestionsPanel'

interface IntelligentUploadFileCardProps {
  candidateRepositories: CandidateRepository[]
  fileItem: ClassifiedFile
  onRemove: (fileId: string) => void
  onRetry: (fileId: string) => void
  onSelectRepository: (fileId: string, repositoryId: string) => void
}

export default function IntelligentUploadFileCard({
  candidateRepositories,
  fileItem,
  onRemove,
  onRetry,
  onSelectRepository,
}: IntelligentUploadFileCardProps) {
  const { t } = useLingui()
  const [isExpanded, setIsExpanded] = useState(true)

  const iconMeta = useMemo(
    () => getFileIconMeta(fileItem.file.name),
    [fileItem.file.name],
  )

  const selectedRepoName = useMemo(() => {
    if (!fileItem.selectedRepositoryId) return null
    const candidate = candidateRepositories.find(
      (r) => r.id === fileItem.selectedRepositoryId,
    )
    if (candidate) return candidate.name
    const suggestion = fileItem.suggestions?.find(
      (s) => s.repositoryId === fileItem.selectedRepositoryId,
    )
    if (suggestion) return suggestion.repositoryName
    return null
  }, [
    candidateRepositories,
    fileItem.selectedRepositoryId,
    fileItem.suggestions,
  ])

  const selectedSuggestion = useMemo(() => {
    if (!fileItem.selectedRepositoryId || !fileItem.suggestions) return null
    return fileItem.suggestions.find(
      (s) => s.repositoryId === fileItem.selectedRepositoryId,
    )
  }, [fileItem.selectedRepositoryId, fileItem.suggestions])

  return (
    <Card className='border-border-default bg-surface-primary shadow-xs transition-shadow duration-200 hover:shadow-sm'>
      {/* File Header Row */}
      <div className='flex items-center justify-between gap-4'>
        {/* Left: Icon + File Details */}
        <div className='flex min-w-0 flex-1 items-center gap-3.5'>
          <div
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-xl border',
              iconMeta.bg,
            )}
          >
            <Icon className='size-5' name={iconMeta.icon} />
          </div>

          <div className='min-w-0 flex-1'>
            <div className='flex items-center gap-2'>
              <span
                className='truncate text-13 font-semibold text-text-primary'
                title={fileItem.file.name}
              >
                {fileItem.file.name}
              </span>
              <span className='shrink-0 text-11 text-text-muted'>
                {formatBytes(fileItem.file.size)}
              </span>
            </div>

            {/* Sub-status info */}
            <div className='mt-1 flex flex-wrap items-center gap-2 text-12'>
              {fileItem.status === 'pending' && (
                <Badge color='gray' label={t`Pending classification`} />
              )}

              {fileItem.status === 'processing' && (
                <div className='flex items-center gap-2'>
                  <span className='inline-flex items-center gap-1.5 font-medium text-accent-primary'>
                    <Icon
                      className='size-3.5 animate-spin'
                      name='tabler:loader-2'
                    />
                    {fileItem.currentStage || t`Analyzing document...`}
                  </span>
                  {fileItem.elapsedSeconds !== undefined && (
                    <span className='text-11 text-text-muted'>
                      ({fileItem.elapsedSeconds}s)
                    </span>
                  )}
                </div>
              )}

              {fileItem.status === 'done' && (
                <div className='flex flex-wrap items-center gap-2'>
                  {fileItem.documentType && (
                    <Badge color='indigo' label={fileItem.documentType} />
                  )}

                  {!isExpanded && (
                    <>
                      <span className='text-text-secondary'>
                        {t`Target:`}{' '}
                        <strong className='font-semibold text-text-primary'>
                          {selectedRepoName || t`Unassigned`}
                        </strong>
                      </span>
                      {selectedSuggestion && (
                        <Badge
                          color={
                            selectedSuggestion.confidence >= 0.8
                              ? 'green'
                              : 'orange'
                          }
                          label={
                            selectedSuggestion.confidence >= 0.8
                              ? t`High Match`
                              : t`Medium Match`
                          }
                        />
                      )}
                    </>
                  )}
                </div>
              )}

              {fileItem.status === 'uploaded' && (
                <div className='flex items-center gap-1.5 font-medium text-success-main'>
                  <Icon className='size-4' name='lucide:check-circle-2' />
                  <span>
                    {t`Successfully uploaded to`}{' '}
                    <strong>{selectedRepoName}</strong>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className='flex shrink-0 items-center gap-1.5'>
          {fileItem.status === 'done' &&
            fileItem.suggestions &&
            fileItem.suggestions.length > 0 && (
              <Tooltip
                content={
                  isExpanded ? t`Hide suggestions` : t`View suggestions`
                }
              >
                <IconButton
                  aria-label={
                    isExpanded ? t`Hide suggestions` : t`View suggestions`
                  }
                  color='gray'
                  icon={isExpanded ? 'lucide:chevron-up' : 'lucide:chevron-down'}
                  variant='ghost'
                  onClick={() => setIsExpanded(!isExpanded)}
                />
              </Tooltip>
            )}

          {fileItem.status !== 'uploaded' && (
            <Tooltip content={t`Remove file`}>
              <IconButton
                aria-label={t`Remove file`}
                color='gray'
                disabled={fileItem.status === 'processing'}
                icon='lucide:trash-2'
                variant='ghost'
                onClick={() => onRemove(fileItem.id)}
              />
            </Tooltip>
          )}
        </div>
      </div>

      {/* Indeterminate loader bar during processing */}
      {fileItem.status === 'processing' && (
        <div className='mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-secondary'>
          <div className='h-full w-2/5 animate-pulse rounded-full bg-accent-primary duration-700' />
        </div>
      )}

      {/* Error state */}
      {fileItem.status === 'error' && (
        <AnimateFadeIn className='mt-3.5 flex items-center justify-between gap-3'>
          <Alert
            className='flex-1'
            text={fileItem.error || t`Classification failed for this file.`}
            variant='red'
          />
          <Button
            color='primary'
            icon='lucide:refresh-cw'
            label={t`Retry`}
            size='sm'
            variant='outline'
            onClick={() => onRetry(fileItem.id)}
          />
        </AnimateFadeIn>
      )}

      {/* Expandable Suggestions Panel */}
      {fileItem.status === 'done' &&
        isExpanded &&
        fileItem.suggestions &&
        fileItem.suggestions.length > 0 && (
          <IntelligentSuggestionsPanel
            candidateRepositories={candidateRepositories}
            documentType={fileItem.documentType}
            keywords={fileItem.keywords}
            selectedRepositoryId={fileItem.selectedRepositoryId}
            suggestions={fileItem.suggestions}
            onSelectRepository={(repoId) =>
              onSelectRepository(fileItem.id, repoId)
            }
          />
        )}
    </Card>
  )
}

function formatBytes(bytes: number, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

function getFileIconMeta(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  if (ext === 'pdf') {
    return {
      bg: 'bg-red-2 text-red-9 border-red-3',
      icon: 'lucide:file-text',
    }
  }
  if (
    ['bmp', 'jpeg', 'jpg', 'png', 'svg', 'tif', 'tiff', 'webp'].includes(ext)
  ) {
    return {
      bg: 'bg-blue-2 text-blue-9 border-blue-3',
      icon: 'lucide:image',
    }
  }
  if (['csv', 'xls', 'xlsx'].includes(ext)) {
    return {
      bg: 'bg-green-2 text-green-9 border-green-3',
      icon: 'lucide:sheet',
    }
  }
  return {
    bg: 'bg-gray-2 text-gray-9 border-gray-3',
    icon: 'lucide:file',
  }
}
