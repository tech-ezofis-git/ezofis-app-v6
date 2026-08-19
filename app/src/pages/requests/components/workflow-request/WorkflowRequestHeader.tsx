interface Props {
  description?: string
  name?: string
}

// Contextual sub-header shown above the dynamically rendered form, naming
// the workflow's form so it's clear which request is being created.
const WorkflowRequestHeader = ({ description, name }: Props) => {
  if (!name && !description) return null

  return (
    <div className='mx-auto max-w-2xl px-6 pt-6'>
      {name && <h2 className='text-17 font-bold text-gray-13'>{name}</h2>}
      {description && (
        <p className='mt-1 text-13 text-gray-10'>{description}</p>
      )}
    </div>
  )
}

WorkflowRequestHeader.displayName = 'WorkflowRequestHeader'
export default WorkflowRequestHeader
