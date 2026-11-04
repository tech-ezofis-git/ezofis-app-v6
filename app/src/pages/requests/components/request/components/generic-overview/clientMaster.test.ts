import { describe, expect, it } from 'vitest'
import {
  buildMasterSave,
  clientDetailForField,
  clientsFromEntries,
  isMasterTagLabel,
  matchClient,
} from './clientMaster'

const ROW_ID = '0d5f7a52-6a43-4f0e-9d25-2f7a7ce1a111'

const entry = {
  Billing_Address: '1 Bill Street, Toronto, ON',
  Company_Name: 'Test Elevator Co.',
  Contact_Name: 'Pat Example',
  Email: 'pat@example.com',
  id: ROW_ID,
  Phone_Number: '905-555-0100',
}

const client = clientsFromEntries([entry])[0]

describe('client master', () => {
  it('reads physical column names', () => {
    expect(client).toEqual({
      billing: '1 Bill Street, Toronto, ON',
      columns: {
        billing: 'Billing_Address',
        contact: 'Contact_Name',
        email: 'Email',
        phone: 'Phone_Number',
      },
      company: 'Test Elevator Co.',
      contact: 'Pat Example',
      email: 'pat@example.com',
      id: ROW_ID,
      phone: '905-555-0100',
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

  it('matches by email before company', () => {
    const other = clientsFromEntries([
      { ...entry, Company_Name: 'Other Co', Email: 'o@example.com', id: 'r2' },
    ])[0]
    expect(
      matchClient([client, other], 'O@example.com', 'Test Elevator Co.'),
    ).toEqual(other)
    expect(matchClient([client, other], '', 'test elevator co')).toEqual(client)
  })

  it('does not choose between two equal matches', () => {
    const rows = clientsFromEntries([entry, { ...entry, id: 'r2' }])
    expect(matchClient(rows, 'pat@example.com', 'Test Elevator Co.')).toBeNull()
  })

  it('updates only the edited detail on the client row', () => {
    const values = {
      billing: 'Other',
      company: 'Any',
      contact: ' Riley New ',
      phone: '1',
    }
    expect(buildMasterSave(client, 'contact', values)).toEqual({
      entryId: ROW_ID,
      fields: { Contact_Name: 'Riley New' },
    })
    expect(buildMasterSave(client, 'phone', values)).toEqual({
      entryId: ROW_ID,
      fields: { Phone_Number: '1' },
    })
    expect(
      buildMasterSave(client, 'email', { email: 'n@example.com' }),
    ).toEqual({
      entryId: ROW_ID,
      fields: { Email: 'n@example.com' },
    })
    expect(
      buildMasterSave(client, 'billing', { billing: '9 New Road' }),
    ).toEqual({
      entryId: ROW_ID,
      fields: { Billing_Address: '9 New Road' },
    })
  })

  it('creates a row with the form details when the client has none', () => {
    expect(
      buildMasterSave(null, 'contact', {
        billing: '9 New Road',
        company: 'New Co',
        contact: 'Riley New',
        email: '',
        phone: '905-555-0111',
      }),
    ).toEqual({
      fields: {
        'Billing Address': '9 New Road',
        'Company Name': 'New Co',
        'Contact': 'Riley New',
        'Phone Number': '905-555-0111',
      },
    })
  })

  it('saves nothing when unchanged, blank, or without a company', () => {
    expect(buildMasterSave(client, 'email', { email: client.email })).toBeNull()
    expect(buildMasterSave(client, 'contact', { contact: '  ' })).toBeNull()
    expect(
      buildMasterSave(null, 'billing', { billing: 'x', company: ' ' }),
    ).toBeNull()
    expect(
      buildMasterSave({ ...client, id: 'r1' }, 'phone', { phone: '1' }),
    ).toBeNull()
  })

  it('saves only Bill To, Contact, Phone and Email of Quote 1', () => {
    expect(clientDetailForField({ label: 'Billing Address' })).toBe('billing')
    expect(clientDetailForField({ label: 'Contact' })).toBe('contact')
    expect(clientDetailForField({ label: 'Phone Number' })).toBe('phone')
    expect(clientDetailForField({ label: 'Email' })).toBe('email')
    expect(clientDetailForField({ label: 'Shipping Address' })).toBeNull()
    expect(clientDetailForField({ label: 'Company Name' })).toBeNull()
    expect(clientDetailForField({ label: 'quote_2 Email' })).toBeNull()
  })

  it('recognises the agent master tags', () => {
    expect(isMasterTagLabel('Billing Address From Master')).toBe(true)
    expect(isMasterTagLabel('shipping_address_from_master')).toBe(true)
    expect(isMasterTagLabel('Rfq Master Match')).toBe(true)
    expect(isMasterTagLabel('Rfq Master No Match')).toBe(true)
    expect(isMasterTagLabel('Billing Address')).toBe(false)
  })
})
