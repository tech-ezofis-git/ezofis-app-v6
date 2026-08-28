import workflowsApiV6, {
  createPublishedWorkflowBrowsePayload,
} from '@/api/v6/workflows'
import type { PortalWorkflowLink } from '@/pages/settings/helpers/portalConfigStorage'

export const PORTAL_WORKFLOW_ICONS = [
  'lucide:file-text',
  'lucide:clipboard-check',
  'lucide:building-2',
  'lucide:life-buoy',
  'lucide:git-fork',
  'lucide:receipt',
]

export const portalWorkflowIcon = (index: number) =>
  PORTAL_WORKFLOW_ICONS[index % PORTAL_WORKFLOW_ICONS.length]

export const isPortalUploadWorkflow = (name: string) => {
  const normalized = name.toLowerCase()
  return (
    normalized.includes('accounts payable') ||
    normalized.includes('account payable') ||
    normalized.includes('payable')
  )
}

export const portalWorkflowKind = (name: string): 'form' | 'upload' =>
  isPortalUploadWorkflow(name) ? 'upload' : 'form'

export const workflowDescriptionFallback = (name: string) =>
  `View and track submissions for ${name}.`

export type PortalWorkflowSummary = {
  completedCount: number
  description: string
  id: string
  inboxCount: number
  name: string
  sentCount: number
  total: number
}

export const listPortalWorkflowSummaries = async ({
  workflows,
}: {
  tenantId?: string
  workflows: PortalWorkflowLink[]
}): Promise<PortalWorkflowSummary[]> => {
  if (!workflows.length) return []

  const metaById = new Map<string, { description: string; name: string }>()

  try {
    const browseRes = await workflowsApiV6.getAllWorkflows(
      createPublishedWorkflowBrowsePayload({ filterBy: [] }),
    )
    const clusters = browseRes.data?.data ?? []
    clusters.forEach((cluster) => {
      ;(cluster.value ?? []).forEach((item) => {
        metaById.set(String(item.id), {
          description: item.description || '',
          name: item.name || String(item.id),
        })
      })
    })
  } catch {
    // Cards still render from the portal's saved workflow names.
  }

  if (metaById.size === 0) {
    try {
      const listRes = await workflowsApiV6.getWorkflows()
      ;(listRes.data?.items ?? []).forEach((item) => {
        metaById.set(String(item.id), {
          description: item.description || '',
          name: item.name || String(item.id),
        })
      })
    } catch {
      // Keep portal names.
    }
  }

  const counts = await Promise.all(
    workflows.map(async (workflow) => {
      const id = String(workflow.id)
      try {
        const { data } = await workflowsApiV6.getInstanceCount(id)
        const inboxCount = data?.inboxCount || 0
        const sentCount = data?.sentCount || 0
        const completedCount = data?.completedCount || 0
        return {
          completedCount,
          id,
          inboxCount,
          sentCount,
          total: inboxCount + sentCount + completedCount,
        }
      } catch {
        return {
          completedCount: 0,
          id,
          inboxCount: 0,
          sentCount: 0,
          total: 0,
        }
      }
    }),
  )

  const countById = new Map(counts.map((row) => [row.id, row]))

  return workflows.map((workflow) => {
    const id = String(workflow.id)
    const meta = metaById.get(id)
    const count = countById.get(id)
    return {
      completedCount: count?.completedCount || 0,
      description: meta?.description || '',
      id,
      inboxCount: count?.inboxCount || 0,
      name: meta?.name || workflow.name || id,
      sentCount: count?.sentCount || 0,
      total: count?.total || 0,
    }
  })
}
