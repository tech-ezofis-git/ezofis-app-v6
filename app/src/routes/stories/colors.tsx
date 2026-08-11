import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/colors')({
  component: ColorsStory,
})

//const colorScales = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

const rgbToHex = (rgb: string) => {
  if (!rgb) return ''
  const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/)
  if (!match) return rgb
  const r = parseInt(match[1], 10).toString(16).padStart(2, '0')
  const g = parseInt(match[2], 10).toString(16).padStart(2, '0')
  const b = parseInt(match[3], 10).toString(16).padStart(2, '0')
  return `#${r}${g}${b}`
}

function copyToClipboard(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text)
  } else {
    // Fallback for non-secure contexts
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    return new Promise<void>((resolve, reject) => {
      document.execCommand('copy') ? resolve() : reject()
      textArea.remove()
    })
  }
}

const ColorBox = ({
  colorClass,
  step,
}: {
  colorClass: string
  step: number
}) => {
  const [hex, setHex] = React.useState('')
  const [copied, setCopied] = React.useState<string | null>(null)
  const ref = React.useRef<HTMLDivElement>(null)

  const handleMouseEnter = () => {
    if (ref.current) {
      const computedStyle = getComputedStyle(ref.current)
      const backgroundColor = computedStyle.backgroundColor
      setHex(rgbToHex(backgroundColor))
    }
  }

  const handleCopy = (text: string, type: 'class' | 'hex') => {
    copyToClipboard(text).then(() => {
      setCopied(type)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  const className = `bg-${colorClass}-${step}`

  return (
    <div className='group relative' onMouseEnter={handleMouseEnter}>
      <div
        className={`h-12 w-full rounded-md border border-black/5 dark:border-white/5 ${className} cursor-pointer transition-transform hover:scale-105 hover:shadow-lg`}
        ref={ref}
      />
      <div className='pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 flex w-max -translate-x-1/2 transform flex-col items-center gap-1 rounded bg-gray-12 px-2 py-1 text-xs text-white opacity-0 shadow transition-opacity group-hover:pointer-events-auto group-hover:opacity-100'>
        <button
          className='pointer-events-auto flex cursor-pointer items-center gap-1 hover:text-primary-8'
          onClick={() => handleCopy(className, 'class')}
        >
          <span className='font-mono'>{className}</span>
          {copied === 'class' && (
            <span className='text-[10px] text-green-9'>Copied!</span>
          )}
        </button>
        {hex && (
          <button
            className='pointer-events-auto flex cursor-pointer items-center gap-1 hover:text-primary-8'
            onClick={() => handleCopy(hex, 'hex')}
          >
            <span className='font-mono opacity-80'>{hex}</span>
            {copied === 'hex' && (
              <span className='text-[10px] text-green-9'>Copied!</span>
            )}
          </button>
        )}
      </div>
      <span className='text-10 mt-2 block text-center text-gray-11 opacity-0 transition-opacity group-hover:opacity-100'>
        {step}
      </span>
    </div>
  )
}

const Palette = ({
  colorClass,
  name,
  steps = 12,
}: {
  colorClass: string
  name: string
  steps?: number
}) => {
  const scales = Array.from({ length: steps }, (_, i) =>
    colorClass === 'gray' ? i : i + 1,
  )

  return (
    <div className='space-y-4'>
      <h3 className='px-1 text-14 font-semibold text-gray-12 capitalize'>
        {name}
      </h3>
      <div className='grid grid-cols-6 gap-3 sm:grid-cols-12 md:grid-cols-14'>
        {scales.map((step) => (
          <ColorBox colorClass={colorClass} key={step} step={step} />
        ))}
      </div>
    </div>
  )
}

const BrandSwatch = ({
  colorClass,
  hexValue,
  label,
}: {
  colorClass: string
  hexValue?: string
  label: string
}) => {
  const [hex, setHex] = React.useState(hexValue || '')
  const [copied, setCopied] = React.useState<string | null>(null)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!hex && ref.current) {
      const computedStyle = getComputedStyle(ref.current)
      const backgroundColor = computedStyle.backgroundColor
      setHex(rgbToHex(backgroundColor))
    }
  }, [hex])

  const handleCopy = (text: string, type: 'class' | 'hex') => {
    copyToClipboard(text).then(() => {
      setCopied(type)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  return (
    <div className='flex flex-col gap-2'>
      <div
        className={`group relative flex h-16 w-full items-center justify-center rounded-md ${colorClass} cursor-pointer shadow-sm transition-transform hover:scale-105 hover:shadow-md`}
        ref={ref}
        onClick={() => handleCopy(colorClass.replace('bg-', ''), 'class')}
      >
        <span className='text-sm font-medium text-white drop-shadow-sm'>
          {label}
        </span>

        {/* Hover Tooltip */}
        <div className='pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 flex w-max -translate-x-1/2 transform flex-col items-center gap-1 rounded bg-gray-12 px-2 py-1 text-xs text-white opacity-0 shadow transition-opacity group-hover:pointer-events-auto group-hover:opacity-100'>
          <span className='font-mono text-[10px] opacity-80'>
            {colorClass.replace('bg-', '')}
          </span>
          {hex && (
            <span className='font-mono text-[10px] opacity-60'>{hex}</span>
          )}
          {copied && (
            <span className='text-[10px] font-bold text-green-9'>Copied!</span>
          )}
        </div>
      </div>
    </div>
  )
}

function ColorsStory() {
  return (
    <div className='max-w-6xl p-6'>
      <StoryTitle>Color Palette</StoryTitle>
      <p className='mb-10 text-15 text-gray-11'>
        Our color system is built using semantic scales, ensuring accessible
        contrast and meaningful visual feedback. Each color family consists of
        12 steps (or 14 for Grayscale), optimized for backgrounds, borders, and
        interactive states.
      </p>

      <div className='space-y-16'>
        {/* Brand Colors - New Section */}
        <section>
          <StorySubTitle>Brand Colors</StorySubTitle>
          <p className='mb-6 text-14 text-gray-11'>
            Primary brand colors used for key interface elements.
          </p>
          <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
            <BrandSwatch colorClass='bg-primary-11' label='Primary' />
            <BrandSwatch colorClass='bg-secondary-9' label='Secondary' />
            <BrandSwatch colorClass='bg-purple-9' label='Accent' />
            <BrandSwatch colorClass='bg-gray-13' label='Dark' />
            <BrandSwatch colorClass='bg-green-9' label='Positive' />
            <BrandSwatch colorClass='bg-red-9' label='Negative' />
            <BrandSwatch colorClass='bg-cyan-9' label='Info' />
            <BrandSwatch colorClass='bg-yellow-9' label='Warning' />
          </div>
        </section>

        {/* Extended Brand Colors */}
        <section>
          <StorySubTitle>Extended Brand Colors</StorySubTitle>
          <div className='mt-8 space-y-12'>
            <Palette colorClass='primary' name='Primary (Purple)' />
            <Palette colorClass='secondary' name='Secondary (Cyan)' />
          </div>
        </section>

        {/* Semantic Colors */}
        <section>
          <StorySubTitle>Semantic Tones</StorySubTitle>
          <div className='mt-8 space-y-12'>
            <Palette colorClass='red' name='Red / Error' />
            <Palette colorClass='green' name='Green / Success' />
            <Palette colorClass='orange' name='Orange / Warning' />
            <Palette colorClass='blue' name='Blue / Info' />
          </div>
        </section>

        {/* Grayscale */}
        <section>
          <StorySubTitle>Neutral & Grayscale</StorySubTitle>
          <div className='mt-8 space-y-12'>
            <Palette colorClass='gray' name='Gray (Neutral)' steps={14} />
          </div>
        </section>

        {/* Extended Palette */}
        <section>
          <StorySubTitle>Extended Palette</StorySubTitle>
          <div className='mt-8 space-y-12'>
            <div className='grid grid-cols-1 gap-12'>
              <Palette colorClass='indigo' name='Indigo' />
              <Palette colorClass='violet' name='Violet' />
              <Palette colorClass='purple' name='Purple' />
              <Palette colorClass='pink' name='Pink' />
              <Palette colorClass='teal' name='Teal' />
              <Palette colorClass='cyan' name='Cyan' />
              <Palette colorClass='yellow' name='Yellow' />
              <Palette colorClass='bronze' name='Bronze' />
              <Palette colorClass='gold' name='Gold' />
            </div>
          </div>
        </section>

        {/* Variable Usage */}
        <section>
          <StorySubTitle>Variable Usage</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            Use the utility classes or CSS variables for consistency. The system
            automatically handles light and dark mode transitions:
          </p>
          <StoryCode>
            {`.my-element {
  background-color: var(--color-primary-9);
  color: var(--color-white);
  border: 1px solid var(--color-gray-3);
}

/* Or via Tailwind */
<div className="bg-primary-9 dark:bg-primary-10 text-white border-gray-3" />`}
          </StoryCode>
        </section>
      </div>
    </div>
  )
}
