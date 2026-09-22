import { useLingui } from '@lingui/react/macro'
import { AnimatePresence, motion } from 'motion/react'
import React, { useEffect, useState } from 'react'
import type { Option } from '@/types/option'
import dashboardApiV6 from '@/api/v6/dashboard'
import { getRepositorys } from '@/api/v6/folder/folder'
import workflowsApiV6 from '@/api/v6/workflows'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import InputSelect from '@/components/base/inputs/InputSelect'
import Skeleton from '@/components/base/Skeleton'
import showToast from '@/components/base/toast/showToast'
import { AnimateFadeIn, AnimateSlideUp } from '@/components/common/animations'
import SkeletonCard from '@/components/common/skeletons/SkeletonCard'
import FolderSharePopover from '@/pages/folders/components/FolderSharePopover'
import authUserStore from '@/stores/authUserStore'
import cn from '@/utils/cn'
import DashboardApiBuilder, {
  type SavedHtmlHeaderActions,
} from './components/DashboardApiBuilder'
import useDashboardStore from './stores/useDashboardStore'
import AccountsPayable from './workflows/accounts-payable/AccountsPayable'
import setupStore from './workflows/accounts-payable/stores/useSetupStore'
import DocumentRepositorySetup from './workflows/document-repository/DocumentRepositorySetup'
import useDmsSetupStore from './workflows/document-repository/stores/useDmsSetupStore'
import { openApSetupPreview } from './workflows/setupPreview'
import DashboardCharts from './workflows/shared/components/Header'
import customerDocumentsHtml from './components/Customer Documents.html?raw'
type DashboardSourceKind = 'repository' | 'workflow'

type DashboardSourceOption = {
  description?: string
  kind: DashboardSourceKind
  label: string
  /** Prefixed select id: `repository:<id>` or `workflow:<id>` */
  selectId: string
  value: string
}

const REPO_ICON = 'lucide:folder'
const WORKFLOW_ICON = 'lucide:workflow'

const DashboardPage = () => {
  const { t } = useLingui()
  const session = authUserStore((state) => state.session)
  const user = authUserStore((state) => state.user)

  const userRole =
    session?.role ||
    (user as any)?.role ||
    (session as any)?.roleName ||
    (user as any)?.roleName ||
    ''

  const isAdminUser =
    !userRole ||
    userRole.toLowerCase() === 'admin' ||
    userRole.toLowerCase() === 'adminuser' ||
    userRole.toLowerCase() === 'admin user' ||
    userRole.toLowerCase().includes('admin')

  const isActivatingAutomation = setupStore(
    (state) => state.isActivatingAutomation,
  )
  const isApSetUpCompleted = setupStore((state) => state.isApSetUpCompleted)
  const isSetupStarted = setupStore((state) => state.isSetupStarted)
  const isDmsSetupStarted = useDmsSetupStore((state) => state.isSetupStarted)

  const repositoryId = useDashboardStore((state) => state.repositoryId)
  const setRepositoryId = useDashboardStore((state) => state.setRepositoryId)

  const [sourceOptions, setSourceOptions] = useState<DashboardSourceOption[]>(
    [],
  )
  const [selectedSourceId, setSelectedSourceId] = useState('')
  const [isLoadingRepos, setIsLoadingRepos] = useState(false)
  const [savedHtmlHeader, setSavedHtmlHeader] =
    useState<SavedHtmlHeaderActions | null>(null)
  const [dashboardSharedEmails, setDashboardSharedEmails] = useState<string[]>(
    [],
  )

  useEffect(() => {
    let active = true
    const loadSources = async () => {
      setIsLoadingRepos(true)
      try {
        const [repoRes, workflowRes] = await Promise.all([
          getRepositorys(),
          workflowsApiV6.getWorkflows(),
        ])
        if (!active) return

        const repoList = Array.isArray(repoRes?.data)
          ? repoRes.data
          : Array.isArray(repoRes?.data?.items)
            ? repoRes.data.items
            : Array.isArray(repoRes?.data?.repositories)
              ? repoRes.data.repositories
              : []

        const repoOptions: DashboardSourceOption[] = repoList
          .map((item: any) => {
            const id = String(
              item?.id || item?.repositoryId || item?.value || '',
            )
            const label = String(
              item?.name ||
              item?.repositoryName ||
              item?.title ||
              item?.label ||
              id,
            )
            const rawDesc = item?.description || item?.details || item?.subtitle
            const description = rawDesc
              ? String(rawDesc)
              : /accounts payable/i.test(label) || id === 'ap'
                ? t`Connect email, ERP, and storage to start invoice processing.`
                : t`Manage files and metadata in ${label} repository`
            return {
              description,
              kind: 'repository' as const,
              label,
              selectId: `repository:${id}`,
              value: id,
            }
          })
          .filter((opt: any) => Boolean(opt.value && opt.label))

        const workflowItems = Array.isArray(workflowRes?.data?.items)
          ? workflowRes.data.items
          : []
        const workflowOptions: DashboardSourceOption[] = workflowItems
          .filter((workflow) => Number(workflow.status) === 1)
          .map((workflow) => {
            const rawDesc = workflow.description || (workflow as any).details
            const description = rawDesc
              ? String(rawDesc)
              : t`Workflow document processing and automation`
            return {
              description,
              kind: 'workflow' as const,
              label: String(workflow.name || 'Untitled Workflow'),
              selectId: `workflow:${workflow.id}`,
              value: String(workflow.id),
            }
          })
          .filter((opt: any) => Boolean(opt.value && opt.label))

        const mapped = [...repoOptions, ...workflowOptions]
        if (!active) return
        setSourceOptions(mapped)

        const currentRepoKey = repositoryId ? `repository:${repositoryId}` : ''
        const existing = mapped.find((opt) => opt.selectId === currentRepoKey)
        if (existing) {
          setSelectedSourceId(existing.selectId)
        } else if (!repositoryId || repositoryId === 'ap') {
          const apOpt = mapped.find(
            (opt) =>
              opt.kind === 'repository' &&
              (/accounts payable/i.test(opt.label) || opt.value === 'ap'),
          )
          if (apOpt) {
            setSelectedSourceId(apOpt.selectId)
            setRepositoryId(apOpt.value)
          } else if (mapped[0]) {
            setSelectedSourceId(mapped[0].selectId)
            if (mapped[0].kind === 'repository') {
              setRepositoryId(mapped[0].value)
            } else {
              setRepositoryId('')
            }
          }
        } else if (mapped[0]) {
          setSelectedSourceId(mapped[0].selectId)
        }
      } catch (err) {
        console.error('Failed to load dashboard sources:', err)
      } finally {
        if (active) setIsLoadingRepos(false)
      }
    }
    void loadSources()
    return () => {
      active = false
    }
  }, [])

  const selectOptions: Array<
    Option & { iconKey: string; kind: DashboardSourceKind }
  > = sourceOptions.map((opt) => ({
    iconKey: opt.kind === 'workflow' ? WORKFLOW_ICON : REPO_ICON,
    id: opt.selectId,
    kind: opt.kind,
    name: opt.label,
    value: opt.selectId,
  }))

  const selectedSource =
    sourceOptions.find((opt) => opt.selectId === selectedSourceId) ||
    sourceOptions.find(
      (opt) =>
        opt.kind === 'repository' &&
        (opt.value === repositoryId || /accounts payable/i.test(opt.label)),
    ) ||
    sourceOptions[0] ||
    null

  const selectedOption =
    selectOptions.find((opt) => opt.id === selectedSource?.selectId) || null

  const selectedName =
    selectedSource?.label || selectedOption?.name || 'Accounts Payable'

  const isWorkflowSource = selectedSource?.kind === 'workflow'
  const activeRepositoryId = isWorkflowSource
    ? ''
    : selectedSource?.value || repositoryId || ''
  const activeWorkflowId = isWorkflowSource ? selectedSource?.value || '' : ''

  useEffect(() => {
    if (!savedHtmlHeader || (!activeRepositoryId && !activeWorkflowId)) {
      setDashboardSharedEmails([])
      return
    }
    let active = true
    dashboardApiV6
      .getDashboardShares({
        repositoryId: activeRepositoryId || undefined,
        tenantId: session?.tenantId || '',
        workflowId: activeWorkflowId || undefined,
      })
      .then((res) => {
        if (!active) return
        setDashboardSharedEmails(
          (res.data || []).map((share) => share.email.toLowerCase()),
        )
      })
    return () => {
      active = false
    }
  }, [activeRepositoryId, activeWorkflowId, savedHtmlHeader, session?.tenantId])

  const isApDashboard =
    !isWorkflowSource &&
    (!activeRepositoryId ||
      /accounts payable/i.test(selectedName) ||
      selectedName.toLowerCase() === 'ap' ||
      activeRepositoryId === 'ap')

  const isCustomerDocuments =
    !isWorkflowSource &&
    (!activeRepositoryId ||
      selectedName.toLowerCase() === 'customer documents')
  const displayTitle =
    selectedSource?.label || selectedName || t`Accounts Payable Automation`

  const displayDescription =
    selectedSource?.description ||
    (isApDashboard
      ? t`Connect email, ERP, and storage to start invoice processing.`
      : isWorkflowSource
        ? t`Workflow document processing and automation`
        : t`Manage repository files and document automation`)

  if (isActivatingAutomation) {
    return (
      <div className='flex h-full min-h-[50vh] flex-col gap-6 p-6'>
        <div className='flex items-center justify-between gap-4'>
          <div className='space-y-2'>
            <Skeleton className='h-5 w-56' />
            <Skeleton className='h-3.5 w-80' />
          </div>
          <Skeleton className='h-9 w-32 rounded-lg' />
        </div>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4'>
          <SkeletonCard height='h-28' />
          <SkeletonCard height='h-28' />
          <SkeletonCard height='h-28' />
          <SkeletonCard height='h-28' />
        </div>
        <SkeletonCard height='h-64' />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex h-full flex-col bg-gray-1',
        isDmsSetupStarted || isSetupStarted || savedHtmlHeader || isCustomerDocuments
          ? 'overflow-hidden'
          : 'overflow-y-auto',
      )}
    >
      {isDmsSetupStarted ? (
        <DocumentRepositorySetup />
      ) : (
        <>
          {!isSetupStarted && (
            <AnimateFadeIn delay={0.05}>
              <div className='flex flex-wrap items-center justify-between gap-3 border-b border-gray-3 px-6 py-3'>
                <div className='min-w-0'>
                  <p className='text-14 font-medium text-gray-13'>
                    {displayTitle}
                  </p>
                  <p className='mt-0.5 text-12 text-gray-10'>
                    {displayDescription}
                  </p>
                </div>
                <div className='flex items-center gap-3'>
                  <div className='w-[220px] sm:w-[280px]'>
                    <InputSelect
                      disabled={isLoadingRepos}
                      options={selectOptions}
                      placeholder={t`Repository or workflow`}
                      value={selectedOption}
                      width={340}
                      searchable
                      onChange={(selected) => {
                        const nextId = String(
                          selected?.value || selected?.id || '',
                        )
                        setSelectedSourceId(nextId)
                        const match = sourceOptions.find(
                          (opt) => opt.selectId === nextId,
                        )
                        if (!match) return
                        if (match.kind === 'repository') {
                          setRepositoryId(match.value)
                        } else {
                          setRepositoryId('')
                        }
                      }}
                    />
                  </div>
                  {savedHtmlHeader ? (
                    <>
                      {isAdminUser ? (
                        <FolderSharePopover
                          allowSign={false}
                          sharedIds={dashboardSharedEmails}
                          successMessage={t`Dashboard shared`}
                          title={t`Share Dashboard`}
                          triggerLabel={t`Share`}
                          iconOnly
                          roleOptions={[
                            { icon: 'lucide:eye', id: 'View', name: t`View` },
                          ]}
                          onShare={async (shares, message) => {
                            try {
                              for (const share of shares) {
                                const { error } =
                                  await dashboardApiV6.shareDashboard({
                                    action: 0,
                                    email: share.email,
                                    message,
                                    repositoryId:
                                      activeRepositoryId || undefined,
                                    tenantId: session?.tenantId,
                                    workflowId: activeWorkflowId || undefined,
                                  })
                                if (error) throw new Error(error)
                              }
                              setDashboardSharedEmails((prev) => [
                                ...new Set([
                                  ...prev,
                                  ...shares.map((share) =>
                                    share.email.trim().toLowerCase(),
                                  ),
                                ]),
                              ])
                              return true
                            } catch (error) {
                              showToast({
                                message:
                                  error instanceof Error
                                    ? error.message
                                    : t`Failed to share dashboard`,
                                variant: 'error',
                              })
                              return false
                            }
                          }}
                        />
                      ) : null}
                      <IconButton
                        ariaLabel={t`Refresh`}
                        className='text-gray-12'
                        color='gray'
                        disabled={savedHtmlHeader.isRefreshing}
                        icon='lucide:refresh-cw'
                        loading={savedHtmlHeader.isRefreshing}
                        size='md'
                        tooltip={t`Refresh`}
                        variant='outline'
                        onClick={savedHtmlHeader.onRefresh}
                      />
                      <IconButton
                        ariaLabel={t`Edit`}
                        className='text-gray-12'
                        color='gray'
                        icon='lucide:pencil'
                        size='md'
                        tooltip={t`Edit`}
                        variant='outline'
                        onClick={savedHtmlHeader.onEdit}
                      />
                    </>
                  ) : null}
                  {isAdminUser && (
                    <Button
                      label={t`Get Started`}
                      size='md'
                      suffixIcon='lucide:arrow-right'
                      onClick={openApSetupPreview}
                    />
                  )}
                </div>
              </div>
            </AnimateFadeIn>
          )}

          <AnimatePresence mode='wait'>
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.99, y: -12 }}
              initial={{ opacity: 0, scale: 0.99, y: 12 }}
              key={selectedSourceId || activeRepositoryId || 'ap'}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                'min-h-0 flex-1',
                (isSetupStarted || isDmsSetupStarted || savedHtmlHeader || isCustomerDocuments) &&
                'flex h-full flex-col',
              )}
            >
              {isApDashboard ? (
                <>
                  {isApSetUpCompleted && !isSetupStarted && (
                    <AnimateSlideUp delay={0.1}>
                      <DashboardCharts />
                    </AnimateSlideUp>
                  )}
                  <AccountsPayable />
                </>
              ) : isCustomerDocuments ? (
                <iframe
                  className="flex-1 w-full border-0 bg-white rounded-xl shadow-xs"
                  srcDoc={customerDocumentsHtml}
                  title="Customer Documents Dashboard"
                />
              ) : (
                <DashboardApiBuilder
                  repositoryId={activeRepositoryId}
                  repositoryName={selectedName || 'Custom Repository'}
                  workflowId={activeWorkflowId}
                  onSavedHtmlHeaderChange={setSavedHtmlHeader}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </div>
  )
}

DashboardPage.displayName = 'DashboardPage'
export default DashboardPage
