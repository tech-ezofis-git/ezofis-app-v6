import { useLingui } from '@lingui/react/macro'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import showToast from '@/components/base/toast/showToast'
import { AnimateSlideUp } from '@/components/common/animations'
import { getPortalConfig } from '@/pages/settings/helpers/portalConfigStorage'
import PortalDetail from './components/PortalDetail'
import PortalHome from './components/PortalHome'
import PortalLogin from './components/PortalLogin'
import PortalPicker from './components/PortalPicker'
import PortalShell from './components/PortalShell'
import PortalWizard from './components/PortalWizard'
import { applyPortalBranding } from './helpers/portalBranding'
import {
  listPortalSubmissions,
  PORTAL_STATUS_TONE,
  type PortalSubmission,
} from './helpers/portalSubmissions'
import {
  listPortalWorkflowSummaries,
  type PortalWorkflowSummary,
} from './helpers/portalWorkflows'
import usePortalSessionStore, {
  type PortalAuthUser,
} from './stores/usePortalSessionStore'

type PortalPageProps = {
  portalId: string
}

type PortalView = 'detail' | 'home' | 'picker' | 'wizard'

const PortalPage = ({ portalId }: PortalPageProps) => {
  const { t } = useLingui()
  const session = usePortalSessionStore((state) => state.sessions[portalId])
  const setSession = usePortalSessionStore((state) => state.setSession)
  const clearSession = usePortalSessionStore((state) => state.clearSession)

  const portal = useMemo(() => getPortalConfig(portalId), [portalId])
  const hasMultipleWorkflows = (portal?.workflows.length || 0) > 1
  const [view, setView] = useState<PortalView>('home')
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(
    !hasMultipleWorkflows && portal?.workflows[0]
      ? String(portal.workflows[0].id)
      : null,
  )
  const [submissions, setSubmissions] = useState<PortalSubmission[]>([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)
  const [workflowSummaries, setWorkflowSummaries] = useState<
    PortalWorkflowSummary[]
  >([])
  const [loadingWorkflows, setLoadingWorkflows] = useState(false)
  const [selectedSubmission, setSelectedSubmission] =
    useState<PortalSubmission | null>(null)
  const [submissionsTick, setSubmissionsTick] = useState(0)
  const [wizardChrome, setWizardChrome] = useState<{
    canSubmit: boolean
    submitting: boolean
    title: string
  } | null>(null)
  const wizardSubmitRef = useRef<() => void>(() => {})
  const handleWizardChromeChange = useCallback(
    (
      chrome: {
        canSubmit: boolean
        submitting: boolean
        title: string
        onSubmit: () => void
      } | null,
    ) => {
      if (chrome) wizardSubmitRef.current = chrome.onSubmit
      setWizardChrome((prev) => {
        if (!chrome) return prev ? null : prev
        if (
          prev?.canSubmit === chrome.canSubmit &&
          prev?.submitting === chrome.submitting &&
          prev?.title === chrome.title
        ) {
          return prev
        }
        return {
          canSubmit: chrome.canSubmit,
          submitting: chrome.submitting,
          title: chrome.title,
        }
      })
    },
    [],
  )

  const selectedWorkflow = useMemo(
    () =>
      portal?.workflows.find(
        (workflow) => String(workflow.id) === String(selectedWorkflowId),
      ) || null,
    [portal, selectedWorkflowId],
  )

  useEffect(() => {
    if (!portal) return
    applyPortalBranding(portal.branding)
    const title = portal.branding?.brandName || portal.name || 'EZOFIS Portal'
    document.title = title
  }, [portal])

  useEffect(() => {
    if (!portal || !session) return

    let cancelled = false
    setLoadingWorkflows(true)
    void listPortalWorkflowSummaries({
      tenantId: portal.tenantId,
      workflows: portal.workflows,
    })
      .then((summaries) => {
        if (!cancelled) setWorkflowSummaries(summaries)
      })
      .finally(() => {
        if (!cancelled) setLoadingWorkflows(false)
      })

    return () => {
      cancelled = true
    }
  }, [portal, session])

  useEffect(() => {
    if (!portal || !session || !selectedWorkflow) {
      setSubmissions([])
      return
    }

    let cancelled = false
    setLoadingSubmissions(true)
    void listPortalSubmissions({
      tenantId: portal.tenantId,
      workflows: [selectedWorkflow],
    })
      .then((result) => {
        if (cancelled) return
        if (result.error) {
          showToast({ message: result.error, variant: 'error' })
        }
        setSubmissions(result.submissions)
      })
      .catch(() => {
        if (cancelled) return
        showToast({
          message: t`Unable to load submissions for the selected workflows.`,
          variant: 'error',
        })
        setSubmissions([])
      })
      .finally(() => {
        if (!cancelled) setLoadingSubmissions(false)
      })

    return () => {
      cancelled = true
    }
  }, [portal, selectedWorkflow, session, submissionsTick, t])

  const handleAuthenticated = (user: PortalAuthUser) => {
    setSession(portalId, user)
    setSelectedSubmission(null)
    setView('home')
    setSelectedWorkflowId(
      (portal?.workflows.length || 0) > 1
        ? null
        : portal?.workflows[0]
          ? String(portal.workflows[0].id)
          : null,
    )
  }

  const startNewSubmission = (workflowId?: string) => {
    if (!portal) return
    const targetId = workflowId || selectedWorkflowId
    const target =
      portal.workflows.find(
        (workflow) => String(workflow.id) === String(targetId),
      ) || (portal.workflows.length === 1 ? portal.workflows[0] : null)

    if (target) {
      setSelectedWorkflowId(String(target.id))
      setSelectedSubmission(null)
      setView('wizard')
      return
    }

    setView('picker')
  }

  const openWorkflow = (workflowId: string) => {
    setSelectedWorkflowId(workflowId)
    setSelectedSubmission(null)
    setView('home')
  }

  const backToWorkflows = () => {
    setSelectedWorkflowId(null)
    setSelectedSubmission(null)
    setSubmissions([])
    setView('home')
  }

  if (!portal) {
    return (
      <div className='flex min-h-svh flex-col items-center justify-center gap-2 bg-surface px-6 text-center'>
        <p className='text-15 font-semibold text-gray-13'>{t`Portal not found`}</p>
        <p className='max-w-sm text-13 text-gray-10'>
          {t`This portal link is invalid or has not been published yet.`}
        </p>
      </div>
    )
  }

  if (!session) {
    return <PortalLogin portal={portal} onAuthenticated={handleAuthenticated} />
  }

  const displayName = session.displayName || session.username
  const fallbackSummaries =
    workflowSummaries.length > 0
      ? workflowSummaries
      : portal.workflows.map((workflow) => ({
          completedCount: 0,
          description: '',
          id: String(workflow.id),
          inboxCount: 0,
          name: workflow.name,
          sentCount: 0,
          total: 0,
        }))

  let content = (
    <PortalHome
      displayName={displayName}
      loadingSubmissions={loadingSubmissions}
      loadingWorkflows={loadingWorkflows}
      showWorkflowCards={hasMultipleWorkflows && !selectedWorkflowId}
      submissions={submissions}
      workflowName={selectedWorkflow?.name}
      workflows={fallbackSummaries}
      onBackToWorkflows={hasMultipleWorkflows ? backToWorkflows : undefined}
      onNewSubmission={() => startNewSubmission()}
      onOpenSubmission={(submission) => {
        setSelectedSubmission(submission)
        setView('detail')
      }}
      onOpenWorkflow={openWorkflow}
    />
  )

  if (view === 'picker') {
    content = (
      <PortalPicker
        portal={portal}
        onBack={() => setView('home')}
        onSelectWorkflow={(id) => startNewSubmission(id)}
      />
    )
  } else if (view === 'wizard' && selectedWorkflowId) {
    content = (
      <PortalWizard
        workflowId={selectedWorkflowId}
        workflowName={selectedWorkflow?.name}
        onChromeChange={handleWizardChromeChange}
        onSubmitted={() => {
          setSubmissionsTick((tick) => tick + 1)
          setView('home')
        }}
      />
    )
  } else if (view === 'detail' && selectedSubmission) {
    content = <PortalDetail submission={selectedSubmission} />
  }

  return (
    <PortalShell
      email={session.username}
      fill={view === 'detail'}
      portal={portal}
      detail={
        view === 'detail' && selectedSubmission
          ? {
              requestNo: selectedSubmission.requestNo,
              status: selectedSubmission.status,
              statusClassName: PORTAL_STATUS_TONE[selectedSubmission.status],
              onBack: () => {
                setSelectedSubmission(null)
                setView('home')
              },
            }
          : null
      }
      wizard={
        view === 'wizard'
          ? {
              canSubmit: Boolean(wizardChrome?.canSubmit),
              submitting: Boolean(wizardChrome?.submitting),
              title:
                wizardChrome?.title ||
                selectedWorkflow?.name ||
                t`New Submission`,
              onCancel: () => setView('home'),
              onSubmit: () => wizardSubmitRef.current(),
            }
          : null
      }
      onSignOut={() => {
        clearSession(portalId)
        setSelectedSubmission(null)
        setSelectedWorkflowId(
          hasMultipleWorkflows
            ? null
            : portal.workflows[0]
              ? String(portal.workflows[0].id)
              : null,
        )
        setSubmissions([])
        setView('home')
      }}
    >
      <AnimateSlideUp
        key={view}
        className={
          view === 'detail' ? 'flex h-full min-h-0 flex-1 flex-col' : undefined
        }
      >
        {content}
      </AnimateSlideUp>
    </PortalShell>
  )
}

PortalPage.displayName = 'PortalPage'
export default PortalPage
