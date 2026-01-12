import { useState } from 'react'
import type { Option } from '@/types/option'
import InputDate from '@/components/base/inputs/InputDate'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'

const vendors = [
  {
    disabled: false,
    id: 1,
    name: 'Acme Supplies Pvt. Ltd.',
  },
  {
    disabled: false,
    id: 2,
    name: 'NovaTech Solutions',
  },
  {
    disabled: false,
    id: 3,
    name: 'GreenLeaf Distributors',
  },
  {
    disabled: false,
    id: 4,
    name: 'Zenith Industrial Co.',
  },
  {
    disabled: false,
    id: 5,
    name: 'BlueOcean Traders',
  },
]
const documentTypes = [
  {
    disabled: false,
    id: 1,
    name: 'Invoice',
  },
  {
    disabled: false,
    id: 2,
    name: 'Purchase Order (PO)',
  },
  {
    disabled: false,
    id: 3,
    name: 'Goods Receipt Note (GRN)',
  },
]

const Form = () => {
  const [vendor, setVendor] = useState<Option | null>(null)
  const [documentType, setDocumentType] = useState<Option | null>(null)
  const [documentNumber, setDocumentNumber] = useState('')
  const [documentDate, setDocumentDate] = useState<string | null>(null)
  const [poNumber, setPoNumber] = useState('')
  const [amount, setAmount] = useState('')
  const [remarks, setRemarks] = useState('')

  return (
    <div className='p-6'>
      <div className='mb-6 text-sm font-medium text-gray-13'>Properties</div>

      <div className='grid grid-cols-4 gap-4'>
        <InputSelect
          label='Vendor'
          options={vendors}
          value={vendor}
          required
          onChange={setVendor}
        />

        <InputSelect
          label='Document Type'
          options={documentTypes}
          value={documentType}
          required
          onChange={setDocumentType}
        />

        <InputText
          label='Document Number'
          value={documentNumber}
          onChange={setDocumentNumber}
        />

        <div />

        <InputDate
          label='Document Date'
          value={documentDate}
          onChange={setDocumentDate}
        />
        <InputText label='PO Number' value={poNumber} onChange={setPoNumber} />
        <InputText label='Amount' value={amount} onChange={setAmount} />

        <div />

        <InputTextarea label='Remarks' value={remarks} onChange={setRemarks} />
      </div>
    </div>
  )
}

Form.displayName = 'Form'
export default Form