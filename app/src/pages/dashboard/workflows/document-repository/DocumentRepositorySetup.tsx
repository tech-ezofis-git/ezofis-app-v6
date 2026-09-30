import DocumentRepositorySteps from './components/Steps'
import useDmsSetupStore from './stores/useDmsSetupStore'

const DocumentRepositorySetup = () => {
  const isSetupStarted = useDmsSetupStore((state) => state.isSetupStarted)

  if (!isSetupStarted) return null

  return <DocumentRepositorySteps />
}

DocumentRepositorySetup.displayName = 'DocumentRepositorySetup'
export default DocumentRepositorySetup
