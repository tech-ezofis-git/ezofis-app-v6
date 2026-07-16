import { useRef, useState } from 'react'
// import MondayLogo from '@/assets/brands/monday.svg'
// import OracleLogo from '@/assets/brands/oracle.svg'
import QuickBooksLogo from '@/assets/brands/quickbooks.svg'
import poMasterUrl from '@/assets/PO Master.xlsx?url'
// import SapLogo from '@/assets/brands/sap.svg'
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
import ColumnMapping from '@/components/common/ColumnMapping'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import { compareHeaderSimilarity } from '@/pages/requests/components/request/components/newrequest/poFlow/utils/headerSimilarity'
import { SYSTEM_TEMPLATE_COLUMNS } from '@/pages/requests/components/request/components/newrequest/poFlow/utils/templateSchema'
import { LINE_ITEM_TEMPLATE_COLUMNS } from '@/pages/requests/components/request/components/newrequest/poFlow/utils/lineItemSchema'
import { detectGroupingColumn } from '@/pages/requests/components/request/components/newrequest/poFlow/utils/lineItemHelpers'
import BrandCard from '../../components/BrandCard'
import SectionHeader from '../../components/SectionHeader'
import { OrDivider } from '../../components/StepLayout'
import { extractHeadersAndData } from '../utils/fileParser'

const items = [
  // { logo: SapLogo, name: 'SAP', value: 'SAP' },
  // { logo: OracleLogo, name: 'Oracle NetSuite', value: 'Oracle NetSuite' },
  {
    description:
      'Connect your QuickBooks account to sync PO and invoice data automatically.',
    logo: QuickBooksLogo,
    name: 'QuickBooks',
    value: 'QuickBooks',
  },
  // { logo: MondayLogo, name: 'Monday.com', value: 'Monday.com' },
  // { logo: XeroLogo, name: 'Xero', value: 'Xero' },
]

const ErpSystem = () => {
  // /  const emailSettings = setupStore((state) => state.emailSettings)
  const erpSettings = setupStore((state) => state.erpSettings)
  const setErpSettings = setupStore((state) => state.setErpSettings)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // const lineItemFileInputRef = useRef<HTMLInputElement>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [activeMappingTab, setActiveMappingTab] = useState<'header' | 'lineItems'>('header')

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
            'Failed to parse file. Please upload a valid CSV or Excel file.',
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
      try {
        const { headers, previewRows, lineItemHeaders: liHeaders, lineItemRows: liRows } = await extractHeadersAndData(file)

        // Auto-suggest column mappings on upload
        const initialMapping: Record<string, string> = {}
        SYSTEM_TEMPLATE_COLUMNS.forEach((col) => {
          const match = headers.find((u) => compareHeaderSimilarity(u, col.key))
          if (match) {
            initialMapping[col.key] = match
          }
        })

        const initialLineItemMapping: Record<string, string> = {}
        const hasLineItems = liHeaders && liHeaders.length > 0
        if (hasLineItems) {
          LINE_ITEM_TEMPLATE_COLUMNS.forEach((col) => {
            const match = liHeaders.find((u) => compareHeaderSimilarity(u, col.key))
            if (match) {
              initialLineItemMapping[col.key] = match
            }
          })
        }

        const detectedGroupCol = hasLineItems ? (detectGroupingColumn(liHeaders) || null) : null

        setErpSettings({
          ...erpSettings,
          importMethod: 'upload',
          isConnected: true,
          mapping: initialMapping,
          previewRows: previewRows,
          system: 'FILE_BASED_IMPORT',
          templateUploaded: true,
          uploadedColumns: headers,
          uploadedTemplate: file,
          wantsFileBasedImport: true,
          lineItemHeaders: hasLineItems ? liHeaders : [],
          lineItemRows: hasLineItems && liRows ? liRows : [],
          groupingColumn: detectedGroupCol,
          lineItemMapping: initialLineItemMapping,
        })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error(err)
        showToast({
          message:
            err.message ||
            'Failed to parse file. Please upload a valid CSV or Excel file.',
          variant: 'error',
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
      {/* PO Master Data Section */}
      <div>
        <AnimateSlideUp delay={0.1}>
          <SectionHeader
            description='Import PO master records to validate invoices against approved purchase orders'
            title='PO Master Data'
          />
        </AnimateSlideUp>

        {/* Master Data Options */}
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
          <AnimateSlideUp delay={0.15}>
            <BrandCard
              checked={erpSettings.system === 'PREDEFINED'}
              description='Try the platform with sample invoices and records.'
              icon='tabler:database-search'
              name='Use demo data'
              value='PREDEFINED'
              onClick={() => {
                setErpSettings({
                  ...erpSettings,
                  importMethod: 'upload',
                  isConnected: true,
                  isConnecting: false,
                  system: 'PREDEFINED',
                  wantsFileBasedImport: false,
                })
              }}
            />
          </AnimateSlideUp>
          <AnimateSlideUp delay={0.2}>
            <BrandCard
              checked={erpSettings.system === 'FILE_BASED_IMPORT'}
              description='Import your records via CSV or Excel.'
              icon='tabler:table-import'
              name='Upload PO master file'
              value='FILE_BASED_IMPORT'
              onClick={() => {
                setErpSettings({
                  ...erpSettings,
                  importMethod: 'upload',
                  isConnected: erpSettings.templateUploaded || false,
                  isConnecting: false,
                  system: 'FILE_BASED_IMPORT',
                  wantsFileBasedImport: true,
                })
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
                PO Master File
              </h3>

              <p className='mt-1.5 mb-4 text-13/5.5 text-pretty text-gray-11'>
                Download the predefined PO Master Data template file to view
                reference records. Use this file to understand the default
                schema structure and sample values used for matching.
              </p>

              {/* Download button */}
              <div className='mb-4 flex justify-start'>
                <Button
                  icon='tabler:download'
                  label='Download PO Master Demo Data'
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
                  className='mt-4 rounded-xl border border-dashed border-gray-3 hover:border-primary-9 bg-surface p-6 text-center transition-all cursor-pointer group'
                  onClick={handleUploadClick}
                >
                  <div className='flex flex-col items-center justify-center space-y-3'>
                    <div className='p-3 bg-gray-2 group-hover:bg-primary-2 rounded-full text-gray-11 group-hover:text-primary-9 transition-colors'>
                      <Icon className='size-6' name='tabler:cloud-upload' />
                    </div>
                    <div>
                      <h3 className='text-14 font-semibold text-gray-13 group-hover:text-primary-9 transition-colors'>
                        Upload PO Master File
                      </h3>
                      <p className='mt-1.5 text-12 text-gray-11'>
                        Drag and drop your spreadsheet here, or <span className='text-primary-9 font-medium'>browse files</span>
                      </p>
                    </div>
                    <p className='text-11 text-gray-9'>
                      Supports Excel (.xlsx, .xls) and CSV formats
                    </p>
                  </div>
                </div>
              ) : (
                /* Premium layout when template is uploaded */
                <div className='mt-4 rounded-xl border border-gray-3 bg-surface p-5 shadow-sm md:p-6'>
                  <h3 className='text-15/5 font-semibold text-gray-13 mb-3'>
                    PO Master file received
                  </h3>

                  {/* Premium file details card */}
                  <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-gray-2 border border-gray-3 mb-4'>
                    <div className='flex items-center gap-3 min-w-0'>
                      <div className='p-2 bg-green-2 rounded-lg text-green-9 shrink-0'>
                        <Icon className='size-6' name='tabler:file-spreadsheet' />
                      </div>
                      <div className='min-w-0'>
                        <div className='font-semibold text-13 text-gray-13 truncate'>
                          {erpSettings.uploadedTemplate?.name}
                        </div>
                        <div className='flex items-center gap-2 text-11 text-gray-11 mt-0.5'>
                          <span>
                            {erpSettings.uploadedTemplate?.name?.endsWith('.csv')
                              ? 'CSV File'
                              : 'Excel Spreadsheet'}
                          </span>
                          <span>•</span>
                          <span>{erpSettings.previewRows?.length || 0} Header Records</span>
                          {erpSettings.lineItemHeaders && erpSettings.lineItemHeaders.length > 0 && (
                            <>
                              <span>•</span>
                              <span>{erpSettings.lineItemRows?.length || 0} Line Items</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className='flex items-center gap-2 self-end md:self-auto'>
                      <Button
                        icon='tabler:refresh'
                        size='xs'
                        variant='outline'
                        label='Replace File'
                        loading={isParsing}
                        onClick={handleUploadClick}
                      />
                      <button
                        type='button'
                        className='p-2 text-gray-9 hover:text-red-11 hover:bg-gray-3 active:scale-95 transition-all rounded-lg border border-gray-3 bg-surface shadow-sm shrink-0'
                        onClick={() => {
                          setErpSettings({
                            ...erpSettings,
                            templateUploaded: false,
                            uploadedTemplate: null,
                            uploadedLineItemTemplate: null,
                            lineItemHeaders: [],
                            lineItemRows: [],
                            groupingColumn: null,
                            lineItemMapping: {},
                          })
                        }}
                        title='Remove file'
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
                          label='Replace File'
                          loading={isParsing}
                          onClick={() => lineItemFileInputRef.current?.click()}
                        />
                        <button
                          type='button'
                          className='p-2 text-gray-9 hover:text-red-11 hover:bg-gray-3 active:scale-95 transition-all rounded-lg border border-gray-3 bg-surface shadow-sm shrink-0'
                          onClick={handleRemoveLineItemFile}
                          title='Remove file'
                        >
                          <Icon className='size-4' name='tabler:trash' />
                        </button>
                      </div>
                    </div>
                  )} */}
                  {/* Mapping fields section inside the same card layout */}
                  <div className='flex flex-col gap-4 mt-3 border-t border-gray-2 pt-3'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <h4 className='text-sm font-semibold text-gray-12'>Mapping Fields</h4>
                        <p className='text-11 text-gray-11 mt-0.5'>
                          Map the columns from your uploaded file to the platform schema.
                        </p>
                      </div>
                    </div>

                    <div className='flex flex-col gap-2'>
                      {erpSettings.lineItemHeaders && erpSettings.lineItemHeaders.length > 0 && !erpSettings.groupingColumn && (
                        <div className='flex items-center gap-2 rounded-lg border border-blue-5 bg-blue-2 px-3 py-2 text-12 text-blue-11 shadow-xs'>
                          <Icon className='size-4 text-blue-9' name='tabler:info-circle' />
                          <span className='font-medium'>
                            Line item info: PO Number column could not be matched.
                          </span>
                        </div>
                      )}

                      {(!erpSettings.lineItemHeaders || erpSettings.lineItemHeaders.length === 0) && (
                        <div className='flex flex-col gap-2.5'>
                          <div className='flex items-center gap-2 rounded-lg border border-blue-5 bg-blue-2 px-3 py-2 text-12 text-blue-11 shadow-xs'>
                            <Icon className='size-4 text-blue-9' name='tabler:info-circle' />
                            <span className='font-medium'>
                              Line item info: No line item data found in this file.
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Tab Switcher */}
                      <div className='flex justify-start gap-4 mb-0'>
                        <button
                          type='button'
                          className={`pl-0 pr-2 py-2 text-13 font-semibold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 text-left ${activeMappingTab === 'header'
                              ? 'border-primary-9 text-primary-9'
                              : 'border-transparent text-gray-11 hover:text-gray-13'
                            }`}
                          onClick={() => setActiveMappingTab('header')}
                        >
                          <span>Header Fields</span>
                          <span className={`px-1.5 py-0.2 text-11 rounded-full ${activeMappingTab === 'header' ? 'bg-primary-2 text-primary-9' : 'bg-gray-2 text-gray-11'
                            }`}>
                            {Object.keys(erpSettings.mapping || {}).length}/{SYSTEM_TEMPLATE_COLUMNS.length}
                          </span>
                        </button>
                        {erpSettings.lineItemHeaders && erpSettings.lineItemHeaders.length > 0 && erpSettings.groupingColumn && (
                          <button
                            type='button'
                            className={`pl-0 pr-2 py-2 text-13 font-semibold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 text-left ${activeMappingTab === 'lineItems'
                                ? 'border-primary-9 text-primary-9'
                                : 'border-transparent text-gray-11 hover:text-gray-13'
                              }`}
                            onClick={() => setActiveMappingTab('lineItems')}
                          >
                            <span>Line Items</span>
                            <span className={`px-1.5 py-0.2 text-11 rounded-full ${activeMappingTab === 'lineItems' ? 'bg-primary-2 text-primary-9' : 'bg-gray-2 text-gray-11'
                              }`}>
                              {Object.keys(erpSettings.lineItemMapping || {}).length}/{LINE_ITEM_TEMPLATE_COLUMNS.length}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Tab Contents */}
                    <div>
                      {activeMappingTab === 'header' && (
                        <AnimateFadeIn delay={0.05}>
                          <ColumnMapping
                            key="header-mapping"
                            title='Header Mapping'
                            simple={true}
                            mapping={erpSettings.mapping || {}}
                            previewRows={erpSettings.previewRows || []}
                            showActionsRow={false}
                            uploadedColumns={erpSettings.uploadedColumns || []}
                            onChangeMapping={(m) =>
                              setErpSettings({
                                ...erpSettings,
                                mapping: m,
                              })
                            }
                          />
                        </AnimateFadeIn>
                      )}

                      {activeMappingTab === 'lineItems' && erpSettings.lineItemHeaders && erpSettings.lineItemHeaders.length > 0 && erpSettings.groupingColumn && (
                        <AnimateFadeIn delay={0.05}>
                          <ColumnMapping
                            key="line-item-mapping"
                            title='Line Item Mapping'
                            simple={true}
                            mapping={erpSettings.lineItemMapping || {}}
                            previewRows={erpSettings.lineItemRows || []}
                            showActionsRow={false}
                            uploadedColumns={erpSettings.lineItemHeaders || []}
                            templateSchema={LINE_ITEM_TEMPLATE_COLUMNS}
                            showGrouping={false}
                            autoScrollAndHighlight={false}
                            onChangeMapping={(m) =>
                              setErpSettings({
                                ...erpSettings,
                                lineItemMapping: m,
                              })
                            }
                          />
                        </AnimateFadeIn>
                      )}
                    </div>
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
            description='Connect your provider to automate data matching.'
            title='Direct Integration'
          />
        </AnimateSlideUp>
        <div className='grid grid-cols-1 gap-3'>
          {items.map((item, index) => {
            const AnimationComponent =
              animationVariants[index % animationVariants.length]
            return (
              <AnimationComponent delay={0.25 + index * 0.08} key={item.value}>
                <BrandCard
                  description={item.description}
                  logo={item.logo}
                  name={item.name}
                  value={item.value}
                  checked={
                    erpSettings.system === item.value &&
                    !isFileBasedImportSelected
                  }
                  onClick={() =>
                    setErpSettings({
                      ...erpSettings,
                      isConnected: false,
                      isConnecting: false,
                      system: item.value,
                      wantsFileBasedImport: false,
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
