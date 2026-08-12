import { motion } from 'motion/react'
import Icon from '@/components/base/icon/Icon'

const AINode = () => {
  return (
    <div className='flex size-23 items-center justify-center rounded-full bg-linear-to-br from-secondary-9 to-primary-9'>
      <motion.div
        animate={{ scale: [1, 0.85, 1.15, 1] }}
        className='flex size-15 items-center justify-center rounded-full bg-surface shadow'
        transition={{
          duration: 1,
          ease: 'easeInOut',
          repeat: Infinity,
          repeatDelay: 1,
          times: [0, 0.65, 0.85, 1],
        }}
      >
        <Icon className='size-7 text-gray-11' name='mingcute:ai-fill' />
      </motion.div>
    </div>
  )
}

AINode.displayName = 'AINode'
export default AINode
