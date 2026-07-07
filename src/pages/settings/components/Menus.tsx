import {
  createColumnHelper,
  useReactTable,
} from '@tanstack/react-table'
import {
  Building2,
  Check,
  CheckSquare,
  Edit3,
  FileCheck2,
  Inbox,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  ScanLine,
  Trash2,
} from 'lucide-react'
import {
  type ElementType,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  createMenu as createMenuApi,
  deleteMenu as deleteMenuApi,
  getMenuById,
  getMenus,
  updateMenu as updateMenuApi,
  type V6MenuItem,
} from '@/api/v6/user'
import IconButton from '@/components/base/button/IconButton'
import Button from '@/components/base/button/Button'
import DataTable from '@/components/base/data-table/DataTable'
import InputNumber from '@/components/base/inputs/InputNumber'
import InputText from '@/components/base/inputs/InputText'
import showToast from '@/components/base/toast/showToast'
import { calculateMenuSetupProgress } from '../helpers/settingsSetupProgress'
import {
  settingsHeaderMeta,
  settingsTableCoreOptions,
  useSettingsTableSearch,
} from '../helpers/settingsDataTable'
import SetupProgressBar from './SetupProgressBar'
import SettingsPageHeader, {
  SettingsHeaderAddButton,
} from './SettingsPageHeader'
import SettingsTableToolbarRow from './SettingsTableToolbarRow'
import useSettingsTableToolbar from './useSettingsTableToolbar'

type AppMenu = {
  created: string
  id: string
  isSystem: boolean
  key: string
  label: string
  routePath: string
  sortOrder: number
}

type MenuFormState = {
  key: string
  label: string
  routePath: string
  sortOrder: number
}

type MenuProps = {
  onBack?: () => void
}

type MenuStep = {
  key: 'details' | 'review' | 'route'
  title: string
}

const menuSteps: MenuStep[] = [
  { key: 'details', title: 'Menu Details' },
  { key: 'route', title: 'Route & Order' },
  { key: 'review', title: 'Review' },
]

const menuIconByKey: Record<string, ElementType> = {
  'approval-queue': CheckSquare,
  dashboard: LayoutDashboard,
  inbox: Inbox,
  'ocr-review': ScanLine,
  'processed-invoices': FileCheck2,
  vendors: Building2,
}

const emptyMenuForm: MenuFormState = {
  key: '',
  label: '',
  routePath: '',
  sortOrder: 1,
}

const menuColumnHelper = createColumnHelper<AppMenu>()

const formatMenuDate = (value?: string) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const mapApiMenuToAppMenu = (menu: V6MenuItem): AppMenu => ({
  created: formatMenuDate(menu.createdAtUtc),
  id: String(menu.id || menu.menuId || ''),
  isSystem: Boolean(menu.isSystem),
  key: String(menu.key || ''),
  label: String(menu.label || menu.key || 'Menu'),
  routePath: String(menu.routePath || '/'),
  sortOrder: Number(menu.sortOrder ?? 0),
})

export default function MenuProfileManagement({ onBack }: MenuProps) {
  const [menus, setMenus] = useState<AppMenu[]>([])
  const [isLoadingMenus, setIsLoadingMenus] = useState(true)
  const [isLoadingMenuDetails, setIsLoadingMenuDetails] = useState(false)
  const [isSavingMenu, setIsSavingMenu] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [isSetupOpen, setIsSetupOpen] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null)
  const [formState, setFormState] = useState<MenuFormState>(emptyMenuForm)

  const tableSearchOptions = useSettingsTableSearch()

  const loadMenus = useCallback(async () => {
    setIsLoadingMenus(true)

    try {
      const response = await getMenus()

      if (response.error) {
        showToast({ message: response.error, variant: 'error' })
        setMenus([])
        return
      }

      const mappedMenus = response.data
        .map(mapApiMenuToAppMenu)
        .sort((a, b) => a.sortOrder - b.sortOrder)

      setMenus(mappedMenus)
    } finally {
      setIsLoadingMenus(false)
    }
  }, [])

  useEffect(() => {
    void loadMenus()
  }, [loadMenus])

  const resetSetup = () => {
    setIsSetupOpen(false)
    setActiveStep(0)
    setEditingMenuId(null)
    setFormState(emptyMenuForm)
  }

  const openCreateMenu = () => {
    const nextSortOrder =
      menus.reduce((max, menu) => Math.max(max, menu.sortOrder), 0) + 1

    setEditingMenuId(null)
    setFormState({
      ...emptyMenuForm,
      sortOrder: nextSortOrder,
    })
    setActiveStep(0)
    setIsSetupOpen(true)
  }

  const openEditMenu = useCallback(async (menu: AppMenu) => {
    setIsLoadingMenuDetails(true)
    setOpenMenuId(null)

    try {
      const response = await getMenuById(menu.id)

      if (response.error || !response.data) {
        showToast({
          message: response.error || 'Failed to load menu',
          variant: 'error',
        })
        return
      }

      const mappedMenu = mapApiMenuToAppMenu(response.data)
      setEditingMenuId(mappedMenu.id)
      setFormState({
        key: mappedMenu.key,
        label: mappedMenu.label,
        routePath: mappedMenu.routePath,
        sortOrder: mappedMenu.sortOrder,
      })
      setActiveStep(0)
      setIsSetupOpen(true)
    } finally {
      setIsLoadingMenuDetails(false)
    }
  }, [])

  const deleteMenu = useCallback(
    async (menuId: string, isSystem: boolean) => {
      if (isSystem) {
        showToast({
          message: 'System menus cannot be deleted',
          variant: 'error',
        })
        return
      }

      const confirmed = window.confirm(
        'Are you sure you want to delete this menu?',
      )
      if (!confirmed) return

      const response = await deleteMenuApi(menuId)

      if (response.error) {
        showToast({ message: response.error, variant: 'error' })
        return
      }

      showToast({ message: 'Menu deleted successfully', variant: 'success' })
      setOpenMenuId(null)
      await loadMenus()
    },
    [loadMenus],
  )

  const saveMenu = async () => {
    const key = formState.key.trim()
    const label = formState.label.trim()
    const routePath = formState.routePath.trim()
    const sortOrder = Number(formState.sortOrder)

    if (!label || !routePath || Number.isNaN(sortOrder)) return

    setIsSavingMenu(true)
    try {
      if (editingMenuId) {
        const response = await updateMenuApi(editingMenuId, {
          label,
          routePath,
          sortOrder,
        })

        if (response.error) {
          showToast({ message: response.error, variant: 'error' })
          return
        }

        showToast({ message: 'Menu updated successfully', variant: 'success' })
      } else {
        if (!key) return

        const response = await createMenuApi({
          key,
          label,
          routePath,
          sortOrder,
        })

        if (response.error) {
          showToast({ message: response.error, variant: 'error' })
          return
        }

        showToast({ message: 'Menu created successfully', variant: 'success' })
      }

      resetSetup()
      await loadMenus()
    } finally {
      setIsSavingMenu(false)
    }
  }

  const menuColumns = useMemo(
    () => [
      menuColumnHelper.display({
        enableResizing: false,
        enableSorting: false,
        header: '',
        id: 'icon',
        maxSize: 48,
        meta: settingsHeaderMeta.center,
        minSize: 48,
        size: 48,
        cell: ({ row }) => {
          const Icon = menuIconByKey[row.original.key] || Menu

          return (
            <div className='flex justify-center'>
              <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--primary-3)] text-[var(--primary-9)]'>
                <Icon size={16} />
              </div>
            </div>
          )
        },
      }),
      menuColumnHelper.accessor('label', {
        enableSorting: false,
        header: 'Menu',
        id: 'label',
        meta: { ...settingsHeaderMeta.start, label: 'Menu' },
        minSize: 180,
        size: 220,
        cell: ({ row }) => {
          const menu = row.original

          return (
            <div className='min-w-0'>
              <div className='truncate font-semibold text-[var(--gray-13)]'>
                {menu.label}
              </div>
              <div className='mt-1 truncate text-sm text-[var(--gray-10)]'>
                {menu.key}
              </div>
            </div>
          )
        },
      }),
      menuColumnHelper.accessor('routePath', {
        enableSorting: false,
        header: 'Route',
        id: 'routePath',
        meta: settingsHeaderMeta.start,
        minSize: 160,
        size: 200,
        cell: ({ getValue }) => (
          <span className='block max-w-full truncate font-mono text-sm text-[var(--gray-12)]'>
            {getValue()}
          </span>
        ),
      }),
      menuColumnHelper.accessor('sortOrder', {
        enableSorting: false,
        header: 'Order',
        id: 'sortOrder',
        meta: settingsHeaderMeta.center,
        minSize: 90,
        size: 100,
        cell: ({ getValue }) => (
          <span className='rounded-[10px] border border-[var(--border-default)] bg-surface px-3 py-1 text-sm font-semibold text-[var(--gray-13)]'>
            {getValue()}
          </span>
        ),
      }),
      menuColumnHelper.display({
        enableSorting: false,
        header: 'Type',
        id: 'type',
        meta: settingsHeaderMeta.start,
        minSize: 110,
        size: 120,
        cell: ({ row }) => <TypeBadge isSystem={row.original.isSystem} />,
      }),
      menuColumnHelper.accessor('created', {
        enableSorting: false,
        header: 'Created',
        id: 'created',
        meta: settingsHeaderMeta.start,
        minSize: 110,
        size: 120,
        cell: ({ getValue }) => <span>{getValue()}</span>,
      }),
      menuColumnHelper.display({
        enableResizing: false,
        enableSorting: false,
        header: 'Actions',
        id: 'actions',
        meta: settingsHeaderMeta.end,
        minSize: 72,
        size: 72,
        cell: ({ row }) => {
          const menu = row.original

          return (
            <div className='relative flex justify-end'>
              <button
                className='rounded-lg p-2 text-[var(--gray-13)] transition hover:bg-[var(--gray-2)] disabled:cursor-not-allowed disabled:opacity-50'
                disabled={isLoadingMenuDetails}
                type='button'
                onClick={(event) => {
                  event.stopPropagation()
                  setOpenMenuId(openMenuId === menu.id ? null : menu.id)
                }}
              >
                <MoreHorizontal size={20} />
              </button>

              {openMenuId === menu.id ? (
                <div className='absolute top-10 right-0 z-50 w-40 overflow-hidden rounded-[10px] border border-[var(--border-default)] bg-surface py-1 text-left shadow-[var(--shadow-lg)]'>
                  <button
                    className='flex w-full items-center gap-2 px-3 py-2 text-[var(--gray-13)] hover:bg-[var(--gray-2)]'
                    type='button'
                    onClick={() => {
                      void openEditMenu(menu)
                    }}
                  >
                    <Edit3 size={15} />
                    Edit
                  </button>
                  <button
                    className='flex w-full items-center gap-2 px-3 py-2 text-[var(--red-11)] hover:bg-[var(--red-2)] disabled:cursor-not-allowed disabled:opacity-40'
                    disabled={menu.isSystem}
                    type='button'
                    onClick={() => {
                      void deleteMenu(menu.id, menu.isSystem)
                    }}
                  >
                    <Trash2 size={15} />
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
          )
        },
      }),
    ],
    [deleteMenu, isLoadingMenuDetails, openEditMenu, openMenuId],
  )

  const menuTable = useReactTable({
    ...settingsTableCoreOptions,
    ...tableSearchOptions,
    columns: menuColumns,
    data: menus,
    getRowId: (row) => row.id,
  })

  const { onRowSizeChange, rowSize, toolbar } = useSettingsTableToolbar({
    isReLoading: isLoadingMenus,
    table: menuTable,
    onReload: () => {
      void loadMenus()
    },
  })

  if (isSetupOpen) {
    return (
      <MenuSetup
        activeStep={activeStep}
        editingMenuId={editingMenuId}
        formState={formState}
        isSaving={isSavingMenu}
        onBack={() => setActiveStep((step) => Math.max(step - 1, 0))}
        onCancel={resetSetup}
        onChange={setFormState}
        onNext={() =>
          setActiveStep((step) => Math.min(step + 1, menuSteps.length - 1))
        }
        onSave={() => {
          void saveMenu()
        }}
        onStepChange={setActiveStep}
      />
    )
  }

  return (
    <main className='bg-[var(--surface)]'>
      <section>
        <SettingsPageHeader
          actions={
            <SettingsHeaderAddButton
              tooltip='Create Menu'
              onClick={openCreateMenu}
            />
          }
          description='Manage navigation menus, routes, and display order across the platform.'
          title='Menu & Profile Management'
          onBack={onBack}
        />

        <div className='px-6 md:px-8'>
          <SettingsTableToolbarRow toolbar={toolbar} />

          <div className='py-4'>
            <DataTable
              emptyDescription='Create a menu to add custom navigation items.'
              emptyIcon='lucide:menu'
              emptyTitle='No menus yet'
              hideActionBar
              isLoading={isLoadingMenus}
              isReLoading={isLoadingMenus}
              pageSize={Math.max(6, menus.length || 6)}
              rowSize={rowSize}
              table={menuTable}
              tableBodyMaxHeight='calc(100vh - 320px)'
              hideGrouping
              stickyHeader
              onReload={() => {
                void loadMenus()
              }}
              onRowSizeChange={onRowSizeChange}
            />
          </div>
        </div>
      </section>
    </main>
  )
}

function MenuSetup({
  activeStep,
  editingMenuId,
  formState,
  isSaving,
  onBack,
  onCancel,
  onChange,
  onNext,
  onSave,
  onStepChange,
}: {
  activeStep: number
  editingMenuId: string | null
  formState: MenuFormState
  isSaving: boolean
  onBack: () => void
  onCancel: () => void
  onChange: (form: MenuFormState) => void
  onNext: () => void
  onSave: () => void
  onStepChange: (step: number) => void
}) {
  const progress = useMemo(
    () => calculateMenuSetupProgress(formState, Boolean(editingMenuId)),
    [editingMenuId, formState],
  )
  const isLastStep = activeStep === menuSteps.length - 1
  const canContinueStepZero = editingMenuId
    ? Boolean(formState.label.trim())
    : Boolean(formState.key.trim() && formState.label.trim())
  const canContinueStepOne = Boolean(
    formState.routePath.trim() && formState.sortOrder >= 0,
  )
  const canSave = canContinueStepZero && canContinueStepOne

  return (
    <main className='min-h-screen bg-[var(--surface-muted)] text-[var(--text-primary)]'>
      <header className='border-b border-[var(--border-default)] bg-surface px-6 py-4'>
        <div className='flex items-start justify-between gap-5'>
          <div className='flex items-start gap-3'>
            <IconButton
              ariaLabel='Cancel setup'
              color='gray'
              icon='lucide:arrow-left'
              size='sm'
              variant='ghost'
              onClick={onCancel}
            />

            <div>
              <h1 className='text-[18px] leading-6 font-semibold text-[var(--gray-13)]'>
                {editingMenuId ? 'Edit Menu' : 'Create Menu'}
              </h1>
              <p className='mt-1 text-[14px] leading-5 text-[var(--gray-11)]'>
                Configure menu details, route path, and display order before
                saving.
              </p>
            </div>
          </div>

          <SetupProgressBar progress={progress} />
        </div>
      </header>

      <div className='grid min-h-[calc(100vh-96px)] grid-cols-1 lg:grid-cols-[296px_1fr]'>
        <aside className='border-r border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-9'>
          <div className='space-y-5'>
            {menuSteps.map((step, index) => {
              const isActive = index === activeStep
              const isCompleted = index < activeStep

              return (
                <button
                  className='group flex w-full items-center gap-5 rounded-[14px] px-3 py-2 text-left transition hover:bg-surface-raised'
                  key={step.key}
                  type='button'
                  onClick={() => onStepChange(index)}
                >
                  <div className='relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--gray-3)]'>
                    {index < menuSteps.length - 1 ? (
                      <span className='absolute top-8 left-1/2 h-12 w-[2px] -translate-x-1/2 bg-[var(--gray-3)]' />
                    ) : null}
                    <span
                      className={[
                        'z-10 flex h-8 w-8 items-center justify-center rounded-full transition',
                        isCompleted
                          ? 'text-[var(--primary-9)]'
                          : isActive
                            ? 'bg-[var(--primary-3)] text-[var(--primary-11)] ring-1 ring-[var(--primary-8)]'
                            : 'bg-[var(--gray-3)] text-[var(--gray-10)]',
                      ].join(' ')}
                    >
                      {isCompleted ? <Check size={14} /> : index + 1}
                    </span>
                  </div>
                  <div className='text-md font-semibold text-[var(--indigo-12)]'>
                    {step.title}
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        <section className='ez-scrollbar h-[calc(100vh-155px)] min-h-0 overflow-y-auto px-6 py-10 lg:px-20'>
          <div className='mx-auto max-w-[860px]'>
            {activeStep === 0 ? (
              <FormCard
                description='Define the menu key and display label shown in navigation.'
                title='Menu Details'
              >
                <div className='grid grid-cols-1 gap-5'>
                  {editingMenuId ? (
                    <InputText
                      disabled
                      label='Menu Key'
                      value={formState.key}
                      onChange={() => undefined}
                    />
                  ) : (
                    <InputText
                      label='Menu Key *'
                      placeholder='e.g. reports'
                      value={formState.key}
                      onChange={(value) =>
                        onChange({ ...formState, key: value })
                      }
                    />
                  )}
                  <InputText
                    label='Label *'
                    placeholder='e.g. Reports'
                    value={formState.label}
                    onChange={(value) =>
                      onChange({ ...formState, label: value })
                    }
                  />
                </div>
              </FormCard>
            ) : null}

            {activeStep === 1 ? (
              <FormCard
                description='Set the route path and sort order for this menu item.'
                title='Route & Order'
              >
                <div className='grid grid-cols-1 gap-5'>
                  <InputText
                    label='Route Path *'
                    placeholder='e.g. /reports'
                    value={formState.routePath}
                    onChange={(value) =>
                      onChange({ ...formState, routePath: value })
                    }
                  />
                  <InputNumber
                    label='Sort Order *'
                    min={0}
                    value={formState.sortOrder}
                    onChange={(value) =>
                      onChange({
                        ...formState,
                        sortOrder: Number(value) || 0,
                      })
                    }
                  />
                </div>
              </FormCard>
            ) : null}

            {activeStep === 2 ? (
              <FormCard
                description='Review the menu configuration before saving.'
                title='Review'
              >
                <div className='space-y-4 rounded-[14px] border border-[var(--border-default)] bg-surface p-5'>
                  <ReviewRow label='Menu Key' value={formState.key || '—'} />
                  <ReviewRow label='Label' value={formState.label || '—'} />
                  <ReviewRow
                    label='Route Path'
                    value={formState.routePath || '—'}
                  />
                  <ReviewRow
                    label='Sort Order'
                    value={String(formState.sortOrder)}
                  />
                </div>
              </FormCard>
            ) : null}

            <div className='mt-10 flex items-center justify-between'>
              <Button
                className='h-10 px-5'
                disabled={activeStep === 0}
                label='Back'
                variant='outline'
                onClick={onBack}
              />

              {isLastStep ? (
                <Button
                  className='h-10 border border-primary-10 bg-primary-11 px-5 text-surface'
                  disabled={!canSave || isSaving}
                  label={isSaving ? 'Saving...' : editingMenuId ? 'Update Menu' : 'Create Menu'}
                  onClick={onSave}
                />
              ) : (
                <Button
                  className='h-10 border border-primary-10 bg-primary-11 px-5 text-surface'
                  disabled={
                    (activeStep === 0 && !canContinueStepZero) ||
                    (activeStep === 1 && !canContinueStepOne)
                  }
                  label='Continue'
                  onClick={onNext}
                />
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function FormCard({
  children,
  description,
  title,
}: {
  children: ReactNode
  description: string
  title: string
}) {
  return (
    <div className='rounded-[18px] border border-[var(--border-default)] bg-surface p-8 shadow-[var(--shadow-sm)]'>
      <h2 className='text-[20px] font-semibold text-[var(--gray-13)]'>{title}</h2>
      <p className='mt-2 text-sm text-[var(--gray-11)]'>{description}</p>
      <div className='mt-8'>{children}</div>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex items-start justify-between gap-6 border-b border-[var(--gray-3)] pb-4 last:border-b-0 last:pb-0'>
      <span className='text-sm font-medium text-[var(--gray-10)]'>{label}</span>
      <span className='max-w-[65%] text-right text-sm font-semibold text-[var(--gray-13)]'>
        {value}
      </span>
    </div>
  )
}

function TypeBadge({ isSystem }: { isSystem: boolean }) {
  const tone = isSystem
    ? 'border-[var(--primary-6)] bg-[var(--primary-2)] text-[var(--primary-11)]'
    : 'border-[var(--gray-4)] bg-[var(--gray-2)] text-[var(--gray-11)]'

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}
    >
      {isSystem ? 'System' : 'Custom'}
    </span>
  )
}
