import type { TreeNode } from '../types/folderTypes'
import { DynamicIcon } from './icons'

export function TreeSidebar({
  activeId,
  expandedIds,
  tree,
  onSelect,
  onToggle,
}: {
  activeId: string
  expandedIds: string[]
  tree: TreeNode[]
  onSelect: (id: string) => void
  onToggle: (id: string) => void
}) {
  return (
    <aside className='flex h-full w-[250px] shrink-0 flex-col border-r border-gray-3 bg-surface-primary'>
      <div className='min-h-0 flex-1 overflow-auto py-3'>
        {tree.map((node) => (
          <TreeNodeRow
            activeId={activeId}
            expandedIds={expandedIds}
            key={node.id}
            level={0}
            node={node}
            onSelect={onSelect}
            onToggle={onToggle}
          />
        ))}
      </div>
    </aside>
  )
}

function TreeNodeRow({
  activeId,
  expandedIds,
  level,
  node,
  onSelect,
  onToggle,
}: {
  activeId: string
  expandedIds: string[]
  level: number
  node: TreeNode
  onSelect: (id: string) => void
  onToggle: (id: string) => void
}) {
  const hasChildren = Boolean(node.children?.length)
  const isOpen = expandedIds.includes(node.id)
  const isActive = activeId === node.id

  const handleRowClick = () => {
    onSelect(node.id)
  }

  const handleChevronClick = (event: React.MouseEvent<HTMLSpanElement>) => {
    event.stopPropagation()
    onToggle(node.id)
  }

  return (
    <div>
      <button
        style={{ paddingLeft: `${12 + level * 18}px` }}
        type='button'
        className={`group flex h-9 w-full items-center gap-2 rounded-r-lg pr-2 text-left text-sm transition-all hover:bg-gray-4 hover:text-gray-12 active:scale-[0.99] ${
          isActive ? 'bg-blue-3 font-medium text-blue-11' : 'text-gray-11'
        }`}
        onClick={handleRowClick}
      >
        <span
          className='flex h-4 w-4 shrink-0 items-center justify-center'
          role='button'
          tabIndex={-1}
          onClick={hasChildren ? handleChevronClick : undefined}
        >
          <DynamicIcon
            className={`h-3.5 w-3.5 ${hasChildren ? '' : 'opacity-0'}`}
            name={
              hasChildren
                ? isOpen
                  ? 'chevronDown'
                  : 'chevronRight'
                : undefined
            }
          />
        </span>

        <DynamicIcon className='h-4 w-4 shrink-0' name={node.iconKey} />

        <span className='truncate'>{node.title}</span>
      </button>

      {isOpen && node.children && (
        <div className='animate-in fade-in slide-in-from-left-2 duration-200'>
          {node.children.map((child) => (
            <TreeNodeRow
              activeId={activeId}
              expandedIds={expandedIds}
              key={child.id}
              level={level + 1}
              node={child}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  )
}
