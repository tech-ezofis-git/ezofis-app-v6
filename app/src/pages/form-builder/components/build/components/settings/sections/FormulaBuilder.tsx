import { type ComponentProps, useState } from 'react'
import type { Question } from '@/pages/form-builder/store/formStore'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import InputNumber from '@/components/base/inputs/InputNumber'
import InputSelectBase from '@/components/base/inputs/InputSelect'
import {
  encodeTableSumValue,
  formatFormulaExpression,
  type FormulaToken,
  getNumericTableColumns,
  isFormulaSourceType,
  isInsideUnclosedAverage,
  isTableFieldType,
} from '@/pages/form-builder/helpers/formula'
import cn from '@/utils/cn'

function InputSelect(props: ComponentProps<typeof InputSelectBase>) {
  return <InputSelectBase searchable wrapOptions {...props} />
}

interface Props {
  activeQuestion: Question
  fields: Question[]
  onChange: (tokens: FormulaToken[]) => void
}

const OPERATORS: { label: string; value: string }[] = [
  { label: '+', value: '+' },
  { label: '−', value: '-' },
  { label: '×', value: '*' },
  { label: '÷', value: '/' },
]

const GROUPING: { label: string; value: string }[] = [
  { label: '(', value: '(' },
  { label: ')', value: ')' },
  { label: ',', value: ',' },
]

const FormulaBuilder = ({ activeQuestion, fields, onChange }: Props) => {
  const [manualValue, setManualValue] = useState<string | number>('')
  const [tableFieldId, setTableFieldId] = useState<string | null>(null)
  const [columnId, setColumnId] = useState<string | null>(null)
  const tokens: FormulaToken[] =
    activeQuestion.settings.specific.formulaTokens || []

  const sourceFields = fields.filter(
    (field) =>
      field.id !== activeQuestion.id && isFormulaSourceType(field.type),
  )
  const tableFields = fields.filter(
    (field) => field.id !== activeQuestion.id && isTableFieldType(field.type),
  )
  const selectedTable = tableFields.find((field) => field.id === tableFieldId)
  const numericColumns = getNumericTableColumns(selectedTable)

  const setTokens = (next: FormulaToken[]) => onChange(next)

  const appendTokens = (incoming: FormulaToken[]) => {
    const next = [...tokens]
    const [first] = incoming
    const last = next.at(-1)
    const shouldInsertComma =
      first &&
      (first.type === 'FIELD' ||
        first.type === 'NUMBER' ||
        first.type === 'TABLE_SUM') &&
      last &&
      (last.type === 'FIELD' ||
        last.type === 'NUMBER' ||
        last.type === 'TABLE_SUM') &&
      isInsideUnclosedAverage(next)

    if (shouldInsertComma) next.push({ type: 'OPERATOR', value: ',' })
    setTokens([...next, ...incoming])
  }

  const removeToken = (index: number) => {
    setTokens(tokens.filter((_, tokenIndex) => tokenIndex !== index))
  }

  const addManualValue = () => {
    const parsed =
      typeof manualValue === 'number' ? manualValue : Number(manualValue)
    if (!Number.isFinite(parsed) || String(manualValue).trim() === '') return
    appendTokens([{ type: 'NUMBER', value: String(parsed) }])
    setManualValue('')
  }

  const addTableColumnSum = () => {
    if (!tableFieldId || !columnId) return
    appendTokens([
      {
        type: 'TABLE_SUM',
        value: encodeTableSumValue(tableFieldId, columnId),
      },
    ])
  }

  const formulaPreview = formatFormulaExpression(tokens, fields)

  return (
    <div className='animate-in fade-in slide-in-from-bottom-2 space-y-3 duration-300'>
      <div className='rounded-xl border border-accent-soft/20 bg-accent-soft/5 p-3'>
        <div className='mb-2 flex items-center justify-between gap-2'>
          <label className='text-[11px] font-bold tracking-wider text-accent-primary uppercase'>
            Formula
          </label>
          {tokens.length > 0 && (
            <button
              className='text-[10px] font-bold tracking-wide text-gray-7 uppercase transition-colors hover:text-error-main active:scale-95'
              type='button'
              onClick={() => setTokens([])}
            >
              Clear
            </button>
          )}
        </div>

        <div className='flex min-h-[44px] flex-wrap gap-1.5 rounded-lg border border-gray-3 bg-surface-primary p-2'>
          {tokens.length === 0 && (
            <span className='self-center text-[11px] text-gray-7 italic'>
              Build a formula with fields, numbers, and operators
            </span>
          )}
          {tokens.map((token, index) => (
            <div
              key={`${token.type}-${token.value}-${index}`}
              className={cn(
                'animate-in fade-in zoom-in-95 flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-bold duration-200',
                token.type === 'FIELD' &&
                  'border-accent-soft bg-accent-soft text-accent-primary',
                token.type === 'TABLE_SUM' &&
                  'border-accent-soft bg-accent-soft text-accent-primary',
                token.type === 'OPERATOR' &&
                  'border-gray-3 bg-surface-secondary text-gray-12',
                token.type === 'NUMBER' &&
                  'border-gray-3 bg-surface-secondary text-gray-12',
                token.type === 'FUNCTION' &&
                  'border-accent-soft bg-accent-soft text-accent-primary',
              )}
            >
              {token.type === 'FIELD'
                ? fields.find((field) => field.id === token.value)?.label ||
                  'Deleted field'
                : token.type === 'TABLE_SUM'
                  ? formatFormulaExpression([token], fields) || 'Table sum'
                  : token.type === 'FUNCTION'
                    ? token.value.toUpperCase()
                    : token.value === '*'
                      ? '×'
                      : token.value === '/'
                        ? '÷'
                        : token.value === '-'
                          ? '−'
                          : token.value}
              <button
                className='text-gray-8 transition-colors hover:text-error-main active:scale-90'
                type='button'
                onClick={() => removeToken(index)}
              >
                <Icon height={10} name='lucide:x' width={10} />
              </button>
            </div>
          ))}
        </div>

        {formulaPreview && (
          <div className='mt-2 text-[11px] font-medium text-gray-8'>
            <span className='mr-1 font-bold text-gray-7'>fx</span>
            {formulaPreview}
          </div>
        )}
      </div>

      <div className='space-y-2'>
        <label className='block text-[10px] font-bold tracking-wider text-gray-7 uppercase'>
          Operators
        </label>
        <div className='grid grid-cols-4 gap-1.5'>
          {OPERATORS.map((operator) => (
            <button
              className='h-8 rounded-lg border border-gray-3 bg-surface-primary text-13 font-bold text-gray-12 transition-all hover:border-accent-primary hover:bg-accent-soft hover:text-accent-primary active:scale-95'
              key={operator.value}
              type='button'
              onClick={() =>
                appendTokens([{ type: 'OPERATOR', value: operator.value }])
              }
            >
              {operator.label}
            </button>
          ))}
        </div>
        <div className='grid grid-cols-4 gap-1.5'>
          <button
            className='h-8 rounded-lg border border-gray-3 bg-surface-primary text-[11px] font-bold tracking-wide text-gray-12 uppercase transition-all hover:border-accent-primary hover:bg-accent-soft hover:text-accent-primary active:scale-95'
            type='button'
            onClick={() =>
              appendTokens([
                { type: 'FUNCTION', value: 'AVG' },
                { type: 'OPERATOR', value: '(' },
              ])
            }
          >
            Avg
          </button>
          {GROUPING.map((item) => (
            <button
              className='h-8 rounded-lg border border-gray-3 bg-surface-primary text-13 font-bold text-gray-12 transition-all hover:border-accent-primary hover:bg-accent-soft hover:text-accent-primary active:scale-95'
              key={item.value}
              type='button'
              onClick={() =>
                appendTokens([{ type: 'OPERATOR', value: item.value }])
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className='space-y-2'>
        <label className='block text-[10px] font-bold tracking-wider text-gray-7 uppercase'>
          Manual value
        </label>
        <div className='flex items-end gap-2'>
          <div className='min-w-0 flex-1'>
            <InputNumber
              placeholder='e.g. 10'
              value={manualValue}
              allowDecimal
              onChange={setManualValue}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addManualValue()
                }
              }}
            />
          </div>
          <Button
            className='shrink-0'
            label='Add'
            size='sm'
            type='button'
            variant='outline'
            onClick={addManualValue}
          />
        </div>
      </div>

      <div className='space-y-2'>
        <label className='block text-[10px] font-bold tracking-wider text-gray-7 uppercase'>
          Include field
        </label>
        <InputSelect
          value={null}
          options={sourceFields.map((field) => ({
            id: field.id,
            name: field.label || 'Untitled',
          }))}
          placeholder={
            sourceFields.length
              ? 'Number, currency, counter, or calculated'
              : 'No compatible fields yet'
          }
          onChange={(option) =>
            option &&
            appendTokens([{ type: 'FIELD', value: String(option.id) }])
          }
        />
        <p className='text-[10px] text-gray-7'>
          Only Number, Currency, Counter, and Calculated fields can be used in a
          formula.
        </p>
      </div>

      <div className='space-y-2'>
        <label className='block text-[10px] font-bold tracking-wider text-gray-7 uppercase'>
          Sum of table column
        </label>
        <InputSelect
          options={tableFields.map((field) => ({
            id: field.id,
            name: field.label || 'Untitled',
          }))}
          placeholder={
            tableFields.length ? 'Select table' : 'No table fields yet'
          }
          value={
            selectedTable
              ? {
                  id: selectedTable.id,
                  name: selectedTable.label || 'Untitled',
                }
              : null
          }
          onChange={(option) => {
            setTableFieldId(option ? String(option.id) : null)
            setColumnId(null)
          }}
        />
        <InputSelect
          disabled={!selectedTable}
          options={numericColumns.map((column) => ({
            id: column.id,
            name: column.name || 'Untitled',
          }))}
          placeholder={
            !selectedTable
              ? 'Select a table first'
              : numericColumns.length
                ? 'Select numeric column'
                : 'No number, currency, counter, or calculated columns'
          }
          value={
            numericColumns.find((column) => column.id === columnId)
              ? {
                  id: columnId as string,
                  name:
                    numericColumns.find((column) => column.id === columnId)
                      ?.name || 'Column',
                }
              : null
          }
          onChange={(option) => setColumnId(option ? String(option.id) : null)}
        />
        <Button
          className='w-full'
          disabled={!tableFieldId || !columnId}
          label='Add column sum'
          size='sm'
          type='button'
          variant='outline'
          onClick={addTableColumnSum}
        />
        <p className='text-[10px] text-gray-7'>
          Adds the sum of that column across all table rows.
        </p>
      </div>
    </div>
  )
}

export default FormulaBuilder
