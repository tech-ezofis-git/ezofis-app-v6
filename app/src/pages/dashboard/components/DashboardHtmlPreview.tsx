type Props = {
  className?: string
  html: string
  title: string
}

export default function DashboardHtmlPreview({
  className,
  html,
  title,
}: Props) {
  return (
    <iframe
      aria-label={title}
      className={
        className ||
        'min-h-[640px] w-full overflow-auto rounded-[16px] border border-border-default bg-surface p-3'
      }
      sandbox='allow-scripts allow-same-origin allow-forms allow-popups'
      srcDoc={html}
      title={title}
    />
  )
}

