# Table Column Audit: SHORT_TEXT, LONG_TEXT, NUMBER, COUNTER

> **Type:** read-only audit. No application code, tests, dependencies or config were changed. This file is the only artifact.
> **Date:** 2026-10-13
> **Scope:** V6 source in `D:\ezofis-app-v6\app`, state after Batch 1 (table-column runtime validation).

## 0. Evidence rules

- **CONFIRMED** = read directly in the V6 source cited below.
- **NOT_VERIFIED** = depends on V5 behaviour. `e:\v5` does not exist on this machine, and `table-column-parity-gap-matrix.md` is not on disk (only the text pasted into chat). V5 claims below are therefore the matrix author's claims, not verified by me.
- Line numbers are from the working tree at audit time.

## 1. How a column setting flows (confirmed)

| Stage | Location | Behaviour |
|---|---|---|
| Builder column row (name, type, size, expand) | `src/pages/form-builder/components/build/components/settings/sections/QuestionSettings.tsx:3138-3340` | `handleUpdateTableColumn` / `handleUpdateTableColumnSettings` (3154-3181) merge a patch into `general`, `lookupSettings`, `specific` and `validation`. A new key needs no store change, but typed keys do. |
| Builder expanded panel | `.../sections/TableColumnSettingsPanel.tsx` | Controls listed in section 3. |
| Store type | `src/pages/form-builder/store/formStore.ts:373-415` | Typed column schema. Only the keys listed in section 2 exist. |
| Save/load | `src/pages/form-builder/helpers/v5SchemaAdapter.ts:1033-1052` | Every column goes through `normalizeFieldSchema`. This is generic: settings objects are preserved, with a few V5 key synchronisations (section 4). |
| Runtime render | `src/pages/requests/components/workflow-request/components/TableFieldRenderer.tsx` | `renderCellInput` per type (LONG_TEXT 558, NUMBER/COUNTER 571, SHORT_TEXT 738). |
| Runtime validation | `src/pages/form-builder/helpers/runtimeValidation.ts:422-455` and `getTableCellConstraintError` (572+) | Required, content rule, min/max, added in Batch 1. |

## 2. Schema keys that exist today for a table column

Per `formStore.ts:373-415` and `TableFieldRenderer.tsx:61-90`:

- `general`: `displayLabel`, `tooltip`, `visibility`
- `specific`: `placeholder`, `defaultValueType`, `customDefaultValue`, `customOptions`, `formulaTokens`, `showColumnTotal`
- `validation`: `fieldRule`, `contentRule`, `minimum`, `maximum`
- `lookupSettings`: `optionsSource`, `repositoryId`, `repositoryField`, `cascadeFromColumn`
- top level: `id`, `name`, `type`, `size`

**There is no key for:** decimal digits/precision, number step, prefix/suffix, allow-decimal, thousand separator, `rangeType`, max-length (separate from `maximum`), or a counter start/increment. These cannot be saved or restored today.

## 3. Setting-by-setting classification

Legend: **FS** FULLY_SUPPORTED, **UI** UI_MISSING, **MAP** MAPPING_MISSING, **RT** RUNTIME_MISSING, **PS** PARTIALLY_SUPPORTED, **NV** NOT_VERIFIED.
"Builder" = control in `TableColumnSettingsPanel.tsx`. "Saved/restored" = persisted by the generic adapter/store path. "Runtime" = enforced or applied for the user.

| # | Setting | Types | Builder | Saved / restored | Runtime | Class | Evidence and notes |
|---|---|---|---|---|---|---|---|
| 1 | Placeholder | all four | Yes (`Panel:205`) | Yes (`specific.placeholder`) | SHORT_TEXT `TableFieldRenderer:745`, LONG_TEXT `:564`. NUMBER/COUNTER hard-code `'0'` (`:571-582`) and ignore it. | **PS** | Works for text. Number-type placeholder set in the builder has no effect. |
| 2 | Required | all four | Yes (`Panel:196`) | Yes (`validation.fieldRule`) | Enforced (`runtimeValidation.ts:437-445`, existing behaviour) | **FS** | Unchanged by Batch 1. |
| 3 | Min/max **length** (text) | SHORT_TEXT, LONG_TEXT | Yes: "Min Length"/"Max Length" (`Panel:420-436`) | Yes (`validation.minimum/maximum`) | Enforced on submit (Batch 1). No native `maxLength` on the input: `InputText` has no such prop and `InputTextarea` would show a counter (`InputTextarea.tsx:71-80`). | **PS** | Submit-time only. Typing is not limited. |
| 4 | Min/max **value** (number) | NUMBER, COUNTER | Yes: "Min Value"/"Max Value" | Yes | Enforced on submit (Batch 1) and native `min`/`max` on the cell (`TableFieldRenderer:573-576`, Mantine clamps on blur) | **FS** | |
| 5 | Content rule | text: ALPHA, ALPHA_SPACES, ALPHA_DASH, ALPHA_NUMERIC, EMAIL, WEB; number: INTEGER, DECIMAL | Yes (`Panel:401-418`, options filtered by type at 404-410) | Yes | Enforced on submit (Batch 1). **Typing is not constrained.** | **PS** | For INTEGER the cell still accepts a decimal point while typing, and the user only finds out on submit. See the proposal (section 6). |
| 6 | Decimal precision | NUMBER, COUNTER | **No** | No key (the panel never writes `validation.decimalValue`) | `runtimeValidation.ts` top-level numeric section (~lines 337-354) checks decimals for top-level fields, but table columns never reach it. Cell has no `decimalScale`. | **UI** | The adapter does map `decimalDigits` and `decimalValue` for any field, including columns (`v5SchemaAdapter.ts:1126-1146`), so a V5-origin value would survive load/save but nothing reads it for columns. Matches matrix row 11. |
| 7 | Number step | NUMBER, COUNTER | No | No key | No (`step` appears nowhere in `TableFieldRenderer`) | **UI** | Searched `TableFieldRenderer.tsx` and the column schema: none. **NV** whether V5 columns had a step. |
| 8 | Prefix / suffix | NUMBER, COUNTER (text too) | No | No key | No. Only CURRENCY_AMOUNT has a hard-coded `$` prefix (`TableFieldRenderer:~588`). | **UI** | `QuestionSettings.tsx` has Prefix/Suffix only for the auto-generate default (≈1005-1041, 2840-2868) and `prefixLabel`/`suffixLabel` (2892-2904) at top-level-field scope; neither is wired to table columns. **NV** whether V5 columns had either. |
| 9 | Allow decimals / thousand separator | NUMBER, COUNTER | No | No key | `InputNumber` supports `allowDecimal`, `decimalScale` and `thousandSeparator` (`InputNumber.tsx:14-19`), but the column cell passes none of them. | **UI** | |
| 10 | Default value, CUSTOM | all four | Yes (`Panel:350-375`, "Static Value") | Yes (`specific.defaultValueType`, `customDefaultValue`) | Applied by `resolveColumnDefaultValue` (`TableFieldRenderer:1119-1132`), **only in `handleAddRow`** (1134-1141) | **PS** | See finding F1. |
| 11 | Default value, USER_EMAIL / CURRENT_DATE | all four offered | Yes | Yes | Same limitation as row 10 | **PS** | UX quirk: the builder offers "Current date" and "Logged in user's email" on NUMBER/COUNTER columns, where the result is meaningless. Not wrong, only odd. |
| 12 | Default value, AUTO_SEQUENCE | all four offered | Yes | Yes | `rows.length + 1` at add time (`:1123-1124`) | **PS** | Same limitation as row 10. Also not recomputed after row delete (numbers can repeat). **NV** how V5 numbered them. |
| 13 | V5 default-value keys on import | all four | n/a | `specific.defaultValue` (V5 modes `USER_EMAIL`, `AUTO_GENERATE`, `CUSTOM`, …, `v5SchemaAdapter.ts:439-449,715-730`) is synchronised with `fillValueType` only. | Renderer reads only `defaultValueType` (`:1120`) | **MAP** | Confirmed from code: nothing translates V5 `specific.defaultValue` into the column's `defaultValueType`. A V5-origin column default will not be applied. The matrix also lists AUTO_GENERATE as UI_MISSING (row 26). **NV** whether V5 stores it under exactly those keys. |
| 14 | Show column total | NUMBER, COUNTER | Yes (`Panel:387-393`, summable types) | Yes (`specific.showColumnTotal`; adapter sets `showSummaryRow`, `v5SchemaAdapter.ts:1046-1051`) | Footer totals (`runtimeFieldAdapter.ts:736-780`, `TableFieldRenderer:1830-1842`); covered by `runtimeUnification.test.ts:540-575` and `phase5ComplexFieldsAndTables.test.ts:84,137` | **FS** | Not applicable to SHORT_TEXT/LONG_TEXT (correctly not offered). Footer uses `toLocaleString()`, so it ignores any future decimal setting. |
| 15 | Counter semantics | COUNTER | Same controls as NUMBER | n/a | Renders identically to NUMBER (`:571-572`) | **NV** | The matrix does not describe V5 counter behaviour (auto-increment, start, step). Cannot classify without V5 source. |
| 16 | `rangeType` semantics | SHORT_TEXT, LONG_TEXT | No (`rangeType` is top-level-field only) | `v5SchemaAdapter.ts:1159-1163` remaps `MINIMUM`/`MAXIMUM` for any field | Batch 1 does **not** read `rangeType` for columns | **NV** | Risk: a V5-origin column carrying both `minimum` and `maximum` plus a one-sided `rangeType` would have both enforced. Needs V5 sample data. |
| 17 | Visibility, tooltip, display label, size | all four | Yes | Yes | Yes (section 4 of the earlier audit) | **FS** | |

## 4. Confirmed findings, in priority order

**F1 (RT, confirmed): column default values are not applied to the initial or replacement blank rows.**
`resolveColumnDefaultValue` is called only from `handleAddRow` (`TableFieldRenderer.tsx:1134-1141`). Blank rows are created without defaults at `:865` (empty ON_DEMAND table opens one row), `:1146` (delete the last row), and `:1177` (bulk delete). So a table's first row never gets its configured default, but every row added with the Add button does.

**F2 (PS, confirmed): content rule INTEGER is enforced only at submit.**
The cell is an `InputNumber` with no `allowDecimal`. A user can type `1.5` into an INTEGER column and only learn it is invalid on submit.

**F3 (UI, confirmed): no schema or UI for decimal digits, step, prefix/suffix, allow-decimal on columns** (rows 6-9). These need new keys, new builder controls, and renderer/validation wiring, so they are not a small batch.

**F4 (PS, confirmed): number-column placeholder is ignored** (row 1): the cell hard-codes `'0'`.

**F5 (MAP, confirmed in code, V5 key names NV): V5 `specific.defaultValue` is not translated to `defaultValueType`** (row 13).

**F6 (NV): COUNTER behaviour and `rangeType` handling for imported V5 columns** cannot be audited without V5 source or fixtures.

## 5. What is confirmed fine

Required, min/max value, min/max length (submit-time), content-rule submit validation, show column total, visibility/tooltip/display label/size, and save/reload of every existing key (generic adapter path) are all working and tested.

## 6. Proposed smallest implementation batch (needs your approval)

**Batch 2A: "Column defaults and number-cell input constraints (no schema change)"**

1. **Apply column defaults to blank rows (F1).**
   - Extract the resolver into a pure helper (e.g. `resolveTableColumnDefault(col, rowIndex, email)` in `fieldRendering.ts` or `runtimeFieldAdapter.ts`) and a `buildDefaultRow(columns, rowIndex)` helper.
   - Use it in `handleAddRow` and the three blank-row sites (`TableFieldRenderer.tsx:865, 1146, 1177`), using the row's index so AUTO_SEQUENCE is correct.
   - Behaviour for columns with no default setting is unchanged (empty row object plus `_rowId`).
2. **INTEGER content rule makes the cell integer-only (F2).** Pass `allowDecimal={false}` to the NUMBER/COUNTER `InputNumber` when `validation.contentRule === 'INTEGER'`. This is a native constraint on top of Batch 1's submit validation, which stays.
3. **Honor the column placeholder on number cells (F4).** Use `col.settings.specific.placeholder` when set, otherwise the current `'0'`.

Explicitly **out of scope** for 2A: decimal digits, step, prefix/suffix (need new schema keys and builder controls; propose as Batch 2B), V5 default-key mapping (F5, needs V5 samples), COUNTER semantics, `rangeType` (F6), text `maxLength` (needs a base-component decision), AUTO_GENERATE.

### Focused tests for 2A

In `src/pages/form-builder/helpers/runtimeValidationAndDefaults.test.ts` (or a new sibling test for the extracted helper):

1. `buildDefaultRow` applies CUSTOM, USER_EMAIL and CURRENT_DATE defaults for columns that configure them.
2. `buildDefaultRow` with `rowIndex = 0` gives `AUTO_SEQUENCE` = 1, and with `rowIndex = 4` gives 5.
3. `buildDefaultRow` for columns with no default settings returns only `_rowId` (regression guard: behaviour unchanged).
4. `buildDefaultRow` omits empty-string defaults (matches the current `def !== ''` check in `handleAddRow`).
5. A small pure predicate for the cell props (e.g. `getNumberCellProps(col)`): INTEGER gives `allowDecimal: false`; DECIMAL or no rule gives `allowDecimal: true`; placeholder falls back to `'0'` when unset and uses the column placeholder when set. Min/max pass-through is already covered by Batch 1.

Verification: `vitest run src/pages/form-builder`, `tsc -b` (revert `tsconfig.tsbuildinfo`), ESLint on touched files without `--fix`, compared against the baseline as in Batch 1.

## 7. Open questions needing V5 access

- V5 key names and semantics for column decimal digits, step, prefix/suffix, and counter behaviour.
- Whether V5 column `rangeType` exists and how `minimum`/`maximum` interact with it.
- V5 `specific.defaultValue` values and where `customDefaultValue` lives for columns.
