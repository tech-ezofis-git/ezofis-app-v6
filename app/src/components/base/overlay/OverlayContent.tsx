import ScrollArea from '@/components/base/scroll-area/ScrollArea'

interface Props {
  children: React.ReactNode
  hasFooter?: boolean
  hasHeader?: boolean
  height?: number | string
}

const OverlayContent = ({
  children,
  hasFooter = false,
  hasHeader = false,
  height,
}: Props) => {
  let _height = 16
  if (hasHeader) _height += 56
  if (hasFooter) _height += 56

  return (
    <ScrollArea height={height || `calc(100dvh - ${_height}px)`}>
      {children}
    </ScrollArea>
  )
}

OverlayContent.displayName = 'OverlayContent'
export default OverlayContent
