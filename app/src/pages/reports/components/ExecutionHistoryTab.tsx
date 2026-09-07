import { useLingui } from '@lingui/react/macro'
import type { ReportExecution } from '@/pages/report-builder/types'
import Icon from '@/components/base/icon/Icon'
import Table from '@/components/base/table/Table'
import Tbody from '@/components/base/table/Tbody'
import Td from '@/components/base/table/Td'
import Th from '@/components/base/table/Th'
import Thead from '@/components/base/table/Thead'
import Tr from '@/components/base/table/Tr'
import { formatDatetime } from '@/utils/dayjs'

interface Props {
  executions: ReportExecution[]
}

const ExecutionHistoryTab = ({ executions }: Props) => {
  const { t } = useLingui()

  if (executions.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-4 py-16 text-center'>
        <Icon className='size-6 text-gray-8' name='lucide:history' />
        <p className='text-13 text-gray-10'>{t`No executions yet. Run this report to see history here.`}</p>
      </div>
    )
  }

  return (
    <div className='overflow-hidden rounded-xl border border-gray-3'>
      <div className='ez-scrollbar overflow-x-auto'>
        <Table>
          <Thead>
            <Tr>
              <Th>{t`Run At`}</Th>
              <Th>{t`Triggered By`}</Th>
              <Th>{t`Status`}</Th>
              <Th>{t`Rows`}</Th>
              <Th>{t`Format`}</Th>
              <Th>{t`Duration`}</Th>
            </Tr>
          </Thead>
          <Tbody>
            {executions.map((execution) => (
              <Tr key={execution.id}>
                <Td>{formatDatetime(execution.runAt, 'datetime')}</Td>
                <Td>{execution.triggeredBy}</Td>
                <Td>
                  <span
                    className={
                      execution.status === 'Success'
                        ? 'inline-flex items-center gap-1 text-green-11'
                        : 'inline-flex items-center gap-1 text-red-11'
                    }
                  >
                    <Icon
                      className='size-3.5'
                      name={
                        execution.status === 'Success'
                          ? 'lucide:check-circle-2'
                          : 'lucide:x-circle'
                      }
                    />
                    {execution.status === 'Success' ? t`Success` : t`Failed`}
                  </span>
                </Td>
                <Td>{execution.rowCount}</Td>
                <Td>{execution.format}</Td>
                <Td>{(execution.durationMs / 1000).toFixed(1)}s</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>
    </div>
  )
}

ExecutionHistoryTab.displayName = 'ExecutionHistoryTab'
export default ExecutionHistoryTab
