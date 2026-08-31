import React, { useState } from 'react'
import { useLingui } from '@lingui/react/macro'
import type { ActivityCredit } from '../sampleCreditData'
import { topSubActivityCredits, totalCredit } from '../sampleCreditData'
import DataChart from './DataChart'
type CreditsChartProps = {
  data: ActivityCredit[]
  search?: string
}

const CreditsChart: React.FC<CreditsChartProps> = ({ data, search = '' }) => {
  const { t } = useLingui()
  const [selectedType, setSelectedType] = useState<ActivityCredit | null>(null)
  const [expandedRows, setExpandedRows] = useState<string[]>([])

  const filteredData = data.filter((item) =>
    `${item.activityType} ${item.creditUsed}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  )

  const toggleRow = (id: string) => {
    setExpandedRows((rows) =>
      rows.includes(id) ? rows.filter((row) => row !== id) : [...rows, id],
    )
  }

  return (
    <div id='creditsChart'>
      <div className='custom-grid'>
        <div className='grid-header'>
          <div className='grid-header-cell'>{t`Type`}</div>
          <div className='grid-header-cell'>{t`Credit Used`}</div>
        </div>

        {filteredData.length ? (
          filteredData.map((value) => (
            <button
              className='grid-row grid-row-button'
              key={value.id}
              onClick={() => setSelectedType(value)}
            >
              <div className='grid-cell name-text'>{value.activityType}</div>
              <div className='grid-cell'>
                <DataChart dataValue={value.creditUsed} total={totalCredit} />
              </div>
            </button>
          ))
        ) : (
          <div className='no-data-message'>{t`No Data Found`}</div>
        )}
      </div>

      {selectedType && (
        <div className='sheet-backdrop' onClick={() => setSelectedType(null)}>
          <aside
            className='sheet-panel'
            onClick={(event) => event.stopPropagation()}
          >
            <div className='sheet-header'>
              <h3>{t`${selectedType.activityType} - Usage Details`}</h3>
              <button
                className='close-button'
                onClick={() => setSelectedType(null)}
              >
                ×
              </button>
            </div>

            <table className='credits-table'>
              <thead>
                <tr>
                  <th>{t`Activity Name`}</th>
                  <th>{t`Total Credits Used`}</th>
                </tr>
              </thead>
              <tbody>
                {topSubActivityCredits.map((subActivity) => {
                  const isExpanded = expandedRows.includes(subActivity.id)
                  return (
                    <React.Fragment key={subActivity.id}>
                      <tr
                        className='sub-activity-row'
                        onClick={() => toggleRow(subActivity.id)}
                      >
                        <td>
                          {isExpanded ? '▾' : '▸'} {subActivity.subActivityName}{' '}
                          {t`(${subActivity.repositoryDetails.length} Folders)`}
                        </td>
                        <td>{subActivity.totalCreditUsed.toLocaleString()}</td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td className='nested-table-cell' colSpan={2}>
                            <table className='nested-table'>
                              <thead>
                                <tr>
                                  <th>{t`Folder Name`}</th>
                                  <th>{t`Usage Count`}</th>
                                  <th>{t`Credits Used`}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {subActivity.repositoryDetails.map((repo) => (
                                  <tr
                                    key={`${subActivity.id}-${repo.repositoryName}`}
                                  >
                                    <td>{repo.repositoryName}</td>
                                    <td>{repo.usageCount}</td>
                                    <td>{repo.creditUsed}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </aside>
        </div>
      )}
    </div>
  )
}

export default CreditsChart
