import type { ActionButton } from '../types'

// Helper to determine tenant specific logic (replacing isTenantArmgroup, etc.)
export const checkTenantFeature = (feature: string) => {
  const origin = window.location.origin
  // Add your logic here based on origin or env variables
  if (feature === 'HIDE_COLUMNS_ARMGROUP') return origin.includes('ag-appsvc')
  return false
}

// Parse flowJson to determine buttons (Approve, Reject, Forward)
export const getActionsForActivity = (
  activityId: string,
  flowJsonString: string | undefined,
): ActionButton[] => {
  if (!activityId || !flowJsonString) return []

  const actions: ActionButton[] = []
  try {
    const flow = JSON.parse(flowJsonString)

    // 1. Check Rules (Outgoing Lines)
    flow.rules?.forEach((rule: any) => {
      if (rule.fromBlockId === activityId) {
        let color: ActionButton['color'] = 'blue'
        let icon = 'tabler:arrow-right'

        const action = rule.proceedAction
        if (['Approve', 'Complete'].includes(action)) {
          color = 'green'
          icon = 'tabler:check'
        } else if (['Reject', 'Terminate'].includes(action)) {
          color = 'red'
          icon = 'tabler:x'
        } else if (['Reply'].includes(action)) {
          color = 'orange'
          icon = 'tabler:arrow-back-up'
        }

        actions.push({ label: action, value: action, color, icon })
      }
    })

    // 2. Check Block Settings (Internal Forward)
    const block = flow.blocks?.find((b: any) => b.id === activityId)
    if (block?.settings?.internalForward) {
      actions.push({
        label: 'Assign',
        value: 'Assign',
        color: 'orange',
        icon: 'tabler:user-share',
      })
    }
  } catch (e) {
    console.error('Error parsing flowJson', e)
  }
  return actions
}

// Safe JSON parse for cell data
export const safeParse = (data: any) => {
  try {
    return typeof data === 'string' ? JSON.parse(data) : data
  } catch {
    return data
  }
}
