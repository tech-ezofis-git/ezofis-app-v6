export const generateId = () => {
  try {
    return crypto.randomUUID()
  } catch (e) {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    )
  }
}

const toTitleCase = (value: string) =>
  value
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

export const getField = (fieldType: string) => {
  const id = generateId()

  const baseField = {
    displayLabel: '',
    id,
    label:
      fieldType.toLowerCase() === 'text_builder'
        ? 'Paragraph'
        : toTitleCase(fieldType.replace(/_/g, ' ')),
    type: fieldType.toUpperCase(),
    settings: {
      aiSettings: {
        formControlValidate: { masterFormColumn: [], masterFormId: 0 },
        validateTypeKeyword: '',
      },
      general: {
        hideLabel: false,
        placeholder: '',
        readOnly: false,
        size: 'col-6',
        tooltip: '',
        url: '',
        visibility: 'NORMAL',
      },
      lookupSettings: {
        columnName: '',
        connectionId: 0,
      },
      specific: {
        allowToAddNewOptions: false,
        autoGenerateValue: { enabled: false, prefix: '', suffix: '' },
        customDefaultValue: '',
        customOptions: 'Option 1,Option 2,Option 3',
        defaultValue: '',
        dividerStyle: 'SOLID',
        fibFields: [] as any[],
        matrixColumns: [] as any[],
        matrixRows: [] as any[],
        optionsPerLine: 0,
        optionsSource: 'CUSTOM',
        optionsType: 'CUSTOM',
        separateOptionsUsing: 'COMMA',
      },
      validation: {
        allowedFileTypes: [] as string[],
        contentRule: '',
        fieldRule: 'OPTIONAL',
        isCalculationEnabled: false,
        maxFileSize: 10,
        maximum: '',
        minimum: '',
      },
    },
  }

  // Specific tweaks based on type
  const s = baseField.settings.specific as any
  const v = baseField.settings.validation as any
  switch (fieldType.toUpperCase()) {
    case 'TABLE':
    case 'DYNAMIC_TABLE':
      s.tableColumns = [
        {
          id: generateId(),
          name: 'Column 1',
          size: 'MEDIUM',
          type: 'SHORT_TEXT',
        },
      ]
      break
    case 'MATRIX':
      s.matrixRowLabels = ['Row 1', 'Row 2']
      s.matrixColumnLabels = ['Col 1', 'Col 2', 'Col 3']
      break
    case 'RATING':
      s.iconType = 'STAR'
      s.iconCount = 5
      break
    case 'OPINION_SCALE':
      s.iconType = 'STAR'
      s.iconCount = 10
      break
    case 'EMAIL':
      baseField.settings.validation.contentRule = 'EMAIL'
      break
    case 'URL':
      baseField.settings.validation.contentRule = 'URL'
      break
    case 'PHONE_NUMBER':
      baseField.settings.validation.contentRule = 'PHONE'
      break
    case 'SINGLE_CHOICE':
      s.customOptions = 'Option 1,Option 2,Option 3'
      s.optionsType = 'CUSTOM'
      s.optionsPerLine = 3
      s.qrCodeEnabled = false
      break
    case 'MULTIPLE_CHOICE':
      s.customOptions = 'Option 1,Option 2,Option 3'
      s.optionsType = 'CUSTOM'
      s.optionsPerLine = 3
      s.bulkActionsEnabled = false
      v.requiredValidation = 'ANY'
      break
    case 'YES_NO_TOGGLE':
      s.customOptions = 'Yes,No'
      s.optionsType = 'CUSTOM'
      s.optionsPerLine = 2
      break
    case 'SCORE':
      s.iconType = 'NUMBER'
      s.iconCount = 10
      break
    case 'FILE_UPLOAD':
    case 'IMAGE_UPLOAD':
      baseField.settings.general.size = 'col-12'
      if (fieldType.toUpperCase() === 'IMAGE_UPLOAD') {
        baseField.settings.validation.allowedFileTypes = ['IMAGE'] as string[]
      }
      break
    case 'CONSENT':
    case 'LEGAL':
      baseField.label = fieldType.toUpperCase() === 'LEGAL' ? 'Legal Declaration' : 'Consent'
      s.customOptions = fieldType.toUpperCase() === 'LEGAL' ? "I Accept,I don't Accept" : 'I agree to the terms and conditions'
      s.optionsType = 'CUSTOM'
      s.optionsPerLine = 1
      break
    case 'DATE':
      s.dateDefaultValueType = 'CUSTOM'
      v.dateLimitType = 'NONE'
      break
    case 'TIME':
      s.timeDefaultValueType = 'CUSTOM'
      v.timeLimitType = 'NONE'
      v.timeFormat = '12'
      break
    case 'DATE_TIME':
      s.dateDefaultValueType = 'CUSTOM'
      v.dateLimitType = 'NONE'
      v.timeFormat = '12'
      break
    case 'CALCULATED':
      s.formulaTokens = []
      baseField.settings.general.readOnly = true
      baseField.settings.general.visibility = 'READ_ONLY'
      baseField.settings.validation.isCalculationEnabled = true
      break
  }

  return baseField
}
