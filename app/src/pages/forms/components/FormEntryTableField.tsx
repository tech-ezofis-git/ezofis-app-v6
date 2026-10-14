import {
  parseTableRows,
  serializeTableRows,
} from '@/pages/form-builder/helpers/tableEntryValue'
import { type Question } from '@/pages/form-builder/store/formStore'
import TableFieldRenderer from '@/pages/requests/components/workflow-request/components/TableFieldRenderer'

interface Props {
  field: Question
  /** The entry value: a JSON string (as stored) or an array of rows. */
  value: unknown
  disabled?: boolean
  required?: boolean
  /** Receives the table serialized the way a form entry stores it. */
  onChange: (serialized: string) => void
}

/**
 * Table field of a form entry. Uses the same runtime table renderer as the
 * published form and New Request, so every column setting (types, defaults,
 * limits, choices, files, conditional rules) behaves the same in all screens;
 * this wrapper only converts between the entry's JSON-string storage and the
 * renderer's array of rows.
 */
const FormEntryTableField = ({
  disabled,
  field,
  required,
  value,
  onChange,
}: Props) => (
  <TableFieldRenderer
    field={field}
    readOnly={disabled}
    required={required}
    value={parseTableRows(value)}
    onChange={(rows) => onChange(serializeTableRows(rows))}
  />
)

export default FormEntryTableField
