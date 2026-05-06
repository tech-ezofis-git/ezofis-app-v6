import { motion } from 'framer-motion'
import cn from '@/utils/cn'

interface Props {
  className?: string
}

const Skeleton = ({ className }: Props) => {
  return (
    <div className={cn('relative h-6 w-full overflow-hidden rounded bg-[var(--gray-3)]/80', className)}>
      <motion.div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.6),transparent)]"
        style={{ mixBlendMode: 'overlay' }}
        animate={{ x: ['-60%', '160%'] }}
        transition={{
          duration: 1.2,
          repeat: Infinity,
          ease: [0, 0, 1, 1],
        }}
      />
    </div>
  )
}

export default Skeleton
