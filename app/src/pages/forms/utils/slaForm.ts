/**
 * An SLA form (type SLA) is a published form with fixed fields, managed from its entries: it is
 * never opened in the form builder.
 */
export const isSlaForm = (item: unknown) => {
  const form = item as {
    _json?: { settings?: { general?: { type?: unknown } } }
    formJson?: { settings?: { general?: { type?: unknown } } }
    type?: unknown
  } | null
  const type =
    form?._json?.settings?.general?.type ??
    form?.formJson?.settings?.general?.type ??
    form?.type
  return (
    String(type ?? '')
      .trim()
      .toUpperCase() === 'SLA'
  )
}

/**
 * An SLA form has: Name, Description and an SLA Steps table, one row per step.
 * After this long a row can notify people and escalate to one target, like a Standard rule. The API
 * reads the rows by these labels (WorkflowSlaMasterEntry), so they are not translated. A table column
 * has one option source and cannot change per row, so Escalate to says which of the three escalate
 * columns the row uses. Stage is typed: an entry can serve several workflows, each with its own stages.
 */
const SLA_DURATION_UNITS = 'Minutes,Hours,Days'
const SLA_YES_NO = 'Yes,No'
const SLA_SEND_BY = 'Email,SMS'
const SLA_ESCALATE_TO = 'User,Group,Stage'

interface SlaColumnOptions {
  customOptions?: string
  /** Can stay empty: clearable, and never filled in for the user. */
  optional?: boolean
  optionsSource?: 'PREDEFINED' | 'USER_LIST'
  predefinedType?: 'GROUP'
  required?: boolean
}

// Fixed ids: rows are stored by column id, and these read clearly in the saved JSON.
const buildColumn = (
  id: string,
  label: string,
  type: string,
  {
    customOptions = '',
    optional = false,
    optionsSource,
    predefinedType,
    required = false,
  }: SlaColumnOptions = {},
) => ({
  id,
  label,
  // Table columns take their visible title from name.
  name: label,
  size: 'MEDIUM',
  type,
  settings: {
    general: { placeholder: '', tooltip: '', visibility: 'NORMAL' },
    lookupSettings: optionsSource ? { optionsSource } : {},
    specific: {
      customOptions,
      separateOptionsUsing: 'COMMA',
      ...(optional ? { optionalChoice: true } : {}),
      ...(predefinedType ? { predefinedType } : {}),
    },
    validation: { fieldRule: required ? 'REQUIRED' : 'OPTIONAL' },
  },
})

export const buildSlaStepColumns = () => [
  buildColumn('after', 'After', 'NUMBER', { required: true }),
  buildColumn('unit', 'Time unit', 'SINGLE_SELECT', {
    customOptions: SLA_DURATION_UNITS,
    required: true,
  }),
  buildColumn('notifyUsers', 'Notify users', 'MULTI_SELECT', {
    optional: true,
    optionsSource: 'USER_LIST',
  }),
  buildColumn('notifyGroup', 'Notify group', 'SINGLE_SELECT', {
    optional: true,
    optionsSource: 'PREDEFINED',
    predefinedType: 'GROUP',
  }),
  buildColumn('notifyInitiator', 'Notify initiator', 'SINGLE_SELECT', {
    customOptions: SLA_YES_NO,
    optional: true,
  }),
  buildColumn('sendBy', 'Send by', 'MULTI_SELECT', {
    customOptions: SLA_SEND_BY,
    optional: true,
  }),
  buildColumn('escalateTo', 'Escalate to', 'SINGLE_SELECT', {
    customOptions: SLA_ESCALATE_TO,
    optional: true,
  }),
  buildColumn('escalateUser', 'Escalate user', 'SINGLE_SELECT', {
    optional: true,
    optionsSource: 'USER_LIST',
  }),
  buildColumn('escalateGroup', 'Escalate group', 'SINGLE_SELECT', {
    optional: true,
    optionsSource: 'PREDEFINED',
    predefinedType: 'GROUP',
  }),
  buildColumn('escalateStage', 'Escalate stage', 'SHORT_TEXT'),
]

interface SlaFieldOptions {
  required?: boolean
  tableColumns?: ReturnType<typeof buildSlaStepColumns>
}

const buildField = (
  label: string,
  type: string,
  { required = false, tableColumns }: SlaFieldOptions = {},
) => ({
  displayLabel: '',
  id: crypto.randomUUID(),
  label,
  type,
  settings: {
    aiSettings: {
      formControlValidate: { masterFormColumn: [], masterFormId: 0 },
      validateTypeKeyword: '',
    },
    general: {
      hideLabel: false,
      placeholder: '',
      readOnly: false,
      size: 'col-12',
      tooltip: '',
      url: '',
      visibility: 'NORMAL',
    },
    lookupSettings: { columnName: '', connectionId: 0 },
    specific: {
      allowToAddNewOptions: false,
      autoGenerateValue: { enabled: false, prefix: '', suffix: '' },
      customDefaultValue: '',
      customOptions: '',
      defaultValue: '',
      dividerStyle: 'SOLID',
      fibFields: [],
      matrixColumns: [],
      matrixRows: [],
      optionsPerLine: 0,
      optionsSource: 'CUSTOM',
      optionsType: 'CUSTOM',
      separateOptionsUsing: 'COMMA',
      ...(tableColumns ? { tableColumns } : {}),
    },
    validation: {
      allowedFileTypes: [],
      contentRule: '',
      fieldRule: required ? 'REQUIRED' : 'OPTIONAL',
      isCalculationEnabled: false,
      maxFileSize: 10,
      maximum: '',
      minimum: '',
    },
  },
})

export const SLA_STEPS_LABEL = 'SLA Steps'

export const buildSlaFormPayload = (name: string, description: string) => ({
  isDeleted: false,
  panels: [
    {
      fields: [
        buildField('Policy Name', 'SHORT_TEXT', { required: true }),
        buildField('Description', 'LONG_TEXT'),
        buildField('SLA Steps', 'TABLE', {
          tableColumns: buildSlaStepColumns(),
        }),
      ],
      id: crypto.randomUUID(),
      settings: { description: '', title: 'SLA Details' },
    },
  ],
  secondaryPanels: [],
  uid: crypto.randomUUID(),
  settings: {
    general: {
      coordinator: '',
      description: description.trim(),
      layout: 'SINGLE',
      name: name.trim(),
      type: 'SLA',
    },
    hubLinkIds: [],
    publish: {
      publishOption: 'PUBLISHED',
      publishSchedule: '',
      unpublishSchedule: '',
    },
    rules: [],
  },
})
