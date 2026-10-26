/** Dot colors for workflows, picked from theme tokens by workflow id. */
// No red / orange: those read as status (overdue, warnings).
const WORKFLOW_DOT_CLASSES = [
  'bg-primary-9',
  'bg-secondary-9',
  'bg-green-9',
  'bg-blue-9',
]

/** A stable dot color for a workflow (same id → same color everywhere). */
export const workflowDotClass = (workflowId: string | number) => {
  const id = String(workflowId)
  let hash = 0
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return WORKFLOW_DOT_CLASSES[hash % WORKFLOW_DOT_CLASSES.length]
}
