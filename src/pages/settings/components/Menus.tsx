import type { DragEndEvent } from '@dnd-kit/core'
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Building2,
  CheckSquare,
  FileCheck2,
  GripVertical,
  Home,
  Inbox,
  LayoutDashboard,
  ScanLine,
  ShoppingCart,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import IconButton from '@/components/base/button/IconButton'
import InputSelect from '@/components/base/inputs/InputSelect'

type MenuItem = {
  disabled?: boolean
  icon: React.ElementType
  id: string
  isDefault?: boolean
  name: string
  visible: boolean
}

type SelectOption = {
  description?: string
  disabled?: boolean
  id: string | number
  name: string
  value?: string
}

const roles = ['AP Manager', 'AP Officer', 'Business User', 'Auditor']
const landingPages = ['Dashboard', 'Inbox', 'OCR Review', 'Vendors']

const initialMenus: MenuItem[] = [
  { icon: LayoutDashboard, id: 'dashboard', name: 'Dashboard', visible: true },
  { icon: Inbox, id: 'inbox', isDefault: true, name: 'Inbox', visible: true },
  {
    disabled: true,
    icon: FileCheck2,
    id: 'processed',
    name: 'Processed Invoices',
    visible: false,
  },
  { icon: ScanLine, id: 'ocr', name: 'OCR Review', visible: true },
  {
    disabled: true,
    icon: CheckSquare,
    id: 'approval',
    name: 'Approval Queue',
    visible: false,
  },
  { icon: Building2, id: 'vendors', name: 'Vendors', visible: true },
  { icon: ShoppingCart, id: 'po', name: 'Purchase Orders', visible: true },
]

type MenuProps = {
  onBack?: () => void
}

export default function MenuProfileManagement({ onBack }: MenuProps) {
  const [selectedRole, setSelectedRole] = useState('AP Manager')
  const [defaultPage, setDefaultPage] = useState('Inbox')
  const [menus, setMenus] = useState<MenuItem[]>(initialMenus)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  )

  const visibleCount = useMemo(
    () => menus.filter((menu) => menu.visible).length,
    [menus],
  )

  const toggleMenu = (id: string) => {
    setMenus((current) =>
      current.map((menu) =>
        menu.id === id && !menu.disabled
          ? { ...menu, visible: !menu.visible }
          : menu,
      ),
    )
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    setMenus((current) => {
      const oldIndex = current.findIndex((item) => item.id === active.id)
      const newIndex = current.findIndex((item) => item.id === over.id)

      return arrayMove(current, oldIndex, newIndex)
    })
  }

  return (
    <main className='h-[calc(100vh-60px)] overflow-auto bg-[var(--surface-muted)] px-10 py-8 text-[var(--gray-13)]'>
      <section className='mx-auto max-w-[93vw]'>
        <div className='flex items-start gap-3'>
          <IconButton
            ariaLabel='Back'
            color='gray'
            icon='lucide:arrow-left'
            size='sm'
            variant='ghost'
            onClick={onBack}
          />

          <div>
            <h1 className='text-lg leading-7 font-semibold text-[var(--gray-13)]'>
              Menu &amp; Profile Management
            </h1>
            <p className='mt-1 text-sm leading-6 text-[var(--primary-10)]'>
              Control role-based menu access, ordering, and default landing
              experience.
            </p>
          </div>
        </div>

        <div className='mt-8 grid max-w-[820px] grid-cols-1 gap-5 md:grid-cols-2'>
          <EzSelectField
            label='Select Role'
            options={roles}
            value={selectedRole}
            onChange={setSelectedRole}
          />

          <EzSelectField
            label='Default Landing Page'
            options={landingPages}
            value={defaultPage}
            onChange={setDefaultPage}
          />
        </div>

        <div className='mt-8 overflow-hidden rounded-[14px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-sm)]'>
          <div className='flex items-center justify-between border-b border-[var(--border-default)] px-5 py-5'>
            <div>
              <h2 className='text-md font-semibold text-[var(--gray-13)]'>
                Menu Configuration
              </h2>
              <p className='mt-1 text-sm text-[var(--gray-11)]'>
                Drag to reorder menus and toggle visibility for this role.
              </p>
            </div>

            <span className='rounded-[8px] bg-[var(--gray-2)] px-4 py-1 text-sm font-semibold text-[var(--gray-13)]'>
              {visibleCount} / {menus.length} visible
            </span>
          </div>

          <DndContext
            collisionDetection={closestCenter}
            sensors={sensors}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={menus.map((menu) => menu.id)}
              strategy={verticalListSortingStrategy}
            >
              {menus.map((menu) => (
                <SortableMenuRow
                  defaultPage={defaultPage}
                  key={menu.id}
                  menu={menu}
                  toggleMenu={toggleMenu}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </section>
    </main>
  )
}

function EzSelectField({
  label,
  options,
  placeholder = 'Select',
  value,
  onChange,
}: {
  label: string
  options: string[]
  placeholder?: string
  value: string
  onChange: (value: string) => void
}) {
  const selectOptions = toSelectOptions(options)
  const selectedOption =
    selectOptions.find(
      (option) => option.value === value || option.name === value,
    ) || null

  return (
    <InputSelect
      label={label}
      options={selectOptions}
      placeholder={placeholder}
      value={selectedOption}
      onChange={(selected: SelectOption | null) => {
        if (!selected) return
        onChange(selected.value || selected.name)
      }}
    />
  )
}

function SortableMenuRow({
  defaultPage,
  menu,
  toggleMenu,
}: {
  defaultPage: string
  menu: MenuItem
  toggleMenu: (id: string) => void
}) {
  const Icon = menu.icon

  const {
    attributes,
    isDragging,
    listeners,
    transform,
    transition,
    setNodeRef,
  } = useSortable({
    disabled: menu.disabled,
    id: menu.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'flex min-h-[62px] items-center justify-between border-b border-[var(--border-default)] bg-white px-5 last:border-b-0',
        isDragging ? 'z-50 opacity-95 shadow-[var(--shadow-md)]' : '',
      ].join(' ')}
    >
      <div className='flex items-center gap-5'>
        <button
          disabled={menu.disabled}
          type='button'
          {...attributes}
          {...listeners}
          className={[
            'cursor-grab active:cursor-grabbing disabled:cursor-not-allowed',
            menu.disabled ? 'text-[var(--gray-6)]' : 'text-[var(--gray-10)]',
          ].join(' ')}
        >
          <GripVertical size={20} />
        </button>

        <div
          className={[
            'flex h-8 w-8 items-center justify-center rounded-[7px]',
            menu.disabled
              ? 'bg-[var(--primary-2)] text-[var(--primary-5)]'
              : 'bg-[var(--primary-3)] text-[var(--primary-9)]',
          ].join(' ')}
        >
          <Icon size={15} strokeWidth={1.8} />
        </div>

        <span
          className={[
            'text-sm font-semibold',
            menu.disabled ? 'text-[var(--gray-9)]' : 'text-[var(--gray-13)]',
          ].join(' ')}
        >
          {menu.name}
        </span>
      </div>

      <div className='flex items-center gap-5'>
        {menu.name === defaultPage && (
          <span className='inline-flex items-center gap-1 rounded-[8px] bg-[var(--primary-3)] px-3 py-1 text-xs font-semibold text-[var(--primary-10)] shadow-[var(--shadow-sm)]'>
            <Home size={13} />
            Default
          </span>
        )}

        <button
          disabled={menu.disabled}
          type='button'
          className={[
            'relative h-5 w-10 rounded-full transition disabled:cursor-not-allowed',
            menu.visible ? 'bg-[var(--primary-9)]' : 'bg-[var(--gray-3)]',
          ].join(' ')}
          onClick={() => toggleMenu(menu.id)}
        >
          <span
            className={[
              'absolute top-1 h-3 w-3 rounded-full bg-white shadow transition',
              menu.visible ? 'left-6' : 'left-1',
            ].join(' ')}
          />
        </button>
      </div>
    </div>
  )
}

function toSelectOptions(options: string[]): SelectOption[] {
  return options.map((option) => ({
    id: option,
    name: option,
    value: option,
  }))
}
