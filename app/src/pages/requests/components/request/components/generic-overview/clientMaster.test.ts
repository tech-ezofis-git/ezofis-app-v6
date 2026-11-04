import { describe, expect, it } from 'vitest'
import {
  buildBillingSave,
  clientsFromEntries,
  isBillingField,
  isMasterTagLabel,
  matchClient,
} from './clientMaster'

const ROW_ID = '0d5f7a52-6a43-4f0e-9d25-2f7a7ce1a111'

const entry = {
  Billing_Address: '1 Bill Street, Toronto, ON',
  Company_Name: 'Test Elevator Co.',
  Email: 'pat@example.com',
  id: ROW_ID,
}

const client = clientsFromEntries([entry])[0]

describe('client master', () => {
  it('reads physical column names', () => {
    expect(client).toEqual({
      billing: '1 Bill Street, Toronto, ON',
      billingColumn: 'Billing_Address',
      company: 'Test Elevator Co.',
      email: 'pat@example.com',
      id: ROW_ID,
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

  it('updates only Bill To on the client row', () => {
    expect(
      buildBillingSave(client, ' 9 New Road ', 'Any', 'a@example.com'),
    ).toEqual({
      entryId: ROW_ID,
      fields: { Billing_Address: '9 New Road' },
    })
  })

  it('creates a row when the client has none', () => {
    expect(
      buildBillingSave(null, '9 New Road', 'New Co', 'n@example.com'),
    ).toEqual({
      fields: {
        'Billing Address': '9 New Road',
        'Company Name': 'New Co',
        'Email': 'n@example.com',
      },
    })
  })

  it('saves nothing when unchanged, blank, or without a company', () => {
    expect(buildBillingSave(client, client.billing, 'A', '')).toBeNull()
    expect(buildBillingSave(client, '  ', 'A', '')).toBeNull()
    expect(buildBillingSave(null, '9 New Road', ' ', '')).toBeNull()
    expect(
      buildBillingSave({ ...client, id: 'r1' }, '9 New Road', 'A', ''),
    ).toBeNull()
  })

  it('treats only Quote 1 Bill To as the master field', () => {
    expect(isBillingField({ label: 'Billing Address' })).toBe(true)
    expect(isBillingField({ label: 'Shipping Address' })).toBe(false)
    expect(isBillingField({ label: 'quote_2 Billing Address' })).toBe(false)
    expect(isBillingField({ label: 'Email' })).toBe(false)
  })

  it('recognises the agent master tags', () => {
    expect(isMasterTagLabel('Billing Address From Master')).toBe(true)
    expect(isMasterTagLabel('shipping_address_from_master')).toBe(true)
    expect(isMasterTagLabel('Rfq Master Match')).toBe(true)
    expect(isMasterTagLabel('Rfq Master No Match')).toBe(true)
    expect(isMasterTagLabel('Billing Address')).toBe(false)
  })
})
