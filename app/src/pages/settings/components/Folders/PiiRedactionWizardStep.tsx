import { Icon } from '@iconify/react'
import { useLingui } from '@lingui/react/macro'
import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  FolderPiiLevel,
  FolderPiiSettings,
} from '@/pages/folders/utils/folderPiiSettings'
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

const LEVEL_STEPS: FolderPiiLevel[] = ['low', 'medium', 'high']

const LEVEL_THEME: Record<
  FolderPiiLevel,
  {
    fill: string
    label: string
    thumb: string
    trackRing: string
  }
> = {
  high: {
    fill: 'bg-red-8',
    label: 'text-red-11',
    thumb: 'bg-red-9',
    trackRing: 'ring-red-9/20',
  },
  low: {
    fill: 'bg-green-8',
    label: 'text-green-11',
    thumb: 'bg-green-9',
    trackRing: 'ring-green-9/20',
  },
  medium: {
    fill: 'bg-orange-8',
    label: 'text-orange-11',
    thumb: 'bg-orange-9',
    trackRing: 'ring-orange-9/20',
  },
}

const normalizeLabel = (value: string) => value.trim().toLowerCase()

const levelToIndex = (level: FolderPiiLevel) =>
  Math.max(0, LEVEL_STEPS.indexOf(level))

const indexToLevel = (index: number): FolderPiiLevel =>
  LEVEL_STEPS[Math.min(LEVEL_STEPS.length - 1, Math.max(0, index))] || 'medium'

const PiiRedactionWizardStep = ({
  fields,
  settings,
  onChange,
}: PiiRedactionWizardStepProps) => {
  const { t } = useLingui()
  const [adding, setAdding] = useState(false)
  const [draftLabel, setDraftLabel] = useState('')
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(
    () => new Set(),
  )

  const availableLabels = useMemo(() => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const field of fields) {
      const label = String(field.fieldName || '').trim()
      if (!label) continue
      const key = normalizeLabel(label)
      if (seen.has(key)) continue
      seen.add(key)
      out.push(label)
    }
    return out
  }, [fields])

  const selectedLabels = useMemo(() => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const raw of settings.fieldIds) {
      const label = String(raw || '').trim()
      if (!label) continue
      // Migrate legacy id → name when possible.
      const fromId = fields.find((field) => String(field.id) === label)
      const resolved = fromId?.fieldName?.trim() || label
      const key = normalizeLabel(resolved)
      if (seen.has(key)) continue
      seen.add(key)
      out.push(resolved)
    }
    return out
  }, [fields, settings.fieldIds])

  /** Fields-step labels first, then any custom selected labels not in Fields. */
  const displayLabels = useMemo(() => {
    const out: string[] = []
    const seen = new Set<string>()

    for (const label of availableLabels) {
      const key = normalizeLabel(label)
      if (dismissedKeys.has(key) || seen.has(key)) continue
      seen.add(key)
      out.push(label)
    }
    for (const label of selectedLabels) {
      const key = normalizeLabel(label)
      if (dismissedKeys.has(key) || seen.has(key)) continue
      seen.add(key)
      out.push(label)
    }
    return out
  }, [availableLabels, dismissedKeys, selectedLabels])

  const setLabels = (next: string[]) => {
    onChange({ ...settings, fieldIds: next })
  }

  const cancelLabel = (label: string) => {
    const key = normalizeLabel(label)
    setLabels(selectedLabels.filter((item) => normalizeLabel(item) !== key))
    setDismissedKeys((prev) => {
      const next = new Set(prev)
      next.add(key)
      return next
    })
  }

  const closeAdd = () => {
    setAdding(false)
    setDraftLabel('')
  }

  const addLabel = (raw: string) => {
    const label = raw.trim()
    if (!label) {
      closeAdd()
      return
    }
    const key = normalizeLabel(label)
    setDismissedKeys((prev) => {
      if (!prev.has(key)) return prev
      const next = new Set(prev)
      next.delete(key)
      return next
    })
    if (!selectedLabels.some((item) => normalizeLabel(item) === key)) {
      setLabels([...selectedLabels, label])
    }
    closeAdd()
  }

  // Visible Fields-step chips are part of the saved selection (× removes them).
  useEffect(() => {
    if (!settings.enabled) return
    const missing = availableLabels.filter((label) => {
      const key = normalizeLabel(label)
      if (dismissedKeys.has(key)) return false
      return !selectedLabels.some((item) => normalizeLabel(item) === key)
    })
    if (missing.length === 0) return
    onChange({
      ...settings,
      fieldIds: [...selectedLabels, ...missing],
    })
  }, [
    availableLabels,
    dismissedKeys,
    onChange,
    selectedLabels,
    settings,
  ])

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

  const levelIndex = levelToIndex(settings.level)
  const committedFillPercent = (levelIndex / (LEVEL_STEPS.length - 1)) * 100
  const [dragFillPercent, setDragFillPercent] = useState<number | null>(null)
  const levelFillPercent = dragFillPercent ?? committedFillPercent
  const previewLevel = indexToLevel(
    Math.round((levelFillPercent / 100) * (LEVEL_STEPS.length - 1)),
  )
  const levelTheme = LEVEL_THEME[previewLevel] || LEVEL_THEME.medium
  const sliderTrackRef = useRef<HTMLDivElement>(null)
  const isDraggingLevelRef = useRef(false)
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    const ratioFromClientX = (clientX: number) => {
      const track = sliderTrackRef.current
      if (!track) return 0
      const rect = track.getBoundingClientRect()
      // Match visual track inset (px-4 / 1rem each side).
      const pad = 16
      const usable = rect.width - pad * 2
      if (usable <= 0) return 0
      return Math.min(1, Math.max(0, (clientX - rect.left - pad) / usable))
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!isDraggingLevelRef.current) return
      event.preventDefault()
      setDragFillPercent(ratioFromClientX(event.clientX) * 100)
    }

    const onPointerUp = (event: PointerEvent) => {
      if (!isDraggingLevelRef.current) return
      isDraggingLevelRef.current = false
      const ratio = ratioFromClientX(event.clientX)
      const nextLevel = indexToLevel(
        Math.round(ratio * (LEVEL_STEPS.length - 1)),
      )
      const current = settingsRef.current
      if (nextLevel !== current.level) {
        onChangeRef.current({ ...current, level: nextLevel })
      }
      setDragFillPercent(null)
    }

    window.addEventListener('pointermove', onPointerMove, { passive: false })
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
  }, [])

  const startLevelDrag = (clientX: number) => {
    const track = sliderTrackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    const pad = 16
    const usable = rect.width - pad * 2
    if (usable <= 0) return
    const ratio = Math.min(
      1,
      Math.max(0, (clientX - rect.left - pad) / usable),
    )
    isDraggingLevelRef.current = true
    setDragFillPercent(ratio * 100)
  }

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
          <>
            <AnimateFadeIn delay={0.15}>
              <div className='rounded-[12px] border border-gray-3 bg-surface p-4'>
                <h3 className='text-14/5 font-semibold text-gray-12'>
                  {t`Fields to redact`}
                </h3>


                <div className='mt-3 max-w-xl'>
                  <div className='flex h-40 w-full flex-wrap content-start gap-1.5 overflow-y-auto rounded-[10px] border border-gray-3 bg-surface-primary p-2.5'>
                    {displayLabels.length === 0 ? (
                      <p className='self-center px-1 py-2 text-13 text-gray-9'>
                        {t`Add fields in the Fields step first, or type a label below.`}
                      </p>
                    ) : null}

                    {displayLabels.map((label) => (
                      <span
                        key={normalizeLabel(label)}
                        className='inline-flex max-w-full items-center gap-1 rounded-full border border-primary-5 bg-primary-2 px-2.5 py-1 text-12 font-medium text-gray-12'
                      >
                        <span className='min-w-0 truncate'>{label}</span>
                        <button
                          aria-label={t`Remove ${label}`}
                          className='inline-flex size-4 shrink-0 items-center justify-center rounded-full text-gray-9 transition-colors hover:bg-red-2 hover:text-red-10 active:scale-95'
                          type='button'
                          onClick={() => cancelLabel(label)}
                        >
                          <Icon className='size-3.5' icon='lucide:x' />
                        </button>
                      </span>
                    ))}

                    {adding ? (
                      <div className='relative flex h-7 min-w-[12rem] flex-1 items-center'>
                        <input
                          autoFocus
                          className='h-full w-full rounded-full border border-primary-6 bg-surface py-0 pr-8 pl-2.5 text-12 text-gray-12 outline-none focus:ring-1 focus:ring-primary-4'
                          placeholder={t`Type label, then press +`}
                          value={draftLabel}
                          onChange={(event) => setDraftLabel(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault()
                              addLabel(draftLabel)
                            }
                            if (event.key === 'Escape') {
                              event.preventDefault()
                              closeAdd()
                            }
                          }}
                        />
                        <button
                          aria-label={t`Add field label`}
                          className='absolute top-1/2 right-1 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-primary-11 transition-colors hover:bg-primary-2 active:scale-95'
                          type='button'
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => addLabel(draftLabel)}
                        >
                          <Icon className='size-3.5' icon='lucide:plus' />
                        </button>
                      </div>
                    ) : (
                      <button
                        aria-label={t`Add field label`}
                        className='inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-dashed border-primary-6 bg-primary-2 text-primary-11 transition-colors hover:bg-primary-3 active:scale-95'
                        type='button'
                        onClick={() => setAdding(true)}
                      >
                        <Icon className='size-3.5' icon='lucide:plus' />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </AnimateFadeIn>

            <AnimateFadeIn delay={0.2}>
              <div className='rounded-[12px] border border-gray-3 bg-surface p-4'>
                <h3 className='text-14/5 font-semibold text-gray-12'>
                  {t`Redaction level`}
                </h3>
               

                <div className='mt-4 w-full select-none'>
                  <div
                    ref={sliderTrackRef}
                    aria-label={t`Redaction level`}
                    aria-valuemax={2}
                    aria-valuemin={0}
                    aria-valuenow={levelIndex}
                    aria-valuetext={previewLevel}
                    className='relative h-11 w-full touch-none px-4'
                    role='slider'
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (
                        event.key === 'ArrowRight' ||
                        event.key === 'ArrowUp'
                      ) {
                        event.preventDefault()
                        onChange({
                          ...settings,
                          level: indexToLevel(levelIndex + 1),
                        })
                      }
                      if (
                        event.key === 'ArrowLeft' ||
                        event.key === 'ArrowDown'
                      ) {
                        event.preventDefault()
                        onChange({
                          ...settings,
                          level: indexToLevel(levelIndex - 1),
                        })
                      }
                    }}
                    onPointerDown={(event) => {
                      event.preventDefault()
                      startLevelDrag(event.clientX)
                    }}
                  >
                    <div className='pointer-events-none absolute inset-y-0 right-4 left-4 flex items-center'>
                      <div className='h-2 w-full rounded-full bg-gray-3' />
                    </div>
                    <div className='pointer-events-none absolute inset-y-0 right-4 left-4 flex items-center'>
                      <div
                        className={cn(
                          'h-2 max-w-full rounded-full',
                          levelTheme.fill,
                        )}
                        style={{ width: `${levelFillPercent}%` }}
                      />
                    </div>
                    <button
                      aria-hidden
                      tabIndex={-1}
                      type='button'
                      className={cn(
                        'absolute top-1/2 z-20 flex size-8 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full text-white shadow-md outline-none active:cursor-grabbing',
                        levelTheme.thumb,
                        dragFillPercent != null ? 'ring-4' : 'hover:ring-4',
                        levelTheme.trackRing,
                      )}
                      style={{
                        left: `calc(1rem + (100% - 2rem) * ${levelFillPercent / 100})`,
                      }}
                      onPointerDown={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        startLevelDrag(event.clientX)
                      }}
                    >
                      <Icon
                        className='size-3.5'
                        icon='lucide:grip-vertical'
                      />
                    </button>
                  </div>

                  <div className='mt-1 flex w-full justify-between px-4'>
                    {LEVEL_STEPS.map((step) => {
                      const active = step === previewLevel
                      const theme = LEVEL_THEME[step]
                      return (
                        <button
                          key={step}
                          type='button'
                          className={cn(
                            'text-12 font-semibold capitalize transition-colors hover:opacity-90 active:scale-95',
                            active ? theme.label : 'text-gray-9',
                          )}
                          onClick={() =>
                            onChange({ ...settings, level: step })
                          }
                        >
                          {step}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </AnimateFadeIn>
          </>
        ) : null}
      </div>
    </SettingsFormSection>
  )
}

export default PiiRedactionWizardStep
