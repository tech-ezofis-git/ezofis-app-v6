import { useLingui } from '@lingui/react/macro'
import { useState } from 'react'
import {
  getReportBuilderReportShares,
  shareReportBuilderReport,
} from '@/api/v6/reportBuilder'
import showToast from '@/components/base/toast/showToast'
import FolderSharePopover from '@/pages/folders/components/FolderSharePopover'

interface ReportShareButtonProps {
  reportId: string
  iconOnly?: boolean
}

const ReportShareButton = ({ iconOnly, reportId }: ReportShareButtonProps) => {
  const { t } = useLingui()
  const [sharedEmails, setSharedEmails] = useState<string[]>([])

  return (
    <FolderSharePopover
      allowSign={false}
      iconOnly={iconOnly}
      roleOptions={[{ icon: 'lucide:eye', id: 'View', name: t`View` }]}
      sharedIds={sharedEmails}
      successMessage={t`Report shared`}
      title={t`Share Report`}
      triggerLabel={t`Share`}
      onOpenChange={(open) => {
        if (!open) return
        getReportBuilderReportShares(reportId).then((res) => {
          setSharedEmails(
            (res.data || []).map((share) => share.email.toLowerCase()),
          )
        })
      }}
      onShare={async (shares, message) => {
        try {
          for (const share of shares) {
            const { error } = await shareReportBuilderReport({
              action: 0,
              email: share.email,
              id: reportId,
              message,
            })
            if (error) throw new Error(error)
          }
          setSharedEmails((prev) => [
            ...new Set([
              ...prev,
              ...shares.map((share) => share.email.trim().toLowerCase()),
            ]),
          ])
          return true
        } catch (error) {
          showToast({
            message:
              error instanceof Error
                ? error.message
                : t`Failed to share report`,
            variant: 'error',
          })
          return false
        }
      }}
    />
  )
}

ReportShareButton.displayName = 'ReportShareButton'
export default ReportShareButton
