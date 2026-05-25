import type { TreeNode } from '../types/folderTypes'
import { DynamicIcon } from './icons'

export function TreeSidebar({
  tree,
  activeId,
  expandedIds,
  onToggle,
  onSelect,
}: {
  tree: TreeNode[]
  activeId: string
  expandedIds: string[]
  onToggle: (id: string) => void
  onSelect: (id: string) => void
}) {
  return (
    <aside className="flex h-full w-[250px] shrink-0 flex-col border-r border-gray-3 bg-surface-primary">
      <div className="min-h-0 flex-1 overflow-auto py-3">
        {tree.map((node) => (
          <TreeNodeRow
            key={node.id}
            node={node}
            activeId={activeId}
            expandedIds={expandedIds}
            onToggle={onToggle}
            onSelect={onSelect}
            level={0}
          />
        ))}
      </div>
    </aside>
  )
}

function TreeNodeRow({
  node,
  activeId,
  expandedIds,
  onToggle,
  onSelect,
  level,
}: {
  node: TreeNode
  activeId: string
  expandedIds: string[]
  onToggle: (id: string) => void
  onSelect: (id: string) => void
  level: number
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
        type="button"
        onClick={handleRowClick}
        className={`group flex h-9 w-full items-center gap-2 rounded-r-lg pr-2 text-left text-sm transition-all hover:bg-gray-4 hover:text-gray-12 active:scale-[0.99] ${
          isActive ? 'bg-blue-3 font-medium text-blue-11' : 'text-gray-11'
        }`}
        style={{ paddingLeft: `${12 + level * 18}px` }}
      >
        <span
          role="button"
          tabIndex={-1}
          onClick={hasChildren ? handleChevronClick : undefined}
          className="flex h-4 w-4 shrink-0 items-center justify-center"
        >
          <DynamicIcon
            name={hasChildren ? (isOpen ? 'chevronDown' : 'chevronRight') : undefined}
            className={`h-3.5 w-3.5 ${hasChildren ? '' : 'opacity-0'}`}
          />
        </span>

        <DynamicIcon name={node.iconKey} className="h-4 w-4 shrink-0" />

        <span className="truncate">{node.title}</span>
      </button>

      {isOpen && node.children && (
        <div className="animate-in fade-in slide-in-from-left-2 duration-200">
          {node.children.map((child) => (
            <TreeNodeRow
              key={child.id}
              node={child}
              activeId={activeId}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
