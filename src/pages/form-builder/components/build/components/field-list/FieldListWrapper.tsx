import type { ReactNode } from 'react'
import { useViewportSize } from '@mantine/hooks'
import { AnimatePresence, motion } from 'motion/react'
import Drawer from '@/components/base/Drawer'
import OverlayContent from '@/components/base/overlay/OverlayContent'
import OverlayHeader from '@/components/base/overlay/OverlayHeader'
import ScrollArea from '@/components/base/scroll-area/ScrollArea'
import { SCREEN_XL } from '@/constants'
import useFieldListStore from '@/pages/form-builder/stores/useFieldListStore'

interface Props {
  children: ReactNode
}

const FieldListWrapper = ({ children }: Props) => {
  const { width } = useViewportSize()
  const isFieldListOpen = useFieldListStore((state) => state.isFieldListOpen)
  const closeFieldList = useFieldListStore((state) => state.closeFieldList)

  if (width >= SCREEN_XL) {
    return (
      <AnimatePresence>
        {isFieldListOpen && (
          <motion.div
            animate={{ opacity: 1, x: 0 }}
            className='fixed top-13 w-64 border-r border-gray-3 bg-surface'
            exit={{ opacity: 0, x: -256 }}
            initial={{ opacity: 0, x: -256 }}
            transition={{ bounce: 0, duration: 0.2 }}
          >
            <ScrollArea height='calc(100dvh - 53px)'>{children}</ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  return (
    <Drawer
      opened={isFieldListOpen}
      position='left'
      width={256}
      onClose={closeFieldList}
    >
      <OverlayHeader title='Fields' onClose={closeFieldList} />
      <OverlayContent hasHeader>{children}</OverlayContent>
    </Drawer>
  )
}

FieldListWrapper.displayName = 'FieldListWrapper'
export default FieldListWrapper
