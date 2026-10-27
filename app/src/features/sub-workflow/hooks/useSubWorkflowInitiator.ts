import { useQuery } from '@tanstack/react-query'
import workflowsApiV6 from '@/api/v6/workflows'
import authUserStore from '@/stores/authUserStore'
import { isSubWorkflowIdSet } from '../utils/blockSettings'
import {
  canInitiateSubWorkflow,
  getInitiatorSubWorkflowId,
} from '../utils/permissions'

export const subWorkflowDefinitionKey = (id: unknown) =>
  ['sub-workflow', 'definition', String(id)] as const

/**
 * Works out whether the step a request is on offers "Initiate - <child>":
 * the block's Workflow Initiator target (START when `activityId` is empty,
 * i.e. a new request), the child workflow's definition, and whether the
 * signed-in user may start it.
 */
const useSubWorkflowInitiator = (
  parentWorkflow: any,
  activityId?: number | string | null,
  { enabled = true }: { enabled?: boolean } = {},
) => {
  const session = authUserStore((state) => state.session)
  const subWorkflowId = parentWorkflow
    ? getInitiatorSubWorkflowId(parentWorkflow, activityId)
    : 0
  const hasTarget = enabled && isSubWorkflowIdSet(subWorkflowId)

  const { data: childWorkflow, isLoading } = useQuery({
    enabled: hasTarget,
    queryKey: subWorkflowDefinitionKey(subWorkflowId),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await workflowsApiV6.getWorkflowById(
        String(subWorkflowId),
      )
      if (error || !data) throw new Error(error || 'Workflow not found')
      return data
    },
  })

  const canInitiate =
    hasTarget &&
    !!childWorkflow &&
    canInitiateSubWorkflow(childWorkflow, session)

  return {
    canInitiate,
    childName: String(childWorkflow?.name || ''),
    childWorkflow: childWorkflow ?? null,
    isLoading: hasTarget && isLoading,
    subWorkflowId: hasTarget ? subWorkflowId : 0,
  }
}

export default useSubWorkflowInitiator
