import { type QueryParams } from '@/types/item'
import { type WorkflowGroupList } from '@/types/workflow'
import { getWorkflowGroups } from './helpers'

export async function getWorkflowGroupList(
  queryParams?: QueryParams,
): Promise<WorkflowGroupList> {
  const workflowGroup = getWorkflowGroups(queryParams)

  return new Promise((resolve) => {
    setTimeout(
      () =>
        resolve({
          data: workflowGroup,
          page: queryParams?.page || 1,
          pageSize: queryParams?.pageSize || 10,
          totalCount: 13, // Matches mock data length
        }),
      1000,
    )
  })
}
