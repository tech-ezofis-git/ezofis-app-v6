import { motion } from 'motion/react'
import Icon from '@/components/base/icon/Icon'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import { AnimateFadeIn } from '@/components/common/animations'

const WorkflowPreview = () => {
  const { emailSettings } = setupStore()

  const getStartNodeConfig = () => {
    switch (emailSettings.provider) {
      case 'gmail':
        return {
          icon: 'logos:google-gmail',
          subtitle: emailSettings.email || 'Auto Sync',
          title: 'Gmail',
        }
      case 'outlook':
        return {
          icon: 'logos:microsoft-outlook',
          subtitle: emailSettings.email || 'Auto Sync',
          title: 'Outlook',
        }
      case 'DIRECT_UPLOAD':
      default:
        return {
          icon: 'tabler:user-up',
          subtitle: 'Quick Drop',
          title: 'Manual',
        }
    }
  }

  const startNode = getStartNodeConfig()

  // Compact Staggered Path (Edge-to-Edge)
  // Node 1 Right (130, 40) -> Node 2 Left (213, 110)
  // Node 2 Right (343, 110) -> Node 3 Left (426, 40)
  // Node 3 Right (556, 40) -> Node 4 Left (640, 110)
  const flowPath = 'M 130 40 C 170 40, 170 110, 213 110 M 343 110 C 385 110, 385 40, 426 40 M 556 40 C 600 40, 600 110, 640 110'

  // Connection Points (Left and Right of each node)
  const points = [
    { x: 130, y: 40 },   // Node 1 Right
    { x: 213, y: 110 },  // Node 2 Left
    { x: 343, y: 110 },  // Node 2 Right
    { x: 426, y: 40 },   // Node 3 Left
    { x: 556, y: 40 },   // Node 3 Right
    { x: 640, y: 110 }   // Node 4 Left
  ]

  return (
    <div className='relative w-full overflow-hidden rounded-xl border border-gray-3 bg-gray-1 py-10 dark:bg-gray-950'>
      {/* Grid Background */}
      <div
        className='absolute inset-0 opacity-[0.02] dark:opacity-[0.05]'
        style={{
          backgroundImage:
            'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      />

      {/* SVG Canvas for Connections */}
      <div className='absolute inset-0 mx-auto w-full max-w-[850px] px-10'>
        <svg className='pointer-events-none h-full w-full' viewBox='0 0 770 150'>
          <g>
            {/* Base Line - Edge to Edge */}
            <path
              className='fill-none stroke-gray-3 stroke-[1.5] dark:stroke-gray-8'
              d={flowPath}
            />

            {/* Animated "Marching Ants" Wave */}
            <motion.path
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{
                pathLength: 1,
                opacity: 1,
                strokeDashoffset: [0, -20]
              }}
              transition={{
                pathLength: { duration: 1.5, ease: 'easeInOut', delay: 0.5 },
                opacity: { duration: 0.5, delay: 0.5 },
                strokeDashoffset: { duration: 1, repeat: Infinity, ease: 'linear' }
              }}
              className='fill-none stroke-purple-5 stroke-[1.5]'
              d={flowPath}
              style={{
                strokeDasharray: '6 4',
              }}
            />

            {/* Traveling Data Pulse */}
            <motion.circle
              r='3'
              fill='var(--purple-5)'
              animate={{ offsetDistance: ['0%', '100%'] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear', delay: 2 }}
              style={{
                offsetPath: `path("${flowPath}")`,
                filter: 'drop-shadow(0 0 4px var(--purple-4))'
              }}
            />

            {/* Edge Connection Points */}
            {points.map((p, i) => (
              <motion.circle
                key={i}
                cx={p.x}
                cy={p.y}
                r='2.5'
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1 + i * 0.2, type: 'spring' }}
                className='fill-purple-5 stroke-white stroke-1 dark:stroke-gray-900'
              />
            ))}
          </g>
        </svg>
      </div>

      <div className='relative mx-auto flex h-[150px] max-w-[850px] justify-between px-10'>
        {/* Node 1: Start (Top) */}
        <div className='flex w-[130px] flex-col items-center pt-1'>
          <AnimateFadeIn delay={0.1}>
            <NodeCard
              icon={startNode.icon}
              isTrigger
              subtitle={startNode.subtitle}
              title={startNode.title}
            />
          </AnimateFadeIn>
        </div>

        {/* Node 2: Agent (Bottom) */}
        <div className='flex w-[130px] flex-col items-center justify-end pb-1'>
          <AnimateFadeIn delay={0.4}>
            <NodeCard
              icon='noto:robot'
              subtitle='Automation'
              title='AP AGENT 1'
            />
          </AnimateFadeIn>
        </div>

        {/* Node 3: Approver (Top) */}
        <div className='flex w-[130px] flex-col items-center pt-1'>
          <AnimateFadeIn delay={0.7}>
            <NodeCard
              icon='flat-color-icons:signature'
              subtitle='Manual Review'
              title='Approver'
            />
          </AnimateFadeIn>
        </div>

        {/* Node 4: End (Bottom) */}
        <div className='flex w-[130px] flex-col items-center justify-end pb-1'>
          <AnimateFadeIn delay={1.0}>
            <NodeCard
              icon='flat-color-icons:ok'
              subtitle='Process End'
              title='End'
            />
          </AnimateFadeIn>
        </div>
      </div>
    </div>
  )
}

const NodeCard = ({
  icon,
  title,
  subtitle,
  isTrigger = false,
}: {
  icon: string
  title: string
  subtitle: string
  isTrigger?: boolean
}) => (
  <div className='group relative'>
    {isTrigger && (
      <div className='absolute -top-4 left-0 flex items-center gap-1 rounded-[2px] border border-purple-3 bg-purple-1 px-1 py-0 text-[6px] font-bold uppercase tracking-wider text-purple-9'>
        <Icon className='size-1.5' name='tabler:bolt-filled' />
        Trigger
      </div>
    )}
    <motion.div
      whileHover={{
        y: -4,
        scale: 1.02,
        borderColor: 'var(--purple-4)',
        boxShadow: '0 10px 25px -5px rgba(168, 85, 247, 0.1), 0 8px 10px -6px rgba(168, 85, 247, 0.1)'
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className='relative z-10 flex w-[130px] flex-col rounded-md border border-gray-3 bg-white p-2 shadow-[0_2px_6px_rgba(0,0,0,0.02)] transition-colors dark:bg-gray-900'
    >
      <div className='flex items-center gap-1.5'>
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          className='flex h-6 w-6 shrink-0 items-center justify-center rounded bg-gray-1 border border-gray-2 transition-colors group-hover:border-purple-2 group-hover:bg-purple-50 dark:bg-gray-800 dark:border-gray-7'
        >
          <Icon className='size-3.5' name={icon} />
        </motion.div>
        <div className='flex-1 overflow-hidden'>
          <div className='flex items-center justify-between'>
            <h4 className='truncate text-[10px] font-bold leading-none text-gray-12 group-hover:text-purple-7 transition-colors'>{title}</h4>
            <Icon className='size-2 text-gray-8' name='tabler:chevron-down' />
          </div>
          <p className='mt-0.5 truncate text-[9px] font-medium leading-none text-gray-10'>{subtitle}</p>
        </div>
      </div>
    </motion.div>
  </div>
)

WorkflowPreview.displayName = 'WorkflowPreview'
export default WorkflowPreview
