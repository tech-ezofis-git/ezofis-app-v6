import { useLingui } from '@lingui/react/macro'
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
    <aside className='ez-scrollbar w-[240px] shrink-0 overflow-y-auto border-r border-gray-3 bg-surface px-3 py-4 xl:w-[270px] 2xl:w-[304px]'>
      <div className='space-y-1'>
        {tree.map((node) => (
          <TreeItem
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

function TreeItem({
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
  const { t } = useLingui()
  const isExpanded = expandedIds.includes(node.id)
  const isActive = activeId === node.id
  const canExpand = Boolean(node.hasChildren || node.children?.length)
  const children = node.children || []

  const handleNodeClick = () => {
    onSelect(node.id)
  }

  const handleChevronClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (!canExpand) return
    // Expand/collapse loads tree children only — do not change the list area.
    onToggle(node.id)
  }

  return (
    <div>
      <div
        style={{ paddingLeft: `${8 + level * 20}px` }}
        className={`group flex min-h-9 cursor-pointer items-center gap-2 rounded-lg py-1.5 pr-2 text-[13px] leading-tight font-medium transition-all ${
          isActive ? 'bg-blue-2 text-blue-11' : 'text-gray-12 hover:bg-gray-2'
        }`}
        onClick={handleNodeClick}
      >
        {/* Always reserve chevron width so folder icons share one vertical column */}
        <div className='flex h-5 w-5 shrink-0 items-center justify-center'>
          {canExpand ? (
            <button
              className='flex h-5 w-5 items-center justify-center rounded-md text-gray-11 transition-all hover:bg-gray-4'
              title={isExpanded ? t`Collapse` : t`Expand`}
              type='button'
              onClick={handleChevronClick}
            >
              <DynamicIcon
                className={`block size-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                name='chevronRight'
              />
            </button>
          ) : (
            <span className='h-5 w-5' aria-hidden />
          )}
        </div>

        <DynamicIcon
          className={`block size-4 shrink-0 ${isActive ? 'text-blue-10' : 'text-gray-11'}`}
          name={node.iconKey || node.title || 'folder'}
        />

        <span className='line-clamp-1 min-w-0 flex-1 leading-tight [overflow-wrap:anywhere] break-words transition-all group-hover:line-clamp-none'>
          {node.title}
        </span>

        {node.isLoading ? (
          <span className='h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-5 border-t-gray-10' />
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
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
