import { useMemo } from 'react'
import type { ReportSourceType } from '@/pages/report-builder/types'
import Badge, { type BadgeColor } from '@/components/base/Badge'

interface Props {
  sourceType?: ReportSourceType | string | null
}

const ReportSourceBadge = ({ sourceType }: Props) => {
  const raw = String(sourceType || '').trim()
  const normalized = raw.toUpperCase()

  const { color, label } = useMemo<{ color: BadgeColor; label: string }>(() => {
    switch (normalized) {
      case 'WORKFLOW':
        return { color: 'cyan', label: 'Workflow' }
      case 'FOLDER':
        return { color: 'orange', label: 'Folder' }
      case 'FORM':
        return { color: 'green', label: 'Form' }
      case 'MASTER':
        return { color: 'violet', label: 'Master' }
      default:
        return {
          color: raw ? 'purple' : 'cyan',
          label: raw || 'Workflow',
        }
    }
  }, [normalized, raw])

  return <Badge color={color} label={label} />
}

ReportSourceBadge.displayName = 'ReportSourceBadge'
export default ReportSourceBadge
