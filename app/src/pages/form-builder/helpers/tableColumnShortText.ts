/* eslint-disable @typescript-eslint/no-explicit-any */
import { isTextFillableColumn } from './tableColumnFiles'

export type AddressPart = 'CITY' | 'COUNTRY' | 'POSTALCODE' | 'STATE'

export interface AddressSuggestion {
  label: string
  raw: any
}

/** Address pieces a picked address can be split into (top-level field list). */
export const ADDRESS_PARTS: Array<{ id: AddressPart; name: string }> = [
  { id: 'CITY', name: 'City' },
  { id: 'STATE', name: 'State' },
  { id: 'COUNTRY', name: 'Country' },
  { id: 'POSTALCODE', name: 'Postal code' },
]

const PHOTON_URL = 'https://photon.komoot.io/api/'

/** One piece of a Photon result, using the same mapping top-level fields use. */
export function addressPartValue(properties: any, part: string): string {
  const props = properties || {}
  switch (part) {
    case 'CITY':
      return props.city || props.county || ''
    case 'STATE':
      return props.state || ''
    case 'COUNTRY':
      return props.country || ''
    case 'POSTALCODE':
      return props.postcode || ''
    default:
      return ''
  }
}

/**
 * Values to write into sibling columns when an address is picked. Only
 * columns the user chose for each piece, that still exist and can hold text,
 * are filled (never the address column itself).
 */
export function buildAddressPatch(
  col: any,
  siblings: any[],
  feature: any,
): Record<string, string> {
  const patch: Record<string, string> = {}
  const fillable = new Set(
    siblings
      .filter((c) => c?.id && c.id !== col?.id && isTextFillableColumn(c))
      .map((c) => String(c.id)),
  )
  for (const row of getAddressMatchingRows(col)) {
    const value = addressPartValue(feature?.properties, row.addressColumn)
    if (!value) continue
    for (const id of row.selectFieldColumn) {
      if (fillable.has(String(id))) patch[String(id)] = value
    }
  }
  return patch
}

/** Photon address search (same service the top-level address field uses). */
export async function fetchAddressSuggestions(
  query: string,
): Promise<AddressSuggestion[]> {
  const res = await fetch(
    `${PHOTON_URL}?q=${encodeURIComponent(query)}&limit=5`,
  )
  const json = await res.json()
  const features: any[] = json?.features || []
  return features.map(formatAddressSuggestion)
}

export function formatAddressSuggestion(feature: any): AddressSuggestion {
  return {
    label: [
      feature?.properties?.name,
      feature?.properties?.city,
      feature?.properties?.state,
      feature?.properties?.country,
    ]
      .filter(Boolean)
      .join(', '),
    raw: feature,
  }
}

/** `specific.addressMatchingFields`, tolerant of missing or odd entries. */
export function getAddressMatchingRows(col: any): Array<{
  addressColumn: AddressPart
  id: string
  selectFieldColumn: string[]
}> {
  const raw = col?.settings?.specific?.addressMatchingFields
  if (!Array.isArray(raw)) return []
  return raw
    .filter((r) => r && typeof r.addressColumn === 'string')
    .map((r) => ({
      addressColumn: r.addressColumn as AddressPart,
      id: String(r.id ?? r.addressColumn),
      selectFieldColumn: Array.isArray(r.selectFieldColumn)
        ? r.selectFieldColumn.map(String)
        : [],
    }))
}

/** Address autocomplete on a SHORT_TEXT column (`specific.isAddressField`). */
export function isAddressColumn(col: any): boolean {
  return (
    String(col?.type || '').toUpperCase() === 'SHORT_TEXT' &&
    col?.settings?.specific?.isAddressField === true
  )
}

/** QR / barcode scan-to-fill on a SHORT_TEXT column (`specific.qrValue`). */
export function isQrColumn(col: any): boolean {
  return (
    String(col?.type || '').toUpperCase() === 'SHORT_TEXT' &&
    col?.settings?.specific?.qrValue === true
  )
}

/**
 * New `addressMatchingFields` after choosing the columns an address piece
 * fills. A piece with no columns is dropped; other pieces are kept.
 */
export function setAddressTargets(
  col: any,
  part: AddressPart,
  targetIds: string[],
): Array<{
  addressColumn: AddressPart
  id: string
  selectFieldColumn: string[]
}> {
  const rows = getAddressMatchingRows(col).filter(
    (r) => r.addressColumn !== part,
  )
  if (targetIds.length > 0) {
    rows.push({ addressColumn: part, id: part, selectFieldColumn: targetIds })
  }
  return ADDRESS_PARTS.map((p) =>
    rows.find((r) => r.addressColumn === p.id),
  ).filter((r): r is NonNullable<typeof r> => Boolean(r))
}
