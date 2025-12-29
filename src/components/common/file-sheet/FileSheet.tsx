import React, { useMemo, useState } from 'react'
import Modal from '@/components/base/Modal'
import IconButton from '@/components/base/button/IconButton'
import IconSpinner from '@/components/base/icon/IconSpinner'
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
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate">{file.name}</div>

                </div>

                <IconButton
                    color="gray"
                    icon="tabler:x"
                    variant="ghost"
                    onClick={onClose}
                />
            </div>

            <div className="relative w-full" style={{ height: 'calc(100vh - 57px)' }}>
                {src ? (
                    <>
                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                                <div className="flex flex-col items-center gap-3">
                                    <div style={{ animationDuration: '1.5s' }}>
                                        <IconSpinner className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <span className="text-sm text-gray-500 animate-pulse">
                                        Loading File
                                    </span>
                                </div>
                            </div>
                        )}
                        <iframe
                            title="file-preview"
                            src={src}
                            className="w-full h-full"
                            allowFullScreen
                            onLoad={handleIframeLoad}
                        />
                    </>
                ) : (
                    <div className="p-6 text-sm text-gray-600">
                        Preview URL could not be resolved (missing apiBaseUrl or file).
                    </div>
                )}
            </div>
        </Modal>
    )
}

FileSheet.displayName = 'FileSheet'
export default FileSheet
