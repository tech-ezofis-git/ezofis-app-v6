/**
 * The everyday name of each form field type. The form builder's field library,
 * the name given to a newly added field, the "Field type" setting and the type
 * tag in the settings panel all read from this list, so a type has one name on
 * every screen.
 */
export const FIELD_TYPE_NAMES: Record<string, string> = {
  ADDRESS: 'Address',
  ADDRESS_INFO: 'Address Template',
  CALCULATED: 'Calculated',
  CONSENT: 'Consent',
  CONTACT_INFO: 'Contact Template',
  COUNTER: 'Counter',
  COUNTRY_CODE: 'Country',
  CURRENCY_AMOUNT: 'Currency',
  DATE: 'Date',
  DATE_TIME: 'Date & Time',
  DIVIDER: 'Divider',
  DYNAMIC_TABLE: 'Dynamic Table',
  EMAIL: 'Email',
  FILE_UPLOAD: 'File Upload',
  FINANCIAL_AUDIT: 'Financial Audit',
  FULL_NAME: 'Full Name',
  HEADING: 'Heading',
  IMAGE_UPLOAD: 'Image Upload',
  INVOICE_REPORT: 'Invoice Report',
  LONG_TEXT: 'Long Text',
  MATRIX: 'Matrix',
  MULTI_SELECT: 'Multi Select',
  MULTIPLE_CHOICE: 'Multiple Choice',
  NUMBER: 'Number',
  OPINION_SCALE: 'Opinion Scale',
  PARAGRAPH: 'Paragraph',
  PASSWORD: 'Password',
  PHONE_NUMBER: 'Phone Number',
  RATING: 'Rating',
  SCORE: 'Score',
  SHORT_TEXT: 'Short Text',
  SIGNATURE: 'Signature',
  SINGLE_CHOICE: 'Single Choice',
  SINGLE_SELECT: 'Single Select',
  TABLE: 'Table',
  TEXT_BUILDER: 'Text Builder',
  TIME: 'Time',
  URL: 'URL',
  YES_NO_TOGGLE: 'Yes/No',
}

/** The everyday name of a field type, or undefined for a type that has none. */
export const getFieldTypeName = (type: string): string | undefined =>
  FIELD_TYPE_NAMES[String(type).toUpperCase()]
