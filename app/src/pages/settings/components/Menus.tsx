import { t as staticT } from '@lingui/macro'
import { useLingui } from '@lingui/react/macro'
import { createColumnHelper, useReactTable } from '@tanstack/react-table'
import {
  Building2,
  Check,
  CheckSquare,
  FileCheck2,
  Inbox,
  LayoutDashboard,
  Menu as MenuIcon,
  MoreHorizontal,
  ScanLine,
} from 'lucide-react'
import {
  type ElementType,
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
import ConfirmDialog from '@/components/base/ConfirmDialog'
import DataTable from '@/components/base/data-table/DataTable'
import InputNumber from '@/components/base/inputs/InputNumber'
import InputText from '@/components/base/inputs/InputText'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import Pagination from '@/components/base/pagination/Pagination'
import showToast from '@/components/base/toast/showToast'
import { isDemoAppOrigin } from '@/utils/origin'
import { formatUtcToLocalDateTime } from '@/utils/utcDate'
import {
  getFieldRequiredError,
  getMissingRequiredLabels,
  getRequiredFieldErrorMessage,
} from '../helpers/requiredFieldErrors'
import {
  settingsHeaderMeta,
  settingsTableCoreOptions,
  useSettingsTablePagination,
  useSettingsTableSearch,
} from '../helpers/settingsDataTable'
import SettingsFormSection from './SettingsFormSection'
import SettingsPageHeader, {
  SettingsHeaderAddButton,
} from './SettingsPageHeader'
import SettingsWizardLayout from './SettingsWizardLayout'
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
  description: string
  key: 'details' | 'review' | 'route'
  title: string
}

const menuSteps: MenuStep[] = [
  {
    description: staticT`Menu key & label`,
    key: 'details',
    title: staticT`Menu Details`,
  },
  {
    description: staticT`Route path & sort order`,
    key: 'route',
    title: staticT`Route & Order`,
  },
  {
    description: staticT`Review & save menu settings`,
    key: 'review',
    title: staticT`Review`,
  },
]

const menuIconByKey: Record<string, ElementType> = {
  'approval-queue': CheckSquare,
  'dashboard': LayoutDashboard,
  'inbox': Inbox,
  'ocr-review': ScanLine,
  'processed-invoices': FileCheck2,
  'vendors': Building2,
}

const emptyMenuForm: MenuFormState = {
  key: '',
  label: '',
  routePath: '',
  sortOrder: 1,
}

const menuColumnHelper = createColumnHelper<AppMenu>()

const mapApiMenuToAppMenu = (menu: V6MenuItem): AppMenu => ({
  created: formatUtcToLocalDateTime(menu.createdAtUtc),
  id: String(menu.id || menu.menuId || ''),
  isSystem: Boolean(menu.isSystem),
  key: String(menu.key || ''),
  label: String(menu.label || menu.key || 'Menu'),
  routePath: String(menu.routePath || '/'),
  sortOrder: Number(menu.sortOrder ?? 0),
})

export default function MenuProfileManagement({ onBack }: MenuProps) {
  const { t } = useLingui()
  const [menus, setMenus] = useState<AppMenu[]>([])
  const [isLoadingMenus, setIsLoadingMenus] = useState(true)
  const [isLoadingMenuDetails, setIsLoadingMenuDetails] = useState(false)
  const [isSavingMenu, setIsSavingMenu] = useState(false)
  const [deletingMenuId, setDeletingMenuId] = useState<string | null>(null)
  const [isDeletingMenu, setIsDeletingMenu] = useState(false)
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

  const openEditMenu = useCallback(
    async (menu: AppMenu) => {
      setIsLoadingMenuDetails(true)

      try {
        const response = await getMenuById(menu.id)

        if (response.error || !response.data) {
          showToast({
            message: response.error || t`Failed to load menu`,
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
    },
    [t],
  )

  const deletingMenu = useMemo(
    () => menus.find((menu) => menu.id === deletingMenuId) || null,
    [deletingMenuId, menus],
  )

  const deleteMenu = useCallback(
    (menuId: string, isSystem: boolean) => {
      if (isSystem) {
        showToast({
          message: t`System menus cannot be deleted`,
          variant: 'error',
        })
        return
      }

      setDeletingMenuId(menuId)
    },
    [t],
  )

  const cancelDeleteMenu = useCallback(() => {
    if (isDeletingMenu) return
    setDeletingMenuId(null)
  }, [isDeletingMenu])

  const confirmDeleteMenu = useCallback(async () => {
    if (!deletingMenuId) return

    setIsDeletingMenu(true)
    try {
      const response = await deleteMenuApi(deletingMenuId)

      if (response.error) {
        showToast({ message: response.error, variant: 'error' })
        return
      }

      showToast({ message: t`Menu deleted successfully`, variant: 'success' })
      setDeletingMenuId(null)
      await loadMenus()
    } finally {
      setIsDeletingMenu(false)
    }
  }, [deletingMenuId, loadMenus, t])

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

        showToast({ message: t`Menu updated successfully`, variant: 'success' })
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

        showToast({ message: t`Menu created successfully`, variant: 'success' })
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
          const Icon = menuIconByKey[row.original.key] || MenuIcon

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
        header: t`Menu`,
        id: 'label',
        meta: { ...settingsHeaderMeta.start, label: t`Menu` },
        minSize: 180,
        size: 220,
        cell: ({ row }) => {
          const menu = row.original

          return (
            <div className='min-w-0'>
              <button
                className='max-w-full text-left font-semibold text-[var(--gray-13)] transition-colors hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50'
                disabled={isLoadingMenuDetails}
                type='button'
                onClick={() => {
                  void openEditMenu(menu)
                }}
              >
                {menu.label}
              </button>
              <div className='mt-1 text-sm text-[var(--gray-10)]'>
                {menu.key}
              </div>
            </div>
          )
        },
      }),
      menuColumnHelper.accessor('routePath', {
        enableSorting: false,
        header: t`Route`,
        id: 'routePath',
        meta: settingsHeaderMeta.start,
        minSize: 160,
        size: 200,
        cell: ({ getValue }) => (
          <span className='font-mono text-sm text-[var(--gray-12)]'>
            {getValue()}
          </span>
        ),
      }),
      menuColumnHelper.accessor('sortOrder', {
        enableSorting: false,
        header: t`Order`,
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
        header: t`Type`,
        id: 'type',
        meta: settingsHeaderMeta.start,
        minSize: 110,
        size: 120,
        cell: ({ row }) => <TypeBadge isSystem={row.original.isSystem} />,
      }),
      menuColumnHelper.accessor('created', {
        enableSorting: false,
        header: t`Created`,
        id: 'created',
        meta: settingsHeaderMeta.start,
        minSize: 110,
        size: 120,
        cell: ({ getValue }) => <span>{getValue()}</span>,
      }),
      menuColumnHelper.display({
        enableResizing: false,
        enableSorting: false,
        header: t`Actions`,
        id: 'actions',
        meta: settingsHeaderMeta.end,
        minSize: 72,
        size: 72,
        cell: ({ row }) => {
          const menu = row.original

          return (
            <div
              className='flex justify-end'
              onClick={(event) => event.stopPropagation()}
            >
              <Menu
                position='bottom-end'
                width={160}
                withinPortal
                target={
                  <button
                    className='rounded-lg p-2 text-[var(--gray-13)] transition hover:bg-[var(--gray-2)] disabled:cursor-not-allowed disabled:opacity-50'
                    disabled={isLoadingMenuDetails}
                    type='button'
                  >
                    <MoreHorizontal size={20} />
                  </button>
                }
              >
                <MenuItem
                  icon='lucide:pencil'
                  label={t`Edit`}
                  onClick={() => {
                    void openEditMenu(menu)
                  }}
                />
                <MenuItem
                  className='text-red-11'
                  disabled={menu.isSystem}
                  icon='lucide:trash-2'
                  iconClass='text-red-11'
                  label={t`Delete`}
                  onClick={() => {
                    void deleteMenu(menu.id, menu.isSystem)
                  }}
                />
              </Menu>
            </div>
          )
        },
      }),
    ],
    [deleteMenu, isLoadingMenuDetails, openEditMenu, t],
  )

  const {
    page,
    pageSize,
    pagination,
    paginationModel,
    onPageChange,
    onPageSizeChange,
    onPaginationChange,
  } = useSettingsTablePagination()

  const menuTable = useReactTable({
    ...settingsTableCoreOptions,
    ...tableSearchOptions,
    ...paginationModel,
    columns: menuColumns,
    data: menus,
    state: {
      ...tableSearchOptions.state,
      pagination,
    },
    getRowId: (row) => row.id,
    onPaginationChange,
  })

  const { rowSize, toolbar, onRowSizeChange } = useSettingsTableToolbar({
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
        onBackToSettings={onBack}
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
    <main className='flex h-full min-h-0 flex-col overflow-hidden bg-[var(--surface)]'>
      <ConfirmDialog
        confirmLabel={t`Delete`}
        isConfirming={isDeletingMenu}
        opened={Boolean(deletingMenuId)}
        title={t`Delete Menu`}
        variant='danger'
        description={
          deletingMenu
            ? t`Are you sure you want to delete "${deletingMenu.label}"? This action cannot be undone.`
            : t`Are you sure you want to delete this menu? This action cannot be undone.`
        }
        onCancel={cancelDeleteMenu}
        onConfirm={() => {
          void confirmDeleteMenu()
        }}
      />
      <section className='flex min-h-0 flex-1 flex-col overflow-hidden'>
        <SettingsPageHeader
          description={t`Manage navigation menus, routes, and display order across the platform.`}
          title={t`Menu & Profile Management`}
          toolbar={toolbar}
          actions={
            <SettingsHeaderAddButton
              tooltip={t`Create Menu`}
              onClick={openCreateMenu}
            />
          }
          onBack={onBack}
        />

        <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 py-4'>
          <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
            <div className='min-h-0 flex-1 overflow-hidden'>
              <DataTable
                emptyDescription={t`Create a menu to add custom navigation items.`}
                emptyIcon='lucide:menu'
                emptyTitle={t`No menus yet`}
                isLoading={isLoadingMenus}
                isReLoading={isLoadingMenus}
                pageSize={pageSize}
                rowSize={rowSize}
                table={menuTable}
                hideActionBar
                hideGrouping
                stickyHeader
                onReload={() => {
                  void loadMenus()
                }}
                onRowSizeChange={onRowSizeChange}
              />
            </div>
            <Pagination
              className='mt-4 shrink-0'
              itemLabel={t`Menus`}
              page={page}
              pageSize={pageSize}
              showPageNumbers={false}
              totalItems={menuTable.getFilteredRowModel().rows.length}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
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
  onBackToSettings,
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
  onBackToSettings?: () => void
  onCancel: () => void
  onChange: (form: MenuFormState) => void
  onNext: () => void
  onSave: () => void
  onStepChange: (step: number) => void
}) {
  const { t } = useLingui()
  const [showErrors, setShowErrors] = useState(false)

  const getMissingLabels = (step = activeStep) => {
    if (step === 0) {
      return getMissingRequiredLabels([
        ...(editingMenuId
          ? []
          : [{ label: t`Menu Key`, value: formState.key }]),
        { label: t`Label`, value: formState.label },
      ])
    }

    if (step === 1) {
      return getMissingRequiredLabels([
        { label: t`Route Path`, value: formState.routePath },
        {
          label: t`Sort Order`,
          value: formState.sortOrder >= 0 ? formState.sortOrder : '',
        },
      ])
    }

    return getMissingRequiredLabels([
      ...(editingMenuId ? [] : [{ label: t`Menu Key`, value: formState.key }]),
      { label: t`Label`, value: formState.label },
      { label: t`Route Path`, value: formState.routePath },
      {
        label: t`Sort Order`,
        value: formState.sortOrder >= 0 ? formState.sortOrder : '',
      },
    ])
  }

  const handleNext = () => {
    if (!isDemoAppOrigin()) {
      const missingLabels = getMissingLabels(activeStep)

      if (missingLabels.length) {
        setShowErrors(true)
        showToast({
          message: t`Please complete all required menu details before continuing.`,
          variant: 'info',
        })
        return
      }
    }

    setShowErrors(false)
    onNext()
  }

  const handleSave = () => {
    const missingLabels = getMissingLabels()

    if (missingLabels.length) {
      setShowErrors(true)
      if (
        missingLabels.includes(t`Menu Key`) ||
        missingLabels.includes(t`Label`)
      ) {
        onStepChange(0)
      } else if (
        missingLabels.includes(t`Route Path`) ||
        missingLabels.includes(t`Sort Order`)
      ) {
        onStepChange(1)
      }
      showToast({
        message: t`Please complete all required menu details before continuing.`,
        variant: 'info',
      })
      return
    }

    setShowErrors(false)
    onSave()
  }

  const handleStepChange = (step: number) => {
    if (!isDemoAppOrigin() && step > activeStep) {
      for (let index = activeStep; index < step; index += 1) {
        const missingLabels = getMissingLabels(index)

        if (missingLabels.length) {
          setShowErrors(true)
          onStepChange(index)
          showToast({
            message: t`Please complete all required menu details before continuing.`,
            variant: 'info',
          })
          return
        }
      }
    }

    setShowErrors(false)
    onStepChange(step)
  }

  const handleBack = () => {
    setShowErrors(false)
    onBack()
  }

  const wizardSteps = useMemo(() => {
    const allowAnyStep = isDemoAppOrigin()
    return menuSteps.map((s, idx) => ({
      clickable: allowAnyStep ? true : undefined,
      description: s.description,
      disabled: allowAnyStep ? false : undefined,
      icon:
        s.key === 'details'
          ? 'tabler:menu-2'
          : s.key === 'route'
            ? 'tabler:route'
            : 'tabler:check',
      id: idx,
      label: s.title,
    }))
  }, [])

  return (
    <SettingsWizardLayout
      activeStep={activeStep}
      headerDescription={t`Configure application navigation menus, route paths, and display order`}
      headerTitle={editingMenuId ? t`Edit Menu Setup` : t`New Menu Setup`}
      isSaving={isSaving}
      moduleTitle={t`Menu & Profile Management`}
      saveLabel={editingMenuId ? t`Update Menu` : t`Save Menu`}
      steps={wizardSteps}
      setupTitle={editingMenuId ? t`Edit Menu` : t`Create Menu`}
      onBack={handleBack}
      onBackToSettings={onBack}
      onCancel={onCancel}
      onNext={handleNext}
      onSave={handleSave}
      onStepChange={handleStepChange}
    >
      {activeStep === 0 ? (
        <SettingsFormSection>
          {editingMenuId ? (
            <InputText
              label={t`Menu Key`}
              value={formState.key}
              disabled
              onChange={() => undefined}
            />
          ) : (
            <InputText
              label={t`Menu Key *`}
              placeholder={t`e.g. reports`}
              value={formState.key}
              error={getFieldRequiredError(
                t`Menu Key`,
                showErrors,
                formState.key,
              )}
              onChange={(value) => onChange({ ...formState, key: value })}
            />
          )}
          <InputText
            error={getFieldRequiredError(t`Label`, showErrors, formState.label)}
            label={t`Label *`}
            placeholder={t`e.g. Reports`}
            value={formState.label}
            onChange={(value) => onChange({ ...formState, label: value })}
          />
        </SettingsFormSection>
      ) : null}

      {activeStep === 1 ? (
        <SettingsFormSection>
          <InputText
            label={t`Route Path *`}
            placeholder={t`e.g. /reports`}
            value={formState.routePath}
            error={getFieldRequiredError(
              t`Route Path`,
              showErrors,
              formState.routePath,
            )}
            onChange={(value) => onChange({ ...formState, routePath: value })}
          />
          <InputNumber
            label={t`Sort Order *`}
            min={0}
            value={formState.sortOrder}
            error={
              showErrors && !(formState.sortOrder >= 0)
                ? t`Please enter Sort Order.`
                : undefined
            }
            onChange={(value) =>
              onChange({
                ...formState,
                sortOrder: Number(value) || 0,
              })
            }
          />
        </SettingsFormSection>
      ) : null}

      {activeStep === 2 ? (
        <SettingsFormSection>
          <div className='rounded-[14px] border border-[var(--border-default)] bg-surface p-6'>
            <h3 className='text-md mb-6 font-semibold text-[var(--gray-13)]'>
              {t`Menu Summary`}
            </h3>
            <div className='grid grid-cols-1 gap-x-12 gap-y-4 text-sm md:grid-cols-2'>
              <SummaryItem label={t`Menu Key`} value={formState.key || '—'} />
              <SummaryItem label={t`Label`} value={formState.label || '—'} />
              <SummaryItem
                label={t`Route Path`}
                value={formState.routePath || '—'}
              />
              <SummaryItem
                label={t`Sort Order`}
                value={String(formState.sortOrder)}
              />
            </div>
          </div>
        </SettingsFormSection>
      ) : null}
    </SettingsWizardLayout>
  )
}

function MenuStepIcon({ step }: { step: MenuStep['key'] }) {
  if (step === 'details') return <MenuIcon size={14} />
  if (step === 'route') return <LayoutDashboard size={14} />
  return <Check size={14} />
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className='font-semibold text-[var(--gray-11)]'>{label}: </span>
      <span className='ml-2 text-[var(--gray-10)]'>{value}</span>
    </div>
  )
}

function TypeBadge({ isSystem }: { isSystem: boolean }) {
  const { t } = useLingui()
  const tone = isSystem
    ? 'border-[var(--primary-6)] bg-[var(--primary-2)] text-[var(--primary-11)]'
    : 'border-[var(--gray-4)] bg-[var(--gray-2)] text-[var(--gray-11)]'

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}
    >
      {isSystem ? t`System` : t`Custom`}
    </span>
  )
}
