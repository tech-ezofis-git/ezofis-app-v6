import ScrollArea from '@/components/base/scroll-area/ScrollArea'

interface Props {
  children: React.ReactNode
  hasFooter?: boolean
  hasHeader?: boolean
  height?: number | string
}

const OverlayContent = ({ children, hasFooter, hasHeader, height }: Props) => {
  let _height = 16
  if (hasHeader) _height += 49
  if (hasFooter) _height += 49

  return (
    <ScrollArea height={height || `calc(100svh - ${_height}px)`}>
      {children}
    </ScrollArea>
  )
}

OverlayContent.displayName = 'OverlayContent'
export default OverlayContent
