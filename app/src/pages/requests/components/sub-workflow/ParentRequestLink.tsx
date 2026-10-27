import { useLingui } from '@lingui/react/macro'
import Icon from '@/components/base/icon/Icon'
import Tooltip from '@/components/base/Tooltip'
import { type MainProcessDetails } from '@/features/sub-workflow'
import cn from '@/utils/cn'
import useOpenLinkedRequest from '../../hooks/useOpenLinkedRequest'

interface Props {
  parent: MainProcessDetails
}

// V5 "main request" link in a child's header: green once the parent has
// finished, orange while it is still running. Opens the parent in place.
const ParentRequestLink = ({ parent }: Props) => {
  const { t } = useLingui()
  const { open, openingId } = useOpenLinkedRequest()
  const finished = Number(parent.flowStatus) === 1
  const workflowName = parent.workflowName || t`another workflow`
  const parentRequestNo = parent.requestNo

  return (
    <Tooltip
      content={t`Sub-process of ${parentRequestNo} (${workflowName})`}
      position='bottom'
    >
      <button
        aria-label={t`Open parent request ${parentRequestNo}`}
        disabled={Boolean(openingId)}
        type='button'
        className={cn(
          // Icon-only until there's room, so the request title keeps its width.
          'animate-in fade-in zoom-in-95 inline-flex h-6 min-w-6 cursor-pointer items-center justify-center gap-1 rounded-full px-1.5 text-[11px] font-semibold transition-all duration-200 hover:shadow-sm active:scale-95 disabled:cursor-wait disabled:opacity-60 2xl:px-2',
          finished
            ? 'bg-green-3 text-green-11 hover:bg-green-4'
            : 'bg-orange-3 text-orange-11 hover:bg-orange-4',
        )}
        onClick={() =>
          open({ instanceId: parent.processId, workflowId: parent.workflowId })
        }
      >
        <Icon
          className={cn('size-3.5', openingId && 'animate-spin')}
          name={openingId ? 'tabler:loader-2' : 'tabler:link'}
        />
        <span className='hidden 2xl:inline'>{parentRequestNo}</span>
      </button>
    </Tooltip>
  )
}

export default ParentRequestLink
