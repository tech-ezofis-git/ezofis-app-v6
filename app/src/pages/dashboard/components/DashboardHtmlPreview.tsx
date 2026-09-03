import { useEffect, useRef } from 'react'

type Props = {
  className?: string
  html: string
  title: string
}

export default function DashboardHtmlPreview({ className, html, title }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    const markup = html.trim()
    if (!host || !markup) return

    const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' })
    root.innerHTML = markup
  }, [html])

  return (
    <div
      ref={hostRef}
      aria-label={title}
      className={
        className ||
        'min-h-[640px] w-full overflow-auto rounded-[16px] border border-border-default bg-white p-3'
      }
      role='region'
    />
  )
}
