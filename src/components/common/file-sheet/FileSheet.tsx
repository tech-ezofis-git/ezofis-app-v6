import React, { useMemo, useState } from 'react'
import Modal from '@/components/base/Modal'
// import IconButton from '@/components/base/button/IconButton'
// import IconSpinner from '@/components/base/icon/IconSpinner'
import Icon from '@/components/base/icon/Icon'
import { AnimatePresence, motion } from 'motion/react'
// import { domain } from 'node_modules/zod/v4/core/regexes.d.cts'

type FileLike = {
    id: string | number
    name: string
    repositoryId?: string | number
    initiate?: boolean
}

type Props = {
    opened: boolean
    onClose: () => void

    file: FileLike | null

    // Context used by the viewer URLs
    tenantId: string | number
    userId: string | number

    // Optional (but supported by your Vue viewer query)
    workflowId?: string | number
    processId?: string | number

    // If your env key differs, pass it explicitly
    apiBaseUrl?: string

    // Viewer options
    type?: 1 | 2 // Vue uses type=2 for repository files
    actions?: string // Vue uses "&action=all" sometimes
}

const DEFAULT_TYPE: 1 | 2 = 2

const getExt = (name?: string) =>
    (name?.split('.').pop() || '').toLowerCase()

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

function resolveApiBaseUrl(explicit?: string) {
    // try the usual suspects used in React/Vite/CRA
    const v =
        explicit ||
        import.meta.env?.VITE_BASE_URL || process.env.REACT_APP_API_URLfallback
    return String(v || '').replace(/\/$/, '')
}

/**
 * This function is the “port” of the Vue fileLink()/itemLink() viewer routing:
 * - chooses docsviewer or pdfviewer for certain origins and ext rules
 * - otherwise falls back to direct API /file/view
 */
function buildPreviewUrl(args: {
    apiBaseUrl: string
    file: FileLike
    tenantId: string | number
    userId: string | number
    workflowId?: string | number
    processId?: string | number
    type: 1 | 2
    actions?: string
}) {

    const {
        apiBaseUrl,
        file,
        tenantId,
        userId,
        workflowId,
        processId,
        type,
        actions,
    } = args

    const originRaw = window.location.origin
    const origin = originRaw.replace(
        'http://localhost:3000',
        'https://trial.ezofis.com',
    )

    console.log(origin)

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
    } else if (origin === 'https://trial.ezofis.com' ||
        origin === 'https://eztrialapp.azurewebsites.net' ||
        origin === 'https://app.ezofis.com' ||
        origin === 'http://192.168.110.126' ||
        origin === 'https://gdms.gfiuae.cloud' ||
        origin === 'https://dfms.m2p.app' ||
        origin === 'http://52.172.32.88') {
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
    console.log(`${domainURL}?tId=${tenantId}&uId=${userId}&rId=${repositoryId}&itemId=${file.id}&wId=${wId}&pId=${pId}&type=${2}&filename=${encodeURIComponent(
        file.name,
    )}${actionSuffix}`, "this is file url")
    // This matches your Vue query style:
    // viewer.html? tId/uId/rId/itemId/wId/pId/type/filename + optional action
    return `${domainURL}?tId=${tenantId}&uId=${userId}&rId=${repositoryId}&itemId=${file.id}&wId=${wId}&pId=${pId}&type=${2}&filename=${encodeURIComponent(
        file.name,
    )}${actionSuffix}`
}

const FileSheet: React.FC<Props> = ({
    opened,
    onClose,
    file,
    tenantId,
    userId,
    workflowId,
    processId,
    apiBaseUrl,
    type = DEFAULT_TYPE,
    actions = '&action=all',
}) => {
    const [isLoading, setIsLoading] = useState(true)
    const baseUrl = useMemo(() => resolveApiBaseUrl(apiBaseUrl), [apiBaseUrl])

    const src = useMemo(() => {
        if (!file) return ''
        if (!baseUrl) return ''

        return buildPreviewUrl({
            apiBaseUrl: baseUrl,
            file,
            tenantId,
            userId,
            workflowId,
            processId,
            type,
            actions,
        })
    }, [file, baseUrl, tenantId, userId, workflowId, processId, type, actions])

    // Reset loading state when modal opens or src changes
    React.useEffect(() => {
        if (opened && src) {
            setIsLoading(true)
        }
    }, [opened, src])

    const handleIframeLoad = () => {
        setIsLoading(false)
    }

    if (!file) return null
    // alert("file name" + file.name + "domain" + src)
    return (
        <Modal opened={opened} onClose={onClose} fullScreen>
            {/* Header: Clean, Light, and Airy */}
            <div className="flex items-center justify-between px-2 py-2 bg-white border-b border-gray-3">
                <div className="flex items-center gap-4 min-w-0">
                    {/* Soft Primary Icon Wrapper */}
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-2 text-primary-9 ring-1 ring-primary-4">
                        <Icon name="tabler:file-search" className="size-6" />
                    </div>

                    <div className="min-w-0">
                        <h3 className="text-base font-bold text-gray-12 truncate leading-tight">
                            {file.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="flex h-1.5 w-1.5 rounded-full bg-green-9 animate-pulse" />
                            <p className="text-[11px] font-bold text-gray-10 uppercase tracking-wider">
                                Live Document Preview
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Close Button - Clean Ghost Style */}
                    <button
                        onClick={onClose}
                        className="group cursor-pointer flex items-center gap-2 rounded-xl bg-gray-2 px-4 py-2 text-sm font-bold text-gray-11 transition-all hover:bg-red-2 hover:text-red-11 active:scale-95"
                    >
                        {/* <span>Close</span> */}
                        <Icon name="tabler:x" className="size-5 transition-transform group-hover:rotate-90" />
                    </button>
                </div>
            </div>

            {/* Body Area */}
            <div className="relative w-full overflow-hidden bg-gray-1" style={{ height: 'calc(100vh - 77px)' }}>
                {src ? (
                    <>
                        {/* Modern Light Loading State */}
                        <AnimatePresence>
                            {isLoading && (
                                <motion.div
                                    initial={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 z-20 flex items-center justify-center bg-white/90 backdrop-blur-md"
                                >
                                    <div className="flex flex-col items-center">
                                        <div className="relative flex size-24 items-center justify-center">
                                            {/* Rotating Outer Rings using Primary scale */}
                                            <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-primary-9 border-r-primary-5" />
                                            <div className="absolute inset-2 animate-[spin_2s_linear_infinite] rounded-full border-[2px] border-transparent border-t-secondary-8 border-l-secondary-4" />

                                            {/* Centered Brand Icon */}
                                            <div className="rounded-2xl bg-primary-1 p-3 shadow-sm">
                                                <Icon name="tabler:loader-3" className="size-8 animate-pulse text-primary-9" />
                                            </div>
                                        </div>
                                        <h4 className="mt-8 text-sm font-bold tracking-tight text-gray-12">
                                            Fetching Document Data
                                        </h4>
                                        <p className="mt-1 text-xs font-medium text-gray-9">This will only take a moment</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <iframe
                            title="file-preview"
                            src={src}
                            className="w-full h-full border-none shadow-inner"
                            allowFullScreen
                            onLoad={handleIframeLoad}
                        />
                    </>
                ) : (
                    /* Redesigned Light Error State */
                    <div className="flex h-full flex-col items-center justify-center text-center p-6">
                        <div className="mb-6 rounded-3xl bg-red-2 p-5 text-red-9 ring-1 ring-red-4 shadow-sm">
                            <Icon name="tabler:file-off" className="size-12" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-13">Unable to display file</h3>
                        <p className="mt-2 max-w-sm text-sm text-gray-10 leading-relaxed">
                            We couldn't generate a preview for this document. Please try downloading the file directly or refresh the page.
                        </p>
                    </div>
                )}
            </div>
        </Modal>
    )
}

FileSheet.displayName = 'FileSheet'
export default FileSheet