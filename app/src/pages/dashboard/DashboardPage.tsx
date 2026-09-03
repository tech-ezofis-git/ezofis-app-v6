import { useLingui } from '@lingui/react/macro'
import { AnimatePresence, motion } from 'motion/react'
import React, { useEffect, useState } from 'react'
import { getRepositorys } from '@/api/v6/folder/folder'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import InputSelect from '@/components/base/inputs/InputSelect'
import { AnimateFadeIn, AnimateSlideUp } from '@/components/common/animations'
import cn from '@/utils/cn'
import DashboardApiBuilder, {
  type SavedHtmlHeaderActions,
} from './components/DashboardApiBuilder'
import useDashboardStore from './stores/useDashboardStore'
import AccountsPayable from './workflows/accounts-payable/AccountsPayable'
import setupStore from './workflows/accounts-payable/stores/useSetupStore'
import DocumentRepositorySetup from './workflows/document-repository/DocumentRepositorySetup'
import useDmsSetupStore from './workflows/document-repository/stores/useDmsSetupStore'
import {
  openApSetupPreview,
  openDmsSetupPreview,
} from './workflows/setupPreview'
import DashboardCharts from './workflows/shared/components/Header'

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

  const [repositoryOptions, setRepositoryOptions] = useState<
    Array<{ label: string; value: string }>
  >([])
  const [isLoadingRepos, setIsLoadingRepos] = useState(false)
  const [savedHtmlHeader, setSavedHtmlHeader] =
    useState<SavedHtmlHeaderActions | null>(null)

  useEffect(() => {
    let active = true
    const loadRepos = async () => {
      setIsLoadingRepos(true)
      try {
        const res = await getRepositorys()
        if (!active || res?.canceled || !res?.data) return
        const list = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.items)
            ? res.data.items
            : Array.isArray(res.data?.repositories)
              ? res.data.repositories
              : []
        const mapped = list
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
            return { label, value: id }
          })
          .filter((opt: any) => Boolean(opt.value && opt.label))
        if (active) {
          setRepositoryOptions(mapped)
          // Default selection for Accounts Payable if not explicitly set
          if (!repositoryId || repositoryId === 'ap') {
            const apOpt = mapped.find(
              (opt: any) =>
                /accounts payable/i.test(opt.label) || opt.value === 'ap',
            )
            if (apOpt) {
              setRepositoryId(apOpt.value)
            }
          }
        }
      } catch (err) {
        console.error('Failed to load repositories for header:', err)
      } finally {
        if (active) setIsLoadingRepos(false)
      }
    }
    void loadRepos()
    return () => {
      active = false
    }
  }, [])

  const selectOptions = repositoryOptions.map((opt) => ({
    id: opt.value,
    name: opt.label,
    value: opt.value,
  }))

  const defaultApOption =
    selectOptions.find(
      (opt) => /accounts payable/i.test(opt.name) || opt.value === 'ap',
    ) || (selectOptions.length > 0 ? selectOptions[0] : null)

  const selectedOption =
    selectOptions.find(
      (opt) => opt.value === repositoryId || String(opt.id) === repositoryId,
    ) || defaultApOption

  const selectedRepo = repositoryOptions.find(
    (opt) => opt.value === repositoryId || opt.label === repositoryId,
  )
  const selectedRepoName = selectedRepo
    ? selectedRepo.label
    : selectedOption?.name || repositoryId || 'Accounts Payable'

  const isApDashboard =
    !repositoryId ||
    /accounts payable/i.test(selectedRepoName) ||
    selectedRepoName.toLowerCase() === 'ap' ||
    repositoryId === 'ap'

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
                  <div className='w-[190px] sm:w-[220px]'>
                    <InputSelect
                      disabled={isLoadingRepos}
                      options={selectOptions}
                      placeholder={t`Repository`}
                      value={selectedOption}
                      searchable
                      onChange={(selected) =>
                        setRepositoryId(
                          selected?.value || String(selected?.id || ''),
                        )
                      }
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
              key={repositoryId || selectedOption?.value || 'ap'}
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
                  repositoryId={repositoryId}
                  repositoryName={selectedRepoName || 'Custom Repository'}
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
