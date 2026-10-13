import { useLingui } from '@lingui/react/macro'
import { useId, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import Modal from '@/components/base/Modal'
import cn from '@/utils/cn'

type InfoCardVariant = 'danger' | 'info' | 'success' | 'warning'

export type InfoCardSize = 'sm' | 'md'

type InfoCardProps = {
  description: string
  title: string
  className?: string
  icon?: string
  showAccent?: boolean
  showVideo?: boolean
  size?: InfoCardSize
  variant?: InfoCardVariant
  videoUrl?: string
}

const VARIANT_CLASS: Record<
  InfoCardVariant,
  {
    accent: string
    button: string
    divider: string
    icon: string
    iconClass: string
    shell: string
  }
> = {
  danger: {
    accent: 'bg-red-9',
    button:
      'border-red-7 text-red-11 hover:bg-red-2 active:bg-red-3 focus-visible:ring-red-7',
    divider: 'border-red-6',
    icon: 'lucide:alert-circle',
    iconClass: 'text-red-9',
    shell: 'border-red-6 bg-red-2 text-red-12',
  },
  info: {
    accent: 'bg-blue-8',
    button:
      'border-blue-7 text-blue-11 hover:bg-blue-2 active:bg-blue-3 focus-visible:ring-blue-7',
    divider: 'border-blue-5',
    icon: 'lucide:info',
    iconClass: 'text-blue-11',
    shell: 'border-blue-5 bg-blue-2 text-blue-12',
  },
  success: {
    accent: 'bg-green-9',
    button:
      'border-green-7 text-green-11 hover:bg-green-2 active:bg-green-3 focus-visible:ring-green-7',
    divider: 'border-green-6',
    icon: 'lucide:circle-check',
    iconClass: 'text-green-9',
    shell: 'border-green-6 bg-green-2 text-green-12',
  },
  warning: {
    accent: 'bg-orange-9',
    button:
      'border-orange-7 text-orange-11 hover:bg-orange-2 active:bg-orange-3 focus-visible:ring-orange-7',
    divider: 'border-orange-6',
    icon: 'lucide:info',
    iconClass: 'text-orange-9',
    shell: 'border-orange-6 bg-orange-2 text-orange-12',
  },
}

const SIZE_CONFIG: Record<
  InfoCardSize,
  {
    button: string
    buttonIcon: string
    description: string
    header: string
    icon: string
    title: string
    videoButton: string
  }
> = {
  sm: {
    button: 'h-6 gap-1 px-2 text-11 font-medium',
    buttonIcon: 'size-3',
    description: 'px-3 py-2 text-11 leading-relaxed font-normal',
    header: 'gap-2.5 px-3 py-2',
    icon: 'size-4 shrink-0',
    title: 'text-12 font-semibold leading-snug',
    videoButton: 'size-6 [&_svg]:size-3',
  },
  md: {
    button: 'h-6.5 gap-1 px-2.5 text-11 font-semibold',
    buttonIcon: 'size-3.5',
    description: 'px-3.5 py-2.5 text-12 leading-relaxed font-medium',
    header: 'gap-3 px-3.5 py-2.5',
    icon: 'size-4.5 shrink-0',
    title: 'text-13 font-semibold leading-snug',
    videoButton: 'size-7 [&_svg]:size-3.5',
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
  icon,
  showAccent = true,
  showVideo = false,
  size = 'md',
  title,
  variant = 'info',
  videoUrl,
}: InfoCardProps) {
  const { t } = useLingui()
  const tone = VARIANT_CLASS[variant]
  const sizes = SIZE_CONFIG[size]
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
          'flex shrink-0 overflow-hidden rounded-md border outline-none',
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
        {showAccent ? <div className={cn('w-1 shrink-0', tone.accent)} /> : null}
        <div className='min-w-0 flex-1'>
          <div className={cn('flex items-center', sizes.header)}>
            <Icon
              className={cn(sizes.icon, tone.iconClass)}
              name={icon || tone.icon}
            />
            <p className={cn('min-w-0 flex-1', sizes.title)} id={titleId}>
              {title}
            </p>
            {description && false ? (
              <button
                aria-expanded={expanded}
                className={cn(
                  'inline-flex shrink-0 items-center rounded-full border bg-surface shadow-xs outline-none transition-colors focus-visible:ring-2',
                  sizes.button,
                  tone.button,
                )}
                type='button'
                onClick={(event) => {
                  event.stopPropagation()
                  toggleExpanded()
                }}
              >
                <Icon
                  className={sizes.buttonIcon}
                  name={expanded ? 'lucide:chevron-up' : 'lucide:chevron-down'}
                />
                {expanded ? t`Read less` : t`Read more`}
              </button>
            ) : null}
            {hasVideo ? (
              <button
                aria-label={t`Play information video`}
                className={cn(
                  'inline-flex shrink-0 items-center justify-center rounded-full border border-primary-6 bg-surface text-primary-11 shadow-xs transition-colors hover:bg-primary-3 active:bg-primary-4',
                  sizes.videoButton,
                )}
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
                'border-t',
                sizes.description,
                tone.divider,
              )}
            >
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {hasVideo ? (
        <Modal
          className='flex max-h-[calc(100vh-48px)] flex-col overflow-hidden rounded-2xl shadow-2xl'
          opened={videoOpen}
          width='calc(100vw - 48px)'
          onClose={() => setVideoOpen(false)}
        >
          <div className='flex shrink-0 items-center justify-between border-b border-gray-3 bg-surface px-5 py-3.5'>
            <h3 className='text-15 font-semibold text-gray-13'>{title}</h3>
            <button
              aria-label={t`Close`}
              className='inline-flex size-8 items-center justify-center rounded-lg text-gray-11 transition-colors hover:bg-gray-3 hover:text-gray-13 active:scale-95'
              type='button'
              onClick={() => setVideoOpen(false)}
            >
              <Icon className='size-4.5' name='lucide:x' />
            </button>
          </div>
          <div className='flex flex-1 items-center justify-center overflow-hidden bg-gray-2 p-3 sm:p-5'>
            {playbackUrl ? (
              <div className='relative aspect-video h-full max-h-[calc(100vh-140px)] w-full max-w-[calc((100vh-140px)*16/9)] overflow-hidden rounded-xl bg-gray-12 shadow-md'>
                {isEmbedVideo(playbackUrl) ? (
                  <iframe
                    allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                    allowFullScreen
                    className='h-full w-full'
                    src={embedSrc(playbackUrl)}
                    title={title}
                  />
                ) : (
                  <video
                    className='h-full w-full'
                    controls
                    src={playbackUrl}
                  >
                    <track kind='captions' />
                  </video>
                )}
              </div>
            ) : (
              <p className='py-12 text-center text-13 text-gray-11'>
                {t`Add a video for this step to play it here.`}
              </p>
            )}
          </div>
        </Modal>
      ) : null}
    </>
  )
}
