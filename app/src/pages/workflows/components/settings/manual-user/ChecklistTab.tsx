import Icon from '@/components/base/icon/Icon'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import InputText from '@/components/base/inputs/InputText'
import { generateId } from '../../../utils/generateId'

interface ChecklistItem {
  id: string
  label: string
  required: boolean
}

interface ChecklistTabProps {
  nodeData: Record<string, any>
  updateNodeData: (key: string, value: any) => void
}

export default function ChecklistTab({
  nodeData,
  updateNodeData,
}: ChecklistTabProps) {
  const items: ChecklistItem[] = Array.isArray(nodeData.checklistItems)
    ? nodeData.checklistItems
    : []

  const setItems = (next: ChecklistItem[]) =>
    updateNodeData('checklistItems', next)

  const addItem = () =>
    setItems([...items, { id: generateId(), label: '', required: true }])
  const removeItem = (id: string) => setItems(items.filter((i) => i.id !== id))
  const updateItem = (id: string, patch: Partial<ChecklistItem>) =>
    setItems(items.map((i) => (i.id === id ? { ...i, ...patch } : i)))

  return (
    <div className='space-y-3 rounded-xl bg-surface-muted p-3'>
      <div className='flex items-center gap-2.5 px-1'>
        <Icon className='h-4 w-4 text-primary-9' name='lucide:list-checks' />
        <div className='flex flex-col space-y-1'>
          <span className='text-13 font-medium text-gray-12'>
            Checklist Items
          </span>
          <span className='text-11 leading-tight text-gray-9'>
            Steps the user must verify before submitting or approving
          </span>
        </div>
      </div>

      <div className='space-y-2'>
        {items.map((item) => (
          <div
            className='flex items-center gap-2 rounded-xl bg-surface p-3 shadow-sm'
            key={item.id}
          >
            <InputText
              className='flex-1'
              placeholder='Checklist item label'
              value={item.label}
              onChange={(val) => updateItem(item.id, { label: val })}
            />
            <div className='flex items-center gap-1.5 whitespace-nowrap'>
              <span className='text-11 text-gray-9'>Required</span>
              <InputSwitch
                checked={item.required}
                onChange={(checked) =>
                  updateItem(item.id, { required: checked })
                }
              />
            </div>
            <button
              className='text-gray-8 hover:text-red-9 shrink-0 p-1 transition-colors'
              title='Remove item'
              onClick={() => removeItem(item.id)}
            >
              <Icon className='h-4 w-4' name='lucide:x' />
            </button>
          </div>
        ))}
      </div>

      <button
        className='border-gray-6 text-gray-9 hover:bg-blue-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-2.5 text-13 font-medium transition-all hover:border-primary-9 hover:text-primary-11 active:scale-[0.99]'
        onClick={addItem}
      >
        <Icon className='h-4 w-4' name='lucide:plus' />
        <span>Add Checklist Item</span>
      </button>
    </div>
  )
}
