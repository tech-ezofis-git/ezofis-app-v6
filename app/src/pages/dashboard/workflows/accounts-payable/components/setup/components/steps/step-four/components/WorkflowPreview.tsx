import { motion } from 'motion/react'
import Icon from '@/components/base/icon/Icon'
import { AnimateFadeIn } from '@/components/common/animations'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import authUserStore from '@/stores/authUserStore'
import cn from '@/utils/cn'

const getUserDisplayName = (
  session: {
    email?: string
    firstName?: string
    lastName?: string
    name?: string
  } | null,
) => {
  if (!session) return 'Current User'
  const fullName =
    session.name?.trim() ||
    [session.firstName, session.lastName].filter(Boolean).join(' ').trim()
  return fullName || session.email || 'Current User'
}

const truncateLabel = (value: string | null | undefined, max = 22) => {
  const text = String(value ?? '')
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

const WorkflowPreview = () => {
  const emailSettings = setupStore((state) => state.emailSettings)
  const erpSettings = setupStore((state) => state.erpSettings)
  const storageSettings = setupStore((state) => state.storageSettings)
  const session = authUserStore((state) => state.session)
  const userName = getUserDisplayName(session)

  const getStartNodeConfig = () => {
    const connectedAccount =
      emailSettings.account ||
      emailSettings.email ||
      session?.email ||
      'Connected'

    switch (emailSettings.provider) {
      case 'gmail':
        return {
          detail: 'Reads invoice documents from email',
          icon: 'logos:google-gmail',
          subtitle: connectedAccount,
          title: 'Gmail',
        }
      case 'outlook':
        return {
          detail: 'Reads invoice documents from email',
          icon: 'vscode-icons:file-type-outlook',
          subtitle: connectedAccount,
          title: 'Outlook',
        }
      case 'DIRECT_UPLOAD':
      default:
        return {
          detail: 'Upload invoice documents manually',
          icon: 'tabler:user-up',
          subtitle: userName,
          title: 'Manual Upload',
        }
    }
  }

  const getStorageDisplayName = () => {
    const system = storageSettings.system
    if (!system || system === 'Included storage') {
      return 'Files saved to EZOFIS Storage'
    }
    if (system === 'OneDrive' || system === 'One Drive') {
      return 'Files saved to OneDrive Storage'
    }
    if (system === 'Google Drive') {
      return 'Files saved to Google Drive Storage'
    }
    if (system === 'GCP') {
      return 'Files saved to GCP Storage'
    }
    return `Files saved to ${system} Storage`
  }

  const getAgentNodeConfig = () => {
    const getErpLabel = () => {
      if (erpSettings.system === 'PREDEFINED') {
        return 'Invoice matching with demo PO'
      }
      if (
        erpSettings.system === 'FILE_BASED_IMPORT' ||
        erpSettings.wantsFileBasedImport
      ) {
        return 'Invoice matching with your PO'
      }
      if (erpSettings.system === 'QuickBooks') {
        return 'Invoice matching via QuickBooks'
      }
      return erpSettings.system
        ? `Invoice matching via ${erpSettings.system}`
        : 'Invoice matching via ERP'
    }

    return {
      detail: getErpLabel(),
      extra: getStorageDisplayName(),
      subtitle: 'Extract · Match · Validate',
      title: 'AP Agent',
    }
  }

  const getApproverNodeConfig = () => ({
    detail: 'Verify & approve',
    subtitle: truncateLabel(userName, 18),
    title: 'Approver Review',
  })

  const getEndNodeConfig = () => {
    const hasConnectedErp =
      !!erpSettings.system &&
      erpSettings.system !== 'PREDEFINED' &&
      erpSettings.system !== 'FILE_BASED_IMPORT' &&
      !erpSettings.wantsFileBasedImport

    return {
      detail: hasConnectedErp ? `Synced to ${erpSettings.system}` : undefined,
      subtitle: 'Payment completed',
      title: 'Process End',
    }
  }

  const startNode = getStartNodeConfig()
  const agentNode = getAgentNodeConfig()
  const approverNode = getApproverNodeConfig()
  const endNode = getEndNodeConfig()

  // Smooth S-curves between staggered top/bottom nodes (viewBox 900 x 240)
  // Cards centered in each column — edges: 188|243, 433|483, 643|708
  const segment1 = 'M 188 42 C 188 130, 243 100, 243 188'
  const segment2 = 'M 433 188 C 433 100, 483 130, 483 42'
  const segment3 = 'M 643 42 C 643 130, 708 100, 708 188'
  const flowPath = `${segment1} ${segment2} ${segment3}`

  const points = [
    { x: 188, y: 42 },
    { x: 243, y: 188 },
    { x: 433, y: 188 },
    { x: 483, y: 42 },
    { x: 643, y: 42 },
    { x: 708, y: 188 },
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

        <div className='relative mx-auto h-[240px] w-full max-w-[900px] px-4'>
          {/* SVG Canvas for Connections — same box as nodes */}
          <svg
            className='pointer-events-none absolute inset-0 h-full w-full'
            preserveAspectRatio='none'
            viewBox='0 0 900 240'
          >
            <g>
              {/* Base track */}
              <path
                className='fill-none stroke-gray-3 stroke-[1.5] dark:stroke-gray-8'
                d={flowPath}
              />

              {/* Moving dashed flow along the full path */}
              <motion.path
                className='fill-none stroke-purple-5 stroke-[2]'
                d={flowPath}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                  opacity: 1,
                  pathLength: 1,
                  strokeDashoffset: [0, -24],
                }}
                style={{ strokeDasharray: '8 6' }}
                transition={{
                  opacity: { delay: 0.3, duration: 0.4 },
                  pathLength: { delay: 0.3, duration: 1.2, ease: 'easeInOut' },
                  strokeDashoffset: {
                    delay: 1.5,
                    duration: 2,
                    ease: 'linear',
                    repeat: Infinity,
                  },
                }}
              />

              {/* Flow pulses traveling over each curve */}
              {[segment1, segment2, segment3].map((segment, index) => (
                <g key={segment}>
                  <circle
                    fill='var(--purple-5)'
                    r='3.5'
                    style={{
                      filter: 'drop-shadow(0 0 5px var(--purple-4))',
                    }}
                  >
                    <animateMotion
                      begin={`${index * 1.8}s`}
                      calcMode='linear'
                      dur='1.8s'
                      path={segment}
                      repeatCount='indefinite'
                    />
                    <animate
                      attributeName='opacity'
                      begin={`${index * 1.8}s`}
                      dur='1.8s'
                      keyTimes='0;0.12;0.85;1'
                      repeatCount='indefinite'
                      values='0;1;1;0'
                    />
                  </circle>
                  <circle fill='white' opacity='0.9' r='1.5'>
                    <animateMotion
                      begin={`${index * 1.8}s`}
                      calcMode='linear'
                      dur='1.8s'
                      path={segment}
                      repeatCount='indefinite'
                    />
                    <animate
                      attributeName='opacity'
                      begin={`${index * 1.8}s`}
                      dur='1.8s'
                      keyTimes='0;0.12;0.85;1'
                      repeatCount='indefinite'
                      values='0;1;1;0'
                    />
                  </circle>
                </g>
              ))}

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

          <div className='relative grid h-full grid-cols-4 gap-0'>
            {/* Node 1: Start (Top) */}
            <div className='flex items-start justify-center pt-1 pl-6 sm:pl-8'>
              <AnimateFadeIn delay={0.1}>
                <NodeCard
                  detail={startNode.detail}
                  icon={startNode.icon}
                  showFullText
                  subtitle={startNode.subtitle}
                  title={startNode.title}
                  widthClass='w-[190px]'
                  isTrigger
                />
              </AnimateFadeIn>
            </div>

            {/* Node 2: Agent (Bottom) */}
            <div className='flex items-end justify-center pb-1'>
              <AnimateFadeIn delay={0.4}>
                <NodeCard
                  detail={agentNode.detail}
                  extra={agentNode.extra}
                  icon='lucide:bot'
                  subtitle={agentNode.subtitle}
                  title={agentNode.title}
                  widthClass='w-[190px]'
                  isAgent
                />
              </AnimateFadeIn>
            </div>

            {/* Node 3: Approver (Top) */}
            <div className='flex items-start justify-center pt-1'>
              <AnimateFadeIn delay={0.7}>
                <NodeCard
                  detail={approverNode.detail}
                  icon='tabler:user-check'
                  subtitle={approverNode.subtitle}
                  title={approverNode.title}
                  widthClass='w-[160px]'
                />
              </AnimateFadeIn>
            </div>

            {/* Node 4: End (Bottom) */}
            <div className='flex items-end justify-center pb-1'>
              <AnimateFadeIn delay={1.0}>
                <NodeCard
                  detail={endNode.detail}
                  icon='flat-color-icons:ok'
                  subtitle={endNode.subtitle}
                  title={endNode.title}
                  widthClass='w-[160px]'
                  isEnd
                />
              </AnimateFadeIn>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const NodeCard = ({
  detail,
  extra,
  icon,
  isAgent = false,
  isEnd = false,
  isTrigger = false,
  showFullText = false,
  subtitle,
  title,
  widthClass = 'w-[130px]',
}: {
  detail?: string
  extra?: string
  icon: string
  isAgent?: boolean
  isEnd?: boolean
  isTrigger?: boolean
  showFullText?: boolean
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
      transition={{ damping: 25, stiffness: 400, type: 'spring' }}
      className={cn(
        'relative z-10 flex flex-col rounded-md border p-2 shadow-[0_2px_6px_rgba(0,0,0,0.02)] transition-colors',
        widthClass,
        isAgent
          ? 'border-purple-8 bg-purple-9 text-white dark:border-purple-7 dark:bg-purple-9'
          : isEnd
            ? 'dark:bg-gray-900 border-green-9 bg-white text-gray-12 dark:border-green-8'
            : 'dark:bg-gray-900 border-gray-3 bg-white text-gray-12 dark:border-gray-8',
      )}
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
          <div className='flex items-center justify-between gap-2'>
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
          <h4 className='mt-2 whitespace-nowrap text-[10px] leading-tight font-bold text-white'>
            {title}
          </h4>
          <p className='mt-1 whitespace-nowrap text-[10px] leading-snug font-medium text-purple-2'>
            {subtitle}
          </p>
          {detail && (
            <p className='mt-0.5 truncate text-[9px] leading-snug text-purple-3/90'>
              {detail}
            </p>
          )}
          {extra && (
            <p className='mt-0.5 truncate text-[9px] leading-snug text-purple-3/90'>
              {extra}
            </p>
          )}
        </>
      ) : (
        <div className='flex items-center gap-1.5'>
          <motion.div
            whileHover={{ rotate: 5, scale: 1.1 }}
            className={cn(
              'flex h-6 w-6 shrink-0 items-center justify-center rounded border transition-colors',
              'group-hover:bg-purple-50 dark:bg-gray-800 border-gray-2 bg-gray-1 group-hover:border-purple-2 dark:border-gray-7',
            )}
          >
            <Icon className='size-3.5' name={icon} />
          </motion.div>
          <div className='min-w-0 flex-1 overflow-hidden'>
            <h4 className='truncate whitespace-nowrap text-[10px] leading-tight font-bold text-gray-12 transition-colors group-hover:text-purple-7'>
              {title}
            </h4>
            <p
              title={subtitle}
              className={cn(
                'mt-0.5 text-[10px] leading-tight font-medium text-gray-10',
                showFullText
                  ? 'break-all break-all whitespace-normal'
                  : 'truncate whitespace-nowrap',
              )}
            >
              {subtitle}
            </p>
            {detail && (
              <p
                title={detail}
                className={cn(
                  'mt-0.5 text-[9px] leading-tight text-gray-9',
                  showFullText
                    ? 'wrap-anywhere break-words whitespace-normal'
                    : 'truncate whitespace-nowrap',
                )}
              >
                {detail}
              </p>
            )}
          </div>
        </div>
      )}
    </motion.div>
  </div>
)

WorkflowPreview.displayName = 'WorkflowPreview'
export default WorkflowPreview
