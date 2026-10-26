import useWorkflowStore from '../stores/useWorkflowStore'

// Node setting sections start open while a new workflow is being built, and
// start minimized when an existing workflow is edited (the user already knows
// the setup and is usually jumping to one section).
const useDefaultSectionOpen = () =>
  useWorkflowStore((state) => state.workflowId === null)

export default useDefaultSectionOpen
