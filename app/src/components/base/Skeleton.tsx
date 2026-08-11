import { motion } from 'framer-motion'
import cn from '@/utils/cn'

interface Props {
  className?: string
}

const Skeleton = ({ className }: Props) => {
  return (
    <div
      className={cn(
        'relative h-6 w-full overflow-hidden rounded bg-[var(--gray-3)]/80',
        className,
      )}
    >
      <motion.div
        animate={{ x: ['-60%', '160%'] }}
        className='pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.6),transparent)]'
        style={{ mixBlendMode: 'overlay' }}
        transition={{
          duration: 1.2,
          ease: [0, 0, 1, 1],
          repeat: Infinity,
        }}
      />
    </div>
  )
}

export default Skeleton
