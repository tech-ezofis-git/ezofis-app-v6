import { useQuery } from '@tanstack/react-query'
import workflowsApiV6 from '@/api/v6/workflows'

export function useHasDocumentApprovalWorkflow(): boolean {
  const { data } = useQuery({
    queryKey: ['workflows', 'document-approval-exists'],
    queryFn: async () => {
      const res = await workflowsApiV6.getWorkflows()
      const items = res.data?.items || []
      return items.some((w) => w.name === 'Document Approval')
    },
    staleTime: 60_000,
  })

  return Boolean(data)
}
