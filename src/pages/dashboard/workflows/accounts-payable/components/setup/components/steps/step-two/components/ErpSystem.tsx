import { useState, useRef } from 'react'
import MondayLogo from '@/assets/brands/monday.svg'
import OracleLogo from '@/assets/brands/oracle.svg'
import QuickBooksLogo from '@/assets/brands/quickbooks.svg'
import SapLogo from '@/assets/brands/sap.svg'
import XeroLogo from '@/assets/brands/xero.svg'
import Alert from '@/components/base/Alert'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import BrandCard from '../../components/BrandCard'
import SectionHeader from '../../components/SectionHeader'

const items = [
  { logo: SapLogo, name: 'SAP', value: 'SAP' },
  { logo: OracleLogo, name: 'Oracle NetSuite', value: 'Oracle NetSuite' },
  {
    logo: QuickBooksLogo,
    name: 'QuickBooks',
    value: 'QuickBooks',
  },
  { logo: MondayLogo, name: 'Monday.com', value: 'Monday.com' },
  { logo: XeroLogo, name: 'Xero', value: 'Xero' },
]

const ErpSystem = () => {
  const emailSettings = setupStore((state) => state.emailSettings)
  const erpSettings = setupStore((state) => state.erpSettings)
  const setErpSettings = setupStore((state) => state.setErpSettings)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showFileBasedImport, setShowFileBasedImport] = useState(
    erpSettings.wantsFileBasedImport || false
  )

  const isDirectUpload = emailSettings.provider === 'DIRECT_UPLOAD'
  const showApAgentGate = isDirectUpload && !erpSettings.wantsFileBasedImport && !showFileBasedImport && !erpSettings.system && !erpSettings.templateUploaded

  const handleTryFileBasedImport = () => {
    setShowFileBasedImport(true)
    setErpSettings({
      ...erpSettings,
      wantsFileBasedImport: true,
    })
  }

  const handleContinueWithErpTools = () => {
    setShowFileBasedImport(false)
    setErpSettings({
      ...erpSettings,
      wantsFileBasedImport: false,
    })
  }

  const handleTemplateDownload = () => {
    // Create a simple CSV template
    const csvContent = 'Purchase Order Number,Vendor,Amount,Date,Status\nPO-001,Example Vendor,1000.00,2024-01-01,Pending'
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'PO_Master_Template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setErpSettings({
        ...erpSettings,
        uploadedTemplate: file,
        templateUploaded: true,
        isConnected: true,
      })
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div>
      <SectionHeader
        description='Select your ERP provider to connect and synchronize invoices, and payments seamlessly.'
        title='Choose Your ERP System'
      />

      {showApAgentGate && (
        <div className='mb-6 rounded-lg border border-gray-3 bg-surface p-6'>
          <div className='mb-4'>
            <h3 className='mb-2 text-16 font-semibold text-gray-13'>
              Use file-based intake?
            </h3>
            <p className='text-14 text-gray-11'>
              You can import purchase orders by uploading a completed template.
            </p>
          </div>
          <div className='flex flex-wrap gap-3'>
            <Button
              label='Try file-based import'
              onClick={handleTryFileBasedImport}
            />
            <Button
              color='gray'
              label='Continue with ERP tools'
              variant='outline'
              onClick={handleContinueWithErpTools}
            />
          </div>
        </div>
      )}

      {showFileBasedImport && (
        <div className='mb-6 space-y-4 rounded-lg border border-gray-3 bg-surface p-6'>
          <div>
            <h3 className='mb-2 text-16 font-semibold text-gray-13'>
              File-based Import
            </h3>
            <p className='mb-4 text-14 text-gray-11'>
              Download the CSV template, fill it with your purchase order data, then upload it.
            </p>
          </div>

          <div className='flex flex-wrap gap-3'>
            <Button
              icon='tabler:download'
              label='Download Template'
              variant='outline'
              onClick={handleTemplateDownload}
            />
            <input
              accept='.csv,.xlsx,.xls'
              className='hidden'
              onChange={handleFileUpload}
              ref={fileInputRef}
              type='file'
            />
            <Button
              icon='tabler:upload'
              label='Upload File'
              variant='outline'
              onClick={handleUploadClick}
            />
          </div>

          {erpSettings.templateUploaded && (
            <Alert
              text="Upload received — we'll generate your onboarding overview from the data in this file."
              variant='green'
            />
          )}

          {erpSettings.uploadedTemplate && (
            <div className='flex items-center gap-2 text-14 text-gray-11'>
              <Icon className='size-4' name='tabler:file' />
              <span>{erpSettings.uploadedTemplate.name}</span>
            </div>
          )}
        </div>
      )}

      {(!isDirectUpload || !showFileBasedImport) && (
        <div className='grid grid-cols-1 gap-2.5 sm:grid-cols-2'>
          {items.map((item) => (
            <BrandCard
              checked={erpSettings.system === item.value}
              key={item.value}
              logo={item.logo}
              name={item.name}
              value={item.value}
              onClick={() =>
                setErpSettings({
                  ...erpSettings,
                  isConnected: false,
                  system: item.value,
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}

ErpSystem.displayName = 'ErpSystem'
export default ErpSystem
