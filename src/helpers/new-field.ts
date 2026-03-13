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

export const getField = (fieldType: string) => {
  const id = generateId()

  const baseField = {
    displayLabel: '',
    id,
    label:
      fieldType.toLowerCase() === 'text_builder'
        ? 'Paragraph'
        : fieldType.replace(/_/g, ' ').toLowerCase(),
    type: fieldType.toUpperCase(),
    settings: {
      aiSettings: {
        formControlValidate: { masterFormColumn: [], masterFormId: 0 },
        validateTypeKeyword: '',
      },
      general: {
        dividerType: 'SOLID',
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
        autoGenerateValue: { prefix: '', suffix: '' },
        customDefaultValue: '',
        customOptions: 'Option 1,Option 2,Option 3',
        defaultValue: 'CUSTOM',
        fibFields: [] as any[],
        matrixColumns: [] as any[],
        matrixRows: [] as any[],
        optionsPerLine: 0,
        optionsType: 'CUSTOM',
        separateOptionsUsing: 'COMMA',
        tableColumns: [] as any[],
        tableRowsType: 'ON_DEMAND',
      },
      validation: {
        allowedFileTypes: [],
        contentRule: '',
        fieldRule: 'OPTIONAL',
        maxFileSize: 10,
        maximum: '',
        minimum: '',
      },
    },
  }

  // Specific tweaks based on type
  switch (fieldType.toUpperCase()) {
    case 'TABLE':
    case 'DYNAMIC_TABLE':
      baseField.settings.specific.tableColumns = [
        { id: generateId(), name: 'Column 1', size: 'md', type: 'SHORT_TEXT' },
      ]
      break
    case 'MATRIX':
      baseField.settings.specific.matrixColumns = ['Col 1', 'Col 2']
      baseField.settings.specific.matrixRows = ['Row 1', 'Row 2']
      break
    case 'SINGLE_SELECT':
    case 'MULTI_SELECT':
    case 'SINGLE_CHOICE':
    case 'MULTIPLE_CHOICE':
      // Defaults are already set in specific block
      break
  }

  return baseField
}
