import { useLingui } from '@lingui/react/macro'
import { useMemo } from 'react'
import type { ReportDomain } from '@/pages/report-builder/constants'
import type { Report } from '@/pages/report-builder/types'
import Table from '@/components/base/table/Table'
import Tbody from '@/components/base/table/Tbody'
import Td from '@/components/base/table/Td'
import Th from '@/components/base/table/Th'
import Thead from '@/components/base/table/Thead'
import Tr from '@/components/base/table/Tr'
import { DOMAIN_FIELDS, SAMPLE_ROWS } from '@/pages/report-builder/constants'
import { resolveFieldStatus } from '@/pages/report-builder/utils/resolveFieldStatus'
import StatusPill from './StatusPill'

interface Props {
  report: Report
}

const OverviewTab = ({ report }: Props) => {
  const { t } = useLingui()
  const sampleRows = SAMPLE_ROWS[report.domain as ReportDomain] || []

  const columns = useMemo(() => {
    const fields = DOMAIN_FIELDS[report.domain as ReportDomain] || []
    return report.fields
      .map((fieldId) => fields.find((f) => f.id === fieldId))
      .filter((f): f is (typeof fields)[number] => Boolean(f))
  }, [report.fields, report.domain])

  if (columns.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-4 py-16 text-center'>
        <p className='text-13 text-gray-10'>{t`This report has no fields configured yet.`}</p>
      </div>
    )
  }

  return (
    <div className='overflow-hidden rounded-xl border border-gray-3'>
      <div className='ez-scrollbar overflow-x-auto'>
        <Table>
          <Thead>
            <Tr>
              {columns.map((field) => (
                <Th key={field.id}>
                  {report.fieldSettings[field.id]?.label || field.label}
                </Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {sampleRows.map((row, index) => (
              <Tr key={index}>
                {columns.map((field) => {
                  const setting = report.fieldSettings[field.id]
                  const status = resolveFieldStatus(setting, row)
                  return (
                    <Td key={field.id}>
                      {status ? (
                        <StatusPill color={status.color} label={status.label} />
                      ) : (
                        (row[field.id] ?? '-')
                      )}
                    </Td>
                  )
                })}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>
    </div>
  )
}

OverviewTab.displayName = 'OverviewTab'
export default OverviewTab
