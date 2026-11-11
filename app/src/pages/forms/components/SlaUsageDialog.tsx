import { useLingui } from '@lingui/react/macro'
import type { SlaFormUsage } from '@/api/v6/workflowSla'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import Modal from '@/components/base/Modal'

interface SlaUsageDialogProps {
  /** Name of the SLA form or rule, shown in the title. */
  name: string
  opened: boolean
  usages: SlaFormUsage[]
  /** True for one rule of the form, which changes how each row is described. */
  forEntry?: boolean
  onClose: () => void
}

/** Lists the workflows and stages connected to an SLA form or one of its rules. */
export default function SlaUsageDialog({
  forEntry = false,
  name,
  opened,
  usages,
  onClose,
}: SlaUsageDialogProps) {
  const { t } = useLingui()

  const howUsed = (usage: SlaFormUsage) => {
    if (!forEntry) return null
    return usage.anyEntry
      ? t`Used when the request picks this rule`
      : t`Chosen in this stage's SLA settings`
  }

  return (
    <Modal opened={opened} width={640} onClose={onClose}>
      <div className='flex items-start justify-between gap-3 border-b border-gray-3 px-5 py-4'>
        <div className='flex min-w-0 items-center gap-3'>
          <span className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-2 text-primary-9'>
            <Icon className='size-5' name='lucide:workflow' />
          </span>
          <div className='min-w-0'>
            <h2 className='text-15 font-semibold text-gray-12'>
              {t`Connected Workflows`}
            </h2>
            <p className='truncate text-12 text-gray-10'>{name}</p>
          </div>
        </div>
        <IconButton
          ariaLabel={t`Close`}
          color='gray'
          icon='lucide:x'
          size='sm'
          variant='ghost'
          onClick={onClose}
        />
      </div>

      <div className='max-h-[60vh] overflow-y-auto p-5'>
        {usages.length === 0 ? (
          <p className='py-6 text-center text-13 text-gray-10'>
            {t`No workflow is connected yet.`}
          </p>
        ) : (
          <div className='overflow-hidden rounded-lg border border-gray-3'>
            <table className='w-full text-13'>
              <thead>
                <tr className='bg-surface-muted text-left text-12 text-gray-10'>
                  <th className='px-3 py-2 font-medium'>{t`Workflow`}</th>
                  <th className='px-3 py-2 font-medium'>{t`Stage`}</th>
                </tr>
              </thead>
              <tbody>
                {usages.map((usage) => (
                  <tr
                    className='border-t border-gray-3'
                    key={`${usage.workflowId}-${usage.stageId ?? 'workflow'}`}
                  >
                    <td className='px-3 py-2.5 align-top'>
                      <a
                        className='inline-flex items-center gap-1.5 font-medium text-primary-11 hover:underline'
                        href={`/workflow-builder/${usage.workflowId}`}
                        rel='noreferrer'
                        target='_blank'
                      >
                        {usage.workflowName}
                        <Icon
                          className='size-3.5'
                          name='lucide:external-link'
                        />
                      </a>
                      {!usage.published && (
                        <span className='ml-2 rounded-full bg-gray-3 px-2 py-0.5 text-[11px] text-gray-11'>
                          {t`Not published`}
                        </span>
                      )}
                    </td>
                    <td className='px-3 py-2.5 align-top text-gray-12'>
                      {usage.scope === 'workflow'
                        ? t`Whole workflow`
                        : usage.stageName || t`Unnamed stage`}
                      {howUsed(usage) && (
                        <span className='block text-11 text-gray-9'>
                          {howUsed(usage)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  )
}
