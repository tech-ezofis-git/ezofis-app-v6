export type CountryDialCode = {
  code: string
  dialCode: string
  name: string
}

/** Convert ISO 3166-1 alpha-2 code to a flag emoji. */
export const getCountryFlagEmoji = (countryCode: string) => {
  const code = String(countryCode || '')
    .trim()
    .toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return '🏳️'

  const chars = [...code].map(
    (char) => 0x1f1e6 + char.charCodeAt(0) - 'A'.charCodeAt(0),
  )
  return String.fromCodePoint(...chars)
}

/** Common country dial codes for phone inputs. */
export const countryDialCodes: CountryDialCode[] = [
  { code: 'US', dialCode: '+1', name: 'United States' },
  { code: 'CA', dialCode: '+1', name: 'Canada' },
  { code: 'GB', dialCode: '+44', name: 'United Kingdom' },
  { code: 'IN', dialCode: '+91', name: 'India' },
  { code: 'AU', dialCode: '+61', name: 'Australia' },
  { code: 'DE', dialCode: '+49', name: 'Germany' },
  { code: 'FR', dialCode: '+33', name: 'France' },
  { code: 'SG', dialCode: '+65', name: 'Singapore' },
  { code: 'AE', dialCode: '+971', name: 'United Arab Emirates' },
  { code: 'SA', dialCode: '+966', name: 'Saudi Arabia' },
  { code: 'ZA', dialCode: '+27', name: 'South Africa' },
  { code: 'NG', dialCode: '+234', name: 'Nigeria' },
  { code: 'KE', dialCode: '+254', name: 'Kenya' },
  { code: 'JP', dialCode: '+81', name: 'Japan' },
  { code: 'KR', dialCode: '+82', name: 'South Korea' },
  { code: 'CN', dialCode: '+86', name: 'China' },
  { code: 'HK', dialCode: '+852', name: 'Hong Kong' },
  { code: 'MY', dialCode: '+60', name: 'Malaysia' },
  { code: 'ID', dialCode: '+62', name: 'Indonesia' },
  { code: 'PH', dialCode: '+63', name: 'Philippines' },
  { code: 'TH', dialCode: '+66', name: 'Thailand' },
  { code: 'VN', dialCode: '+84', name: 'Vietnam' },
  { code: 'BR', dialCode: '+55', name: 'Brazil' },
  { code: 'MX', dialCode: '+52', name: 'Mexico' },
  { code: 'NL', dialCode: '+31', name: 'Netherlands' },
  { code: 'IE', dialCode: '+353', name: 'Ireland' },
  { code: 'IT', dialCode: '+39', name: 'Italy' },
  { code: 'ES', dialCode: '+34', name: 'Spain' },
  { code: 'CH', dialCode: '+41', name: 'Switzerland' },
  { code: 'SE', dialCode: '+46', name: 'Sweden' },
  { code: 'NO', dialCode: '+47', name: 'Norway' },
  { code: 'DK', dialCode: '+45', name: 'Denmark' },
  { code: 'FI', dialCode: '+358', name: 'Finland' },
  { code: 'NZ', dialCode: '+64', name: 'New Zealand' },
  { code: 'PK', dialCode: '+92', name: 'Pakistan' },
  { code: 'BD', dialCode: '+880', name: 'Bangladesh' },
  { code: 'LK', dialCode: '+94', name: 'Sri Lanka' },
  { code: 'QA', dialCode: '+974', name: 'Qatar' },
  { code: 'KW', dialCode: '+965', name: 'Kuwait' },
  { code: 'BH', dialCode: '+973', name: 'Bahrain' },
  { code: 'OM', dialCode: '+968', name: 'Oman' },
  { code: 'EG', dialCode: '+20', name: 'Egypt' },
  { code: 'TR', dialCode: '+90', name: 'Turkey' },
  { code: 'PL', dialCode: '+48', name: 'Poland' },
  { code: 'PT', dialCode: '+351', name: 'Portugal' },
  { code: 'RU', dialCode: '+7', name: 'Russia' },
  { code: 'UA', dialCode: '+380', name: 'Ukraine' },
  { code: 'IL', dialCode: '+972', name: 'Israel' },
  { code: 'AR', dialCode: '+54', name: 'Argentina' },
  { code: 'CL', dialCode: '+56', name: 'Chile' },
]

export const countryDialCodeOptions = countryDialCodes.map((country) => ({
  id: country.code,
  iconKey: `circle-flags:${country.code.toLowerCase()}`,
  name: country.dialCode,
  value: `${country.dialCode}|${country.code}`,
}))

export const DEFAULT_COUNTRY_DIAL_CODE = '+1'
export const DEFAULT_COUNTRY_ISO = 'US'
export const DEFAULT_COUNTRY_DIAL_VALUE = `${DEFAULT_COUNTRY_DIAL_CODE}|${DEFAULT_COUNTRY_ISO}`

export const getDialCodeFromCountryValue = (value: string) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (raw.includes('|')) return raw.split('|')[0] || ''
  return raw.startsWith('+') ? raw : ''
}

export const getCountrySelectValue = (countryCode: string) => {
  const raw = String(countryCode || '').trim()
  if (!raw) return ''
  if (raw.includes('|')) return raw

  const match = countryDialCodes.find((country) => country.dialCode === raw)
  if (match) return `${match.dialCode}|${match.code}`

  return raw.startsWith('+') ? `${raw}|${DEFAULT_COUNTRY_ISO}` : ''
}
