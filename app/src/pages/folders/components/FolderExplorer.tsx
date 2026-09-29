import { useLingui } from '@lingui/react/macro'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SettingsBreadcrumbItem } from '@/pages/settings/helpers/settingsBreadcrumbs'
import uploadAndIndexApi, {
  type IndexStageFileRequest,
} from '@/api/v6/uploadAndIndex'
import showToast from '@/components/base/toast/showToast'
import useAskAiActionStore from '@/components/common/ask-ai/stores/useAskAiActionStore'
import { isDemoAppOrigin } from '@/utils/origin'
import type { AppView, FileItem } from '../types/folderTypes'
import { encodeRepositoryNodeId, folderApi } from '../api/folderApi'
import { useHasDocumentApprovalWorkflow } from '../hooks/useDocumentApprovalWorkflow'
import { useFolderExplorer } from '../hooks/useFolderExplorer'
import useFolderSecurityPermissions from '../hooks/useFolderSecurityPermissions'
import useFoldersTopbar from '../hooks/useFoldersTopbar'
import {
  RESET_FOLDER_VIEW_EVENT,
  markFolderExplorerAskAiQuery,
} from '../utils/folderExplorerSession'
import {
  findRepositoryNodeId,
  getRepositoryRootNodeId,
} from '../utils/folderExplorerUtils'
import { getRepositoryFieldRawValue } from '../utils/repositoryFieldUtils'
import { AiSummaryView } from './AiSummaryView'
import { DocumentDetailsView } from './DocumentDetailsView'
import { DocumentsListView } from './DocumentsListView'
import { EditMetadataView } from './EditMetadataView'
import { ExplorerToolbar } from './ExplorerToolbar'
import FolderTable from './FolderTable'
import IntelligentUploadView from './IntelligentUpload/IntelligentUploadView'
import { StartWorkflowView } from './StartWorkflowView'
import { TreeSidebar } from './TreeSidebar'
import Upload from './Upload/Upload'

export function FolderExplorer() {
  const { i18n, t } = useLingui()
  const hasDocumentApprovalWorkflow = useHasDocumentApprovalWorkflow()
  const {
    activeFolder,
    appView,
    beginFilterDefer,
    breadcrumbs,
    changePageSize,
    changeServerPage,
    changeViewMode,
    commitFilterDefer,
    currentFolderGroupField,
    error,
    expandedIds,
    fileColumns,
    fileFilters,
    filePage,
    files,
    fileSearch,
    filterOptionsCache,
    folderContextFilters,
    folderFilterOptionSource,
    folderFilters,
    folderHasMore,
    folderPage,
    folders,
    folderSearch,
    itemFilterFields,
    loading,
    loadingFolders,
    loadingPage,
    loadMoreFolders,
    openFile,
    openFileAction,
    openFolder,
    refreshData,
    refreshing,
    repositoryNodes,
    selectedFile,
    selectedRepository,
    selectFolder,
    toggleFolder,
    tree,
    viewMode,
    getRepositoryIdFromFolder,
    getSelectedFileRow,
    setAppView,
    setFileFilters,
    setFileSearch,
    setFolderFilters,
    setFolderSearch,
  } = useFolderExplorer()

  const isBusy = loading || loadingPage || refreshing
  const navigate = useNavigate()
  const deepLinkSearch: any = useSearch({ strict: false })
  const applyingDeepLinkRef = useRef<string | null>(null)

  const pendingAskAiAction = useAskAiActionStore((state) => state.pending)
  const setPageContext = useAskAiActionStore((state) => state.setPageContext)
  const clearPending = useAskAiActionStore((state) => state.clearPending)
  const applyingAskAiRef = useRef(false)
  const [pendingUploadFiles, setPendingUploadFiles] = useState<File[]>([])
  const [pendingStagedFileId, setPendingStagedFileId] = useState<
    string | undefined
  >(undefined)
  const [pendingOpenShare, setPendingOpenShare] = useState(false)
  const [detailsDocument, setDetailsDocument] = useState<{
    id: string
    repositoryId: string
  } | null>(null)
  const folderBeforeUploadRef = useRef('')

  const resolveUploadReturnFolder = useCallback(
    (folderId: string) => {
      if (!folderId) return ''
      // List view repository dropdown only matches repository root nodes.
      if (viewMode === 'list') {
        return getRepositoryRootNodeId(folderId, tree) || folderId
      }
      return folderId
    },
    [tree, viewMode],
  )

  const exitUpload = useCallback(() => {
    const sourceFolder = folderBeforeUploadRef.current || activeFolder
    const folderToSelect = resolveUploadReturnFolder(sourceFolder)

    setPendingUploadFiles([])
    setPendingStagedFileId(undefined)

    if (folderToSelect) selectFolder(folderToSelect)
    else setAppView('explorer')
  }, [activeFolder, resolveUploadReturnFolder, selectFolder, setAppView])

  const openShareForFile = useCallback(
    (fileId: string) => {
      setPendingOpenShare(true)
      setDetailsDocument(null)
      openFileAction(fileId, 'details')
    },
    [openFileAction],
  )

  const handleFileAction = useCallback(
    (fileId: string, targetView: AppView) => {
      const trimmedId = String(fileId || '').trim()
      if (!trimmedId) return
      if (
        trimmedId.startsWith('staged-') ||
        files.some((f) => f.id === trimmedId && (f.isStaged || f.stageFileId))
      ) {
        folderBeforeUploadRef.current = activeFolder
        setPendingUploadFiles([])
        setPendingStagedFileId(
          trimmedId.startsWith('staged-') ? trimmedId : `staged-${trimmedId}`,
        )
        setAppView('Upload')
        return
      }
      openFileAction(trimmedId, targetView)
    },
    [activeFolder, files, openFileAction, setAppView],
  )

  /** Prefer an explicit repositoryId (Ask AI / deep-link) so workspace fetch
   *  does not depend on activeFolder having finished switching. */
  const openDetailsFile = useCallback(
    (fileId: string, repositoryId?: string) => {
      const trimmedId = String(fileId || '').trim()
      if (!trimmedId) return
      if (
        trimmedId.startsWith('staged-') ||
        files.some((f) => f.id === trimmedId && (f.isStaged || f.stageFileId))
      ) {
        folderBeforeUploadRef.current = activeFolder
        setPendingUploadFiles([])
        setPendingStagedFileId(
          trimmedId.startsWith('staged-') ? trimmedId : `staged-${trimmedId}`,
        )
        setAppView('Upload')
        return
      }
      const trimmedRepo = String(repositoryId || '').trim()
      if (trimmedRepo) {
        setDetailsDocument({ id: trimmedId, repositoryId: trimmedRepo })
      } else {
        setDetailsDocument(null)
      }
      openFile(trimmedId)
    },
    [activeFolder, files, openFile, setAppView],
  )

  const resolvedRepositoryId = String(
    selectedRepository?.id || getRepositoryIdFromFolder(activeFolder) || '',
  )
  const currentRepositoryId = resolvedRepositoryId

  const handleDeleteStagedFile = useCallback(
    async (file: FileItem) => {
      const fileId = String(file.stageFileId || file.id || '')
        .replace(/^staged-/, '')
        .trim()
      const repositoryId = String(
        file.repositoryId || resolvedRepositoryId || '',
      ).trim()
      if (!fileId || !repositoryId) {
        showToast({
          message: t`Couldn't delete this staged file.`,
          variant: 'error',
        })
        throw new Error('missing staged file id')
      }

      const { error } = await uploadAndIndexApi.deleteStagedFiles({
        fileIds: [fileId],
        repositoryId,
      })
      if (error) {
        showToast({
          message: String(error),
          variant: 'error',
        })
        throw new Error(error)
      }

      showToast({
        message: t`Staged file deleted.`,
        variant: 'success',
      })
      await refreshData()
    },
    [refreshData, resolvedRepositoryId, t],
  )

  const handleDeleteStagedFiles = useCallback(
    async (filesToDelete: FileItem[]) => {
      const fileIds = filesToDelete
        .map((file) =>
          String(file.stageFileId || file.id || '')
            .replace(/^staged-/, '')
            .trim(),
        )
        .filter(Boolean)

      const repositoryId = String(
        filesToDelete[0]?.repositoryId || resolvedRepositoryId || '',
      ).trim()

      if (!fileIds.length || !repositoryId) {
        showToast({
          message: t`Couldn't delete selected staged files.`,
          variant: 'error',
        })
        throw new Error('missing staged file id or repository id')
      }

      const { error } = await uploadAndIndexApi.deleteStagedFiles({
        fileIds,
        repositoryId,
      })
      if (error) {
        showToast({
          message: String(error),
          variant: 'error',
        })
        throw new Error(error)
      }

      showToast({
        message:
          fileIds.length === 1
            ? t`Staged file deleted.`
            : t`${fileIds.length} staged files deleted.`,
        variant: 'success',
      })
      await refreshData()
    },
    [refreshData, resolvedRepositoryId, t],
  )

  const buildStageFileIndexPayload = useCallback(
    (file: FileItem): IndexStageFileRequest => {
      const fields = fileColumns.map((col) => {
        let rawVal = getRepositoryFieldRawValue(
          file,
          col.key,
          folderContextFilters,
        )
        if (rawVal === undefined && col.label) {
          rawVal = getRepositoryFieldRawValue(
            file,
            col.label,
            folderContextFilters,
          )
        }
        if (rawVal === undefined && col.fieldId) {
          rawVal = getRepositoryFieldRawValue(
            file,
            col.fieldId,
            folderContextFilters,
          )
        }

        const strVal =
          rawVal === undefined || rawVal === null
            ? ''
            : typeof rawVal === 'object'
              ? JSON.stringify(rawVal)
              : String(rawVal)

        return {
          name: col.label || col.key,
          type: String(col.dataType || 'text').trim() || 'text',
          value: strVal,
        }
      })

      return {
        fields,
        itemId: null,
        ocrResult: null,
        repositoryId: String(file.repositoryId || resolvedRepositoryId || ''),
        status: 'Indexing',
      }
    },
    [fileColumns, folderContextFilters, resolvedRepositoryId],
  )

  const handleExportStagedFile = useCallback(
    async (file: FileItem) => {
      const stageId = String(file.stageFileId || file.id || '')
        .replace(/^staged-/, '')
        .trim()

      if (!stageId) {
        showToast({
          message: t`Couldn't export this staged file. Missing ID.`,
          variant: 'error',
        })
        throw new Error('missing staged file id')
      }

      const payload = buildStageFileIndexPayload(file)
      const { error } = await uploadAndIndexApi.indexStageFile(stageId, payload)

      if (error) {
        showToast({
          message: String(error),
          variant: 'error',
        })
        throw new Error(error)
      }

      showToast({
        message: t`Staged file exported successfully.`,
        variant: 'success',
      })
      await refreshData()
    },
    [buildStageFileIndexPayload, refreshData, t],
  )

  const handleExportStagedFiles = useCallback(
    async (filesToExport: FileItem[]) => {
      if (!filesToExport.length) return

      let successCount = 0
      let lastError = ''

      for (const file of filesToExport) {
        const stageId = String(file.stageFileId || file.id || '')
          .replace(/^staged-/, '')
          .trim()
        if (!stageId) continue

        const payload = buildStageFileIndexPayload(file)
        const { error } = await uploadAndIndexApi.indexStageFile(
          stageId,
          payload,
        )

        if (error) {
          lastError = String(error)
        } else {
          successCount++
        }
      }

      if (successCount > 0) {
        showToast({
          message:
            successCount === 1
              ? t`Staged file exported successfully.`
              : t`${successCount} staged files exported successfully.`,
          variant: 'success',
        })
        await refreshData()
      } else if (lastError) {
        showToast({
          message: lastError,
          variant: 'error',
        })
        throw new Error(lastError)
      }
    },
    [buildStageFileIndexPayload, refreshData, t],
  )

  const handleDeleteArchivedFile = useCallback(
    async (fileId: string) => {
      const targetId = String(fileId || '').trim()
      const file = files.find((f) => f.id === targetId)
      const repositoryId = String(
        file?.repositoryId || resolvedRepositoryId || '',
      ).trim()

      if (!targetId || !repositoryId) {
        showToast({
          message: t`Couldn't delete this document. Missing document or repository ID.`,
          variant: 'error',
        })
        throw new Error('missing file id or repository id')
      }

      const { error } = await folderApi.deleteRepositoryItem({
        itemId: targetId,
        repositoryId,
      })

      if (error) {
        showToast({
          message: String(error),
          variant: 'error',
        })
        throw new Error(error)
      }

      showToast({
        message: t`Document deleted successfully.`,
        variant: 'success',
      })
      await refreshData()
    },
    [files, refreshData, resolvedRepositoryId, t],
  )

  const selectRepositoryById = useCallback(
    (repositoryId: string, label = 'Repository') => {
      const repoId = String(repositoryId || '').trim()
      if (!repoId) return false
      if (currentRepositoryId.toLowerCase() === repoId.toLowerCase()) {
        return false
      }
      const nodeId =
        findRepositoryNodeId(tree, repoId) ||
        encodeRepositoryNodeId({
          kind: 'repository',
          label,
          repositoryId: repoId,
        })
      // selectFolder bypasses openFolder's loading guard.
      selectFolder(nodeId)
      return true
    },
    [currentRepositoryId, selectFolder, tree],
  )

  // Deep-link: /folders?repositoryId&itemId (Global Search + Ask AI).
  useEffect(() => {
    const { folderId, itemId, repositoryId } = deepLinkSearch || {}
    const repoId = String(repositoryId || '').trim()
    const openItemId = String(itemId || '').trim()
    const folderKey = String(folderId || '').trim()
    const deepLinkKey = `${repoId}|${openItemId}|${folderKey}`

    if (!repoId && !folderKey) {
      applyingDeepLinkRef.current = null
      return
    }
    if (tree.length === 0) return
    if (applyingDeepLinkRef.current === deepLinkKey) return

    applyingDeepLinkRef.current = deepLinkKey

    const nodeId =
      folderKey ||
      findRepositoryNodeId(tree, repoId) ||
      (repoId
        ? encodeRepositoryNodeId({
            kind: 'repository',
            label: 'Repository',
            repositoryId: repoId,
          })
        : '')

    if (nodeId && nodeId !== activeFolder) {
      selectFolder(nodeId)
    }

    if (openItemId) {
      openDetailsFile(openItemId, repoId || undefined)
    }

    if (!globalThis.location?.pathname?.startsWith('/embed')) {
      void navigate({ replace: true, search: {}, to: '/folders' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkSearch, tree.length])

  const { permissions: folderPermissions } = useFolderSecurityPermissions(
    resolvedRepositoryId,
    activeFolder,
  )
  const canUpload = Boolean(
    activeFolder && resolvedRepositoryId && folderPermissions.upload,
  )
  const canIntelligentUpload = Boolean(!isDemoAppOrigin())

  useEffect(() => {
    if (appView === 'Upload' && !folderPermissions.upload) {
      exitUpload()
    }
    if (appView === 'editMetadata' && !folderPermissions.editMetadata) {
      setAppView(selectedFile ? 'details' : 'explorer')
    }
    if (appView === 'workflow' && !selectedFile) {
      setAppView('explorer')
    }
  }, [
    appView,
    exitUpload,
    folderPermissions.editMetadata,
    folderPermissions.upload,
    selectedFile,
    setAppView,
  ])

  useEffect(() => {
    const handleReset = () => {
      setAppView('explorer')
    }
    window.addEventListener(RESET_FOLDER_VIEW_EVENT, handleReset)
    return () => {
      window.removeEventListener(RESET_FOLDER_VIEW_EVENT, handleReset)
    }
  }, [setAppView])

  useEffect(() => {
    setPageContext({
      actionFrom: 'Repository',
      specificId: currentRepositoryId,
    })
    return () => {
      const latest = useAskAiActionStore.getState().pageContext
      if (latest?.actionFrom === 'Repository') {
        useAskAiActionStore.getState().clearContext()
      }
    }
  }, [currentRepositoryId, setPageContext])

  // Ask AI / Global Search pending: switch repo, apply search/filters, open file.
  useEffect(() => {
    if (!pendingAskAiAction || pendingAskAiAction.target !== 'Repository') {
      applyingAskAiRef.current = false
      return
    }
    if (applyingAskAiRef.current) return
    if (tree.length === 0) return
    // Wait for folder content settle after a repo switch, otherwise search/filter
    // writes get wiped by the activeFolder effect.
    if (loading || loadingPage) return

    applyingAskAiRef.current = true

    const repoId = String(pendingAskAiAction.repositoryId || '').trim()
    const legacyMetaKeys = new Set([
      'repo',
      'repository',
      'repositoryid',
      'repositoryname',
      'workspace',
      'workspaceid',
    ])
    let fileSearch = pendingAskAiAction.fileSearch?.trim() || ''
    const filters = Object.fromEntries(
      Object.entries(pendingAskAiAction.filters || {}).flatMap(
        ([key, value]) => {
          const normalized = key.toLowerCase().replace(/[\s_-]/g, '')
          if (normalized === 'search') {
            if (!fileSearch) {
              fileSearch = String(value || '').trim()
            }
            return []
          }
          if (legacyMetaKeys.has(normalized)) return []
          return [[key, value]]
        },
      ),
    )

    if (viewMode !== 'list') {
      changeViewMode('list')
      applyingAskAiRef.current = false
      return
    }

    if (
      selectRepositoryById(
        repoId,
        pendingAskAiAction.repositoryLabel || 'Repository',
      )
    ) {
      applyingAskAiRef.current = false
      return
    }

    const fromAskAi = Boolean(pendingAskAiAction.ephemeral)
    if (fromAskAi) {
      markFolderExplorerAskAiQuery()
    }
    setFileFilters(filters, { fromAskAi })
    setFileSearch(fileSearch, { fromAskAi })
    setFolderSearch(fileSearch, { fromAskAi })

    const openItemId = pendingAskAiAction.openItemId?.trim() || ''
    if (openItemId) {
      openDetailsFile(openItemId, repoId || undefined)
    }

    clearPending()
    applyingAskAiRef.current = false
  }, [
    changeViewMode,
    clearPending,
    loading,
    loadingPage,
    openDetailsFile,
    pendingAskAiAction,
    selectRepositoryById,
    setFileFilters,
    setFileSearch,
    setFolderSearch,
    tree.length,
    viewMode,
  ])

  const handleBreadcrumbNavigate = useCallback(
    (key: string) => {
      if (appView === 'Upload') {
        setPendingUploadFiles([])
      }

      if (key === 'folders-root') {
        if (appView === 'Upload') {
          selectFolder('')
          setAppView('explorer')
        } else {
          void openFolder('')
        }
        return
      }

      if (appView === 'Upload') selectFolder(key)
      else void openFolder(key)
    },
    [appView, openFolder, selectFolder, setAppView, tree],
  )

  const foldersTopbar = useMemo(() => {
    const pathItems = breadcrumbs.map((item) => ({
      key: item.id,
      label: item.label,
    }))

    const items: SettingsBreadcrumbItem[] = [
      {
        key: 'folders-root',
        label: t`Folders`,
      },
      ...pathItems,
    ]

    if (appView === 'Upload') {
      items.push({ label: t`Upload` })
    }
    if (appView === 'intelligentUpload') {
      items.push({ label: t`Intelligent Upload & Classify` })
    }

    return {
      items,
      onNavigate: handleBreadcrumbNavigate,
    }
  }, [appView, breadcrumbs, handleBreadcrumbNavigate, i18n.locale, t])

  useFoldersTopbar(foldersTopbar)

  const handleShareFilter = useCallback(
    async (shares: any[], message: string) => {
      if (!resolvedRepositoryId) return false
      try {
        let successCount = 0
        for (const share of shares) {
          const result = await folderApi.shareFilter({
            action: share.action,
            email: share.email,
            filters: { ...fileFilters, ...folderContextFilters },
            message,
            repositoryId: resolvedRepositoryId,
          })
          if (!result.error) successCount++
        }
        return successCount === shares.length
      } catch (err) {
        console.error(err)
        return false
      }
    },
    [fileFilters, folderContextFilters, resolvedRepositoryId],
  )

  const handleIntelligentUpload = () => {
    if (isDemoAppOrigin()) return
    if (!resolvedRepositoryId) {
      showToast({
        message: t`Select a folder before uploading.`,
        variant: 'error',
      })
      return
    }
    setAppView('intelligentUpload')
  }

  const handleUpload = () => {
    if (!resolvedRepositoryId) {
      showToast({
        message: t`Select a repository before uploading.`,
        variant: 'error',
      })
      return
    }
    folderBeforeUploadRef.current = activeFolder
    setPendingUploadFiles([])
    setPendingStagedFileId(undefined)
    setAppView('Upload')
  }

  const handleUploadFiles = (files: File[]) => {
    if (!resolvedRepositoryId) {
      showToast({
        message: t`Select a repository before uploading.`,
        variant: 'error',
      })
      return
    }
    folderBeforeUploadRef.current = activeFolder
    setPendingUploadFiles(files)
    setAppView('Upload')
  }

  const handleRefresh = async () => {
    if (isBusy) return

    /**
     * refreshData should set refreshing=true inside useFolderExplorer.
     * Example inside hook:
     *
     * const refreshData = async () => {
     *   try {
     *     setRefreshing(true)
     *     await loadFolderData({ reset: true })
     *   } finally {
     *     setRefreshing(false)
     *   }
     * }
     */
    await refreshData()
  }

  if (appView === 'details') {
    const detailsId = detailsDocument?.id || selectedFile
    const detailsRepositoryId =
      detailsDocument?.repositoryId ||
      String(
        getRepositoryIdFromFolder(activeFolder) || selectedRepository?.id || '',
      )

    return (
      <DocumentDetailsView
        autoOpenShare={pendingOpenShare}
        id={detailsId}
        permissions={folderPermissions}
        repositoryId={detailsRepositoryId}
        onAiSummary={() => setAppView('aiSummary')}
        onBack={() => {
          setPendingOpenShare(false)
          setDetailsDocument(null)
          setAppView('explorer')
        }}
        onEdit={
          folderPermissions.editMetadata
            ? () => setAppView('editMetadata')
            : undefined
        }
        onOpenRelatedDocument={({
          id: relatedId,
          repositoryId: relatedRepoId,
        }) => {
          setPendingOpenShare(false)
          setDetailsDocument({
            id: relatedId,
            repositoryId: relatedRepoId,
          })
          openFileAction(relatedId, 'details')
        }}
        onShareOpened={() => setPendingOpenShare(false)}
        onWorkflow={
          hasDocumentApprovalWorkflow
            ? () => setAppView('workflow')
            : undefined
        }
      />
    )
  }

  if (appView === 'editMetadata') {
    return (
      <EditMetadataView
        fileColumns={fileColumns}
        fileData={getSelectedFileRow(selectedFile)}
        onBack={() => setAppView(selectedFile ? 'details' : 'explorer')}
        onSave={(values) => {
          console.log('save metadata', {
            itemId: selectedFile,
            repositoryId: getRepositoryIdFromFolder(activeFolder),
            values,
          })
        }}
      />
    )
  }

  if (appView === 'Upload') {
    return (
      <Upload
        folderId={activeFolder}
        initialFiles={pendingUploadFiles}
        initialStagedFileId={pendingStagedFileId}
        repositoryData={selectedRepository}
        repositoryId={resolvedRepositoryId || null}
        onBack={exitUpload}
        onSuccess={refreshData}
      />
    )
  }

  if (appView === 'intelligentUpload') {
    if (isDemoAppOrigin()) {
      setAppView('explorer')
      return null
    }

    const candidateRepos = repositoryNodes.map((node) => ({
      id: String(getRepositoryIdFromFolder(node.id) || node.id),
      name: node.title,
    }))

    return (
      <IntelligentUploadView
        candidateRepositories={candidateRepos}
        repositoryId={resolvedRepositoryId || null}
        onBack={() => setAppView('explorer')}
        onDone={async (targetRepositoryId?: string) => {
          console.log(
            '[FolderExplorer] onDone triggered with targetRepositoryId:',
            targetRepositoryId,
          )
          if (targetRepositoryId) {
            const targetNodeId =
              findRepositoryNodeId(tree, targetRepositoryId) ||
              encodeRepositoryNodeId({
                kind: 'repository',
                label: 'Repository',
                repositoryId: targetRepositoryId,
              })
            console.log(
              '[FolderExplorer] Resolved targetNodeId in tree for selectFolder:',
              targetNodeId,
            )
            selectFolder(targetNodeId)
          } else {
            console.log(
              '[FolderExplorer] Navigating back to main explorer view',
            )
            setAppView('explorer')
            await refreshData()
          }
        }}
      />
    )
  }

  if (appView === 'aiSummary') {
    console.log(
      'appView === aiSummary',
      selectedFile,
      getSelectedFileRow(selectedFile),
    )
    const currentFileName = getSelectedFileRow(selectedFile)?.fileName
    return (
      <AiSummaryView
        currentFileName={currentFileName}
        itemId={selectedFile}
        repositoryId={String(
          selectedRepository?.id ||
            getRepositoryIdFromFolder(activeFolder) ||
            '',
        )}
        onBack={() => setAppView(selectedFile ? 'details' : 'explorer')}
      />
    )
  }

  if (appView === 'workflow') {
    if (!selectedFile) {
      setAppView('explorer')
      return null
    }
    const resolvedRepoId = String(
      getRepositoryIdFromFolder(activeFolder) ||
        selectedRepository?.id ||
        files.find((f) => f.id === selectedFile)?.repositoryId ||
        '',
    )
    return (
      <StartWorkflowView
        id={selectedFile}
        repositoryId={resolvedRepoId}
        onBack={() => setAppView(selectedFile ? 'details' : 'explorer')}
      />
    )
  }

  const displayFolders = activeFolder
    ? folders
    : (repositoryNodes.map((node) => ({
        createdByName: node.createdByName || '-',
        iconKey: node.iconKey || 'folder',
        id: node.id,
        itemsText: node.fileCount !== undefined ? String(node.fileCount) : '-',
        modifiedText: node.createdAtUtc || '-',
        title: node.title,
      })) as any[])

  const displayFiles = activeFolder ? files : []

  if (viewMode === 'list') {
    return (
      <div className='flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-surface-secondary text-sm text-gray-11'>
        <DocumentsListView
          activeRepositoryId={activeFolder}
          breadcrumbs={breadcrumbs}
          currentFolderGroupField={currentFolderGroupField}
          error={error}
          fileColumns={fileColumns}
          fileFilters={fileFilters}
          filePage={filePage}
          files={displayFiles}
          filterOptionsCache={filterOptionsCache}
          folderContextFilters={folderContextFilters}
          folderFilterOptionSource={folderFilterOptionSource}
          folders={displayFolders}
          itemFilterFields={itemFilterFields}
          loading={loading}
          loadingPage={loadingPage}
          permissions={folderPermissions}
          refreshing={refreshing}
          repositories={repositoryNodes}
          repositoryId={resolvedRepositoryId}
          searchQuery={fileSearch}
          uploadDisabled={!canUpload}
          view={viewMode}
          setView={changeViewMode}
          onAiSummary={(id) => handleFileAction(id, 'aiSummary')}
          onBreadcrumbSelect={openFolder}
          onDeleteFile={handleDeleteArchivedFile}
          onDeleteStagedFile={handleDeleteStagedFile}
          onDeleteStagedFiles={handleDeleteStagedFiles}
          onEdit={
            folderPermissions.editMetadata
              ? (id) => handleFileAction(id, 'editMetadata')
              : undefined
          }
          onExportStagedFile={handleExportStagedFile}
          onExportStagedFiles={handleExportStagedFiles}
          onFilterMenuOpenChange={(id) => {
            if (id) beginFilterDefer()
            else commitFilterDefer()
          }}
          onFiltersChange={(filters) => {
            setFileFilters(filters, { manual: true })
            setFolderFilters(filters, { manual: true })
          }}
          onIntelligentUpload={
            canIntelligentUpload ? handleIntelligentUpload : undefined
          }
          onOpenFile={openDetailsFile}
          onPageChange={changeServerPage}
          onPageSizeChange={changePageSize}
          onRefresh={handleRefresh}
          onRepositoryChange={openFolder}
          onSearchChange={(value) => {
            setFileSearch(value, { manual: true })
            setFolderSearch(value, { manual: true })
          }}
          onShare={openShareForFile}
          onShareFilter={handleShareFilter}
          onUpload={canUpload ? handleUpload : undefined}
          onUploadFile={canUpload ? handleUploadFiles : undefined}
          onWorkflow={
            hasDocumentApprovalWorkflow
              ? (id) => openFileAction(id, 'workflow')
              : undefined
          }
        />
      </div>
    )
  }

  return (
    <div className='flex h-full min-h-0 flex-col bg-surface-secondary text-sm text-gray-11'>
      <ExplorerToolbar
        currentFolderGroupField={currentFolderGroupField}
        disabled={isBusy}
        fileColumns={fileColumns}
        fileFilters={fileFilters}
        files={files}
        fileSearch={fileSearch}
        filterOptionsCache={filterOptionsCache}
        folderContextFilters={folderContextFilters}
        folderFilterOptionSource={folderFilterOptionSource}
        folderFilters={folderFilters}
        folders={displayFolders}
        folderSearch={folderSearch}
        itemFilterFields={itemFilterFields}
        loading={loading}
        loadingFolders={loadingFolders}
        loadingPage={loadingPage}
        refreshing={refreshing}
        repositoryId={resolvedRepositoryId}
        view={viewMode}
        setView={changeViewMode}
        onFileFiltersChange={(filters) => {
          setFileFilters(filters, { manual: true })
        }}
        onFileSearchChange={(value) => {
          setFileSearch(value, { manual: true })
        }}
        onFilterMenuOpenChange={(id) => {
          if (id) beginFilterDefer()
          else commitFilterDefer()
        }}
        onFolderFiltersChange={(filters) => {
          setFolderFilters(filters, { manual: true })
        }}
        onFolderSearchChange={(value) => {
          setFolderSearch(value, { manual: true })
        }}
        onIntelligentUpload={
          canIntelligentUpload ? handleIntelligentUpload : undefined
        }
        onRefresh={handleRefresh}
        onShare={handleShareFilter}
        onUpload={canUpload ? handleUpload : undefined}
      />

      <div className='flex min-h-0 flex-1 overflow-hidden'>
        <TreeSidebar
          activeId={activeFolder}
          expandedIds={expandedIds}
          tree={tree}
          onSelect={openFolder}
          onToggle={toggleFolder}
        />

        <main className='flex min-w-0 flex-1 flex-col overflow-hidden bg-surface-secondary'>
          <div className='ez-scrollbar min-h-0 flex-1 overflow-y-auto'>
            <FolderTable
              fileColumns={fileColumns}
              fileFilters={fileFilters}
              filePage={filePage}
              files={displayFiles}
              fileSearch={fileSearch}
              folderContextFilters={folderContextFilters}
              folderFilters={folderFilters}
              folderHasMore={activeFolder ? folderHasMore : false}
              folders={displayFolders}
              folderSearch={folderSearch}
              hideFolderActions={!activeFolder}
              loading={loading}
              loadingFolders={loadingFolders}
              loadingPage={loadingPage}
              permissions={folderPermissions}
              refreshing={refreshing}
              repositoryId={resolvedRepositoryId}
              uploadDisabled={!canUpload}
              folderTotalCount={
                activeFolder ? folderPage?.totalCount : displayFolders.length
              }
              onAiSummary={(id) => handleFileAction(id, 'aiSummary')}
              onDeleteFile={handleDeleteArchivedFile}
              onDeleteStagedFile={handleDeleteStagedFile}
              onDeleteStagedFiles={handleDeleteStagedFiles}
              onEditMetadata={
                folderPermissions.editMetadata
                  ? (id) => handleFileAction(id, 'editMetadata')
                  : undefined
              }
              onExportStagedFile={handleExportStagedFile}
              onExportStagedFiles={handleExportStagedFiles}
              onLoadMoreFolders={loadMoreFolders}
              onOpenFile={openDetailsFile}
              onOpenFolder={openFolder}
              onPageChange={changeServerPage}
              onPageSizeChange={changePageSize}
              onShare={openShareForFile}
              onUpload={canUpload ? handleUpload : undefined}
              onUploadFile={canUpload ? handleUploadFiles : undefined}
              onWorkflow={
                hasDocumentApprovalWorkflow
                  ? (id) => handleFileAction(id, 'workflow')
                  : undefined
              }
            />
          </div>
        </main>
      </div>
    </div>
  )
}
