import { useState } from 'react'
import type { TreeNode } from '../types/folderTypes'
import { DynamicIcon } from './icons'

export function TreeSidebar({
  activeId,
  tree,
  onSelect,
}: {
  activeId: string
  tree: TreeNode[]
  onSelect: (id: string) => void
}) {
  return (
    <aside className='flex h-full w-[250px] shrink-0 flex-col border-r border-gray-3 bg-surface-primary'>
      <div className='min-h-0 flex-1 overflow-auto py-3'>
        {tree.map((node) => (
          <TreeNodeRow
            activeId={activeId}
            key={node.id}
            level={0}
            node={node}
            onSelect={onSelect}
          />
        ))}
      </div>

      {/* <div className="border-t border-gray-3 p-3">
        <div className="mb-2 flex items-center justify-between text-sm text-gray-11">
          <span className="flex items-center gap-2">
            <DynamicIcon name="archive" />
            Storage
          </span>

          <span>34.2 / 50 GB</span>
        </div>

        <div className="h-1.5 rounded-full bg-gray-3">
          <div className="h-full w-[68%] rounded-full bg-blue-9" />
        </div>
      </div> */}
    </aside>
  )
}

function TreeNodeRow({
  activeId,
  level,
  node,
  onSelect,
}: {
  activeId: string
  level: number
  node: TreeNode
  onSelect: (id: string) => void
}) {
  const [open, setOpen] = useState(level < 2)

  const hasChildren = Boolean(node.children?.length)
  const isActive = activeId === node.id

  const handleClick = () => {
    if (hasChildren) {
      setOpen((prev) => !prev)
    }

    onSelect(node.id)
  }

  return (
    <div>
      <button
        style={{ paddingLeft: `${12 + level * 18}px` }}
        type='button'
        className={`group flex h-9 w-full items-center gap-2 rounded-r-lg pr-2 text-left text-sm transition-all hover:bg-gray-4 hover:text-gray-12 active:scale-[0.99] ${
          isActive ? 'bg-blue-3 font-medium text-blue-11' : 'text-gray-11'
        }`}
        onClick={handleClick}
      >
        <DynamicIcon
          className={`h-3.5 w-3.5 ${hasChildren ? '' : 'opacity-0'}`}
          name={
            hasChildren ? (open ? 'chevronDown' : 'chevronRight') : undefined
          }
        />

        <DynamicIcon className='h-4 w-4 shrink-0' name={node.iconKey} />

        <span className='truncate'>{node.title}</span>
      </button>

      {open && node.children && (
        <div className='animate-in fade-in slide-in-from-left-2 duration-200'>
          {node.children.map((child) => (
            <TreeNodeRow
              activeId={activeId}
              key={child.id}
              level={level + 1}
              node={child}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}
