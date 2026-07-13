import { motion } from 'motion/react'
import Icon from '@/components/base/icon/Icon'
import { AnimateFadeIn } from '@/components/common/animations'
import cn from '@/utils/cn'
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
          subtitle: 'Inbox, Scan, API',
          title: 'Manual / Upload',
        }
    }
  }

  const startNode = getStartNodeConfig()

  // Compact Staggered Path (Edge-to-Edge)
  // Node 1 Right (130, 40) -> Node 2 Left (207, 110)
  // Node 2 Right (337, 110) -> Node 3 Left (413, 40)
  // Node 3 Right (563, 40) -> Node 4 Left (640, 110)
  const flowPath =
    'M 130 40 C 168 40, 168 110, 207 110 M 337 110 C 375 110, 375 40, 413 40 M 563 40 C 601 40, 601 110, 640 110'

  const points = [
    { x: 130, y: 40 },
    { x: 207, y: 110 },
    { x: 337, y: 110 },
    { x: 413, y: 40 },
    { x: 563, y: 40 },
    { x: 640, y: 110 },
  ]

  return (
    <div className='dark:bg-gray-950 relative w-full overflow-hidden rounded-xl border border-gray-3 bg-white'>
      {/* Header */}
      <div className='bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-between border-b border-gray-3 px-5 py-3.5'>
        <div className='flex items-center gap-2'>
          <Icon className='size-4 text-purple-9' name='tabler:git-fork' />
          <span className='text-13/5 font-semibold text-gray-13'>
            Automated Invoice Pipeline
          </span>
        </div>
        <div className='flex items-center gap-1.5 rounded-full border border-green-3 bg-green-1 px-2.5 py-0.5 text-11 font-medium text-green-11'>
          <span className='size-1.5 animate-pulse rounded-full bg-green-9' />
          Validation Ready
        </div>
      </div>

      <div className='relative py-10'>
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
              <path
                className='fill-none stroke-gray-3 stroke-[1.5] dark:stroke-gray-8'
                d={flowPath}
              />

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

              {/* Staggered Segment Pulses */}
              <motion.circle
                animate={{ offsetDistance: ['0%', '100%'], opacity: [0, 1, 1, 0] }}
                fill='var(--purple-5)'
                r='3'
                style={{
                  filter: 'drop-shadow(0 0 4px var(--purple-4))',
                  offsetPath: `path("M 130 40 C 168 40, 168 110, 207 110")`,
                }}
                transition={{
                  delay: 0,
                  duration: 1.2,
                  ease: 'linear',
                  repeat: Infinity,
                  repeatDelay: 2.4,
                }}
              />

              <motion.circle
                animate={{ offsetDistance: ['0%', '100%'], opacity: [0, 1, 1, 0] }}
                fill='var(--purple-5)'
                r='3'
                style={{
                  filter: 'drop-shadow(0 0 4px var(--purple-4))',
                  offsetPath: `path("M 337 110 C 375 110, 375 40, 413 40")`,
                }}
                transition={{
                  delay: 1.2,
                  duration: 1.2,
                  ease: 'linear',
                  repeat: Infinity,
                  repeatDelay: 2.4,
                }}
              />

              <motion.circle
                animate={{ offsetDistance: ['0%', '100%'], opacity: [0, 1, 1, 0] }}
                fill='var(--purple-5)'
                r='3'
                style={{
                  filter: 'drop-shadow(0 0 4px var(--purple-4))',
                  offsetPath: `path("M 563 40 C 601 40, 601 110, 640 110")`,
                }}
                transition={{
                  delay: 2.4,
                  duration: 1.2,
                  ease: 'linear',
                  repeat: Infinity,
                  repeatDelay: 2.4,
                }}
              />

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
                icon='lucide:bot'
                subtitle='Extraction & Matching'
                title='AI Automation'
                isAgent
              />
            </AnimateFadeIn>
          </div>

          {/* Node 3: Approver (Top) */}
          <div className='flex w-[150px] flex-col items-center pt-1'>
            <AnimateFadeIn delay={0.7}>
              <NodeCard
                icon='flat-color-icons:signature'
                subtitle='Manual Sign-off'
                title='Approver Review'
                widthClass='w-[150px]'
              />
            </AnimateFadeIn>
          </div>

          {/* Node 4: End (Bottom) */}
          <div className='flex w-[130px] flex-col items-center justify-end pb-1'>
            <AnimateFadeIn delay={1.0}>
              <NodeCard
                icon='flat-color-icons:ok'
                subtitle='ERP Synced'
                title='Process End'
                isEnd
              />
            </AnimateFadeIn>
          </div>
        </div>
      </div>
    </div>
  )
}

const NodeCard = ({
  icon,
  isTrigger = false,
  isAgent = false,
  isEnd = false,
  subtitle,
  title,
  widthClass = 'w-[130px]',
}: {
  icon: string
  isTrigger?: boolean
  isAgent?: boolean
  isEnd?: boolean
  subtitle: string
  title: string
  widthClass?: string
}) => (
  <div className='group relative'>
    {isTrigger && (
      <div className='absolute -top-4 left-0 flex items-center gap-1 rounded-[2px] border border-purple-3 bg-purple-1 px-1 py-0 text-[6px] font-bold tracking-wider text-purple-9 uppercase'>
        <Icon className='size-1.5' name='tabler:bolt-filled' />
        Trigger
      </div>
    )}
    <motion.div
      className={cn(
        'relative z-10 flex flex-col rounded-md border p-2 shadow-[0_2px_6px_rgba(0,0,0,0.02)] transition-colors',
        widthClass,
        isAgent
          ? 'border-purple-8 bg-purple-9 text-white dark:border-purple-7 dark:bg-purple-9'
          : isEnd
            ? 'border-green-9 bg-white dark:bg-gray-900 text-gray-12 dark:border-green-8'
            : 'border-gray-3 bg-white dark:border-gray-8 dark:bg-gray-900 text-gray-12'
      )}
      transition={{ damping: 25, stiffness: 400, type: 'spring' }}
      whileHover={
        isAgent
          ? {
            borderColor: 'var(--purple-3)',
            boxShadow:
              '0 10px 25px -5px rgba(168, 85, 247, 0.25), 0 8px 10px -6px rgba(168, 85, 247, 0.25)',
            scale: 1.02,
            y: -4,
          }
          : isEnd
            ? {
              borderColor: 'var(--green-5)',
              boxShadow:
                '0 10px 25px -5px rgba(34, 197, 94, 0.15), 0 8px 10px -6px rgba(34, 197, 94, 0.15)',
              scale: 1.02,
              y: -4,
            }
            : {
              borderColor: 'var(--purple-4)',
              boxShadow:
                '0 10px 25px -5px rgba(168, 85, 247, 0.1), 0 8px 10px -6px rgba(168, 85, 247, 0.1)',
              scale: 1.02,
              y: -4,
            }
      }
    >
      {isAgent ? (
        <>
          <div className='flex items-start justify-between gap-2'>
            <motion.div
              className='flex h-6 w-6 shrink-0 items-center justify-center rounded border border-purple-7/40 bg-purple-8/40 text-white transition-colors'
              whileHover={{ rotate: 5, scale: 1.1 }}
            >
              <Icon className='size-3.5 text-white' name={icon} />
            </motion.div>
            <span className='shrink-0 rounded border border-purple-7/60 bg-purple-8/50 px-1.5 py-0.5 text-[6px] font-bold tracking-wide text-white uppercase'>
              AI Agent
            </span>
          </div>
          <h4 className='mt-2 text-[10px] leading-tight font-bold text-white break-words'>
            {title}
          </h4>
          <p className='mt-1 text-[9px] leading-snug font-medium text-purple-2 break-words'>
            {subtitle}
          </p>
          <div className='mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-purple-8/40'>
            <div className='h-full w-2/3 rounded-full bg-purple-3' />
          </div>
        </>
      ) : (
        <div className='flex items-center gap-1.5'>
          <motion.div
            className={cn(
              'flex h-6 w-6 shrink-0 items-center justify-center rounded border transition-colors',
              'bg-gray-1 border-gray-2 group-hover:bg-purple-50 group-hover:border-purple-2 dark:bg-gray-800 dark:border-gray-7'
            )}
            whileHover={{ rotate: 5, scale: 1.1 }}
          >
            <Icon className='size-3.5' name={icon} />
          </motion.div>
          <div className='flex-1 min-w-0'>
            <h4 className='text-[9px] leading-tight font-bold text-gray-12 transition-colors group-hover:text-purple-7 break-words'>
              {title}
            </h4>
            <p className='mt-0.5 text-[8px] leading-tight font-medium text-gray-10 break-words'>
              {subtitle}
            </p>
          </div>
        </div>
      )}
    </motion.div>
  </div>
)

WorkflowPreview.displayName = 'WorkflowPreview'
export default WorkflowPreview
