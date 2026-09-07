import { useLingui } from '@lingui/react/macro'
import type { Report } from '@/pages/report-builder/types'
import IconButton from '@/components/base/button/IconButton'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'

interface Props {
  report: Report
  onDelete: (report: Report) => void
  onDuplicate: (report: Report) => void
  onEdit: (report: Report) => void
  onRunNow: (report: Report) => void
  onSchedule: (report: Report) => void
}

const RowActionsMenu = ({
  report,
  onDelete,
  onDuplicate,
  onEdit,
  onRunNow,
  onSchedule,
}: Props) => {
  const { t } = useLingui()

  return (
    <Menu
      position='bottom-end'
      width={170}
      target={
        <IconButton color='gray' icon='lucide:more-vertical' variant='ghost' />
      }
    >
      <MenuItem
        icon='lucide:play'
        label={t`Run now`}
        onClick={() => onRunNow(report)}
      />
      <MenuItem
        icon='lucide:edit'
        label={t`Edit`}
        onClick={() => onEdit(report)}
      />
      <MenuItem
        icon='lucide:calendar-clock'
        label={t`Schedule`}
        onClick={() => onSchedule(report)}
      />
      <MenuItem
        icon='lucide:copy'
        label={t`Duplicate`}
        onClick={() => onDuplicate(report)}
      />
      <MenuItem
        icon='lucide:trash-2'
        iconClass='text-red-11'
        label={t`Delete`}
        onClick={() => onDelete(report)}
      />
    </Menu>
  )
}

RowActionsMenu.displayName = 'RowActionsMenu'
export default RowActionsMenu
