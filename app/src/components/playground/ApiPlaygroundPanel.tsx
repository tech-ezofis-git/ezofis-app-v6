import { motion } from 'motion/react'
import usePlaygroundStore from '@/stores/usePlaygroundStore'
import ApiPlayground from './ApiPlayground'

const ApiPlaygroundPanel = () => {
  const isOpen = usePlaygroundStore((state) => state.isOpen)
  const context = usePlaygroundStore((state) => state.context)
  const close = usePlaygroundStore((state) => state.close)

  if (!isOpen) return null

  return (
    <motion.aside
      animate={{ opacity: 1, x: 0 }}
      className='fixed top-0 right-0 bottom-0 z-[9999] flex w-[420px] max-w-[calc(100vw-16px)] flex-col border-l border-[var(--border-default)] bg-surface shadow-[-8px_0_24px_rgba(0,0,0,.06)]'
      initial={{ opacity: 0.96, x: 28 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      <ApiPlayground context={context} onClose={close} />
    </motion.aside>
  )
}

ApiPlaygroundPanel.displayName = 'ApiPlaygroundPanel'
export default ApiPlaygroundPanel
