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
        tableColumns: [] as any[],
        tableRowsType: 'ON_DEMAND',
      },
      validation: {
        allowedFileTypes: [] as string[],
        contentRule: '',
        fieldRule: 'OPTIONAL',
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
          label: 'Column 1',
          size: 'col-6',
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
    case 'YES_NO_TOGGLE':
      s.customOptions = 'Yes,No'
      s.optionsType = 'CUSTOM'
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
      baseField.label = 'Consent'
      s.customOptions = 'I agree to the terms and conditions'
      s.optionsType = 'CUSTOM'
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
  }

  return baseField
}
