import { useLingui } from '@lingui/react/macro'
import { useEffect, useMemo, useRef, useState } from 'react'
import showToast from '@/components/base/toast/showToast'
import Attachments from '@/pages/requests/components/request/components/sections/attachment/Attachments'
import History from '@/pages/requests/components/request/components/sections/history/History'
import type { PortalSubmission } from '../helpers/portalSubmissions'
import {
  buildDetailFormModel,
  buildPortalNavSections,
  PORTAL_SECTION_ATTACHMENTS,
  PORTAL_SECTION_HISTORY,
  submissionInstanceIds,
} from '../helpers/portalDetail'
import {
  loadPortalWizard,
  type PortalWizardSource,
} from '../helpers/portalWizardLoad'
import { PortalDetailSkeleton } from './PortalLayoutSkeleton'
import PortalPanelNav from './PortalPanelNav'
import PortalSubmissionDetails from './PortalSubmissionDetails'

type PortalDetailProps = {
  submission: PortalSubmission
}

export default function PortalDetail({ submission }: PortalDetailProps) {
  const { t } = useLingui()
  const [source, setSource] = useState<PortalWizardSource | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState('')
  const scrollRef = useRef<HTMLElement | null>(null)
  const clickingRef = useRef(false)

  const { instanceId, processId, repositoryId } = useMemo(
    () => submissionInstanceIds(submission),
    [submission],
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadPortalWizard(submission.workflowId, submission.workflowName)
      .then((next) => {
        if (!cancelled) setSource(next)
      })
      .catch((error) => {
        if (cancelled) return
        setSource(null)
        showToast({
          message:
            error instanceof Error
              ? error.message
              : t`Unable to load this request.`,
          variant: 'error',
        })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [submission.workflowId, submission.workflowName, t])

  const panels = useMemo(() => source?.panels || [], [source])
  const resolvedRepositoryId = source?.repositoryId || repositoryId || undefined
  const formModel = useMemo(
    () => buildDetailFormModel(submission.raw, panels),
    [panels, submission.raw],
  )
  const sections = useMemo(
    () =>
      buildPortalNavSections(panels, {
        attachments: t`Attachments`,
        history: t`History`,
      }),
    [panels, t],
  )

  useEffect(() => {
    if (!activeId && sections[0]) setActiveId(sections[0].id)
  }, [activeId, sections])

  useEffect(() => {
    const root = scrollRef.current
    if (!root || loading || !sections.length) return

    const nodes = sections
      .map((section) => root.querySelector(`#${CSS.escape(section.id)}`))
      .filter((node): node is Element => Boolean(node))

    if (!nodes.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (clickingRef.current) return
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (left, right) =>
              left.boundingClientRect.top - right.boundingClientRect.top,
          )
        const nextId = visible[0]?.target.id
        if (nextId) setActiveId(nextId)
      },
      {
        root,
        rootMargin: '0px 0px -60% 0px',
        threshold: [0.1, 0.25, 0.5],
      },
    )

    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [loading, sections])

  const scrollToSection = (id: string) => {
    const root = scrollRef.current
    const target = root?.querySelector(`#${CSS.escape(id)}`)
    if (!root || !(target instanceof HTMLElement)) return

    clickingRef.current = true
    setActiveId(id)
    const nextTop =
      root.scrollTop +
      target.getBoundingClientRect().top -
      root.getBoundingClientRect().top -
      8
    root.scrollTo({ behavior: 'smooth', top: nextTop })
    window.setTimeout(() => {
      clickingRef.current = false
    }, 700)
  }

  if (loading) {
    return (
      <div className='h-full min-h-0'>
        <PortalDetailSkeleton />
      </div>
    )
  }

  return (
    <div className='flex h-full min-h-0'>
      <aside className='hidden h-full min-h-0 w-72 shrink-0 overflow-hidden border-r border-gray-4 bg-surface lg:flex lg:flex-col xl:w-80'>
        <PortalPanelNav
          activeId={activeId}
          sections={sections}
          onSelect={scrollToSection}
        />
      </aside>

      <section
        className='min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5'
        ref={scrollRef}
      >
        <div className='mb-4 lg:hidden'>
          <PortalPanelNav
            activeId={activeId}
            sections={sections}
            onSelect={scrollToSection}
          />
        </div>

        {panels.length > 0 ? (
          <PortalSubmissionDetails formModel={formModel} panels={panels} />
        ) : (
          <div className='rounded-xl border border-gray-4 bg-surface p-5 text-13 text-gray-10'>
            {t`No form panels found for this request.`}
          </div>
        )}

        <div
          className='mt-5 scroll-mt-3 rounded-xl border border-gray-4 bg-surface p-4 shadow-sm sm:p-5'
          id={PORTAL_SECTION_ATTACHMENTS}
        >
          <div className='mb-3 text-15 font-semibold text-gray-13'>
            {t`Attachments`}
          </div>
          <Attachments
            formModel={formModel}
            instanceId={instanceId}
            repositoryId={resolvedRepositoryId}
            selectedItem={submission.raw}
            showRelatedFinder={false}
            workflowId={submission.workflowId}
            canUpload
            enabled
          />
        </div>

        <div
          className='mt-5 scroll-mt-3 rounded-xl border border-gray-4 bg-surface p-4 shadow-sm sm:p-5'
          id={PORTAL_SECTION_HISTORY}
        >
          <div className='mb-3 text-15 font-semibold text-gray-13'>
            {t`History`}
          </div>
          <History
            instanceId={instanceId}
            processId={processId}
            workflowId={submission.workflowId}
            enabled
          />
        </div>
      </section>
    </div>
  )
}
