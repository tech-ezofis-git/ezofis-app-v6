import { useLingui } from '@lingui/react/macro'
import { useId, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import Modal from '@/components/base/Modal'
import cn from '@/utils/cn'

type InfoCardVariant = 'danger' | 'info' | 'success'

type InfoCardProps = {
  description: string
  title: string
  className?: string
  showVideo?: boolean
  variant?: InfoCardVariant
  videoUrl?: string
}

const VARIANT_CLASS: Record<
  InfoCardVariant,
  { accent: string; divider: string; icon: string; iconClass: string; shell: string }
> = {
  danger: {
    accent: 'bg-red-9',
    divider: 'border-red-6',
    icon: 'lucide:alert-circle',
    iconClass: 'text-red-9',
    shell: 'border-red-6 bg-red-2 text-red-12',
  },
  info: {
    accent: 'bg-blue-8',
    divider: 'border-blue-5',
    icon: 'lucide:info',
    iconClass: 'text-blue-11',
    shell: 'border-blue-5 bg-blue-2 text-blue-12',
  },
  success: {
    accent: 'bg-green-9',
    divider: 'border-green-6',
    icon: 'lucide:circle-check',
    iconClass: 'text-green-9',
    shell: 'border-green-6 bg-green-2 text-green-12',
  },
}

const DEFAULT_INFO_VIDEO_URL =
  'https://app.supademo.com/embed/clxbirpmz0rgat2oea5devc2m'

const isEmbedVideo = (url: string) =>
  /youtube\.com|youtu\.be|vimeo\.com|supademo\.com|\/embed\//i.test(url)

const embedSrc = (url: string) => {
  const youtube = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/i,
  )
  if (youtube?.[1]) return `https://www.youtube.com/embed/${youtube[1]}`
  const vimeo = url.match(/vimeo\.com\/(\d+)/i)
  if (vimeo?.[1]) return `https://player.vimeo.com/video/${vimeo[1]}`
  return url
}

export default function InfoCard({
  className,
  description,
  showVideo = false,
  title,
  variant = 'info',
  videoUrl,
}: InfoCardProps) {
  const { t } = useLingui()
  const tone = VARIANT_CLASS[variant]
  const [expanded, setExpanded] = useState(true)
  const [videoOpen, setVideoOpen] = useState(false)
  const titleId = useId()
  const playbackUrl = videoUrl || (showVideo ? DEFAULT_INFO_VIDEO_URL : '')
  const hasVideo = Boolean(playbackUrl)
  const canToggle = Boolean(description)

  const toggleExpanded = () => {
    if (!canToggle) return
    setExpanded((current) => !current)
  }

  return (
    <>
      <div
        aria-expanded={canToggle ? expanded : undefined}
        className={cn(
          'flex overflow-hidden rounded-md border outline-none',
          tone.shell,
          canToggle && 'cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-7',
          className,
        )}
        role={canToggle ? 'button' : undefined}
        tabIndex={canToggle ? 0 : undefined}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest('[data-info-card-ignore]')) return
          toggleExpanded()
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          toggleExpanded()
        }}
      >
        <div className={cn('w-1 shrink-0', tone.accent)} />
        <div className='min-w-0 flex-1'>
          <div className='flex items-center gap-3 px-3.5 py-2.5'>
            <Icon
              className={cn('size-5 shrink-0', tone.iconClass)}
              name={tone.icon}
            />
            <p className='min-w-0 flex-1 text-13 font-semibold leading-snug' id={titleId}>
              {title}
            </p>
            {description ? (
              <button
                aria-expanded={expanded}
                className='inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-blue-8 bg-surface px-2.5 text-12 font-semibold text-blue-11 shadow-sm outline-none transition-colors hover:bg-blue-2 focus-visible:ring-2 focus-visible:ring-blue-7 active:bg-blue-3'
                type='button'
                onClick={(event) => {
                  event.stopPropagation()
                  toggleExpanded()
                }}
              >
                <Icon
                  className='size-3.5'
                  name={expanded ? 'lucide:chevron-up' : 'lucide:chevron-down'}
                />
                {expanded ? t`Read less` : t`Read more`}
              </button>
            ) : null}
            {hasVideo ? (
              <button
                aria-label={t`Play information video`}
                className='inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-primary-6 bg-surface text-primary-11 shadow-sm transition-colors hover:bg-primary-3 active:bg-primary-4'
                type='button'
                onClick={(event) => {
                  event.stopPropagation()
                  setVideoOpen(true)
                }}
              >
                <Icon className='size-3.5' name='lucide:play' />
              </button>
            ) : null}
          </div>
          {description && expanded ? (
            <p
              className={cn(
                'border-t px-3.5 py-2.5 text-12 leading-relaxed font-medium',
                tone.divider,
              )}
            >
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {hasVideo ? (
        <Modal opened={videoOpen} width={720} onClose={() => setVideoOpen(false)}>
          <div className='flex items-center justify-between border-b border-gray-3 px-4 py-3'>
            <h3 className='text-14 font-semibold text-gray-13'>{title}</h3>
            <button
              aria-label={t`Close`}
              className='inline-flex size-7 items-center justify-center rounded-md text-gray-11 hover:bg-gray-3'
              type='button'
              onClick={() => setVideoOpen(false)}
            >
              <Icon className='size-4' name='lucide:x' />
            </button>
          </div>
          <div className='bg-gray-1 p-4'>
            {playbackUrl ? (
              isEmbedVideo(playbackUrl) ? (
                <iframe
                  allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                  allowFullScreen
                  className='aspect-video w-full rounded-lg bg-gray-12'
                  src={embedSrc(playbackUrl)}
                  title={title}
                />
              ) : (
                <video
                  className='aspect-video w-full rounded-lg bg-gray-12'
                  controls
                  src={playbackUrl}
                >
                  <track kind='captions' />
                </video>
              )
            ) : (
              <p className='py-8 text-center text-13 text-gray-11'>
                {t`Add a video for this step to play it here.`}
              </p>
            )}
          </div>
        </Modal>
      ) : null}
    </>
  )
}
