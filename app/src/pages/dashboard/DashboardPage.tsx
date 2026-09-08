import { useLingui } from '@lingui/react/macro'
import { AnimatePresence, motion } from 'motion/react'
import React, { useEffect, useState } from 'react'
import { getRepositorys } from '@/api/v6/folder/folder'
import workflowsApiV6 from '@/api/v6/workflows'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import InputSelect from '@/components/base/inputs/InputSelect'
import { AnimateFadeIn, AnimateSlideUp } from '@/components/common/animations'
import type { Option } from '@/types/option'
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

type DashboardSourceKind = 'repository' | 'workflow'

type DashboardSourceOption = {
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
            return {
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
          .map((workflow) => ({
            kind: 'workflow' as const,
            label: String(workflow.name || 'Untitled Workflow'),
            selectId: `workflow:${workflow.id}`,
            value: String(workflow.id),
          }))
          .filter((opt: any) => Boolean(opt.value && opt.label))

        const mapped = [...repoOptions, ...workflowOptions]
        if (!active) return
        setSourceOptions(mapped)

        const currentRepoKey = repositoryId
          ? `repository:${repositoryId}`
          : ''
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
    Option & { kind: DashboardSourceKind; rightIconKey: string }
  > = sourceOptions.map((opt) => ({
    id: opt.selectId,
    kind: opt.kind,
    name: opt.label,
    rightIconKey: opt.kind === 'workflow' ? WORKFLOW_ICON : REPO_ICON,
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

  const isApDashboard =
    !isWorkflowSource &&
    (!activeRepositoryId ||
      /accounts payable/i.test(selectedName) ||
      selectedName.toLowerCase() === 'ap' ||
      activeRepositoryId === 'ap')

  if (isActivatingAutomation) {
    return (
      <div className='bg-gray-50/50 flex h-full min-h-[50vh] flex-col items-center justify-center' />
    )
  }

  return (
    <div
      className={cn(
        'flex h-full flex-col bg-gray-1',
        isDmsSetupStarted || isSetupStarted || savedHtmlHeader
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
              <div className='flex flex-wrap items-center justify-between gap-3 border-b border-gray-3 px-6 py-3 md:px-8'>
                <div className='min-w-0'>
                  <p className='text-14 font-medium text-gray-13'>
                    {t`Accounts Payable Automation`}
                  </p>
                  <p className='mt-0.5 text-12 text-gray-10'>
                    {t`Connect email, ERP, and storage to start invoice processing.`}
                  </p>
                </div>
                <div className='flex items-center gap-3'>
                  <div className='w-[220px] sm:w-[280px]'>
                    <InputSelect
                      disabled={isLoadingRepos}
                      options={selectOptions}
                      placeholder={t`Repository or workflow`}
                      value={selectedOption}
                      searchable
                      width={340}
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
                  <Button
                    label={t`Get Started`}
                    size='md'
                    suffixIcon='lucide:arrow-right'
                    onClick={openApSetupPreview}
                  />
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
                (isSetupStarted || isDmsSetupStarted || savedHtmlHeader) &&
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
