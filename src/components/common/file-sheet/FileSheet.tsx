import { AnimatePresence, motion } from 'motion/react'
import React, { useEffect, useMemo, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import Modal from '@/components/base/Modal'

type FileLike = {
  id: string | number
  initiate?: boolean
  name: string
  repositoryId?: string | number
}

// type Props = {
//     opened: boolean;
//     onClose: () => void;
//     file: FileLike | null;
//     tenantId: string | number;
//     userId: string | number;
//     workflowId?: string | number;
//     processId?: string | number;
//     apiBaseUrl?: string;
//     type?: 1 | 2;
//     actions?: string;
//     fullScreen?: boolean;  // New prop to control if the FileSheet should use Modal or Inline view
// };

const DEFAULT_TYPE: 1 | 2 = 2

const getExt = (name?: string) => (name?.split('.').pop() || '').toLowerCase()

// Mirrors the Vue helper intent (good enough for viewer routing decisions)
const htmlSupport = (ext: string) => ['html', 'htm'].includes(ext)
const otherFilePDFSupport = (ext: string) =>
  [
    // office-like formats that often go through docsviewer
    'doc',
    'docx',
    'xls',
    'xlsx',
    'ppt',
    'pptx',
    'csv',
    'txt',
    'rtf',
    // images typically safe in docsviewer flows too
    'png',
    'jpg',
    'jpeg',
    'webp',
    'gif',
    // add more if your Vue helper had more
  ].includes(ext)

// Function to build preview URL
function buildPreviewUrl(args: {
  actions?: string
  apiBaseUrl: string
  file: FileLike
  processId?: string | number
  tenantId: string | number
  type: 1 | 2
  userId: string | number
  workflowId?: string | number
}) {
  const {
    actions,
    apiBaseUrl,
    file,
    processId,
    tenantId,
    type,
    userId,
    workflowId,
  } = args

  const originRaw = window.location.origin
  const replaceOriginTargets = [
    'http://localhost:3000',
    'https://demoapp.ezofis.com',
  ]
  let origin = originRaw
  if (originRaw && replaceOriginTargets.includes(originRaw)) {
    origin = originRaw.replace(originRaw, 'https://trial.ezofis.com')
  }

  console.log(origin, 'this is sample Url')

  const ext = getExt(file.name)

  // Same "armgroup" special-case you had (hard-coded viewer)
  // In Vue this was behind this.isTenantArmgroup()
  // If you have a tenant flag, you can swap this condition.
  const isArmgroupOrigin = false

  // Vue logic:
  // - for certain origins + non-pdf (and not otherFilePDFSupport), use docsviewer
  // - else pdfviewer
  // - else for one origin use DocsViewer
  // - else return direct /file/view
  let domainURL = ''
  const actionSuffix = actions || '' // e.g. "&action=all"

  if (isArmgroupOrigin) {
    domainURL = 'https://ag-appsvc04.azurewebsites.net/web/viewer.html'
  } else if (
    ((origin === 'https://trial.ezofis.com' && ext !== 'pdf') ||
      origin === 'https://eztrialapp.azurewebsites.net' ||
      (origin === 'https://app.ezofis.com' && ext !== 'pdf') ||
      origin === 'http://192.168.110.126' ||
      origin === 'https://gdms.gfiuae.cloud' ||
      origin === 'https://dfms.m2p.app') &&
    !otherFilePDFSupport(ext)
  ) {
    domainURL = `${origin}/docsviewer/index.html`
  } else if (!htmlSupport(ext) && origin === 'http://52.172.32.88') {
    domainURL = 'http://52.172.32.88/DocsViewer/index.html'
  } else if (
    origin === 'https://trial.ezofis.com' ||
    origin === 'https://eztrialapp.azurewebsites.net' ||
    origin === 'https://app.ezofis.com' ||
    origin === 'http://192.168.110.126' ||
    origin === 'https://gdms.gfiuae.cloud' ||
    origin === 'https://dfms.m2p.app' ||
    origin === 'http://52.172.32.88'
  ) {
    // Vue: default viewer for these cases is pdfviewer
    domainURL = `${origin}/PDFViewer/web/viewer.html`
  } else {
    // Direct API fallback (Vue did this in the final else)
    const repositoryId = file.repositoryId ?? ''
    return `${apiBaseUrl}/file/view/${tenantId}/${userId}/${repositoryId}/${file.id}/${type}`
  }

  const repositoryId = file.repositoryId ?? ''
  const wId = workflowId ?? ''
  const pId = processId ?? ''
  // console.log(`${domainURL}?tId=${tenantId}&uId=${userId}&rId=${repositoryId}&itemId=${file.id}&wId=${wId}&pId=${pId}&type=${2}&filename=${encodeURIComponent(
  //     file.name,
  // )}${actionSuffix}`, "this is file url")
  // This matches your Vue query style:
  // viewer.html? tId/uId/rId/itemId/wId/pId/type/filename + optional action
  return `${domainURL}?tId=${tenantId}&uId=${userId}&rId=${repositoryId}&itemId=${file.id}&wId=${wId}&pId=${pId}&type=${2}&filename=${encodeURIComponent(
    file.name,
  )}${actionSuffix}`
}

function resolveApiBaseUrl(explicit?: string) {
  // try the usual suspects used in React/Vite/CRA
  const v =
    explicit ||
    import.meta.env?.VITE_BASE_URL ||
    process.env.REACT_APP_API_URLfallback
  return String(v || '').replace(/\/$/, '')
}

const FileSheet: React.FC<any> = ({
  actions = '',
  apiBaseUrl,
  customLoading = false, // New capability: allow parent to force loading state
  file,
  fullScreen = false, // Default to false for inline view
  opened,
  processId,
  tenantId,
  type = DEFAULT_TYPE,
  userId,

  workflowId,
  onClose,
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const showLoader = isLoading || customLoading

  const baseUrl = useMemo(() => resolveApiBaseUrl(apiBaseUrl), [apiBaseUrl])

  const src = useMemo(() => {
    if (!file) return ''
    return buildPreviewUrl({
      actions,
      apiBaseUrl: baseUrl,
      file,
      processId,
      tenantId,
      type,
      userId,
      workflowId,
    })
  }, [file, baseUrl, tenantId, userId, workflowId, processId, type, actions])

  useEffect(() => {
    if (opened && src) {
      setIsLoading(true)
    }
  }, [opened, src])

  const handleIframeLoad = () => {
    setIsLoading(false)
  }

  if (!file) return null

  // If fullScreen is true, display in Modal, otherwise inline in a container
  if (fullScreen) {
    return (
      <Modal opened={opened} fullScreen onClose={onClose}>
        {/* Header */}
        <div className='flex items-center justify-between border-b border-gray-3 bg-white px-2 py-2'>
          <div className='flex min-w-0 items-center gap-4'>
            <div className='flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-2 text-primary-9 ring-1 ring-primary-4'>
              <Icon className='size-6' name='tabler:file-search' />
            </div>

            <div className='min-w-0'>
              <h3 className='truncate text-base leading-tight font-bold text-gray-12'>
                {file.name}
              </h3>
              <div className='mt-0.5 flex items-center gap-2'>
                <span className='flex h-1.5 w-1.5 animate-pulse rounded-full bg-green-9' />
                <p className='text-[11px] font-bold tracking-wider text-gray-10 uppercase'>
                  Live Document Preview
                </p>
              </div>
            </div>
          </div>

          <div className='flex items-center gap-3'>
            <button
              className='group flex cursor-pointer items-center gap-2 rounded-xl bg-gray-2 px-4 py-2 text-sm font-bold text-gray-11 transition-all hover:bg-red-2 hover:text-red-11 active:scale-95'
              onClick={onClose}
            >
              <Icon
                className='size-5 transition-transform group-hover:rotate-90'
                name='tabler:x'
              />
            </button>
          </div>
        </div>

        {/* Body: File Viewer */}
        <div
          className='relative w-full overflow-hidden bg-gray-1'
          style={{ height: 'calc(100vh - 77px)' }}
        >
          {src ? (
            <>
              {/* Loading State: Scanning Animation */}
              <AnimatePresence>
                {showLoader && (
                  <motion.div
                    className='pointer-events-none absolute inset-0 z-30'
                    exit={{ opacity: 0 }}
                    initial={{ opacity: 1 }}
                  >
                    {/* Backdrop with subtle primary tint */}
                    <div className='absolute inset-0 bg-[var(--primary-9)]/5'></div>

                    {/* Scanning Bar (defined in index.css) */}
                    <div className='scanning-bar animate-scan absolute inset-x-0 z-40 h-1 bg-[var(--primary-9)] shadow-[0_0_15px_rgba(var(--primary-9),0.8)]'></div>

                    {/* Floating Indicator Pill */}
                    <div className='absolute bottom-10 left-1/2 z-50 flex shrink-0 -translate-x-1/2 transform items-center gap-2 rounded-full border border-[var(--gray-4)] bg-white/90 px-5 py-2.5 shadow-xl backdrop-blur-sm'>
                      <div className='flex items-center gap-3'>
                        <div className='flex size-5 items-center justify-center rounded-full bg-[var(--primary-1)]'>
                          <Icon
                            className='size-3.5 animate-pulse text-[var(--primary-9)]'
                            name='tabler:scan'
                          />
                        </div>
                        {/* <span className="text-sm font-bold text-[var(--gray-12)] tracking-tight whitespace-nowrap">
                                                    Scanning Document...
                                                </span> */}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <iframe
                className='h-full w-full border-none shadow-inner'
                src={src}
                title='file-preview'
                allowFullScreen
                onLoad={handleIframeLoad}
              />
            </>
          ) : (
            <div className='flex h-full flex-col items-center justify-center p-6 text-center'>
              <div className='mb-6 rounded-3xl bg-red-2 p-5 text-red-9 shadow-sm ring-1 ring-red-4'>
                <Icon className='size-12' name='tabler:file-off' />
              </div>
              <h3 className='text-xl font-bold text-gray-13'>
                Unable to display file
              </h3>
              <p className='mt-2 max-w-sm text-sm leading-relaxed text-gray-10'>
                We couldn't generate a preview for this document. Please try
                downloading the file directly or refresh the page.
              </p>
            </div>
          )}
        </div>
      </Modal>
    )
  }

  // Inline view (not full screen, using a container)
  return (
    <div className='relative h-full w-full'>
      {/* Loading State: Scanning Animation */}
      <AnimatePresence>
        {showLoader && (
          <motion.div
            className='pointer-events-none absolute inset-0 z-30'
            exit={{ opacity: 0 }}
            initial={{ opacity: 1 }}
          >
            {/* Backdrop with subtle primary tint */}
            <div className='absolute inset-0 bg-[var(--primary-9)]/5'></div>

            {/* Scanning Bar (defined in index.css) */}
            <div className='scanning-bar animate-scan absolute inset-x-0 z-40 h-1 bg-[var(--primary-9)] shadow-[0_0_15px_rgba(var(--primary-9),0.8)]'></div>

            {/* Floating Indicator Pill */}
          </motion.div>
        )}
      </AnimatePresence>{' '}
      {/* You can adjust the height based on your design */}
      {src ? (
        <iframe
          className='h-full w-full border-none shadow-md'
          src={src}
          title='file-preview'
          allowFullScreen
          onLoad={handleIframeLoad}
        />
      ) : (
        <div className='flex h-full flex-col items-center justify-center p-6 text-center'>
          <div className='mb-6 rounded-3xl bg-red-2 p-5 text-red-9 shadow-sm ring-1 ring-red-4'>
            <Icon className='size-12' name='tabler:file-off' />
          </div>
          <h3 className='text-xl font-bold text-gray-13'>
            Unable to display file
          </h3>
          <p className='mt-2 max-w-sm text-sm leading-relaxed text-gray-10'>
            We couldn't generate a preview for this document. Please try
            downloading the file directly or refresh the page.
          </p>
        </div>
      )}
    </div>
  )
}

export default FileSheet
