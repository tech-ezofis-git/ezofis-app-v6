import { describe, expect, it } from 'vitest'
import {
  buildClientFieldPatch,
  buildMasterUpdate,
  clientDetailForField,
  clientsFromEntries,
  isCompanyField,
  isMasterTagLabel,
  matchClient,
  matchClientByCompany,
} from './clientMaster'

const entry = {
  Billing_Address: '1 Bill Street, Toronto, ON',
  Company_Name: 'Test Elevator Co.',
  Contact_Name: 'Pat Example',
  Email: 'pat@example.com',
  id: 'row-1',
  Phone_Number: '905-555-0100',
  Shipping_Address: '2 Ship Street, Toronto, ON',
}

const client = clientsFromEntries([entry])[0]

const formFields = [
  { id: 'f-company', label: 'Company Name' },
  { id: 'f-contact', label: 'Contact' },
  { id: 'f-phone', label: 'Phone Number' },
  { id: 'f-email', label: 'Email' },
  { id: 'f-bill', label: 'Billing Address' },
  { id: 'f-ship', label: 'Shipping Address' },
  { id: 'f-q2-email', label: 'quote_2 Email' },
]

describe('client master', () => {
  it('reads physical column names', () => {
    expect(client).toEqual({
      billing: '1 Bill Street, Toronto, ON',
      columns: {
        billing: 'Billing_Address',
        company: 'Company_Name',
        contact: 'Contact_Name',
        email: 'Email',
        phone: 'Phone_Number',
        shipping: 'Shipping_Address',
      },
      company: 'Test Elevator Co.',
      contact: 'Pat Example',
      email: 'pat@example.com',
      id: 'row-1',
      phone: '905-555-0100',
      shipping: '2 Ship Street, Toronto, ON',
    })
  })

  it('reads values held in a JSON column and keyed by field id', () => {
    const rows = clientsFromEntries(
      [
        {
          formData: JSON.stringify({ a1: 'Json Co.', b2: 'j@example.com' }),
          id: 9,
        },
      ],
      [
        { id: 'a1', label: 'Company Name' },
        { id: 'b2', label: 'Email' },
      ],
    )
    expect(rows[0]).toMatchObject({
      company: 'Json Co.',
      email: 'j@example.com',
      id: '9',
    })
  })

  it('skips entries with no company', () => {
    expect(clientsFromEntries([{ Email: 'x@example.com' }])).toEqual([])
  })

  it('fills every header field for the chosen client', () => {
    const patch = buildClientFieldPatch(client, formFields)
    expect(Object.fromEntries(patch.map((row) => [row.id, row.value]))).toEqual(
      {
        'f-bill': client.billing,
        'f-company': client.company,
        'f-contact': client.contact,
        'f-email': client.email,
        'f-phone': client.phone,
        'f-ship': client.shipping,
      },
    )
  })

  it('never clears a field when the master value is blank', () => {
    const patch = buildClientFieldPatch({ ...client, shipping: '' }, formFields)
    expect(patch.map((row) => row.id)).not.toContain('f-ship')
  })

  it('leaves out fields the form does not have', () => {
    const patch = buildClientFieldPatch(client, [formFields[3]])
    expect(patch.map((row) => row.id)).toEqual(['f-email'])
  })

  it('matches a company only when exactly one client has it', () => {
    const rows = clientsFromEntries([entry, { ...entry, id: 'row-2' }])
    expect(matchClientByCompany([client], 'test elevator co')).toEqual(client)
    expect(matchClientByCompany(rows, 'Test Elevator Co.')).toBeNull()
    expect(matchClientByCompany([client], '')).toBeNull()
  })

  it('matches by email before company', () => {
    const other = clientsFromEntries([
      {
        ...entry,
        Company_Name: 'Other Co',
        Email: 'o@example.com',
        id: 'row-2',
      },
    ])[0]
    expect(
      matchClient([client, other], 'O@example.com', 'Test Elevator Co.'),
    ).toEqual(other)
    expect(matchClient([client, other], '', 'Other Co')).toEqual(other)
  })

  it('saves an edited detail under its master column', () => {
    const row = {
      ...client,
      id: '0d5f7a52-6a43-4f0e-9d25-2f7a7ce1a111',
      masterFormId: 'form-1',
    }
    expect(buildMasterUpdate(row, 'billing', ' 9 New Road ')).toEqual({
      Billing_Address: '9 New Road',
    })
  })

  it('saves nothing when unchanged, blank, or without a real row', () => {
    const row = {
      ...client,
      id: '0d5f7a52-6a43-4f0e-9d25-2f7a7ce1a111',
      masterFormId: 'form-1',
    }
    expect(buildMasterUpdate(row, 'email', client.email)).toBeNull()
    expect(buildMasterUpdate(row, 'email', '  ')).toBeNull()
    expect(
      buildMasterUpdate({ ...row, id: 'row-1' }, 'email', 'n@example.com'),
    ).toBeNull()
    expect(
      buildMasterUpdate({ ...row, columns: {} }, 'email', 'n@example.com'),
    ).toBeNull()
    expect(buildMasterUpdate(client, 'email', 'n@example.com')).toBeNull()
  })

  it('never saves the company back to the master', () => {
    expect(clientDetailForField({ label: 'Company Name' })).toBeNull()
    expect(clientDetailForField({ label: 'Billing Address' })).toBe('billing')
    expect(clientDetailForField({ label: 'quote_2 Email' })).toBeNull()
  })

  it('recognises the agent master tags', () => {
    expect(isMasterTagLabel('Billing Address From Master')).toBe(true)
    expect(isMasterTagLabel('shipping_address_from_master')).toBe(true)
    expect(isMasterTagLabel('Rfq Master Match')).toBe(true)
    expect(isMasterTagLabel('Billing Address')).toBe(false)
  })

  it('recognises company fields', () => {
    expect(isCompanyField(formFields[0])).toBe(true)
    expect(isCompanyField(formFields[1])).toBe(false)
  })
})
