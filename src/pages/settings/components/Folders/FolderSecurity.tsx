import { useState } from 'react'
import cn from '@/utils/cn'
import FolderSecurityPolicyWizard from './FolderSecurityPolicyWizard'
import DocumentSecurityRuleWizard from './DocumentSecurityRuleWizard'

export type FolderSecurityProps = {
  folderName: string
  repositoryId?: string
  onBack: () => void
}

type TabKey = 'folder' | 'document'

const tabs: { key: TabKey; label: string }[] = [
  { key: 'folder', label: 'Folder Security' },
  { key: 'document', label: 'Document Security' },
]

export default function FolderSecurity({
  folderName,
  repositoryId = '',
  onBack,
}: FolderSecurityProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('folder')

  return (
    <div className='flex h-full min-h-0 flex-col overflow-hidden bg-[var(--surface)]'>
      <div className='flex min-h-10 flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default)] bg-[var(--surface)] px-4'>
        <div className='flex h-10 min-w-0 items-center'>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key

            return (
              <button
                key={tab.key}
                type='button'
                className={cn(
                  'relative mr-6 flex h-10 items-center text-sm font-medium transition',
                  isActive
                    ? 'text-[var(--primary-9)] font-semibold'
                    : 'text-[var(--gray-11)] hover:text-[var(--primary-9)]',
                )}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}

                {isActive ? (
                  <span className='absolute bottom-0 left-0 h-[2px] w-full bg-[var(--primary-9)]' />
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      <div className='min-h-0 flex-1 overflow-hidden'>
        {activeTab === 'folder' ? (
          <FolderSecurityPolicyWizard
            folderName={folderName}
            repositoryId={repositoryId}
            onClose={onBack}
          />
        ) : (
          <DocumentSecurityRuleWizard
            folderName={folderName}
            repositoryId={repositoryId}
            onClose={onBack}
          />
        )}
      </div>
    </div>
  )
}
