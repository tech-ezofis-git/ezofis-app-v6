import { useLingui } from '@lingui/react/macro'
import { useEffect, useRef, useState } from 'react'
import { axiosV6 } from '@/api/axios'
// import MondayLogo from '@/assets/brands/monday.svg'
// import OracleLogo from '@/assets/brands/oracle.svg'
import QuickBooksLogo from '@/assets/brands/quickbooks.svg'
import poMasterUrl from '@/assets/PO Master.xlsx?url'
// import XeroLogo from '@/assets/brands/xero.svg'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import showToast from '@/components/base/toast/showToast'
import {
  AnimateBounce,
  AnimateFadeIn,
  AnimateRotate,
  AnimateScale,
  AnimateSlideUp,
} from '@/components/common/animations'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import {
  compareHeaderSimilarity,
  normalizeFieldMapping,
} from '@/pages/requests/components/request/components/newrequest/poFlow/utils/headerSimilarity'
import { detectGroupingColumn } from '@/pages/requests/components/request/components/newrequest/poFlow/utils/lineItemHelpers'
import { LINE_ITEM_TEMPLATE_COLUMNS } from '@/pages/requests/components/request/components/newrequest/poFlow/utils/lineItemSchema'
import {
  HEADER_MAPPING_API_FIELDS,
  LINE_ITEM_MAPPING_API_FIELDS,
} from '@/pages/requests/components/request/components/newrequest/poFlow/utils/mappingFieldDefaults'
import { SYSTEM_TEMPLATE_COLUMNS } from '@/pages/requests/components/request/components/newrequest/poFlow/utils/templateSchema'
import authUserStore from '@/stores/authUserStore'
import BrandCard from '../../components/BrandCard'
import SectionHeader from '../../components/SectionHeader'
import { OrDivider } from '../../components/StepLayout'
import SwitchIntegrationConfirm from '../../components/SwitchIntegrationConfirm'
import { extractHeadersAndData } from '../utils/fileParser'
import ApColumnMapping from './ApColumnMapping'

const items = [
  {
    description:
      'Connect your QuickBooks account to sync PO and invoice data automatically.',
    logo: QuickBooksLogo,
    name: 'QuickBooks',
    value: 'QuickBooks',
  },
]

const ErpSystem = () => {
  const { t } = useLingui()
  const erpSettings = setupStore((state) => state.erpSettings)
  const setErpSettings = setupStore((state) => state.setErpSettings)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // const lineItemFileInputRef = useRef<HTMLInputElement>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [activeMappingTab, setActiveMappingTab] = useState<
    'header' | 'lineItems'
  >('header')
  const [shouldScroll, setShouldScroll] = useState(false)
  const mappingSectionRef = useRef<HTMLDivElement>(null)
  const [pendingSwitch, setPendingSwitch] = useState<{
    name: string
    apply: () => void
  } | null>(null)

  const getErpLabel = (value: string) => {
    if (value === 'PREDEFINED') return t`Use demo data`
    if (value === 'FILE_BASED_IMPORT') return t`Upload PO master file`
    return items.find((item) => item.value === value)?.name || value
  }

  const requestSwitch = (
    nextValue: string,
    nextName: string,
    apply: () => void,
  ) => {
    if (erpSettings.system === nextValue) return

    const isOAuthConnected =
      erpSettings.isConnected &&
      erpSettings.system !== 'PREDEFINED' &&
      erpSettings.system !== 'FILE_BASED_IMPORT'

    if (isOAuthConnected && erpSettings.system !== nextValue) {
      setPendingSwitch({ apply, name: nextName })
      return
    }

    apply()
  }

  // Scroll to mapping fields section once PO master field mapping is completed
  useEffect(() => {
    if (shouldScroll && mappingSectionRef.current) {
      mappingSectionRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
      setShouldScroll(false)
    }
  }, [shouldScroll])

  const mappedHeaderCount = (erpSettings.uploadedColumns || []).filter(
    (excelCol) => Object.values(erpSettings.mapping || {}).includes(excelCol),
  ).length
  const totalHeaderCount = (erpSettings.uploadedColumns || []).length

  const mappedLineItemCount = (erpSettings.lineItemHeaders || []).filter(
    (excelCol) =>
      Object.values(erpSettings.lineItemMapping || {}).includes(excelCol),
  ).length
  const totalLineItemCount = (erpSettings.lineItemHeaders || []).length

  const headerPoMapping = erpSettings.mapping?.['PO Number']
  const lineItemPoMapping = erpSettings.lineItemMapping?.['PO Number']
  const hasLineItems =
    erpSettings.lineItemHeaders && erpSettings.lineItemHeaders.length > 0
  const showPoMismatchWarning =
    hasLineItems &&
    (!headerPoMapping ||
      !lineItemPoMapping ||
      headerPoMapping !== lineItemPoMapping)

  /*
  const handleLineItemFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    if (file) {
      setIsParsing(true)
      try {
        const { headers, previewRows } = await extractHeadersAndData(file)

        // Suggest mappings for line items from this file
        const initialLineItemMapping: Record<string, string> = {}
        LINE_ITEM_TEMPLATE_COLUMNS.forEach((col) => {
          const match = headers.find((u) => compareHeaderSimilarity(u, col.key))
          if (match) {
            initialLineItemMapping[col.key] = match
          }
        })

        const detectedGroupCol = detectGroupingColumn(headers) || null

        setErpSettings({
          ...erpSettings,
          lineItemHeaders: headers,
          lineItemRows: previewRows || [],
          groupingColumn: detectedGroupCol,
          lineItemMapping: initialLineItemMapping,
          uploadedLineItemTemplate: file,
        })
      } catch (err: any) {
        console.error(err)
        showToast({
          message:
            err.message ||
            t`Failed to parse file. Please upload a valid CSV or Excel file.`,
          variant: 'error',
        })
      } finally {
        setIsParsing(false)
      }
    }
  }

  const handleRemoveLineItemFile = () => {
    setErpSettings({
      ...erpSettings,
      lineItemHeaders: [],
      lineItemRows: [],
      groupingColumn: null,
      lineItemMapping: {},
      uploadedLineItemTemplate: null,
    })
  }
  */

  const isFileBasedImportSelected = erpSettings.system === 'FILE_BASED_IMPORT'

  const handleDownloadPredefinedMaster = () => {
    const link = document.createElement('a')
    link.href = poMasterUrl
    link.download = 'PO Master.xlsx'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    if (file) {
      setIsParsing(true)

      // Clear existing mappings immediately so the UI resets
      setErpSettings({
        ...erpSettings,
        fieldDataTypes: {},
        groupingColumn: null,
        isConnected: false,
        isParsingTemplate: true,
        lineItemFieldDataTypes: {},
        lineItemHeaders: [],
        lineItemMapping: {},
        lineItemRows: [],
        mapping: {},
        previewRows: [],
        templateUploaded: false,
        uploadedColumns: [],
        uploadedTemplate: null,
      })

      try {
        const {
          excelSheets,
          headers,
          lineItemHeaders: liHeaders,
          lineItemRows: liRows,
          previewRows,
        } = await extractHeadersAndData(file)

        // Build API field lists from the same predefined schemas used in the mapping UI
        const headerFields = HEADER_MAPPING_API_FIELDS
        const lineItemFields = LINE_ITEM_MAPPING_API_FIELDS

        // Setup mappings with fallback to local similarity match
        let initialMapping: Record<string, string> = {}
        let initialLineItemMapping: Record<string, string> = {}
        let fieldDataTypes: Record<string, string> = {}
        let lineItemFieldDataTypes: Record<string, string> = {}

        SYSTEM_TEMPLATE_COLUMNS.forEach((col) => {
          const match = (headers || []).find((u) =>
            compareHeaderSimilarity(u, col.key),
          )
          if (match) {
            initialMapping[col.key] = match
          }
        })

        const safeLiHeaders = liHeaders || []
        const hasLineItems = safeLiHeaders.length > 0
        if (hasLineItems) {
          LINE_ITEM_TEMPLATE_COLUMNS.forEach((col) => {
            const match = safeLiHeaders.find((u) =>
              compareHeaderSimilarity(u, col.key),
            )
            if (match) {
              initialLineItemMapping[col.key] = match
            }
          })
        }

        // Map fields via the v6 field-mapping API
        try {
          const tenantId = authUserStore.getState().session?.tenantId || ''
          const { data, status } = await axiosV6.post(
            '/field-mapping',
            {
              excelSheets: excelSheets || [],
              headerFields,
              lineItemFields,
            },
            {
              headers: {
                'X-Tenant-Id': String(tenantId),
              },
            },
          )

          if (status === 200 && data) {
            const apiMapping: Record<string, string> = {}
            const apiLineItemMapping: Record<string, string> = {}
            const apiFieldDataTypes: Record<string, string> = {}
            const apiLineItemFieldDataTypes: Record<string, string> = {}

            if (data.headerFields && Array.isArray(data.headerFields)) {
              data.headerFields.forEach((item: any) => {
                if (item.excelField && item.masterField) {
                  apiMapping[item.masterField] = item.excelField
                  const rawType = item.dataType || 'SHORT_TEXT'
                  apiFieldDataTypes[item.masterField] =
                    rawType === 'DROPDOWN' ? 'SINGLE_SELECT' : rawType
                }
              })
            }

            if (data.lineItemFields && Array.isArray(data.lineItemFields)) {
              // Build a lookup: excelColumn -> resolved predefined key from header mapping
              // so line item fields sharing the same Excel column inherit the correct key
              const headerExcelToKey: Record<string, string> = {}
              Object.entries(apiMapping).forEach(
                ([masterField, excelField]) => {
                  headerExcelToKey[excelField.toLowerCase().trim()] =
                    masterField
                },
              )

              data.lineItemFields.forEach((item: any) => {
                if (item.excelField && item.masterField) {
                  const excelNorm = item.excelField.toLowerCase().trim()
                  // If the same Excel column was already resolved in header fields, reuse that key
                  const inheritedKey = headerExcelToKey[excelNorm]
                  const key = inheritedKey ?? item.masterField
                  apiLineItemMapping[key] = item.excelField
                  const rawType = item.dataType || 'SHORT_TEXT'
                  apiLineItemFieldDataTypes[key] =
                    rawType === 'DROPDOWN' ? 'SINGLE_SELECT' : rawType
                }
              })
            }

            // If we got mappings from API, use them
            if (Object.keys(apiMapping).length > 0) {
              const normalizedHeader = normalizeFieldMapping(
                apiMapping,
                apiFieldDataTypes,
                SYSTEM_TEMPLATE_COLUMNS,
              )
              initialMapping = normalizedHeader.mapping
              fieldDataTypes = normalizedHeader.fieldDataTypes
            }
            if (Object.keys(apiLineItemMapping).length > 0) {
              const normalizedLineItems = normalizeFieldMapping(
                apiLineItemMapping,
                apiLineItemFieldDataTypes,
                LINE_ITEM_TEMPLATE_COLUMNS,
              )
              initialLineItemMapping = normalizedLineItems.mapping
              lineItemFieldDataTypes = normalizedLineItems.fieldDataTypes
            }
          }
        } catch (apiErr) {
          console.error('Failed to get mapping from endpoint:', apiErr)
        }

        const normalizedLocalHeader = normalizeFieldMapping(
          initialMapping,
          fieldDataTypes,
          SYSTEM_TEMPLATE_COLUMNS,
        )
        initialMapping = normalizedLocalHeader.mapping
        fieldDataTypes = normalizedLocalHeader.fieldDataTypes

        if (hasLineItems) {
          const normalizedLocalLineItems = normalizeFieldMapping(
            initialLineItemMapping,
            lineItemFieldDataTypes,
            LINE_ITEM_TEMPLATE_COLUMNS,
          )
          initialLineItemMapping = normalizedLocalLineItems.mapping
          lineItemFieldDataTypes = normalizedLocalLineItems.fieldDataTypes
        }

        const headerPo =
          initialMapping['PO Number'] || initialMapping['Purchase Order']
        if (headerPo && safeLiHeaders.length > 0) {
          const matchedLiCol = safeLiHeaders.find(
            (col) =>
              col.toLowerCase().trim() === headerPo.toLowerCase().trim() ||
              compareHeaderSimilarity(col, headerPo),
          )
          if (matchedLiCol) {
            initialLineItemMapping['PO Number'] = matchedLiCol
          }
        }

        const lineItemPo = initialLineItemMapping['PO Number']
        let detectedGroupCol: string | null = null
        if (
          headerPo &&
          lineItemPo &&
          (headerPo.toLowerCase().trim() === lineItemPo.toLowerCase().trim() ||
            compareHeaderSimilarity(headerPo, lineItemPo))
        ) {
          detectedGroupCol = lineItemPo
        }

        if (!detectedGroupCol && hasLineItems) {
          // 1. Same column name in both sheets (case-insensitive)
          const commonCol = safeLiHeaders.find((liCol) =>
            (headers || []).some(
              (h) => h.toLowerCase().trim() === liCol.toLowerCase().trim(),
            ),
          )

          if (commonCol) {
            detectedGroupCol = commonCol
          } else if (safeLiHeaders.length > 0) {
            // 2. May be first column on both sheets
            detectedGroupCol = safeLiHeaders[0]
          }
        }

        setErpSettings({
          ...erpSettings,
          fieldDataTypes,
          groupingColumn: detectedGroupCol,
          importMethod: 'upload',
          isConnected: true,
          isParsingTemplate: false,
          lineItemFieldDataTypes,
          lineItemHeaders: hasLineItems ? safeLiHeaders : [],
          lineItemMapping: initialLineItemMapping,
          lineItemRows: hasLineItems && liRows ? liRows : [],
          mapping: initialMapping,
          previewRows: previewRows || [],
          system: 'FILE_BASED_IMPORT',
          templateUploaded: true,
          uploadedColumns: headers || [],
          uploadedTemplate: file,
          wantsFileBasedImport: true,
        })
        setShouldScroll(true)
      } catch (err: any) {
        console.error(err)
        showToast({
          message:
            err.message ||
            t`Failed to parse file. Please upload a valid CSV or Excel file.`,
          variant: 'error',
        })
        setErpSettings({
          ...setupStore.getState().erpSettings,
          isParsingTemplate: false,
        })
      } finally {
        setIsParsing(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const animationVariants = [
    AnimateSlideUp,
    AnimateScale,
    AnimateBounce,
    AnimateRotate,
    AnimateFadeIn,
  ]

  return (
    <div className='space-y-6'>
      <SwitchIntegrationConfirm
        currentName={getErpLabel(erpSettings.system)}
        nextName={pendingSwitch?.name}
        opened={Boolean(pendingSwitch)}
        onCancel={() => setPendingSwitch(null)}
        onConfirm={() => {
          pendingSwitch?.apply()
          setPendingSwitch(null)
        }}
      />

      {/* PO Master Data Section */}
      <div>
        <AnimateSlideUp delay={0.1}>
          <SectionHeader
            description={t`Import PO master records to validate invoices against approved purchase orders`}
            title={t`PO Master Data`}
          />
        </AnimateSlideUp>

        {/* Master Data Options */}
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
          <AnimateSlideUp delay={0.15}>
            <BrandCard
              checked={erpSettings.system === 'PREDEFINED'}
              description={t`Try the platform with sample invoices and records.`}
              icon='tabler:database-search'
              name={t`Use demo data`}
              value='PREDEFINED'
              connected={
                erpSettings.system === 'PREDEFINED' && erpSettings.isConnected
              }
              onClick={() => {
                requestSwitch('PREDEFINED', t`Use demo data`, () => {
                  const current = setupStore.getState().erpSettings
                  setErpSettings({
                    ...current,
                    account: '',
                    connectorId: '',
                    importMethod: 'upload',
                    isConnected: true,
                    isConnecting: false,
                    isParsingTemplate: false,
                    system: 'PREDEFINED',
                    wantsFileBasedImport: false,
                  })
                })
              }}
            />
          </AnimateSlideUp>
          <AnimateSlideUp delay={0.2}>
            <BrandCard
              checked={erpSettings.system === 'FILE_BASED_IMPORT'}
              description={t`Import your records via CSV or Excel.`}
              icon='tabler:table-import'
              name={t`Upload PO master file`}
              value='FILE_BASED_IMPORT'
              connected={
                erpSettings.system === 'FILE_BASED_IMPORT' &&
                erpSettings.templateUploaded
              }
              onClick={() => {
                requestSwitch(
                  'FILE_BASED_IMPORT',
                  t`Upload PO master file`,
                  () => {
                    const current = setupStore.getState().erpSettings
                    setErpSettings({
                      ...current,
                      account: '',
                      connectorId: '',
                      importMethod: 'upload',
                      isConnected: current.templateUploaded || false,
                      isConnecting: false,
                      isParsingTemplate: false,
                      system: 'FILE_BASED_IMPORT',
                      wantsFileBasedImport: true,
                    })
                  },
                )
              }}
            />
          </AnimateSlideUp>
        </div>

        {/* Hidden file input */}
        <input
          accept='.csv,.xlsx,.xls'
          className='hidden'
          id='fileUploadInput'
          ref={fileInputRef}
          type='file'
          onChange={handleFileUpload}
        />

        {/* Hidden separate line items file input */}
        {/* <input
          accept='.csv,.xlsx,.xls'
          className='hidden'
          id='lineItemFileUploadInput'
          ref={lineItemFileInputRef}
          type='file'
          onChange={handleLineItemFileUpload}
        /> */}

        {erpSettings.system === 'PREDEFINED' && (
          <AnimateFadeIn delay={0.2}>
            <div className='mt-4 rounded-xl border border-gray-3 bg-surface p-5 shadow-sm md:p-6'>
              <h3 className='text-15/5 font-semibold text-gray-13'>
                {t`PO Master File`}
              </h3>

              <p className='mt-1.5 mb-4 text-13/5.5 text-pretty text-gray-11'>
                {t`Download the predefined PO Master Data template file to view reference records. Use this file to understand the default schema structure and sample values used for matching.`}
              </p>

              <div className='flex justify-start'>
                <Button
                  icon='tabler:download'
                  label={t`Download PO Master Demo Data`}
                  size='sm'
                  onClick={handleDownloadPredefinedMaster}
                />
              </div>
            </div>
          </AnimateFadeIn>
        )}

        {isFileBasedImportSelected && (
          <>
            <AnimateFadeIn delay={0.2}>
              {!erpSettings.templateUploaded ? (
                /* Beautiful dropzone layout when no file is uploaded */
                <div
                  className='group mt-4 cursor-pointer rounded-xl border border-dashed border-gray-3 bg-surface p-6 text-center transition-all hover:border-primary-9'
                  onClick={isParsing ? undefined : handleUploadClick}
                >
                  {isParsing ? (
                    <div className='flex flex-col items-center justify-center space-y-3 py-4'>
                      <Icon
                        className='size-8 animate-spin text-primary-9'
                        name='tabler:loader-2'
                      />
                      <div>
                        <h3 className='text-14 font-semibold text-gray-13'>
                          {t`Analyzing file and mapping fields...`}
                        </h3>
                        <p className='mt-1.5 animate-pulse text-12 text-gray-11'>
                          {t`Please wait a moment`}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className='flex flex-col items-center justify-center space-y-3'>
                      <div className='rounded-full bg-gray-2 p-3 text-gray-11 transition-colors group-hover:bg-primary-2 group-hover:text-primary-9'>
                        <Icon className='size-6' name='tabler:cloud-upload' />
                      </div>
                      <div>
                        <h3 className='text-14 font-semibold text-gray-13 transition-colors group-hover:text-primary-9'>
                          {t`Upload PO Master File`}
                        </h3>
                        <p className='mt-1.5 text-12 text-gray-11'>
                          {t`Drag and drop your spreadsheet here, or`}{' '}
                          <span className='font-medium text-primary-9'>
                            {t`browse files`}
                          </span>
                        </p>
                      </div>
                      <p className='text-11 text-gray-9'>
                        {t`Supports Excel (.xlsx, .xls) and CSV formats`}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* Premium layout when template is uploaded */
                <div className='mt-4 rounded-xl border border-gray-3 bg-surface p-5 shadow-sm md:p-6'>
                  <h3 className='mb-3 text-15/5 font-semibold text-gray-13'>
                    {t`PO Master file received`}
                  </h3>

                  {/* Premium file details card */}
                  <div className='mb-4 flex flex-col justify-between gap-4 rounded-xl border border-gray-3 bg-gray-2 p-4 md:flex-row md:items-center'>
                    <div className='flex min-w-0 items-center gap-3'>
                      <div className='shrink-0 rounded-lg bg-green-2 p-2 text-green-9'>
                        <Icon
                          className='size-6'
                          name='tabler:file-spreadsheet'
                        />
                      </div>
                      <div className='min-w-0'>
                        <div className='truncate text-13 font-semibold text-gray-13'>
                          {erpSettings.uploadedTemplate?.name}
                        </div>
                        <div className='mt-0.5 flex items-center gap-2 text-11 text-gray-11'>
                          <span>
                            {erpSettings.uploadedTemplate?.name?.endsWith(
                              '.csv',
                            )
                              ? t`CSV File`
                              : t`Excel Spreadsheet`}
                          </span>
                          <span>•</span>
                          <span>
                            {erpSettings.previewRows?.length || 0}{' '}
                            {t`Header Records`}
                          </span>
                          {erpSettings.lineItemHeaders &&
                            erpSettings.lineItemHeaders.length > 0 && (
                              <>
                                <span>•</span>
                                <span>
                                  {erpSettings.lineItemRows?.length || 0}{' '}
                                  {t`Line Items`}
                                </span>
                              </>
                            )}
                        </div>
                      </div>
                    </div>
                    <div className='flex items-center gap-2 self-end md:self-auto'>
                      <Button
                        icon='tabler:refresh'
                        label={t`Replace File`}
                        loading={isParsing}
                        size='xs'
                        variant='outline'
                        onClick={handleUploadClick}
                      />
                      <button
                        className='shrink-0 rounded-lg border border-gray-3 bg-surface p-2 text-gray-9 shadow-sm transition-all hover:bg-gray-3 hover:text-red-11 active:scale-95'
                        title={t`Remove file`}
                        type='button'
                        onClick={() => {
                          setErpSettings({
                            ...erpSettings,
                            groupingColumn: null,
                            lineItemHeaders: [],
                            lineItemMapping: {},
                            lineItemRows: [],
                            templateUploaded: false,
                            uploadedLineItemTemplate: null,
                            uploadedTemplate: null,
                          })
                        }}
                      >
                        <Icon className='size-4' name='tabler:trash' />
                      </button>
                    </div>
                  </div>

                  {/* Uploaded Line Items File Details Card (if separately uploaded) */}
                  {/* {erpSettings.uploadedLineItemTemplate && (
                    <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-gray-2 border border-gray-3 mb-4 animate-in fade-in slide-in-from-top-2 duration-300'>
                      <div className='flex items-center gap-3 min-w-0'>
                        <div className='p-2 bg-blue-2 rounded-lg text-blue-9 shrink-0'>
                          <Icon className='size-6' name='tabler:file-spreadsheet' />
                        </div>
                        <div className='min-w-0'>
                          <div className='font-semibold text-13 text-gray-13 truncate'>
                            {erpSettings.uploadedLineItemTemplate.name}
                          </div>
                          <div className='flex items-center gap-2 text-11 text-gray-11 mt-0.5'>
                            <span>
                              {erpSettings.uploadedLineItemTemplate.name?.endsWith('.csv')
                                ? 'CSV File'
                                : 'Excel Spreadsheet'}
                            </span>
                            <span>•</span>
                            <span>Line Items File</span>
                            <span>•</span>
                            <span>{erpSettings.lineItemRows?.length || 0} Line Items</span>
                          </div>
                        </div>
                      </div>
                      <div className='flex items-center gap-2 self-end md:self-auto'>
                        <Button
                          icon='tabler:refresh'
                          size='xs'
                          variant='outline'
                          label={t`Replace File`}
                          loading={isParsing}
                          onClick={() => lineItemFileInputRef.current?.click()}
                        />
                        <button
                          type='button'
                          className='p-2 text-gray-9 hover:text-red-11 hover:bg-gray-3 active:scale-95 transition-all rounded-lg border border-gray-3 bg-surface shadow-sm shrink-0'
                          onClick={handleRemoveLineItemFile}
                          title={t`Remove file`}
                        >
                          <Icon className='size-4' name='tabler:trash' />
                        </button>
                      </div>
                    </div>
                  )} */}
                  {/* Mapping fields section inside the same card layout */}
                  <div
                    className='mt-3 flex flex-col gap-4 border-t border-gray-2 pt-3'
                    ref={mappingSectionRef}
                  >
                    <div className='flex items-center justify-between'>
                      <div>
                        <h4 className='text-sm font-semibold text-gray-12'>
                          {t`Mapping Fields`}
                        </h4>
                        <p className='mt-0.5 text-11 text-gray-11'>
                          {t`Map the columns from your uploaded file to the platform schema.`}
                        </p>
                      </div>
                    </div>

                    <div className='flex flex-col gap-2'>
                      {showPoMismatchWarning && (
                        <div className='animate-in fade-in flex items-center gap-2 rounded-lg border border-blue-5 bg-blue-2 px-3 py-2 text-12 text-blue-11 shadow-xs duration-300'>
                          <Icon
                            className='size-4 text-blue-9'
                            name='tabler:info-circle'
                          />
                          <span className='font-medium'>
                            {t`Line item info: PO Number mapping not matched. Please map the same PO Number column in both sections.`}
                          </span>
                        </div>
                      )}

                      {(!erpSettings.lineItemHeaders ||
                        erpSettings.lineItemHeaders.length === 0) && (
                        <div className='flex flex-col gap-2.5'>
                          <div className='flex items-center gap-2 rounded-lg border border-blue-5 bg-blue-2 px-3 py-2 text-12 text-blue-11 shadow-xs'>
                            <Icon
                              className='size-4 text-blue-9'
                              name='tabler:info-circle'
                            />
                            <span className='font-medium'>
                              {t`Line item info: No line item data found in this file.`}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Tab Switcher */}
                      <div className='mb-0 flex justify-start gap-4'>
                        <button
                          type='button'
                          className={`flex cursor-pointer items-center gap-1.5 border-b-2 py-2 pr-2 pl-0 text-left text-13 font-semibold transition-all ${
                            activeMappingTab === 'header'
                              ? 'border-primary-9 text-primary-9'
                              : 'border-transparent text-gray-11 hover:text-gray-13'
                          }`}
                          onClick={() => setActiveMappingTab('header')}
                        >
                          <span>{t`Header Fields`}</span>
                          <span
                            className={`py-0.2 rounded-full px-1.5 text-11 ${
                              activeMappingTab === 'header'
                                ? 'bg-primary-2 text-primary-9'
                                : 'bg-gray-2 text-gray-11'
                            }`}
                          >
                            {mappedHeaderCount}/{totalHeaderCount}
                          </span>
                        </button>
                        {erpSettings.lineItemHeaders &&
                          erpSettings.lineItemHeaders.length > 0 && (
                            <button
                              type='button'
                              className={`flex cursor-pointer items-center gap-1.5 border-b-2 py-2 pr-2 pl-0 text-left text-13 font-semibold transition-all ${
                                activeMappingTab === 'lineItems'
                                  ? 'border-primary-9 text-primary-9'
                                  : 'border-transparent text-gray-11 hover:text-gray-13'
                              }`}
                              onClick={() => setActiveMappingTab('lineItems')}
                            >
                              <span>{t`Line Items`}</span>
                              <span
                                className={`py-0.2 rounded-full px-1.5 text-11 ${
                                  activeMappingTab === 'lineItems'
                                    ? 'bg-primary-2 text-primary-9'
                                    : 'bg-gray-2 text-gray-11'
                                }`}
                              >
                                {mappedLineItemCount}/{totalLineItemCount}
                              </span>
                            </button>
                          )}
                      </div>
                    </div>

                    {/* Tab Contents */}
                    {activeMappingTab === 'header' && (
                      <AnimateFadeIn delay={0.05}>
                        <ApColumnMapping
                          activeMappingTab='header'
                          fieldDataTypes={erpSettings.fieldDataTypes || {}}
                          key='header-mapping'
                          mapping={erpSettings.mapping || {}}
                          previewRows={erpSettings.previewRows || []}
                          uploadedColumns={erpSettings.uploadedColumns || []}
                          onUpdateMapping={(m, types) => {
                            const headerPo =
                              m['PO Number'] || m['Purchase Order']
                            const nextLineItemMapping = {
                              ...erpSettings.lineItemMapping,
                            }
                            if (headerPo && erpSettings.lineItemHeaders) {
                              const matchedLiCol =
                                erpSettings.lineItemHeaders.find(
                                  (col) =>
                                    col.toLowerCase().trim() ===
                                      headerPo.toLowerCase().trim() ||
                                    compareHeaderSimilarity(col, headerPo),
                                )
                              if (matchedLiCol) {
                                nextLineItemMapping['PO Number'] = matchedLiCol
                              }
                            }
                            const finalLineItemPo =
                              nextLineItemMapping['PO Number']
                            const newGroupCol =
                              headerPo &&
                              finalLineItemPo &&
                              (headerPo.toLowerCase().trim() ===
                                finalLineItemPo.toLowerCase().trim() ||
                                compareHeaderSimilarity(
                                  headerPo,
                                  finalLineItemPo,
                                ))
                                ? finalLineItemPo
                                : null
                            setErpSettings({
                              ...erpSettings,
                              fieldDataTypes: types,
                              groupingColumn: newGroupCol,
                              lineItemMapping: nextLineItemMapping,
                              mapping: m,
                            })
                          }}
                        />
                      </AnimateFadeIn>
                    )}

                    {activeMappingTab === 'lineItems' &&
                      erpSettings.lineItemHeaders &&
                      erpSettings.lineItemHeaders.length > 0 && (
                        <AnimateFadeIn delay={0.05}>
                          <ApColumnMapping
                            activeMappingTab='lineItems'
                            key='line-item-mapping'
                            mapping={erpSettings.lineItemMapping || {}}
                            previewRows={erpSettings.lineItemRows || []}
                            uploadedColumns={erpSettings.lineItemHeaders || []}
                            fieldDataTypes={
                              erpSettings.lineItemFieldDataTypes || {}
                            }
                            onUpdateMapping={(m, types) => {
                              const headerPo =
                                erpSettings.mapping?.['PO Number'] ||
                                erpSettings.mapping?.['Purchase Order']
                              const lineItemPo = m['PO Number']
                              const newGroupCol =
                                headerPo &&
                                lineItemPo &&
                                (headerPo.toLowerCase().trim() ===
                                  lineItemPo.toLowerCase().trim() ||
                                  compareHeaderSimilarity(headerPo, lineItemPo))
                                  ? lineItemPo
                                  : null
                              setErpSettings({
                                ...erpSettings,
                                groupingColumn: newGroupCol,
                                lineItemFieldDataTypes: types,
                                lineItemMapping: m,
                              })
                            }}
                          />
                        </AnimateFadeIn>
                      )}
                  </div>
                </div>
              )}
            </AnimateFadeIn>
          </>
        )}
      </div>

      <OrDivider />

      {/* ERP Integration Section */}
      <div>
        <AnimateSlideUp delay={0.2}>
          <SectionHeader
            description={t`Connect your provider to automate data matching.`}
            title={t`Direct Integration`}
          />
        </AnimateSlideUp>
        <div className='grid grid-cols-1 gap-3'>
          {items.map((item, index) => {
            const AnimationComponent =
              animationVariants[index % animationVariants.length]
            return (
              <AnimationComponent delay={0.25 + index * 0.08} key={item.value}>
                <BrandCard
                  logo={item.logo}
                  name={item.name}
                  value={item.value}
                  checked={
                    erpSettings.system === item.value &&
                    !isFileBasedImportSelected
                  }
                  connected={
                    erpSettings.system === item.value &&
                    !isFileBasedImportSelected &&
                    erpSettings.isConnected
                  }
                  description={
                    erpSettings.system === item.value &&
                    erpSettings.isConnected &&
                    erpSettings.account
                      ? erpSettings.account
                      : item.value === 'QuickBooks'
                        ? t`Connect your QuickBooks account to sync PO and invoice data automatically.`
                        : item.description
                  }
                  onClick={() =>
                    requestSwitch(item.value, item.name, () => {
                      const current = setupStore.getState().erpSettings
                      setErpSettings({
                        ...current,
                        account: '',
                        connectorId: '',
                        isConnected: false,
                        isConnecting: false,
                        system: item.value,
                        wantsFileBasedImport: false,
                      })
                    })
                  }
                />
              </AnimationComponent>
            )
          })}
        </div>
      </div>
    </div>
  )
}

ErpSystem.displayName = 'ErpSystem'
export default ErpSystem
