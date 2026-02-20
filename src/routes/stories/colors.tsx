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
        const textArea = document.createElement("textarea")
        textArea.value = text
        textArea.style.position = "fixed"
        textArea.style.left = "-999999px"
        textArea.style.top = "-999999px"
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        return new Promise<void>((resolve, reject) => {
            document.execCommand('copy') ? resolve() : reject()
            textArea.remove()
        })
    }

}

const ColorBox = ({ colorClass, step }: { colorClass: string; step: number }) => {
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
        <div
            className='group relative'
            onMouseEnter={handleMouseEnter}
        >
            <div
                ref={ref}
                className={`h-12 w-full rounded-md border border-black/5 dark:border-white/5 ${className} cursor-pointer transition-transform hover:scale-105 hover:shadow-lg`}
            />
            <div className='absolute z-10 bottom-full left-1/2 mb-2 w-max -translate-x-1/2 transform rounded bg-gray-12 px-2 py-1 text-xs text-white opacity-0 shadow transition-opacity group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto flex flex-col items-center gap-1'>
                <button
                    onClick={() => handleCopy(className, 'class')}
                    className='hover:text-primary-8 flex items-center gap-1 cursor-pointer pointer-events-auto'
                >
                    <span className="font-mono">{className}</span>
                    {copied === 'class' && <span className="text-[10px] text-green-9">Copied!</span>}
                </button>
                {hex && (
                    <button
                        onClick={() => handleCopy(hex, 'hex')}
                        className='hover:text-primary-8 flex items-center gap-1 cursor-pointer pointer-events-auto'
                    >
                        <span className="font-mono opacity-80">{hex}</span>
                        {copied === 'hex' && <span className="text-[10px] text-green-9">Copied!</span>}
                    </button>
                )}
            </div>
            <span className='text-10 mt-2 block text-center text-gray-11 opacity-0 transition-opacity group-hover:opacity-100'>
                {step}
            </span>
        </div>
    )
}

const Palette = ({ name, colorClass, steps = 12 }: { name: string; colorClass: string; steps?: number }) => {
    const scales = Array.from({ length: steps }, (_, i) => (colorClass === 'gray' ? i : i + 1))

    return (
        <div className='space-y-4'>
            <h3 className='px-1 text-14 font-semibold capitalize text-gray-12'>{name}</h3>
            <div className='grid grid-cols-6 gap-3 sm:grid-cols-12 md:grid-cols-14'>
                {scales.map((step) => (
                    <ColorBox key={step} colorClass={colorClass} step={step} />
                ))}
            </div>
        </div>
    )
}

const BrandSwatch = ({ label, colorClass, hexValue }: { label: string; colorClass: string; hexValue?: string }) => {
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
        <div className="flex flex-col gap-2">
            <div
                ref={ref}
                className={`group relative flex h-16 w-full items-center justify-center rounded-md ${colorClass} shadow-sm transition-transform hover:scale-105 hover:shadow-md cursor-pointer`}
                onClick={() => handleCopy(colorClass.replace('bg-', ''), 'class')}
            >
                <span className="text-white font-medium text-sm drop-shadow-sm">{label}</span>

                {/* Hover Tooltip */}
                <div className='absolute z-10 bottom-full left-1/2 mb-2 w-max -translate-x-1/2 transform rounded bg-gray-12 px-2 py-1 text-xs text-white opacity-0 shadow transition-opacity group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto flex flex-col items-center gap-1'>
                    <span className="font-mono text-[10px] opacity-80">{colorClass.replace('bg-', '')}</span>
                    {hex && <span className="font-mono text-[10px] opacity-60">{hex}</span>}
                    {copied && <span className="text-[10px] text-green-9 font-bold">Copied!</span>}
                </div>
            </div>
        </div>
    )
}

function ColorsStory() {
    return (
        <div className='max-w-6xl p-6'>
            <StoryTitle>Color Palette</StoryTitle>
            <p className='text-15 text-gray-11 mb-10'>
                Our color system is built using semantic scales, ensuring accessible contrast and meaningful visual feedback.
                Each color family consists of 12 steps (or 14 for Grayscale), optimized for backgrounds, borders, and interactive states.
            </p>

            <div className='space-y-16'>
                {/* Brand Colors - New Section */}
                <section>
                    <StorySubTitle>Brand Colors</StorySubTitle>
                    <p className="text-14 text-gray-11 mb-6">
                        Primary brand colors used for key interface elements.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <BrandSwatch label="Primary" colorClass="bg-primary-11" />
                        <BrandSwatch label="Secondary" colorClass="bg-secondary-9" />
                        <BrandSwatch label="Accent" colorClass="bg-purple-9" />
                        <BrandSwatch label="Dark" colorClass="bg-gray-13" />
                        <BrandSwatch label="Positive" colorClass="bg-green-9" />
                        <BrandSwatch label="Negative" colorClass="bg-red-9" />
                        <BrandSwatch label="Info" colorClass="bg-cyan-9" />
                        <BrandSwatch label="Warning" colorClass="bg-yellow-9" />
                    </div>
                </section>

                {/* Extended Brand Colors */}
                <section>
                    <StorySubTitle>Extended Brand Colors</StorySubTitle>
                    <div className='mt-8 space-y-12'>
                        <Palette name='Primary (Purple)' colorClass='primary' />
                        <Palette name='Secondary (Cyan)' colorClass='secondary' />
                    </div>
                </section>

                {/* Semantic Colors */}
                <section>
                    <StorySubTitle>Semantic Tones</StorySubTitle>
                    <div className='mt-8 space-y-12'>
                        <Palette name='Red / Error' colorClass='red' />
                        <Palette name='Green / Success' colorClass='green' />
                        <Palette name='Orange / Warning' colorClass='orange' />
                        <Palette name='Blue / Info' colorClass='blue' />
                    </div>
                </section>

                {/* Grayscale */}
                <section>
                    <StorySubTitle>Neutral & Grayscale</StorySubTitle>
                    <div className='mt-8 space-y-12'>
                        <Palette name='Gray (Neutral)' colorClass='gray' steps={14} />
                    </div>
                </section>

                {/* Extended Palette */}
                <section>
                    <StorySubTitle>Extended Palette</StorySubTitle>
                    <div className='mt-8 space-y-12'>
                        <div className='grid grid-cols-1 gap-12'>
                            <Palette name='Indigo' colorClass='indigo' />
                            <Palette name='Violet' colorClass='violet' />
                            <Palette name='Purple' colorClass='purple' />
                            <Palette name='Pink' colorClass='pink' />
                            <Palette name='Teal' colorClass='teal' />
                            <Palette name='Cyan' colorClass='cyan' />
                            <Palette name='Yellow' colorClass='yellow' />
                            <Palette name='Bronze' colorClass='bronze' />
                            <Palette name='Gold' colorClass='gold' />
                        </div>
                    </div>
                </section>

                {/* Variable Usage */}
                <section>
                    <StorySubTitle>Variable Usage</StorySubTitle>
                    <p className='text-14 text-gray-11 mb-4'>
                        Use the utility classes or CSS variables for consistency. The system automatically handles light and dark mode transitions:
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
