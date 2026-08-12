import { getField } from '@/helpers/new-field'
import { type Question } from '@/pages/form-builder/store/formStore'

/**
 * Handles the selection of a field type, including complex templates.
 * Returns an array of questions to be added.
 */
export const createFieldQuestions = (type: string): Question[] => {
  if (type === 'FULL_NAME') {
    const firstName = getField('SHORT_TEXT')
    firstName.label = 'First Name'
    firstName.settings.general.size = 'col-6'
    const lastName = getField('SHORT_TEXT')
    lastName.label = 'Last Name'
    lastName.settings.general.size = 'col-6'
    return [firstName as Question, lastName as Question]
  } else if (type === 'CONTACT_INFO') {
    const name = getField('SHORT_TEXT')
    name.label = 'Full Name'
    const email = getField('EMAIL')
    const phone = getField('PHONE_NUMBER')
    const company = getField('SHORT_TEXT')
    company.label = 'Company'
    return [
      name as Question,
      email as Question,
      phone as Question,
      company as Question,
    ]
  } else if (type === 'ADDRESS' || type === 'ADDRESS_INFO') {
    const street = getField('SHORT_TEXT')
    street.label = 'Street Address'
    const city = getField('SHORT_TEXT')
    city.label = 'City'
    city.settings.general.size = 'col-6'
    const state = getField('SHORT_TEXT')
    state.label = 'State / Province'
    state.settings.general.size = 'col-6'
    const zip = getField('SHORT_TEXT')
    zip.label = 'Zip / Postal Code'
    zip.settings.general.size = 'col-6'
    const country = getField('COUNTRY_CODE')
    country.settings.general.size = 'col-6'
    return [
      street as Question,
      city as Question,
      state as Question,
      zip as Question,
      country as Question,
    ]
  } else if (type === 'FINANCIAL_AUDIT' || type === 'GL_MATCHING') {
    const supplier = getField('SHORT_TEXT')
    supplier.label = 'Supplier Name'
    supplier.settings.general.size = 'col-6'
    const matterId = getField('SHORT_TEXT')
    matterId.label = 'Matter ID'
    matterId.settings.general.size = 'col-6'

    const client = getField('SHORT_TEXT')
    client.label = 'Client Name'
    client.settings.general.size = 'col-4'
    const currency = getField('SHORT_TEXT')
    currency.label = 'Currency'
    currency.settings.general.size = 'col-4'
    const amount = getField('CURRENCY_AMOUNT')
    amount.label = 'Invoice Amount'
    amount.settings.general.size = 'col-4'

    const date = getField('DATE')
    date.label = 'Due Date'
    date.settings.general.size = 'col-4'
    const decision = getField('SHORT_TEXT')
    decision.label = 'Audit Decision'
    decision.settings.general.size = 'col-4'
    const score = getField('NUMBER')
    score.label = 'Overall Score (%)'
    score.settings.general.size = 'col-4'

    const reason = getField('LONG_TEXT')
    reason.label = 'Audit Reasoning'
    const table = getField('TABLE')
    table.label = 'GL Matching Details'

    return [
      supplier,
      matterId,
      client,
      currency,
      amount,
      date,
      decision,
      score,
      reason,
      table,
    ] as Question[]
  } else if (type === 'INVOICE_REPORT') {
    const supplier = getField('SHORT_TEXT')
    supplier.label = 'Supplier Name'
    const poNumber = getField('SHORT_TEXT')
    poNumber.label = 'PO Number'
    const currency = getField('SHORT_TEXT')
    currency.label = 'Currency'
    currency.settings.general.size = 'col-4'
    const totalDue = getField('CURRENCY_AMOUNT')
    totalDue.label = 'Total Due'
    totalDue.settings.general.size = 'col-4'
    const score = getField('NUMBER')
    score.label = 'Match Score (%)'
    score.settings.general.size = 'col-4'

    const decision = getField('SHORT_TEXT')
    decision.label = 'Decision'
    const reason = getField('LONG_TEXT')
    reason.label = 'Reason'

    const table = getField('TABLE')
    table.label = 'Line Items'

    return [
      supplier as Question,
      poNumber as Question,
      currency as Question,
      totalDue as Question,
      score as Question,
      decision as Question,
      reason as Question,
      table as Question,
    ]
  } else {
    const newQuestion = getField(type)
    return [newQuestion as Question]
  }
}
