import { msg } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { createColumnHelper, useReactTable } from '@tanstack/react-table'
import { MoreHorizontal } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Option } from '@/types/option'
import formApi from '@/api/form/form'
import workflowsApiV6, {
  createPublishedWorkflowBrowsePayload,
  mapPublishedBrowseResponseToOptions,
} from '@/api/v6/workflows'
import IconButton from '@/components/base/button/IconButton'
import ConfirmDialog from '@/components/base/ConfirmDialog'
import TableExport from '@/components/base/data-table/actions/TableExport'
import TableSearch from '@/components/base/data-table/actions/TableSearch'
import DataTable from '@/components/base/data-table/DataTable'
import InputCheckbox from '@/components/base/inputs/InputCheckbox'
import InputRadioGroup from '@/components/base/inputs/InputRadioGroup'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import Pagination from '@/components/base/pagination/Pagination'
import showToast from '@/components/base/toast/showToast'
import { AnimateFadeIn } from '@/components/common/animations'
import CustomFilter from '@/components/common/CustomFilter'
import {
  BRANDING_STORAGE_KEYS,
  readBrandingSession,
} from '@/lib/branding/session'
import authUserStore from '@/stores/authUserStore'
import { formatDatetime } from '@/utils/dayjs'
import { matchesCategoryFilterValue } from '@/utils/filterUtils'
import type { SettingsOption } from '../helpers/userGroupMappers'
import {
  applyLoginType,
  deletePortalConfig,
  emptyPortalConfig,
  getPortalPublicUrl,
  listPortalConfigs,
  nextPortalId,
  type PortalBrandingSnapshot,
  type PortalConfig,
  type PortalLoginType,
  savePortalConfig,
} from '../helpers/portalConfigStorage'
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
import SettingsPageHeader from './SettingsPageHeader'
import SettingsSelectedChips from './SettingsSelectedChips'
import SettingsWizardLayout from './SettingsWizardLayout'
import useSettingsTableToolbar from './useSettingsTableToolbar'

const SESSION_KEY = 'ezofis_portal_configuration_state'

const PORTAL_STEP_MSGS = [
  {
    description: msg`Portal name and description`,
    icon: 'tabler:app-window',
    key: 'details' as const,
    title: msg`Portal Details`,
  },
  {
    description: msg`Choose how users sign in to this portal`,
    icon: 'tabler:shield-lock',
    key: 'authentication' as const,
    title: msg`Authentication`,
  },
  {
    description: msg`Connect one or more workflows to this portal`,
    icon: 'tabler:git-fork',
    key: 'workflows' as const,
    title: msg`Workflows`,
  },
  {
    description: msg`Review and save portal settings`,
    icon: 'tabler:check',
    key: 'review' as const,
    title: msg`Review`,
  },
]

const LOGIN_TYPE_OPTIONS = [
  {
    description: 'Sends OTP to the Email',
    id: 1,
    name: 'Email with OTP',
    value: 'emailOtp' as const,
  },
  {
    description: 'Validate accounts to application users',
    id: 2,
    name: 'Application Login',
    value: 'applicationLogin' as const,
  },
  {
    description: 'Validate accounts to master',
    id: 3,
    name: 'Master Login',
    value: 'masterLogin' as const,
  },
]

const LOGIN_TYPE_LABELS: Record<PortalLoginType, string> = {
  applicationLogin: 'Application Login',
  emailOtp: 'Email with OTP',
  masterLogin: 'Master Login',
}

const FALLBACK_FORM_OPTIONS: Option[] = [
  { id: '1', name: 'Employee Master' },
  { id: '2', name: 'Vendor Master' },
  { id: '3', name: 'Customer Master' },
]

const FALLBACK_FIELD_OPTIONS: Option[] = [
  { id: 'email', name: 'Email' },
  { id: 'username', name: 'Username' },
  { id: 'firstName', name: 'First Name' },
  { id: 'lastName', name: 'Last Name' },
  { id: 'password', name: 'Password' },
  { id: 'employeeId', name: 'Employee ID' },
]

const portalColumnHelper = createColumnHelper<PortalConfig>()

function getStoredState() {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

const parseStoredColorMap = (raw: string) => {
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw) as Record<string, string>
    return parsed && typeof parsed === 'object' && Object.keys(parsed).length
      ? parsed
      : undefined
  } catch {
    return undefined
  }
}

const capturePortalBranding = (): PortalBrandingSnapshot => {
  const light = parseStoredColorMap(
    readBrandingSession(BRANDING_STORAGE_KEYS.light),
  )
  const dark = parseStoredColorMap(
    readBrandingSession(BRANDING_STORAGE_KEYS.dark),
  )

  return {
    applySurfaceBackground:
      readBrandingSession(BRANDING_STORAGE_KEYS.applySurface) === 'true',
    brandName: readBrandingSession(BRANDING_STORAGE_KEYS.brandName) || '',
    colorPreferences:
      light || dark
        ? {
            dark,
            light,
          }
        : undefined,
    favicon: readBrandingSession(BRANDING_STORAGE_KEYS.favicon) || '',
    logo: readBrandingSession(BRANDING_STORAGE_KEYS.logo) || '',
  }
}

const optionFromId = (id: string | number | undefined, options: Option[]) => {
  if (id == null || id === '' || id === 0 || id === '0') return null
  const match = options.find((option) => String(option.id) === String(id))
  return match || { id, name: String(id) }
}

const extractFormFields = (formJson: unknown): Option[] => {
  let parsed = formJson
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed)
    } catch {
      return []
    }
  }
  if (!parsed || typeof parsed !== 'object') return []
  const record = parsed as Record<string, unknown>
  const rawFields = Array.isArray(record.panels)
    ? record.panels.flatMap((panel) => {
        const row = panel as Record<string, unknown>
        return Array.isArray(row.fields) ? row.fields : []
      })
    : Array.isArray(record.fields)
      ? record.fields
      : Array.isArray(record.components)
        ? record.components
        : []

  return rawFields
    .map((field) => {
      const row = field as Record<string, unknown>
      const id = String(row.id || row.key || row.name || '')
      const name = String(row.label || row.title || row.name || row.id || '')
      return id ? { id, name: name || id } : null
    })
    .filter((field): field is Option => Boolean(field))
}

const loginTypeToRadioId = (loginType: PortalLoginType) => {
  if (loginType === 'applicationLogin') return 2
  if (loginType === 'masterLogin') return 3
  return 1
}

const radioIdToLoginType = (id: number): PortalLoginType => {
  if (id === 2) return 'applicationLogin'
  if (id === 3) return 'masterLogin'
  return 'emailOtp'
}

export default function PortalConfiguration({
  onBack,
}: {
  onBack?: () => void
}) {
  const { t } = useLingui()
  const session = authUserStore((state) => state.session)
  const storedState = useMemo(() => getStoredState(), [])

  const [portals, setPortals] = useState<PortalConfig[]>([])
  const [isLoadingPortals, setIsLoadingPortals] = useState(true)
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>(
    storedState?.activeFilters ?? {},
  )
  const [isSetupOpen, setIsSetupOpen] = useState(
    storedState?.isSetupOpen ?? false,
  )
  const [editingPortalId, setEditingPortalId] = useState<number | null>(
    storedState?.editingPortalId ?? null,
  )
  const [activeStep, setActiveStep] = useState(storedState?.activeStep ?? 0)
  const [draftPortal, setDraftPortal] = useState<PortalConfig>(() => {
    const stored = storedState?.draftPortal
    if (!stored || typeof stored !== 'object') return emptyPortalConfig()
    return {
      ...emptyPortalConfig(),
      ...stored,
      authentication: {
        ...emptyPortalConfig().authentication,
        ...(stored.authentication || {}),
      },
      loginType:
        stored.loginType === 'masterLogin' ||
        stored.loginType === 'applicationLogin' ||
        stored.loginType === 'emailOtp'
          ? stored.loginType
          : 'emailOtp',
      workflows: Array.isArray(stored.workflows) ? stored.workflows : [],
    }
  })
  const [deletingPortalId, setDeletingPortalId] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          activeFilters,
          activeStep,
          draftPortal,
          editingPortalId,
          isSetupOpen,
        }),
      )
    } catch {
      // ignore
    }
  }, [activeFilters, activeStep, draftPortal, editingPortalId, isSetupOpen])

  const portalJsonIds = useMemo(
    () => ({
      tenantId: session?.tenantId || '',
      userId: session?.id || '',
    }),
    [session?.id, session?.tenantId],
  )

  const reloadPortals = useCallback(async () => {
    setIsLoadingPortals(true)
    const result = await listPortalConfigs(portalJsonIds)
    setPortals(result.data)
    setIsLoadingPortals(false)
    if (result.error) {
      showToast({ message: result.error, variant: 'error' })
    }
  }, [portalJsonIds])

  useEffect(() => {
    void reloadPortals()
  }, [reloadPortals])

  const filteredPortals = useMemo(() => {
    return portals.filter((portal) => {
      let matches = true
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (!value) return
        if (key === 'name') {
          if (!matchesCategoryFilterValue(portal.name, value, 'contains')) {
            matches = false
          }
        } else if (key === 'login') {
          const labels = [
            LOGIN_TYPE_LABELS[portal.loginType],
            ...portal.authentication.socialLogin,
          ].join(' ')
          if (!matchesCategoryFilterValue(labels, value, 'contains')) {
            matches = false
          }
        }
      })
      return matches
    })
  }, [activeFilters, portals])

  const tableSearchOptions = useSettingsTableSearch(SESSION_KEY)

  const openCreatePortal = () => {
    setEditingPortalId(null)
    setDraftPortal(emptyPortalConfig())
    setActiveStep(0)
    setIsSetupOpen(true)
  }

  const openEditPortal = useCallback((portal: PortalConfig) => {
    setEditingPortalId(portal.id)
    setDraftPortal({
      ...emptyPortalConfig(),
      ...portal,
      authentication: {
        ...emptyPortalConfig().authentication,
        ...portal.authentication,
      },
    })
    setActiveStep(0)
    setIsSetupOpen(true)
  }, [])

  const savePortal = async () => {
    setIsSaving(true)
    try {
      const now = new Date().toISOString()
      const isEdit = Boolean(editingPortalId)
      const branding = capturePortalBranding()
      const next: PortalConfig = {
        ...draftPortal,
        authentication: applyLoginType(
          draftPortal.loginType,
          draftPortal.authentication,
        ),
        branding: {
          ...draftPortal.branding,
          ...branding,
          brandName:
            branding.brandName || draftPortal.branding?.brandName || '',
          favicon: branding.favicon || draftPortal.branding?.favicon || '',
          logo: branding.logo || draftPortal.branding?.logo || '',
        },
        createdAt: isEdit ? draftPortal.createdAt || now : now,
        createdBy: isEdit
          ? draftPortal.createdBy || session?.id || '1'
          : session?.id || '1',
        createdByEmail: isEdit
          ? draftPortal.createdByEmail || session?.email || ''
          : session?.email || '',
        id: isEdit ? Number(editingPortalId) : nextPortalId(portals),
        modifiedAt: isEdit ? now : null,
        modifiedBy: isEdit ? session?.id || '0' : '0',
        modifiedByEmail: isEdit ? session?.email || null : null,
        tenantId: session?.tenantId || draftPortal.tenantId || '',
        workflow: draftPortal.workflows[0]?.name || '',
        workflowId: draftPortal.workflows[0]?.id || '',
      }

      const result = await savePortalConfig(next, portalJsonIds)
      if (result.error) {
        showToast({ message: result.error, variant: 'error' })
        return
      }
      await reloadPortals()
      setIsSetupOpen(false)
      showToast({
        message: isEdit
          ? t`Portal updated successfully`
          : t`Portal created successfully`,
        variant: 'success',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const confirmDeletePortal = async () => {
    if (deletingPortalId == null) return
    const result = await deletePortalConfig(deletingPortalId, portalJsonIds)
    if (result.error) {
      showToast({ message: result.error, variant: 'error' })
      return
    }
    await reloadPortals()
    setDeletingPortalId(null)
    showToast({ message: t`Portal deleted successfully`, variant: 'success' })
  }

  const copyPortalUrl = useCallback(
    async (id: number | string) => {
      const url = getPortalPublicUrl(id, portalJsonIds)
      try {
        await navigator.clipboard.writeText(url)
        showToast({ message: t`Portal URL copied`, variant: 'success' })
      } catch {
        showToast({ message: t`Could not copy URL`, variant: 'error' })
      }
    },
    [portalJsonIds, t],
  )

  const deletingPortal = portals.find(
    (portal) => portal.id === deletingPortalId,
  )

  const portalColumns = useMemo(
    () => [
      portalColumnHelper.accessor('name', {
        enableSorting: false,
        header: t`Name`,
        id: 'name',
        meta: { ...settingsHeaderMeta.start, label: t`Name` },
        minSize: 160,
        size: 220,
      }),
      portalColumnHelper.accessor('description', {
        enableSorting: false,
        header: t`Description`,
        id: 'description',
        meta: settingsHeaderMeta.start,
        minSize: 140,
        size: 200,
        cell: ({ getValue }) => <span>{getValue() || '—'}</span>,
      }),
      portalColumnHelper.display({
        enableSorting: false,
        header: t`Login`,
        id: 'login',
        meta: settingsHeaderMeta.start,
        minSize: 160,
        size: 220,
        cell: ({ row }) => {
          const labels = [
            LOGIN_TYPE_LABELS[row.original.loginType],
            ...row.original.authentication.socialLogin,
          ]
            .filter(Boolean)
            .join(', ')
          return <span>{labels || '—'}</span>
        },
      }),
      portalColumnHelper.display({
        enableSorting: false,
        header: t`Workflows`,
        id: 'workflows',
        meta: settingsHeaderMeta.start,
        minSize: 140,
        size: 200,
        cell: ({ row }) => {
          const names = row.original.workflows
            .map((workflow) => workflow.name)
            .filter(Boolean)
          return <span>{names.join(', ') || row.original.workflow || '—'}</span>
        },
      }),
      portalColumnHelper.accessor('createdAt', {
        enableSorting: false,
        header: t`Created`,
        id: 'createdAt',
        meta: settingsHeaderMeta.start,
        minSize: 140,
        size: 170,
        cell: ({ getValue }) => {
          const raw = String(getValue() || '')
          if (!raw) return <span>—</span>
          return <span>{formatDatetime(raw, 'datetime')}</span>
        },
      }),
      portalColumnHelper.accessor('createdByEmail', {
        enableSorting: false,
        header: t`Created by`,
        id: 'createdByEmail',
        meta: settingsHeaderMeta.start,
        minSize: 140,
        size: 180,
        cell: ({ getValue }) => <span>{getValue() || '—'}</span>,
      }),
      portalColumnHelper.display({
        enableResizing: false,
        enableSorting: false,
        header: '',
        id: 'actions',
        meta: settingsHeaderMeta.end,
        minSize: 56,
        size: 56,
        cell: ({ row }) => {
          const portal = row.original
          return (
            <div
              className='flex justify-end'
              onClick={(event) => event.stopPropagation()}
            >
              <Menu
                position='bottom-end'
                width={180}
                withinPortal
                target={
                  <button
                    className='rounded-lg p-2 text-[var(--gray-13)] transition hover:bg-[var(--gray-2)]'
                    type='button'
                  >
                    <MoreHorizontal size={20} />
                  </button>
                }
              >
                <MenuItem
                  icon='lucide:pencil'
                  label={t`Edit`}
                  onClick={() => openEditPortal(portal)}
                />
                <MenuItem
                  icon='lucide:copy'
                  label={t`Copy URL`}
                  onClick={() => void copyPortalUrl(portal.id)}
                />
                {/* <MenuItem
                  icon='lucide:external-link'
                  label={t`Open portal`}
                  onClick={() =>
                    window.open(
                      getPortalPublicUrl(portal.id, portalJsonIds),
                      '_blank',
                      'noopener',
                    )
                  }
                /> */}
                <MenuItem
                  className='text-red-11'
                  icon='lucide:trash-2'
                  iconClass='text-red-11'
                  label={t`Delete`}
                  onClick={() => setDeletingPortalId(portal.id)}
                />
              </Menu>
            </div>
          )
        },
      }),
    ],
    [copyPortalUrl, openEditPortal, t],
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

  const portalTable = useReactTable({
    ...settingsTableCoreOptions,
    ...tableSearchOptions,
    ...paginationModel,
    columns: portalColumns,
    data: filteredPortals,
    state: {
      ...tableSearchOptions.state,
      pagination,
    },
    getRowId: (row: PortalConfig) => String(row.id),
    onPaginationChange,
  })

  const { rowSize, onRowSizeChange } = useSettingsTableToolbar({
    isReLoading: isLoadingPortals,
    table: portalTable,
    onReload: reloadPortals,
  })

  if (isSetupOpen) {
    return (
      <PortalSetup
        activeStep={activeStep}
        draftPortal={draftPortal}
        editingPortalId={editingPortalId}
        isSaving={isSaving}
        publicUrlIds={portalJsonIds}
        previewPortalId={
          editingPortalId || draftPortal.id || nextPortalId(portals)
        }
        onBack={() => setActiveStep((step: number) => Math.max(step - 1, 0))}
        onBackToSettings={onBack}
        onCancel={() => setIsSetupOpen(false)}
        onChange={setDraftPortal}
        onNext={() => setActiveStep((step: number) => Math.min(step + 1, 3))}
        onSave={() => void savePortal()}
        onStepChange={setActiveStep}
      />
    )
  }

  return (
    <main className='flex h-full flex-col bg-[var(--surface)]'>
      <ConfirmDialog
        confirmLabel={t`Delete`}
        opened={deletingPortalId != null}
        title={t`Delete Portal`}
        variant='danger'
        description={
          deletingPortal
            ? `Are you sure you want to delete "${deletingPortal.name}"? This action cannot be undone.`
            : 'Are you sure you want to delete this portal? This action cannot be undone.'
        }
        onCancel={() => setDeletingPortalId(null)}
        onConfirm={() => void confirmDeletePortal()}
      />
      <section className='flex min-h-0 flex-1 flex-col'>
        <SettingsPageHeader
          description={t`Create branded portals with login methods and connected workflows.`}
          title={t`Portal Configuration`}
          onBack={onBack}
        />
        <div className='flex flex-1 flex-col overflow-hidden p-4'>
          <CustomFilter
            activeFilters={activeFilters}
            customSearchComponent={<TableSearch table={portalTable as never} />}
            actionButtons={[
              {
                color: 'gray',
                icon: 'tabler:refresh',
                id: 'refresh',
                isIconButton: true,
                tooltip: 'Refresh',
                variant: 'outline',
                onClick: reloadPortals,
              },
            ]}
            addButton={{
              tooltip: 'Add Portal',
              onClick: openCreatePortal,
            }}
            filters={[
              {
                id: 'name',
                label: t`Name`,
                options: portals
                  .map((portal) => String(portal.name || '').trim())
                  .filter(Boolean)
                  .sort((a, b) => a.localeCompare(b))
                  .map((name) => ({ label: name, value: name })),
                searchable: true,
                searchPlaceholder: 'Search name...',
              },
              {
                id: 'login',
                label: t`Login`,
                options: [
                  ...Object.values(LOGIN_TYPE_LABELS).map((label) => ({
                    label,
                    value: label,
                  })),
                  { label: 'Google', value: 'Google' },
                  { label: 'Microsoft', value: 'Microsoft' },
                ],
              },
            ]}
            showReset={
              Object.keys(activeFilters).some((key) => activeFilters[key]) ||
              !!tableSearchOptions.state.globalFilter?.value
            }
            trailingActions={
              <TableExport fileName='portals' table={portalTable as never} />
            }
            onFilterChange={(id, val) =>
              setActiveFilters((prev) => ({ ...prev, [id]: val }))
            }
            onReset={() => {
              setActiveFilters({})
              tableSearchOptions.onGlobalFilterChange({ id: '', value: '' })
            }}
          />
          <div className='mt-2 flex min-h-0 flex-1 flex-col overflow-hidden'>
            <div className='min-h-0 flex-1 overflow-hidden'>
              <DataTable
                emptyDescription='Create a portal to configure login methods and connected workflows.'
                emptyIcon='lucide:app-window'
                emptyTitle='No portals yet'
                isLoading={isLoadingPortals}
                isReLoading={isLoadingPortals}
                pageSize={pageSize}
                rowSize={rowSize}
                table={portalTable}
                hideActionBar
                hideGrouping
                stickyHeader
                onReload={reloadPortals}
                onRowSizeChange={onRowSizeChange}
              />
            </div>
            <Pagination
              className='mt-4 shrink-0'
              itemLabel={t`Portals`}
              page={page}
              pageSize={pageSize}
              showPageNumbers={false}
              totalItems={portalTable.getFilteredRowModel().rows.length}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
            />
          </div>
        </div>
      </section>
    </main>
  )
}

function PortalSetup({
  activeStep,
  draftPortal,
  editingPortalId,
  isSaving,
  previewPortalId,
  publicUrlIds,
  onBack,
  onBackToSettings,
  onCancel,
  onChange,
  onNext,
  onSave,
  onStepChange,
}: {
  activeStep: number
  draftPortal: PortalConfig
  editingPortalId: number | null
  isSaving: boolean
  previewPortalId: number
  publicUrlIds: { tenantId?: string; userId?: string }
  onBack: () => void
  onBackToSettings?: () => void
  onCancel: () => void
  onChange: (portal: PortalConfig) => void
  onNext: () => void
  onSave: () => void
  onStepChange: (step: number) => void
}) {
  const { i18n, t } = useLingui()
  const [showErrors, setShowErrors] = useState(false)
  const [formOptions, setFormOptions] = useState<Option[]>(
    FALLBACK_FORM_OPTIONS,
  )
  const [formFields, setFormFields] = useState<Option[]>(FALLBACK_FIELD_OPTIONS)
  const [loadingForms, setLoadingForms] = useState(false)
  const [loadingFields, setLoadingFields] = useState(false)
  const [loadedWorkflows, setLoadedWorkflows] = useState<SettingsOption[]>([])
  const [loadingWorkflows, setLoadingWorkflows] = useState(false)

  const workflowNameById = useMemo(() => {
    const byId = new Map<string, string>()
    loadedWorkflows.forEach((workflow) => {
      if (workflow.name) byId.set(String(workflow.id), workflow.name)
    })
    return byId
  }, [loadedWorkflows])

  const selectedWorkflows = useMemo(
    () =>
      draftPortal.workflows.map((workflow) => ({
        id: String(workflow.id),
        name:
          workflowNameById.get(String(workflow.id)) ||
          workflow.name ||
          String(workflow.id),
      })),
    [draftPortal.workflows, workflowNameById],
  )

  const portalPublicUrl = getPortalPublicUrl(previewPortalId, publicUrlIds)

  const workflowOptions = useMemo(() => {
    const byId = new Map<string, SettingsOption>()
    loadedWorkflows.forEach((workflow) =>
      byId.set(String(workflow.id), workflow),
    )
    selectedWorkflows.forEach((workflow) => {
      if (!byId.has(String(workflow.id))) {
        byId.set(String(workflow.id), workflow)
      }
    })
    return Array.from(byId.values())
  }, [loadedWorkflows, selectedWorkflows])

  useEffect(() => {
    let cancelled = false
    setLoadingWorkflows(true)
    void (async () => {
      try {
        const browseRes = await workflowsApiV6.getAllWorkflows(
          createPublishedWorkflowBrowsePayload({ filterBy: [] }),
        )
        if (cancelled) return

        let options: SettingsOption[] = mapPublishedBrowseResponseToOptions(
          browseRes.data,
        ).map((workflow) => ({
          id: String(workflow.id),
          name: workflow.name || String(workflow.id),
        }))

        if (options.length === 0) {
          const listRes = await workflowsApiV6.getWorkflows()
          if (cancelled) return
          options = (listRes.data?.items ?? []).map((workflow) => ({
            id: String(workflow.id),
            name: workflow.name || String(workflow.id),
          }))
        }

        if (!cancelled) setLoadedWorkflows(options)
      } finally {
        if (!cancelled) setLoadingWorkflows(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (draftPortal.loginType !== 'masterLogin') return
    let cancelled = false
    setLoadingForms(true)
    void formApi
      .listAllForms()
      .then((res) => {
        if (cancelled) return
        const raw = res.data
        let forms: Array<Record<string, unknown>> = []
        if (Array.isArray(raw)) {
          if (raw[0]?.value && Array.isArray(raw[0].value)) {
            forms = raw.flatMap((group) => group.value || [])
          } else {
            forms = raw
          }
        } else if (Array.isArray(raw?.data)) {
          if (raw.data[0]?.value && Array.isArray(raw.data[0].value)) {
            forms = raw.data.flatMap(
              (group: { value?: Record<string, unknown>[] }) =>
                group.value || [],
            )
          } else {
            forms = raw.data
          }
        } else if (Array.isArray(raw?.content)) {
          forms = raw.content
        } else if (Array.isArray(raw?.value)) {
          forms = raw.value
        }
        const options = forms
          .map((form) => ({
            id: String(form?.id || form?.formId || ''),
            name: String(form?.name || form?.title || form?.id || ''),
          }))
          .filter((form) => form.id)
        if (options.length) setFormOptions(options)
      })
      .finally(() => {
        if (!cancelled) setLoadingForms(false)
      })
    return () => {
      cancelled = true
    }
  }, [draftPortal.loginType])

  useEffect(() => {
    const formId = draftPortal.authentication.formId
    if (draftPortal.loginType !== 'masterLogin' || !formId || formId === 0) {
      setFormFields(FALLBACK_FIELD_OPTIONS)
      return
    }
    let cancelled = false
    setLoadingFields(true)
    void formApi
      .getFormDataById(String(formId))
      .then((res) => {
        if (cancelled) return
        const fields = extractFormFields(res.data?.formJson)
        setFormFields(fields.length ? fields : FALLBACK_FIELD_OPTIONS)
      })
      .finally(() => {
        if (!cancelled) setLoadingFields(false)
      })
    return () => {
      cancelled = true
    }
  }, [draftPortal.authentication.formId, draftPortal.loginType])

  const getMissingLabels = (step = activeStep) => {
    if (step === 0) {
      return getMissingRequiredLabels([
        { label: 'Portal Name', value: draftPortal.name },
      ])
    }

    if (step === 1) {
      const labels = draftPortal.loginType ? [] : ['Login type']
      if (draftPortal.loginType === 'masterLogin') {
        labels.push(
          ...getMissingRequiredLabels([
            {
              label: 'Master Form',
              value:
                draftPortal.authentication.formId &&
                draftPortal.authentication.formId !== 0 &&
                draftPortal.authentication.formId !== '0'
                  ? draftPortal.authentication.formId
                  : '',
            },
            {
              label: 'Username Field',
              value: draftPortal.authentication.usernameField[0],
            },
            {
              label: 'First Name Field',
              value: draftPortal.authentication.firstnameField,
            },
          ]),
        )
        if (draftPortal.authentication.passwordTypes === 'PASSWORD') {
          labels.push(
            ...getMissingRequiredLabels([
              {
                label: 'Password Field',
                value: draftPortal.authentication.passwordField,
              },
            ]),
          )
        }
      }
      return labels
    }

    if (step === 2) {
      return draftPortal.workflows.length ? [] : ['Workflow']
    }

    return [
      ...getMissingRequiredLabels([
        { label: 'Portal Name', value: draftPortal.name },
      ]),
      ...(draftPortal.loginType ? [] : ['Login type']),
      ...(draftPortal.workflows.length ? [] : ['Workflow']),
    ]
  }

  const handleNext = () => {
    const missingLabels = getMissingLabels(activeStep)
    if (missingLabels.length) {
      setShowErrors(true)
      showToast({
        message: getRequiredFieldErrorMessage(missingLabels),
        variant: 'error',
      })
      return
    }
    setShowErrors(false)
    onNext()
  }

  const handleSave = () => {
    const missingLabels = getMissingLabels(3)
    if (missingLabels.length) {
      setShowErrors(true)
      if (missingLabels.includes('Portal Name')) onStepChange(0)
      else if (
        missingLabels.includes('Login type') ||
        missingLabels.includes('Master Form')
      ) {
        onStepChange(1)
      } else onStepChange(2)
      showToast({
        message: getRequiredFieldErrorMessage(missingLabels),
        variant: 'error',
      })
      return
    }
    setShowErrors(false)
    onSave()
  }

  const handleStepChange = (step: number) => {
    if (step > activeStep) {
      for (let index = activeStep; index < step; index += 1) {
        const missingLabels = getMissingLabels(index)
        if (missingLabels.length) {
          setShowErrors(true)
          onStepChange(index)
          showToast({
            message: getRequiredFieldErrorMessage(missingLabels),
            variant: 'error',
          })
          return
        }
      }
    }
    setShowErrors(false)
    onStepChange(step)
  }

  const setLoginType = (loginType: PortalLoginType) => {
    onChange({
      ...draftPortal,
      authentication: applyLoginType(loginType, draftPortal.authentication),
      loginType,
    })
  }

  const toggleSocialEnabled = (checked: boolean) => {
    onChange({
      ...draftPortal,
      authentication: {
        ...draftPortal.authentication,
        signInType: checked,
        socialLogin: checked ? draftPortal.authentication.socialLogin : [],
      },
    })
  }

  const toggleSocialLogin = (
    provider: 'Google' | 'Microsoft',
    checked: boolean,
  ) => {
    const current = draftPortal.authentication.socialLogin
    const next = checked
      ? Array.from(new Set([...current, provider]))
      : current.filter((item) => item !== provider)

    onChange({
      ...draftPortal,
      authentication: {
        ...draftPortal.authentication,
        socialLogin: next,
      },
    })
  }

  const wizardSteps = useMemo(() => {
    const isEditMode = editingPortalId !== null
    return PORTAL_STEP_MSGS.map((step, idx) => ({
      clickable: isEditMode ? true : undefined,
      description: i18n._(step.description),
      disabled: isEditMode ? false : undefined,
      icon: step.icon,
      id: idx,
      label: i18n._(step.title),
    }))
  }, [editingPortalId, i18n])

  const showMasterFields = draftPortal.loginType === 'masterLogin'
  const showSocialLogin =
    draftPortal.loginType === 'masterLogin' ||
    draftPortal.loginType === 'applicationLogin'
  const socialLoginSummary = draftPortal.authentication.signInType
    ? draftPortal.authentication.socialLogin.join(', ') || t`Enabled`
    : t`Off`

  return (
    <SettingsWizardLayout
      activeStep={activeStep}
      headerDescription={PORTAL_STEP_MSGS[activeStep]?.description}
      headerTitle={PORTAL_STEP_MSGS[activeStep]?.title}
      isSaving={isSaving}
      moduleTitle={msg`Portal Configuration`}
      saveLabel={editingPortalId ? t`Update Portal` : t`Save Portal`}
      steps={wizardSteps}
      setupTitle={editingPortalId ? msg`Edit Portal` : msg`Create Portal`}
      onBack={() => {
        setShowErrors(false)
        onBack()
      }}
      onBackToSettings={onBackToSettings}
      onCancel={onCancel}
      onNext={handleNext}
      onSave={handleSave}
      onStepChange={handleStepChange}
    >
      <AnimatePresence initial={false} mode='wait'>
        {activeStep === 0 && (
          <AnimateFadeIn className='flex flex-col gap-6 md:gap-7' key='step-0'>
            <SettingsFormSection>
              <AnimateFadeIn delay={0.1}>
                <InputText
                  autoFocus={!editingPortalId}
                  label={t`Portal Name *`}
                  placeholder={t`e.g. Access2Pay Portal`}
                  value={draftPortal.name}
                  error={getFieldRequiredError(
                    'Portal Name',
                    showErrors,
                    draftPortal.name,
                  )}
                  onChange={(value) =>
                    onChange({ ...draftPortal, name: value })
                  }
                />
              </AnimateFadeIn>
              <AnimateFadeIn delay={0.15}>
                <InputTextarea
                  label={t`Description`}
                  minRows={4}
                  placeholder={t`Describe what this portal is used for...`}
                  value={draftPortal.description}
                  onChange={(value) =>
                    onChange({ ...draftPortal, description: value })
                  }
                />
              </AnimateFadeIn>
            </SettingsFormSection>
          </AnimateFadeIn>
        )}

        {activeStep === 1 && (
          <AnimateFadeIn className='flex flex-col gap-6 md:gap-7' key='step-1'>
            <SettingsFormSection>
              <AnimateFadeIn delay={0.1}>
                <InputRadioGroup
                  label={t`Login type *`}
                  options={LOGIN_TYPE_OPTIONS}
                  value={loginTypeToRadioId(draftPortal.loginType)}
                  error={
                    showErrors && !draftPortal.loginType
                      ? t`Please fill the required field: Login type`
                      : undefined
                  }
                  onChange={(value) => setLoginType(radioIdToLoginType(value))}
                />
              </AnimateFadeIn>

              {showMasterFields ? (
                <AnimateFadeIn delay={0.15}>
                  <div className='flex flex-col gap-6 md:gap-7'>
                    <InputSelect
                      label={t`Master Form *`}
                      loading={loadingForms}
                      options={formOptions}
                      placeholder={t`Select master form`}
                      searchable
                      error={getFieldRequiredError(
                        'Master Form',
                        showErrors,
                        draftPortal.authentication.formId &&
                          draftPortal.authentication.formId !== 0 &&
                          draftPortal.authentication.formId !== '0'
                          ? draftPortal.authentication.formId
                          : '',
                      )}
                      value={optionFromId(
                        draftPortal.authentication.formId,
                        formOptions,
                      )}
                      onChange={(selected) =>
                        onChange({
                          ...draftPortal,
                          authentication: {
                            ...draftPortal.authentication,
                            firstnameField: '',
                            formId: selected?.id || 0,
                            passwordField: '',
                            usernameField: [],
                          },
                        })
                      }
                    />
                    <InputSelect
                      label={t`Username Field *`}
                      loading={loadingFields}
                      options={formFields}
                      placeholder={t`Select username / email field`}
                      searchable
                      error={getFieldRequiredError(
                        'Username Field',
                        showErrors,
                        draftPortal.authentication.usernameField[0],
                      )}
                      value={optionFromId(
                        draftPortal.authentication.usernameField[0],
                        formFields,
                      )}
                      onChange={(selected) =>
                        onChange({
                          ...draftPortal,
                          authentication: {
                            ...draftPortal.authentication,
                            usernameField: selected?.id
                              ? [String(selected.id)]
                              : [],
                          },
                        })
                      }
                    />
                    <InputSelect
                      label={t`First Name Field *`}
                      loading={loadingFields}
                      options={formFields}
                      placeholder={t`Select first name field`}
                      searchable
                      error={getFieldRequiredError(
                        'First Name Field',
                        showErrors,
                        draftPortal.authentication.firstnameField,
                      )}
                      value={optionFromId(
                        draftPortal.authentication.firstnameField,
                        formFields,
                      )}
                      onChange={(selected) =>
                        onChange({
                          ...draftPortal,
                          authentication: {
                            ...draftPortal.authentication,
                            firstnameField: selected ? String(selected.id) : '',
                          },
                        })
                      }
                    />
                    <InputRadioGroup
                      label={t`Password & authentication method`}
                      options={[
                        {
                          description:
                            'Use a one-time password for initial login',
                          id: 1,
                          name: 'Login With OTP',
                        },
                        {
                          description:
                            'Use the login password field from the master for authentication',
                          id: 2,
                          name: 'Login Password Field',
                        },
                      ]}
                      value={
                        draftPortal.authentication.passwordTypes === 'PASSWORD'
                          ? 2
                          : 1
                      }
                      onChange={(value) =>
                        onChange({
                          ...draftPortal,
                          authentication: {
                            ...draftPortal.authentication,
                            passwordField:
                              value === 2
                                ? draftPortal.authentication.passwordField
                                : '',
                            passwordTypes: value === 2 ? 'PASSWORD' : 'OTP',
                          },
                        })
                      }
                    />
                    {draftPortal.authentication.passwordTypes === 'PASSWORD' ? (
                      <InputSelect
                        label={t`Password Field *`}
                        loading={loadingFields}
                        options={formFields}
                        placeholder={t`Select password field`}
                        searchable
                        error={getFieldRequiredError(
                          'Password Field',
                          showErrors,
                          draftPortal.authentication.passwordField,
                        )}
                        value={optionFromId(
                          draftPortal.authentication.passwordField,
                          formFields,
                        )}
                        onChange={(selected) =>
                          onChange({
                            ...draftPortal,
                            authentication: {
                              ...draftPortal.authentication,
                              passwordField: selected
                                ? String(selected.id)
                                : '',
                            },
                          })
                        }
                      />
                    ) : null}
                  </div>
                </AnimateFadeIn>
              ) : null}

              {showSocialLogin ? (
                <AnimateFadeIn delay={0.2}>
                  <div className='flex flex-col gap-3'>
                    <InputCheckbox
                      checked={draftPortal.authentication.signInType}
                      description={t`Allow users to sign in with Google or Microsoft`}
                      label={t`Social Login`}
                      onChange={(checked) =>
                        toggleSocialEnabled(Boolean(checked))
                      }
                    />
                    {draftPortal.authentication.signInType ? (
                      <div className='flex flex-col gap-3 pl-7'>
                        <InputCheckbox
                          label={t`Google`}
                          checked={draftPortal.authentication.socialLogin.includes(
                            'Google',
                          )}
                          onChange={(checked) =>
                            toggleSocialLogin('Google', Boolean(checked))
                          }
                        />
                        <InputCheckbox
                          label={t`Microsoft`}
                          checked={draftPortal.authentication.socialLogin.includes(
                            'Microsoft',
                          )}
                          onChange={(checked) =>
                            toggleSocialLogin('Microsoft', Boolean(checked))
                          }
                        />
                      </div>
                    ) : null}
                  </div>
                </AnimateFadeIn>
              ) : null}
            </SettingsFormSection>
          </AnimateFadeIn>
        )}

        {activeStep === 2 && (
          <AnimateFadeIn className='flex flex-col gap-6 md:gap-7' key='step-2'>
            <SettingsFormSection>
              <AnimateFadeIn delay={0.1}>
                <div className='flex flex-col gap-2'>
                  <InputSelectMultiple
                    label={t`Workflows *`}
                    loading={loadingWorkflows}
                    options={workflowOptions}
                    placeholder={t`Search and select workflows...`}
                    value={selectedWorkflows}
                    clearable
                    searchable
                    error={
                      showErrors && !draftPortal.workflows.length
                        ? 'Please fill the required field: Workflow'
                        : undefined
                    }
                    onChange={(value) => {
                      const next = (value || []) as SettingsOption[]
                      onChange({
                        ...draftPortal,
                        workflows: next.map((item) => ({
                          category: [],
                          categoryFieldId: '',
                          categoryFieldMasterSync: [],
                          id: item.id,
                          name:
                            workflowNameById.get(String(item.id)) ||
                            item.name ||
                            String(item.id),
                          processInfo: [],
                        })),
                      })
                    }}
                  />
                  <SettingsSelectedChips
                    className='mt-0'
                    items={selectedWorkflows}
                    onRemove={(id) =>
                      onChange({
                        ...draftPortal,
                        workflows: draftPortal.workflows.filter(
                          (workflow) => String(workflow.id) !== String(id),
                        ),
                      })
                    }
                  />
                </div>
              </AnimateFadeIn>
            </SettingsFormSection>
          </AnimateFadeIn>
        )}

        {activeStep === 3 && (
          <AnimateFadeIn className='flex flex-col gap-6 md:gap-7' key='step-3'>
            <SettingsFormSection>
              <div className='rounded-[14px] border border-[var(--border-default)] bg-surface p-6'>
                <AnimateFadeIn delay={0.1}>
                  <h3 className='text-md mb-6 font-semibold text-[var(--gray-13)]'>
                    {t`Portal Summary`}
                  </h3>
                </AnimateFadeIn>

                <div className='grid grid-cols-1 gap-x-12 gap-y-5 md:grid-cols-2'>
                  <AnimateFadeIn delay={0.15}>
                    <SummaryItem
                      label={t`Portal Name`}
                      value={draftPortal.name || '—'}
                    />
                  </AnimateFadeIn>
                  <AnimateFadeIn delay={0.18}>
                    <SummaryItem
                      label={t`Description`}
                      value={draftPortal.description || '—'}
                    />
                  </AnimateFadeIn>
                  <AnimateFadeIn delay={0.21}>
                    <SummaryItem
                      label={t`Login type`}
                      value={LOGIN_TYPE_LABELS[draftPortal.loginType]}
                    />
                  </AnimateFadeIn>

                  {showMasterFields ? (
                    <>
                      <AnimateFadeIn delay={0.27}>
                        <SummaryItem
                          label={t`Master Form`}
                          value={
                            optionFromId(
                              draftPortal.authentication.formId,
                              formOptions,
                            )?.name || '—'
                          }
                        />
                      </AnimateFadeIn>
                      <AnimateFadeIn delay={0.3}>
                        <SummaryItem
                          label={t`Username Field`}
                          value={
                            optionFromId(
                              draftPortal.authentication.usernameField[0],
                              formFields,
                            )?.name || '—'
                          }
                        />
                      </AnimateFadeIn>
                      <AnimateFadeIn delay={0.33}>
                        <SummaryItem
                          label={t`First Name Field`}
                          value={
                            optionFromId(
                              draftPortal.authentication.firstnameField,
                              formFields,
                            )?.name || '—'
                          }
                        />
                      </AnimateFadeIn>
                      <AnimateFadeIn delay={0.36}>
                        <SummaryItem
                          label={t`Password & authentication method`}
                          value={
                            draftPortal.authentication.passwordTypes ===
                            'PASSWORD'
                              ? t`Login Password Field`
                              : t`Login With OTP`
                          }
                        />
                      </AnimateFadeIn>
                      {draftPortal.authentication.passwordTypes ===
                      'PASSWORD' ? (
                        <AnimateFadeIn delay={0.39}>
                          <SummaryItem
                            label={t`Password Field`}
                            value={
                              optionFromId(
                                draftPortal.authentication.passwordField,
                                formFields,
                              )?.name || '—'
                            }
                          />
                        </AnimateFadeIn>
                      ) : null}
                    </>
                  ) : null}

                  {showSocialLogin ? (
                    <AnimateFadeIn delay={0.42}>
                      <SummaryItem
                        label={t`Social Login`}
                        value={socialLoginSummary}
                      />
                    </AnimateFadeIn>
                  ) : null}
                </div>

                <AnimateFadeIn delay={0.45}>
                  <div className='mt-6 border-t border-[var(--border-default)] pt-5'>
                    <div className='mb-2 text-xs font-medium text-gray-11'>
                      {t`Workflows`}
                    </div>
                    <SummaryChipList items={selectedWorkflows} />
                  </div>
                </AnimateFadeIn>

                <AnimateFadeIn delay={0.5}>
                  <div className='mt-6'>
                    <InputText
                      label={t`Portal URL`}
                      rightSectionPointerEvents='auto'
                      value={portalPublicUrl}
                      readOnly
                      rightSection={
                        <IconButton
                          ariaLabel={t`Copy URL`}
                          color='gray'
                          icon='lucide:copy'
                          size='sm'
                          variant='ghost'
                          onClick={() => {
                            void navigator.clipboard
                              .writeText(portalPublicUrl)
                              .then(() => {
                                showToast({
                                  message: t`Portal URL copied`,
                                  variant: 'success',
                                })
                              })
                              .catch(() => {
                                showToast({
                                  message: t`Could not copy URL`,
                                  variant: 'error',
                                })
                              })
                          }}
                        />
                      }
                      onChange={() => undefined}
                    />
                    <p className='mt-1.5 text-12 text-gray-9'>
                      {t`Copy this URL and open it in another tab to use the portal.`}
                    </p>
                  </div>
                </AnimateFadeIn>
              </div>
            </SettingsFormSection>
          </AnimateFadeIn>
        )}
      </AnimatePresence>
    </SettingsWizardLayout>
  )
}

function SummaryChipList({ items }: { items: SettingsOption[] }) {
  if (!items.length) {
    return <span className='text-sm text-gray-10'>—</span>
  }

  return (
    <div className='flex flex-wrap gap-2'>
      {items.map((item) => (
        <span
          className='inline-flex max-w-full items-center rounded-lg border border-primary-4/60 bg-gradient-to-r from-primary-3/70 to-primary-2/90 px-2.5 py-1 text-xs font-semibold text-gray-13 shadow-2xs'
          key={item.id}
        >
          <span className='truncate'>{item.name}</span>
        </span>
      ))}
    </div>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className='min-w-0'>
      <div className='text-xs font-medium text-gray-11'>{label}</div>
      <div className='mt-1 text-sm break-words text-gray-13'>
        {value || '—'}
      </div>
    </div>
  )
}
