import type { TreeNode } from '../types/folderTypes'
import { DynamicIcon } from './icons'

const findParentId = (
  nodes: TreeNode[],
  childId: string,
  parentId = '',
): string => {
  for (const node of nodes) {
    if (node.id === childId) return parentId

    const found = findParentId(node.children || [], childId, node.id)
    if (found) return found
  }

  return ''
}

const hasNodeInChildren = (node: TreeNode, targetId: string): boolean => {
  const children = node.children || []

  for (const child of children) {
    if (child.id === targetId) return true
    if (hasNodeInChildren(child, targetId)) return true
  }

  return false
}

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
    <aside className='ez-scrollbar w-[304px] shrink-0 overflow-y-auto border-r border-gray-3 bg-surface px-3 py-4'>
      <div className='space-y-1'>
        {tree.map((node) => (
          <TreeItem
            activeId={activeId}
            expandedIds={expandedIds}
            key={node.id}
            level={0}
            node={node}
            rootTree={tree}
            onSelect={onSelect}
            onToggle={onToggle}
          />
        ))}
      </div>
    </aside>
  )
}

function TreeItem({
  activeId,
  expandedIds,
  level,
  node,
  rootTree,
  onSelect,
  onToggle,
}: {
  activeId: string
  expandedIds: string[]
  level: number
  node: TreeNode
  rootTree: TreeNode[]
  onSelect: (id: string) => void
  onToggle: (id: string) => void
}) {
  const isExpanded = expandedIds.includes(node.id)
  const isActive = activeId === node.id
  const canExpand = Boolean(node.hasChildren || node.children?.length)
  const children = node.children || []
  const activeInsideThisNode = hasNodeInChildren(node, activeId)

  const handleNodeClick = () => {
    onSelect(node.id)
  }

  const handleChevronClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()

    if (!canExpand) return

    if (isExpanded) {
      onToggle(node.id)

      const parentId = findParentId(rootTree, node.id)

      if (isActive && parentId) {
        onSelect(parentId)
      }

      if (!isActive && activeInsideThisNode) {
        onSelect(node.id)
      }

      return
    }

    onSelect(node.id)
  }

  return (
    <div>
      <div
        style={{ paddingLeft: `${8 + level * 22}px` }}
        className={`group flex h-10 cursor-pointer items-center gap-2 rounded-lg pr-2 text-[15px] font-medium transition-all ${
          isActive ? 'bg-blue-2 text-blue-11' : 'text-gray-12 hover:bg-gray-2'
        }`}
        onClick={handleNodeClick}
      >
        <button
          disabled={!canExpand}
          title={isExpanded ? 'Collapse' : 'Expand'}
          type='button'
          className={`flex h-6 w-6 items-center justify-center rounded-md transition-all ${
            canExpand ? 'text-gray-11 hover:bg-gray-4' : 'text-transparent'
          }`}
          onClick={handleChevronClick}
        >
          {canExpand ? (
            <DynamicIcon
              className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              name='chevronRight'
            />
          ) : (
            <span className='h-4 w-4' />
          )}
        </button>

        <DynamicIcon
          className={`h-5 w-5 shrink-0 ${isActive ? 'text-blue-10' : 'text-gray-11'}`}
          name={node.iconKey || node.title || 'folder'}
        />

        <span className='min-w-0 flex-1 truncate' title={node.title}>
          {node.title}
        </span>

        {node.isLoading ? (
          <span className='h-3 w-3 animate-spin rounded-full border-2 border-gray-5 border-t-gray-10' />
        ) : null}
      </div>

      {isExpanded && children.length ? (
        <div className='mt-1 space-y-1'>
          {children.map((child) => (
            <TreeItem
              activeId={activeId}
              expandedIds={expandedIds}
              key={child.id}
              level={level + 1}
              node={child}
              rootTree={rootTree}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
