import useDmsSetupStore from './stores/useDmsSetupStore'
import DocumentRepositorySteps from './components/Steps'

const DocumentRepositorySetup = () => {
  const isSetupStarted = useDmsSetupStore((state) => state.isSetupStarted)

  if (!isSetupStarted) return null

  return <DocumentRepositorySteps />
}

DocumentRepositorySetup.displayName = 'DocumentRepositorySetup'
export default DocumentRepositorySetup
