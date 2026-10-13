/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import {
  getEffectiveFieldLabel,
  getMatrixCellValue,
  getNormalizedMatrixConfig,
  resolveRuntimeFieldType,
  setMatrixCellValue,
} from '@/pages/form-builder/helpers/runtimeFieldAdapter'
import cn from '@/utils/cn'

export interface MatrixFieldControlProps {
  disabled?: boolean
  field: any
  value: any
  onChange: (nextValue: Record<string, any>) => void
}

/**
 * Shared runtime Matrix renderer supporting both V5 structured `{ id, label, type, matrixTypeSettings }`
 * rows/columns and V6 `string[]` rows/columns.
 */
export const RuntimeMatrixField = ({
  disabled,
  field,
  value,
  onChange,
}: MatrixFieldControlProps) => {
  const { columns, rows } = getNormalizedMatrixConfig(field)

  return (
    <div className='overflow-x-auto rounded-lg border border-gray-3 bg-surface shadow-2xs'>
      <table className='w-full border-collapse text-left text-xs'>
        <thead className='border-b border-gray-3 bg-gray-2/60'>
          <tr>
            <th className='p-2.5 font-bold text-gray-11' />
            {columns.map((col) => (
              <th
                className='p-2.5 text-center font-bold whitespace-nowrap text-gray-12'
                key={col.key}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              className='border-b border-gray-2 transition-colors last:border-0 hover:bg-gray-1/40'
              key={row.key}
            >
              <td className='p-2.5 font-semibold text-gray-12'>{row.label}</td>
              {columns.map((col) => {
                const cellVal = getMatrixCellValue(value, row, col)
                return (
                  <td className='p-2.5 text-center align-middle' key={col.key}>
                    {col.type === 'CHECKBOX' ? (
                      <input
                        checked={Boolean(cellVal)}
                        className='size-4 cursor-pointer accent-primary-9 disabled:cursor-not-allowed disabled:opacity-50'
                        disabled={disabled}
                        type='checkbox'
                        onChange={(e) =>
                          onChange(
                            setMatrixCellValue(
                              value,
                              row,
                              col,
                              e.target.checked,
                            ),
                          )
                        }
                      />
                    ) : col.type === 'SHORT_TEXT' || col.type === 'NUMBER' ? (
                      <input
                        className='w-full min-w-[80px] rounded border border-gray-3 bg-surface px-2 py-1 text-xs text-gray-12 outline-none focus:border-primary-9 disabled:cursor-not-allowed disabled:opacity-50'
                        disabled={disabled}
                        placeholder='...'
                        type={col.type === 'NUMBER' ? 'number' : 'text'}
                        value={cellVal ?? ''}
                        onChange={(e) =>
                          onChange(
                            setMatrixCellValue(
                              value,
                              row,
                              col,
                              e.target.value,
                            ),
                          )
                        }
                      />
                    ) : (
                      <input
                        checked={Boolean(cellVal)}
                        className='size-4 cursor-pointer accent-primary-9 disabled:cursor-not-allowed disabled:opacity-50'
                        disabled={disabled}
                        name={`matrix_${field.id}_${row.key}`}
                        type='radio'
                        onChange={() =>
                          onChange(setMatrixCellValue(value, row, col, true))
                        }
                      />
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export interface LegacyInlineFieldProps {
  disabled?: boolean
  field: any
  value: any
  onChange: (nextValue: any) => void
}

/**
 * Shared Flat-Focus UI (No-Popup Policy) inline renderer for V5 legacy field types:
 * - `POPUP`: Rendered via inline expansion (collapsible card section, never a modal/popup).
 * - `TABS`: Rendered via inline tab switcher + contextual layout reflow.
 * - `NESTED_LIST`: Rendered as an interactive hierarchical checklist/tree inline.
 * - `LOGIN_AUTHENTICATION` / `EMAIL_AUTHENTICATION` / `MOBILE_AUTHENTICATION`:
 *   Preserves portal authentication settings and renders an inline verification control.
 */
export const LegacyInlineFieldRenderer = ({
  disabled,
  field,
  value,
  onChange,
}: LegacyInlineFieldProps) => {
  const type = resolveRuntimeFieldType(field)
  const specific = field?.settings?.specific || {}
  const label = getEffectiveFieldLabel(field)
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeTabIdx, setActiveTabIdx] = useState(0)

  if (type === 'POPUP') {
    const triggerType = specific.popupTriggerType || 'BUTTON'
    const contentText =
      specific.popupContent ||
      field?.settings?.general?.description ||
      (typeof value === 'string' && value ? value : '')

    return (
      <div className='w-full rounded-xl border border-gray-3 bg-surface p-3 shadow-2xs transition-all'>
        <div className='flex items-center justify-between gap-2'>
          <div className='flex items-center gap-2'>
            <Icon className='size-4 text-primary-9' name='lucide:panel-top-open' />
            <span className='text-xs font-bold text-gray-12'>{label}</span>
            <span className='rounded bg-gray-2 px-1.5 py-0.5 text-[10px] font-medium text-gray-9'>
              Inline View ({triggerType})
            </span>
          </div>
          <button
            className='flex cursor-pointer items-center gap-1 rounded-lg border border-gray-3 bg-gray-1 px-2.5 py-1 text-xs font-semibold text-gray-12 transition-all hover:bg-gray-2 active:scale-95'
            type='button'
            onClick={() => setIsExpanded((prev) => !prev)}
          >
            <span>{isExpanded ? 'Hide Details' : 'Expand Inline'}</span>
            <Icon
              className='size-3.5'
              name={isExpanded ? 'lucide:chevron-up' : 'lucide:chevron-down'}
            />
          </button>
        </div>
        {isExpanded && (
          <div className='animate-in fade-in slide-in-from-top-2 mt-3 space-y-2 border-t border-gray-2 pt-3 duration-200'>
            {contentText && (
              <p className='text-xs text-gray-11'>{contentText}</p>
            )}
            <input
              className='w-full rounded-md border border-gray-3 bg-surface px-2.5 py-1.5 text-xs text-gray-12 outline-none focus:border-primary-9 disabled:opacity-50'
              disabled={disabled}
              placeholder='Enter response or notes...'
              type='text'
              value={typeof value === 'string' ? value : ''}
              onChange={(e) => onChange(e.target.value)}
            />
          </div>
        )}
      </div>
    )
  }

  if (type === 'TABS') {
    const rawTabs: any[] = Array.isArray(specific.tabList)
      ? specific.tabList
      : Array.isArray(specific.tabs)
        ? specific.tabs
        : [
            { id: 'tab_1', label: 'Tab 1' },
            { id: 'tab_2', label: 'Tab 2' },
          ]
    const tabs = rawTabs.map((t: any, idx: number) =>
      typeof t === 'string'
        ? { id: `tab_${idx}`, label: t }
        : {
            id: String(t?.id || `tab_${idx}`),
            label: String(t?.label || t?.name || `Tab ${idx + 1}`),
          },
    )
    const safeIdx = Math.min(activeTabIdx, Math.max(0, tabs.length - 1))
    const currentTab = tabs[safeIdx]
    const tabValObj =
      value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : { [currentTab?.id || 'tab_0']: typeof value === 'string' ? value : '' }

    return (
      <div className='w-full rounded-xl border border-gray-3 bg-surface p-3 shadow-2xs'>
        <div className='flex flex-wrap gap-1.5 border-b border-gray-2 pb-2'>
          {tabs.map((tab, idx) => (
            <button
              key={tab.id}
              type='button'
              className={cn(
                'cursor-pointer rounded-lg px-3 py-1 text-xs font-bold transition-all active:scale-95',
                idx === safeIdx
                  ? 'bg-primary-9 text-white'
                  : 'bg-gray-1 text-gray-11 hover:bg-gray-2',
              )}
              onClick={() => setActiveTabIdx(idx)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {currentTab && (
          <div className='mt-3 space-y-1.5'>
            <label className='block text-[11px] font-semibold text-gray-10'>
              {currentTab.label}
            </label>
            <input
              className='w-full rounded-md border border-gray-3 bg-surface px-2.5 py-1.5 text-xs text-gray-12 outline-none focus:border-primary-9 disabled:opacity-50'
              disabled={disabled}
              placeholder={`Enter ${currentTab.label} details...`}
              type='text'
              value={String(tabValObj[currentTab.id] ?? '')}
              onChange={(e) =>
                onChange({
                  ...tabValObj,
                  [currentTab.id]: e.target.value,
                })
              }
            />
          </div>
        )}
      </div>
    )
  }

  if (type === 'NESTED_LIST') {
    const rawItems: any[] =
      Array.isArray(specific.nestedListItems) &&
      specific.nestedListItems.length > 0
        ? specific.nestedListItems
        : Array.isArray(specific.nestedList) && specific.nestedList.length > 0
          ? specific.nestedList
          : Array.isArray(specific.options) && specific.options.length > 0
            ? specific.options
            : ['Item 1', 'Item 2']

    const selectedList: string[] = Array.isArray(value)
      ? value.map(String)
      : typeof value === 'string' && value.trim()
        ? value
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : []

    const toggleItem = (itemLabel: string) => {
      if (disabled) return
      const next = selectedList.includes(itemLabel)
        ? selectedList.filter((x) => x !== itemLabel)
        : [...selectedList, itemLabel]
      onChange(next)
    }

    const renderNestedNodes = (nodes: any[], depth = 0) => (
      <div className={cn('space-y-1.5', depth > 0 && 'ml-5 border-l border-gray-3 pl-3')}>
        {nodes.map((node: any, idx: number) => {
          const itemLabel =
            typeof node === 'string'
              ? node
              : String(node?.label || node?.name || node?.title || `Item ${idx + 1}`)
          const children =
            node && typeof node === 'object'
              ? node.children || node.items || node.subItems || []
              : []
          const isChecked = selectedList.includes(itemLabel)

          return (
            <div key={`${depth}-${idx}-${itemLabel}`} className='space-y-1'>
              <label className='flex cursor-pointer items-center gap-2 text-xs text-gray-12'>
                <input
                  checked={isChecked}
                  className='size-3.5 cursor-pointer accent-primary-9 disabled:opacity-50'
                  disabled={disabled}
                  type='checkbox'
                  onChange={() => toggleItem(itemLabel)}
                />
                <span className='font-medium'>{itemLabel}</span>
              </label>
              {Array.isArray(children) &&
                children.length > 0 &&
                renderNestedNodes(children, depth + 1)}
            </div>
          )
        })}
      </div>
    )

    return (
      <div className='w-full rounded-xl border border-gray-3 bg-surface p-3 shadow-2xs'>
        {renderNestedNodes(rawItems)}
      </div>
    )
  }

  // LOGIN_AUTHENTICATION / EMAIL_AUTHENTICATION / MOBILE_AUTHENTICATION
  const loginType =
    specific.loginType ||
    (type === 'MOBILE_AUTHENTICATION' ? 'MOBILE' : 'EMAIL')
  return (
    <div className='w-full rounded-xl border border-gray-3 bg-surface p-3 shadow-2xs'>
      <div className='mb-2 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Icon className='size-4 text-primary-9' name='lucide:shield-check' />
          <span className='text-xs font-bold text-gray-12'>{label}</span>
        </div>
        <span className='rounded bg-primary-1 px-2 py-0.5 text-[10px] font-semibold text-primary-9'>
          Portal Auth ({loginType})
        </span>
      </div>
      <input
        className='w-full rounded-md border border-gray-3 bg-surface px-2.5 py-1.5 text-xs text-gray-12 outline-none focus:border-primary-9 disabled:opacity-50'
        disabled={disabled}
        type={loginType === 'MOBILE' ? 'tel' : 'email'}
        value={typeof value === 'string' ? value : ''}
        placeholder={
          loginType === 'MOBILE'
            ? 'Enter mobile number for verification...'
            : 'Enter email address for verification...'
        }
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
