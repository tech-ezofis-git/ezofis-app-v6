import { useParams } from '@tanstack/react-router'
import useWorkflowStore from '../stores/useWorkflowStore'

/** Id of the workflow open in the builder, or null for an unsaved one. */
const useCurrentBuilderWorkflowId = () => {
  const { workflowId } = useParams({ strict: false }) as {
    workflowId?: string
  }
  const storeId = useWorkflowStore((state) => state.workflowId)
  if (workflowId && workflowId !== 'new') return workflowId
  return storeId ?? null
}

export default useCurrentBuilderWorkflowId
