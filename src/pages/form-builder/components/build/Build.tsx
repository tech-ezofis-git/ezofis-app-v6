import FieldList from './components/field-list/FieldList'
import Form from './components/form/Form'

const Build = () => {
  return (
    <div
      className='bg-surface-muted'
      style={{ minHeight: 'calc(100dvh - 52px)' }}
    >
      <FieldList />
      <Form />
    </div>
  )
}

Build.displayName = 'Build'
export default Build
