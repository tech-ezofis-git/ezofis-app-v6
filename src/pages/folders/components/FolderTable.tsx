import { useEffect, useRef, useState } from 'react'
import type { FileItem, FolderItem } from '../types/folderTypes'
import { DynamicIcon } from './icons'
import { StatusPill } from './Ui'

export function FolderTable({
  folders,
  files,
  onOpenFolder,
  onOpenFile,
  onEditMetadata,
  onAiSummary,
  onShare,
  onWorkflow,
}: {
  folders: FolderItem[]
  files: FileItem[]
  onOpenFolder: (id: string) => void
  onOpenFile: (id: string) => void
  onEditMetadata: (id: string) => void
  onAiSummary: (id: string) => void
  onShare: (id: string) => void
  onWorkflow: (id: string) => void
}) {
  const [openMenu, setOpenMenu] = useState<{
    type: 'folder' | 'file'
    id: string
  } | null>(null)

  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null)
      }
    }

    document.addEventListener('mousedown', closeMenu)
    return () => document.removeEventListener('mousedown', closeMenu)
  }, [])

  const toggleMenu = (type: 'folder' | 'file', id: string) => {
    setOpenMenu((prev) =>
      prev?.type === type && prev.id === id ? null : { type, id }
    )
  }

  return (
    <div className="animate-in fade-in duration-300">
      {folders.length ? (
        <section className="border-b border-gray-3 bg-surface">

          <div className="grid grid-cols-[48px_1.4fr_1fr_1fr_0.8fr_48px] border-b border-gray-3 px-4 py-3 text-sm font-semibold text-gray-11">
            <span />
            <span>Name</span>
            <span>Items</span>
            <span>Date Modified</span>
            {/* <span>Size</span> */}
            <span />
          </div>

          {folders.map((folder) => (
            <div
              key={folder.id}
              className="group relative grid w-full cursor-pointer grid-cols-[48px_1.4fr_1fr_1fr_0.8fr_48px] items-center border-b border-gray-3 px-4 py-2 text-left text-sm transition-all  hover:z-10 hover:bg-[var(--gray-1)] hover:shadow-sm text-[15px]"
              onClick={() => onOpenFolder(folder.id)}
              style={{ fontWeight: '500' }}

            >
              <DynamicIcon name={folder.iconKey} className="h-5 w-5 text-gray-11 group-hover:text-primary-10" />

              <button
                type="button"
                onClick={() => onOpenFolder(folder.id)}
                className="truncate text-left font-bold text-gray-13 "
              >
                {folder.title}
              </button>

              <span className="text-gray-10">{folder.itemsText}</span>
              <span className="text-gray-10">{folder.modifiedText}</span>
              {/* <span className="text-gray-10">{folder.sizeText || '-'}</span> */}

              <div className="relative flex justify-end">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    toggleMenu('folder', folder.id)
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-13 opacity-0 transition-all hover:bg-gray-5 group-hover:opacity-100"
                >
                  <DynamicIcon name="more" className="h-4 w-4" />
                </button>

                {openMenu?.type === 'folder' && openMenu.id === folder.id && (
                  <div
                    ref={menuRef}
                    className="absolute right-0 top-9 z-50 w-[200px] overflow-hidden rounded-xl border border-gray-3 bg-white py-2 shadow-xl"
                  >
                    <MenuItem
                      icon="folder"
                      label="Open"
                      onClick={() => {
                        setOpenMenu(null)
                        onOpenFolder(folder.id)
                      }}
                    />
                    <MenuItem icon="edit" label="Rename" onClick={() => setOpenMenu(null)} />
                    <MenuItem icon="share" label="Share" onClick={() => setOpenMenu(null)} />

                    <div className="my-2 border-t border-gray-3" />

                    <MenuItem
                      icon="trash"
                      label="Delete"
                      danger
                      onClick={() => setOpenMenu(null)}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {folders.length ? (<div className="relative flex items-center justify-center bg-surface  py-3">
        <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-gray-4" />

        <div className="relative z-10 flex items-center gap-2 rounded-full border border-gray-3 bg-surface px-4 py-1.5 text-xs font-bold text-gray-10 shadow-sm">
          <DynamicIcon name="fileText" className="h-4 w-4 text-gray-8" />

          <span className="rounded text-gray-8 px-1.5 py-0.5 ">
            FILES IN THIS FOLDER
          </span>

          <span className="h-px w-5 bg-gray-4" />

          <span className='text-gray-8'>{files.length || 0}</span>
        </div>
      </div>) : null}
      {files.length ? (
        <section className="bg-surface">


          <div className="grid grid-cols-[48px_1.6fr_1fr_1fr_0.7fr_1fr_0.6fr_48px] border-b border-t border-gray-3 px-4 py-3 text-sm font-semibold text-gray-11">
            <span />
            <span>Name</span>
            <span>Type</span>
            <span>Date</span>
            <span>Amount</span>
            <span>Status</span>
            {/* <span>OCR</span> */}
            <span />
          </div>

          {files.map((file) => (
            <div
              key={file.id}
              className="group cursor-pointer relative grid w-full grid-cols-[48px_1.6fr_1fr_1fr_0.7fr_1fr_0.6fr_48px] items-center border-b border-gray-3 px-4 py-2 text-left text-sm transition-all  hover:z-10 hover:bg-[var(--gray-1)] hover:shadow-sm"
              onClick={() => onOpenFile(file.id)}
            >
              <DynamicIcon name="fileText" className="h-5 w-5 text-gray-11 group-hover:text-secondary-10" />

              <button
                type="button"
                onClick={() => onOpenFile(file.id)}
                className="truncate text-left font-bold text-gray-13 text-[15px]"
                style={{ fontWeight: '500' }}
              >
                {file.name}
              </button>

              <span className="text-gray-10">{file.type}</span>
              <span className="text-gray-10">{file.date}</span>
              <span className="text-gray-10">{file.amount || '-'}</span>
              <StatusPill status={file.status} />

              {/* <span
                className={`font-bold ${file.ocr < 80
                  ? 'text-red-9'
                  : file.ocr < 95
                    ? 'text-orange-9'
                    : 'text-green-9'
                  }`}
              >
                {file.ocr}%
              </span> */}

              <div className="relative flex justify-end">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    toggleMenu('file', file.id)
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-13 opacity-0 transition-all hover:bg-gray-5 group-hover:opacity-100"
                >
                  <DynamicIcon name="more" className="h-4 w-4" />
                </button>

                {openMenu?.type === 'file' && openMenu.id === file.id && (
                  <div
                    ref={menuRef}
                    className="absolute right-0 top-9 z-50 w-[220px] overflow-hidden rounded-xl border border-gray-3 bg-white py-2 shadow-xl"
                  >
                    <MenuItem
                      icon="eye"
                      label="View Details"
                      onClick={() => {
                        setOpenMenu(null)
                        onOpenFile(file.id)
                      }}
                    />
                    <MenuItem
                      icon="edit"
                      label="Edit Metadata"
                      onClick={() => {
                        setOpenMenu(null)
                        onEditMetadata(file.id)
                      }}
                    />

                    <MenuItem
                      icon="bot"
                      label="AI Summary"
                      onClick={() => {
                        setOpenMenu(null)
                        onAiSummary(file.id)
                      }}
                    />

                    <MenuItem
                      icon="share"
                      label="Share"
                      onClick={() => {
                        setOpenMenu(null)
                        onShare(file.id)
                      }}
                    />

                    <MenuItem
                      icon="play"
                      label="Start Workflow"
                      onClick={() => {
                        setOpenMenu(null)
                        onWorkflow(file.id)
                      }}
                    />

                    <div className="my-2 border-t border-gray-3" />

                    <MenuItem
                      icon="trash"
                      label="Delete"
                      danger
                      onClick={() => setOpenMenu(null)}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  )
}

function MenuItem({
  icon,
  label,
  danger = false,
  onClick,
}: {
  icon: string
  label: string
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-[14px] transition-all hover:bg-gray-2 ${danger ? 'text-red-9' : 'text-gray-13'
        }`}
    >
      <DynamicIcon name={icon} className="h-4 w-4 text-current" />
      {label}
    </button>
  )
}