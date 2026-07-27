import FolderSecurityPolicyWizard from './FolderSecurityPolicyWizard'

export type FolderSecurityProps = {
  folderName: string
  onBack: () => void
}

export default function FolderSecurity({
  folderName,
  onBack,
}: FolderSecurityProps) {
  return <FolderSecurityPolicyWizard folderName={folderName} onClose={onBack} />
}
