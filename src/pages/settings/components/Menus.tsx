import { useMemo, useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import {
  LayoutDashboard,
  Inbox,
  FileCheck2,
  ScanLine,
  CheckSquare,
  Building2,
  ShoppingCart,
  GripVertical,
  Home,
} from 'lucide-react';

import InputSelect from '@/components/base/inputs/InputSelect';
import IconButton from '@/components/base/button/IconButton';

type SelectOption = {
  id: string | number;
  name: string;
  description?: string;
  disabled?: boolean;
  value?: string;
};

type MenuItem = {
  id: string;
  name: string;
  icon: React.ElementType;
  visible: boolean;
  isDefault?: boolean;
  disabled?: boolean;
};

const roles = ['AP Manager', 'AP Officer', 'Business User', 'Auditor'];
const landingPages = ['Dashboard', 'Inbox', 'OCR Review', 'Vendors'];

const initialMenus: MenuItem[] = [
  { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, visible: true },
  { id: 'inbox', name: 'Inbox', icon: Inbox, visible: true, isDefault: true },
  { id: 'processed', name: 'Processed Invoices', icon: FileCheck2, visible: false, disabled: true },
  { id: 'ocr', name: 'OCR Review', icon: ScanLine, visible: true },
  { id: 'approval', name: 'Approval Queue', icon: CheckSquare, visible: false, disabled: true },
  { id: 'vendors', name: 'Vendors', icon: Building2, visible: true },
  { id: 'po', name: 'Purchase Orders', icon: ShoppingCart, visible: true },
];

function toSelectOptions(options: string[]): SelectOption[] {
  return options.map((option) => ({
    id: option,
    name: option,
    value: option,
  }));
}

function EzSelectField({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select',
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const selectOptions = toSelectOptions(options);
  const selectedOption =
    selectOptions.find((option) => option.value === value || option.name === value) || null;

  return (
    <InputSelect
      label={label}
      options={selectOptions}
      value={selectedOption}
      placeholder={placeholder}
      onChange={(selected: SelectOption | null) => {
        if (!selected) return;
        onChange(selected.value || selected.name);
      }}
    />
  );
}

function SortableMenuRow({
  menu,
  defaultPage,
  toggleMenu,
}: {
  menu: MenuItem;
  defaultPage: string;
  toggleMenu: (id: string) => void;
}) {
  const Icon = menu.icon;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: menu.id,
    disabled: menu.disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'flex min-h-[62px] items-center justify-between border-b border-[var(--border-default)] px-5 last:border-b-0 bg-white',
        isDragging ? 'z-50 shadow-[var(--shadow-md)] opacity-95' : '',
      ].join(' ')}
    >
      <div className="flex items-center gap-5">
        <button
          type="button"
          disabled={menu.disabled}
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

      <div className="flex items-center gap-5">
        {menu.name === defaultPage && (
          <span className="inline-flex items-center gap-1 rounded-[8px] bg-[var(--primary-3)] px-3 py-1 text-xs font-semibold text-[var(--primary-10)] shadow-[var(--shadow-sm)]">
            <Home size={13} />
            Default
          </span>
        )}

        <button
          type="button"
          disabled={menu.disabled}
          onClick={() => toggleMenu(menu.id)}
          className={[
            'relative h-5 w-10 rounded-full transition disabled:cursor-not-allowed',
            menu.visible ? 'bg-[var(--primary-9)]' : 'bg-[var(--gray-3)]',
          ].join(' ')}
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
  );
}

type MenuProps = {
  onBack?: () => void;
};

export default function MenuProfileManagement({ onBack }: MenuProps) {
  const [selectedRole, setSelectedRole] = useState('AP Manager');
  const [defaultPage, setDefaultPage] = useState('Inbox');
  const [menus, setMenus] = useState<MenuItem[]>(initialMenus);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );

  const visibleCount = useMemo(
    () => menus.filter((menu) => menu.visible).length,
    [menus],
  );

  const toggleMenu = (id: string) => {
    setMenus((current) =>
      current.map((menu) =>
        menu.id === id && !menu.disabled
          ? { ...menu, visible: !menu.visible }
          : menu,
      ),
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    setMenus((current) => {
      const oldIndex = current.findIndex((item) => item.id === active.id);
      const newIndex = current.findIndex((item) => item.id === over.id);

      return arrayMove(current, oldIndex, newIndex);
    });
  };

  return (
    <main className="h-[calc(100vh-60px)] overflow-auto bg-[var(--surface-muted)] px-10 py-8 text-[var(--gray-13)]">
      <section className="mx-auto max-w-[93vw]">
        <div className="flex items-start gap-3">
          <IconButton
            ariaLabel="Back"
            color="gray"
            icon="lucide:arrow-left"
            size="sm"
            variant="ghost"
            onClick={onBack}
          />

          <div>
            <h1 className="text-lg font-semibold leading-7 text-[var(--gray-13)]">
              Menu &amp; Profile Management
            </h1>
            <p className="mt-1 text-sm leading-6 text-[var(--primary-10)]">
              Control role-based menu access, ordering, and default landing experience.
            </p>
          </div>
        </div>

        <div className="mt-8 grid max-w-[820px] grid-cols-1 gap-5 md:grid-cols-2">
          <EzSelectField
            label="Select Role"
            value={selectedRole}
            options={roles}
            onChange={setSelectedRole}
          />

          <EzSelectField
            label="Default Landing Page"
            value={defaultPage}
            options={landingPages}
            onChange={setDefaultPage}
          />
        </div>

        <div className="mt-8 overflow-hidden rounded-[14px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between border-b border-[var(--border-default)] px-5 py-5">
            <div>
              <h2 className="text-md font-semibold text-[var(--gray-13)]">
                Menu Configuration
              </h2>
              <p className="mt-1 text-sm text-[var(--gray-11)]">
                Drag to reorder menus and toggle visibility for this role.
              </p>
            </div>

            <span className="rounded-[8px] bg-[var(--gray-2)] px-4 py-1 text-sm font-semibold text-[var(--gray-13)]">
              {visibleCount} / {menus.length} visible
            </span>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={menus.map((menu) => menu.id)}
              strategy={verticalListSortingStrategy}
            >
              {menus.map((menu) => (
                <SortableMenuRow
                  key={menu.id}
                  menu={menu}
                  defaultPage={defaultPage}
                  toggleMenu={toggleMenu}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </section>
    </main>
  );
}