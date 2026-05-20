import { motion } from 'motion/react'
import Icon from '@/components/base/icon/Icon'
import { AnimateFadeIn } from '@/components/common/animations'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'

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
  const flowPath =
    'M 130 40 C 170 40, 170 110, 213 110 M 343 110 C 385 110, 385 40, 426 40 M 556 40 C 600 40, 600 110, 640 110'

  // Connection Points (Left and Right of each node)
  const points = [
    { x: 130, y: 40 }, // Node 1 Right
    { x: 213, y: 110 }, // Node 2 Left
    { x: 343, y: 110 }, // Node 2 Right
    { x: 426, y: 40 }, // Node 3 Left
    { x: 556, y: 40 }, // Node 3 Right
    { x: 640, y: 110 }, // Node 4 Left
  ]

  return (
    <div className='dark:bg-gray-950 relative w-full overflow-hidden rounded-xl border border-gray-3 bg-gray-1 py-10'>
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
        <svg
          className='pointer-events-none h-full w-full'
          viewBox='0 0 770 150'
        >
          <g>
            {/* Base Line - Edge to Edge */}
            <path
              className='fill-none stroke-gray-3 stroke-[1.5] dark:stroke-gray-8'
              d={flowPath}
            />

            {/* Animated "Marching Ants" Wave */}
            <motion.path
              className='fill-none stroke-purple-5 stroke-[1.5]'
              d={flowPath}
              initial={{ opacity: 0, pathLength: 0 }}
              animate={{
                opacity: 1,
                pathLength: 1,
                strokeDashoffset: [0, -20],
              }}
              style={{
                strokeDasharray: '6 4',
              }}
              transition={{
                opacity: { delay: 0.5, duration: 0.5 },
                pathLength: { delay: 0.5, duration: 1.5, ease: 'easeInOut' },
                strokeDashoffset: {
                  duration: 1,
                  ease: 'linear',
                  repeat: Infinity,
                },
              }}
            />

            {/* Traveling Data Pulse */}
            <motion.circle
              animate={{ offsetDistance: ['0%', '100%'] }}
              fill='var(--purple-5)'
              r='3'
              style={{
                filter: 'drop-shadow(0 0 4px var(--purple-4))',
                offsetPath: `path("${flowPath}")`,
              }}
              transition={{
                delay: 2,
                duration: 4,
                ease: 'linear',
                repeat: Infinity,
              }}
            />

            {/* Edge Connection Points */}
            {points.map((p, i) => (
              <motion.circle
                animate={{ opacity: 1, scale: 1 }}
                className='dark:stroke-gray-900 fill-purple-5 stroke-white stroke-1'
                cx={p.x}
                cy={p.y}
                initial={{ opacity: 0, scale: 0 }}
                key={i}
                r='2.5'
                transition={{ delay: 1 + i * 0.2, type: 'spring' }}
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
              subtitle={startNode.subtitle}
              title={startNode.title}
              isTrigger
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
  isTrigger = false,
  subtitle,
  title,
}: {
  icon: string
  isTrigger?: boolean
  subtitle: string
  title: string
}) => (
  <div className='group relative'>
    {isTrigger && (
      <div className='absolute -top-4 left-0 flex items-center gap-1 rounded-[2px] border border-purple-3 bg-purple-1 px-1 py-0 text-[6px] font-bold tracking-wider text-purple-9 uppercase'>
        <Icon className='size-1.5' name='tabler:bolt-filled' />
        Trigger
      </div>
    )}
    <motion.div
      className='dark:bg-gray-900 relative z-10 flex w-[130px] flex-col rounded-md border border-gray-3 bg-white p-2 shadow-[0_2px_6px_rgba(0,0,0,0.02)] transition-colors'
      transition={{ damping: 25, stiffness: 400, type: 'spring' }}
      whileHover={{
        borderColor: 'var(--purple-4)',
        boxShadow:
          '0 10px 25px -5px rgba(168, 85, 247, 0.1), 0 8px 10px -6px rgba(168, 85, 247, 0.1)',
        scale: 1.02,
        y: -4,
      }}
    >
      <div className='flex items-center gap-1.5'>
        <motion.div
          className='group-hover:bg-purple-50 dark:bg-gray-800 flex h-6 w-6 shrink-0 items-center justify-center rounded border border-gray-2 bg-gray-1 transition-colors group-hover:border-purple-2 dark:border-gray-7'
          whileHover={{ rotate: 5, scale: 1.1 }}
        >
          <Icon className='size-3.5' name={icon} />
        </motion.div>
        <div className='flex-1 overflow-hidden'>
          <div className='flex items-center justify-between'>
            <h4 className='truncate text-[10px] leading-none font-bold text-gray-12 transition-colors group-hover:text-purple-7'>
              {title}
            </h4>
            <Icon className='size-2 text-gray-8' name='tabler:chevron-down' />
          </div>
          <p className='mt-0.5 truncate text-[9px] leading-none font-medium text-gray-10'>
            {subtitle}
          </p>
        </div>
      </div>
    </motion.div>
  </div>
)

WorkflowPreview.displayName = 'WorkflowPreview'
export default WorkflowPreview
