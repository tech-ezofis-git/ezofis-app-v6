import type { Node } from '@xyflow/react'
import { useLingui } from '@lingui/react/macro'
import { useMemo, useState } from 'react'
import type { Option } from '@/types/option'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import Input from '@/components/base/inputs/InputText'
import cn from '@/utils/cn'
import { generateId } from '../../utils/generateId'
import {
  KANBAN_CARD_COLORS,
  type KanbanCardColor,
  type KanbanCardSetting,
  kanbanColorDotClass,
} from '../../utils/kanbanSettings'
import {
  NODE_TOOL_TYPE,
  normalizeNodeToolType,
} from '../../utils/nodeToolTypes'

const SKIP_STAGE_TYPES = new Set([
  NODE_TOOL_TYPE.CONDITION,
  'annotation',
  'comment',
  'group',
  'note',
])

type DraftCard = {
  color: KanbanCardColor
  id: string
  name: string
  nodeIds: string[]
}

const emptyDraft = (): DraftCard => ({
  color: 'primary',
  id: generateId(),
  name: '',
  nodeIds: [],
})

const stageLabel = (node: Node) => {
  const data = (node.data || {}) as Record<string, unknown>
  return String(data.label || data.title || data.toolType || node.id)
}

type Props = {
  cards: KanbanCardSetting[]
  nodes: Node[]
  onChange: (cards: KanbanCardSetting[]) => void
}

export default function KanbanViewSettingsSection({
  cards,
  nodes,
  onChange,
}: Props) {
  const { t } = useLingui()
  const [draft, setDraft] = useState<DraftCard | null>(null)
  const [error, setError] = useState('')

  const stageOptions: Option[] = useMemo(() => {
    return nodes
      .filter((node) => {
        const data = (node.data || {}) as Record<string, unknown>
        const type = normalizeNodeToolType(data.toolType || data.type)
        return type && !SKIP_STAGE_TYPES.has(type)
      })
      .map((node) => ({
        id: node.id,
        name: stageLabel(node),
      }))
  }, [nodes])

  const usedNodeIds = useMemo(() => {
    const used = new Set<string>()
    cards.forEach((card) => {
      if (draft && card.id === draft.id) return
      card.nodeIds.forEach((id) => used.add(id))
    })
    return used
  }, [cards, draft])

  const availableOptions = useMemo(
    () =>
      stageOptions.map((option) => ({
        ...option,
        disabled: usedNodeIds.has(String(option.id)),
      })),
    [stageOptions, usedNodeIds],
  )

  const startCreate = () => {
    setError('')
    setDraft(emptyDraft())
  }

  const startEdit = (card: KanbanCardSetting) => {
    setError('')
    setDraft({ ...card })
  }

  const cancelDraft = () => {
    setDraft(null)
    setError('')
  }

  const saveDraft = () => {
    if (!draft) return
    const name = draft.name.trim()
    if (!name) {
      setError(t`Enter a card name.`)
      return
    }
    if (!draft.nodeIds.length) {
      setError(t`Select at least one workflow stage.`)
      return
    }
    const next: KanbanCardSetting = {
      color: draft.color,
      id: draft.id,
      name,
      nodeIds: draft.nodeIds,
    }
    const exists = cards.some((card) => card.id === draft.id)
    onChange(
      exists
        ? cards.map((card) => (card.id === draft.id ? next : card))
        : [...cards, next],
    )
    setDraft(null)
    setError('')
  }

  const removeCard = (id: string) => {
    onChange(cards.filter((card) => card.id !== id))
    if (draft?.id === id) cancelDraft()
  }

  return (
    <div className='space-y-3'>
      {cards.length === 0 && !draft ? (
        <p className='text-12 leading-5 text-gray-10'>
          {t`Add cards to group workflow stages into Kanban columns. If no cards are saved, Requests shows one column per stage.`}
        </p>
      ) : null}

      <div className='space-y-2'>
        {cards.map((card) => {
          if (draft?.id === card.id) return null
          const stageNames = card.nodeIds
            .map(
              (id) =>
                stageOptions.find((option) => String(option.id) === id)?.name ||
                id,
            )
            .filter(Boolean)
          return (
            <div
              className='animate-in fade-in slide-in-from-top-1 rounded-xl border border-gray-3 bg-surface p-3 duration-200'
              key={card.id}
            >
              <div className='flex items-start gap-2'>
                <span
                  className={cn(
                    'mt-1 size-2.5 shrink-0 rounded-full',
                    kanbanColorDotClass(card.color),
                  )}
                />
                <div className='min-w-0 flex-1'>
                  <div className='truncate text-13 font-semibold text-gray-13'>
                    {card.name}
                  </div>
                  <div className='mt-1 flex flex-wrap gap-1'>
                    {stageNames.map((name) => (
                      <span
                        className='max-w-full truncate rounded-full border border-gray-3 bg-gray-2 px-2 py-0.5 text-[10px] font-semibold text-gray-11'
                        key={name}
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
                <IconButton
                  ariaLabel={t`Edit card`}
                  color='gray'
                  icon='lucide:pencil'
                  size='xs'
                  variant='ghost'
                  onClick={() => startEdit(card)}
                />
                <IconButton
                  ariaLabel={t`Delete card`}
                  color='red'
                  icon='lucide:trash-2'
                  size='xs'
                  variant='ghost'
                  onClick={() => removeCard(card.id)}
                />
              </div>
            </div>
          )
        })}
      </div>

      {draft ? (
        <div className='animate-in fade-in slide-in-from-top-2 space-y-3 rounded-xl border border-primary-4 bg-surface p-3 duration-300'>
          <Input
            label={t`Card name`}
            placeholder={t`e.g. PDA Preparation`}
            value={draft.name}
            required
            onChange={(value) => {
              setDraft({ ...draft, name: value })
              setError('')
            }}
          />

          <div>
            <div className='mb-2 text-13 font-medium text-gray-11'>
              {t`Card color`}
            </div>
            <div className='flex flex-wrap gap-2'>
              {KANBAN_CARD_COLORS.map((color) => {
                const active = draft.color === color.id
                return (
                  <button
                    aria-label={color.label}
                    key={color.id}
                    type='button'
                    className={cn(
                      'flex size-8 items-center justify-center rounded-full border transition-all hover:scale-105 active:scale-95',
                      active
                        ? 'border-primary-9 ring-2 ring-primary-4'
                        : 'border-gray-3 hover:border-primary-6',
                    )}
                    onClick={() => setDraft({ ...draft, color: color.id })}
                  >
                    <span className={cn('size-4 rounded-full', color.dot)} />
                  </button>
                )
              })}
            </div>
          </div>

          <InputSelectMultiple
            label={t`Workflow stages`}
            options={availableOptions}
            placeholder={t`Select one or more stages`}
            searchable
            value={availableOptions.filter((option) =>
              draft.nodeIds.includes(String(option.id)),
            )}
            onChange={(options) => {
              setDraft({
                ...draft,
                nodeIds: options.map((option) => String(option.id)),
              })
              setError('')
            }}
          />

          {error ? (
            <p className='text-12 font-medium text-red-9'>{error}</p>
          ) : null}

          <div className='flex items-center justify-end gap-2'>
            <Button
              color='gray'
              size='xs'
              variant='outline'
              onClick={cancelDraft}
            >
              {t`Cancel`}
            </Button>
            <Button size='xs' onClick={saveDraft}>
              {cards.some((card) => card.id === draft.id)
                ? t`Update card`
                : t`Add card`}
            </Button>
          </div>
        </div>
      ) : (
        <button
          className='flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-4 py-2.5 text-13 font-medium text-gray-11 transition-all hover:border-primary-6 hover:bg-primary-2 hover:text-primary-9 active:scale-[0.99]'
          type='button'
          onClick={startCreate}
        >
          <Icon className='size-4' name='lucide:plus' />
          {t`Add card`}
        </button>
      )}
    </div>
  )
}
