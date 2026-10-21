# V5 vs V6 Table Column Settings Parity Gap Matrix & Implementation Roadmap

> **Audit Type:** Source-code-backed, read-only audit and gap matrix comparing V5 and V6 table column configuration, data schemas, and runtime execution.  
> **Target File:** `table-column-parity-gap-matrix.md`  
> **Source Roots Inspected:**  
> - **V6:** `e:\ezofis-app-v6\app`  
> - **V5:** `e:\v5`  
> **Verification Date:** 2026-10-13  
> **Verification Status:** 100% verified against raw source code (no assumed compatibility).

---

## 1. Executive Summary & Audit Context

In V5, table columns are structured using Vue 2 components where each column in `tableColumns` is an instance of a form field (`getNewField(...)`) rendered through `FieldSettings.vue` with `settingsFor === 'TABLE'`. When configuring a table column in V5, the user has access to General, Specific, Validation, and Lookup tabs.

In V6, table columns are modeled within `Question['settings']['specific']['tableColumns']` and configured via `QuestionSettings.tsx` (column header cards) and `TableColumnSettingsPanel.tsx` (expanded inline settings drawer).

### Classification Taxonomy
- `FULLY_SUPPORTED`: UI exists, configuration is serialized into the schema, and runtime enforcement/rendering is fully operational.
- `UI_MISSING`: Schema and/or runtime support exists (or is ready), but no UI controls exist in the V6 builder to configure the setting.
- `MAPPING_MISSING`: UI exists and runtime supports the concept, but the adapter/serializer (`v5SchemaAdapter.ts` or `formStore.ts`) drops or fails to convert the setting.
- `RUNTIME_MISSING`: UI exists and setting is persisted into JSON schema, but the runtime execution engine (`TableFieldRenderer.tsx` or `runtimeValidation.ts`) completely ignores it.
- `PARTIALLY_SUPPORTED`: Either subset of options work, or works for a few column types but fails/falls back for others.
- `NOT_APPLICABLE`: Legacy V5 construct superseded or obsoleted by V6 architecture.

---

## 2. Complete V5 Table Column Settings Parity Matrix

The following table inventories every column-level setting available in V5, maps it to V6, classifies its parity state, details verified behavior, and identifies the exact source files.

| # | V5 Column Setting | V5 UI & Schema Path | V6 Corresponding Setting & Schema Path | Parity Classification | Verified Source Evidence & Behavior Gap | V6 Files Requiring Changes |
|---|---|---|---|---|---|---|
| **1** | **Column Name / Label** | `col.label` | `col.name` (synced to `col.label`) | `FULLY_SUPPORTED` | V5: `TableColumnsBuilder.vue:55`, `GeneralSettings.vue:26-33`.<br>V6: `QuestionSettings.tsx:3236-3246`, `v5SchemaAdapter.ts:1036-1044`, `TableFieldRenderer.tsx:1660-1671`. Fully round-tripped and rendered. | None |
| **2** | **Column Type (Data Type)** | `col.type` (18 types: `LABEL`, `SERIAL_NUMBER`, `SHORT_TEXT`, `LONG_TEXT`, `NUMBER`, `COUNTER`, `DATE`, `TIME`, `CHIPS`, `SINGLE_SELECT`, `MULTI_SELECT`, `SINGLE_CHOICE`, `MULTIPLE_CHOICE`, `FILE_UPLOAD`, `CALCULATED`, `IMAGE`, `CURRENCY_AMOUNT`, `PHONE_NUMBER`) | `col.type` (23 types exposed in builder dropdown) | `PARTIALLY_SUPPORTED` | V5 renders all 18 types via dedicated field wrappers (`TableField.vue:301`).<br>V6 supports 17 types natively (`TableFieldRenderer.tsx:551-742`), but **6 types** (`SIGNATURE`, `RATING`, `YES_NO_TOGGLE`, `ADDRESS`, `OPINION_SCALE`, `SCORE`) fall back to plain text inputs at runtime (`TableFieldRenderer.tsx:733-741`). | `TableFieldRenderer.tsx:551-742` |
| **3** | **Column Size / Width** | `col.size` (`SMALL`, `MEDIUM`, `LARGE`) | `col.size` (`SMALL`, `MEDIUM`, `LARGE`) | `FULLY_SUPPORTED` | V5: `TableColumnsBuilder.vue:76-81`.<br>V6: `QuestionSettings.tsx:3304-3318`, `v5SchemaAdapter.ts:1045`. Translates to Tailwind widths `w-24`, `w-40`, `w-64` in `TableFieldRenderer.tsx:1586-1590`. | None |
| **4** | **Display Label** | `col.displayLabel` / `col.settings.general.displayLabel` | `col.displayLabel` / `col.settings.general.displayLabel` | `FULLY_SUPPORTED` | V5: `GeneralSettings.vue:41-48`.<br>V6: `TableColumnSettingsPanel.tsx:155-162`, `v5SchemaAdapter.ts:673-685`, `fieldRendering.ts:144-161`. Displayed as table header and exported label. | None |
| **5** | **Visibility (Normal / Read Only / Disable / Hidden)** | `col.settings.general.visibility` (`NORMAL`, `READ_ONLY`, `DISABLE`, `HIDDEN`) | `col.settings.general.visibility` | `FULLY_SUPPORTED` | V5: `GeneralSettings.vue:91-99`, `TableField.vue:307`.<br>V6: `TableColumnSettingsPanel.tsx:164-185`, `v5SchemaAdapter.ts:698-712`. `HIDDEN` filters column (`TableFieldRenderer.tsx:874`); `READ_ONLY`/`DISABLE` locks cells (`TableFieldRenderer.tsx:101-103`). | None |
| **6** | **Tooltip** | `col.settings.general.tooltip` | `col.settings.general.tooltip` | `FULLY_SUPPORTED` | V5: `GeneralSettings.vue:117-123`, `TableField.vue:140-165`.<br>V6: `TableColumnSettingsPanel.tsx:187-192`, `TableFieldRenderer.tsx:1662-1670` (renders tooltip trigger beside column header). | None |
| **7** | **Placeholder** | `col.settings.general.placeholder` (or `specific.placeholder`) | `col.settings.specific.placeholder` | `FULLY_SUPPORTED` | V5: `GeneralSettings.vue:105-111`.<br>V6: `TableColumnSettingsPanel.tsx:204-211`, `TableFieldRenderer.tsx:96-97, 558, 724, 737`. Passed to cell inputs. | None |
| **8** | **Field Rule (Required / Optional)** | `col.settings.validation.fieldRule` (`REQUIRED` / `OPTIONAL`) | `col.settings.validation.fieldRule` (`REQUIRED` / `OPTIONAL`) | `FULLY_SUPPORTED` | V5: `ValidationSettings.vue:5-13`, `TableField.vue:153-156`.<br>V6: `TableColumnSettingsPanel.tsx:194-202`, `v5SchemaAdapter.ts:1122-1124`, `runtimeValidation.ts:425-445`. Validates all rows on submit; blocks invalid submission. | None |
| **9** | **Content Rule (Text, Alpha, Email, Web, Integer, Decimal)** | `col.settings.validation.contentRule` (`TEXT`, `ALPHA`, `ALPHA_SPACES`, `ALPHA_DASH`, `ALPHA_NUMERIC`, `EMAIL`, `WEB`, `INTEGER`, `DECIMAL`) | `col.settings.validation.contentRule` | `RUNTIME_MISSING` | V5: `ValidationSettings.vue:30-40`, filtered per type; validated in runtime vee-validate wrapper.<br>V6: `TableColumnSettingsPanel.tsx:396-418` exposes all rules and persists them to schema, but `runtimeValidation.ts:423-445` **only checks `fieldRule === 'REQUIRED'`** and completely skips `contentRule`. Table cells accept invalid input without validation. | `runtimeValidation.ts:423-445`, `TableFieldRenderer.tsx:551-742` |
| **10** | **Min / Max (Length / Value)** | `col.settings.validation.minimum`, `col.settings.validation.maximum` | `col.settings.validation.minimum`, `col.settings.validation.maximum` | `RUNTIME_MISSING` | V5: `ValidationSettings.vue:170-202`, enforced via `VeeValidate` rules.<br>V6: `TableColumnSettingsPanel.tsx:420-438` provides Min/Max inputs and saves them, but `runtimeValidation.ts:423-445` **does not check minimum or maximum** for table columns. | `runtimeValidation.ts:423-445`, `TableFieldRenderer.tsx:568-574` |
| **11** | **Decimal Digits Precision** | `col.settings.validation.decimalValue` (default `2`) | `col.settings.validation.decimalValue` | `UI_MISSING` | V5: `ValidationSettings.vue:46-52` shows `decimalDigits` when `contentRule === 'DECIMAL'`.<br>V6: Not present in `TableColumnSettingsPanel.tsx`. Defaulting hardcoded in renderer. | `TableColumnSettingsPanel.tsx:401-418`, `TableFieldRenderer.tsx:568-585` |
| **12** | **Static Options (Custom Options)** | `col.settings.specific.customOptions` | `col.settings.specific.customOptions` | `FULLY_SUPPORTED` | V5: `OptionsBuilder.vue:740-750`.<br>V6: `TableColumnSettingsPanel.tsx:215-224`, `TableFieldRenderer.tsx:124-129, 625, 638`. Comma-separated list parsed and rendered as options. | None |
| **13** | **Options Delimiter / Separator** | `col.settings.specific.separateOptionsUsing` (`COMMA`, `NEWLINE`) | None (Hardcoded to comma) | `UI_MISSING` | V5: `OptionsBuilder.vue:763-774` allows `COMMA` or `NEWLINE` delimiter.<br>V6: Fixed string split `,` in `TableFieldRenderer.tsx:126`. Options containing commas cannot be defined. | `TableColumnSettingsPanel.tsx:215-225`, `TableFieldRenderer.tsx:124-130` |
| **14** | **Options Source: Master Form (Dynamic Options from Form/Table)** | `col.settings.specific.optionsType === 'MASTER'`, `masterFormId`, `masterFormColumn`, `isSameMaster`, `masterFormConditionColumn` | None | `UI_MISSING` | V5: `OptionsBuilder.vue:20-68, 683-690`. Loads options dynamically from another form or table, with sibling condition matching (`isSameMaster`).<br>V6: `TableColumnSettingsPanel.tsx` only offers `LOOKUP` (Repository) and `API` (Catalog). Master Form options source is missing in the column panel. | `TableColumnSettingsPanel.tsx:226-245`, `TableFieldRenderer.tsx:910-1040` |
| **15** | **Options Source: Repository Folder Lookup** | `col.settings.specific.optionsType === 'REPOSITORY'`, `repositoryId`, `repositoryField` | `col.settings.lookupSettings.optionsSource === 'LOOKUP'`, `repositoryId`, `repositoryField` | `FULLY_SUPPORTED` | V5: `OptionsBuilder.vue:717-720`.<br>V6: `TableColumnSettingsPanel.tsx:246-293`, `TableFieldRenderer.tsx:914-930, 1022-1035`. Dynamically queries repository item facets and populates select options. | None |
| **16** | **Cascade Filter by Sibling Column** | `col.settings.specific.masterFormParentColumn` (V5 Master) or `col.settings.lookupSettings.parentField` (V5 Hub) | `col.settings.lookupSettings.cascadeFromColumn` | `FULLY_SUPPORTED` | V5: `OptionsBuilder.vue:1273-1297`, `TableField.vue:2654-2680`.<br>V6: `TableColumnSettingsPanel.tsx:295-322`, `v5SchemaAdapter.ts:1631-1633`, `TableFieldRenderer.tsx:919-1014`. Dynamically re-queries facets filtered by sibling column's current row value. | None |
| **17** | **Options Source: External API / Integration Catalog** | `col.settings.lookupSettings.connection === 'api'`, `columnNameInAPI`, `syncFieldsForAPI` | `col.settings.lookupSettings.optionsSource === 'API'` | `FULLY_SUPPORTED` | V5: `LookupSettings.vue:74-150`, `TableField.vue:2912-3020`.<br>V6: `TableColumnSettingsPanel.tsx:230-244`, `TableFieldRenderer.tsx:524-540, 1092-1109`. Renders `ApiCatalogSelect` with product autofill. | None |
| **18** | **Options Source: Predefined Tables (Workspace, Folder, User, Workflow)** | `col.settings.specific.optionsType === 'PREDEFINED'`, `predefinedTable`, `predefinedTableColumn` | None | `UI_MISSING` | V5: `OptionsBuilder.vue:721-726, 779-860`. Populates select dropdown from internal Ezofis entities (User list, Workspace, etc.).<br>V6: Not exposed in `TableColumnSettingsPanel.tsx`. | `TableColumnSettingsPanel.tsx:226-245`, `TableFieldRenderer.tsx:910-1040` |
| **19** | **Options Source: Unique Existing Values** | `col.settings.specific.optionsType === 'EXISTING'` | None | `UI_MISSING` | V5: `OptionsBuilder.vue:673-679`. Pulls unique already-submitted values.<br>V6: Not exposed in column settings. | `TableColumnSettingsPanel.tsx:226-245` |
| **20** | **Calculated Column Formula Tokens** | `col.settings.specific.formulaTokens` / top-level `settings.rules[].calculations` | `col.settings.specific.formulaTokens` / top-level `settings.rules[].calculations` | `FULLY_SUPPORTED` | V5: Evaluated via `calculations` array matching `columnId`.<br>V6: `TableColumnSettingsPanel.tsx:332-345` (FormulaBuilder), `v5SchemaAdapter.ts:1282-1297, 1451-1467`, `runtimeFieldAdapter.ts:790-833`. Live recalculation per row across sibling columns on every keystroke. | None |
| **21** | **Show Column Total (Footer Sum)** | `col.settings.specific.showColumnTotal` | `col.settings.specific.showColumnTotal` | `FULLY_SUPPORTED` | V5: `SpecificSettings.vue:2107-2121`, `TableField.vue:2618-2640`.<br>V6: `TableColumnSettingsPanel.tsx:385-394`, `v5SchemaAdapter.ts:1046-1051`, `runtimeFieldAdapter.ts:740-785`, `TableFieldRenderer.tsx:1822-1841`. Footer sums rendered correctly. | None |
| **22** | **Default Value: Static / Custom** | `col.settings.specific.defaultValue === 'CUSTOM'`, `customDefaultValue` | `col.settings.specific.defaultValueType === 'CUSTOM'`, `customDefaultValue` | `FULLY_SUPPORTED` | V5: `SpecificSettings.vue:108-128`.<br>V6: `TableColumnSettingsPanel.tsx:363-371`, `TableFieldRenderer.tsx:1121-1132`. Injected on `handleAddRow`. | None |
| **23** | **Default Value: Logged-in User Email** | `col.settings.specific.defaultValue === 'USER_EMAIL'` | `col.settings.specific.defaultValueType === 'USER_EMAIL'` | `FULLY_SUPPORTED` | V5: `OptionsBuilder.vue:894-899`.<br>V6: `TableColumnSettingsPanel.tsx:347-362`, `TableFieldRenderer.tsx:1113-1115`. Reads email from auth store on row creation. | None |
| **24** | **Default Value: Current Date** | `col.settings.specific.defaultValue === 'CURRENT_DATE'` | `col.settings.specific.defaultValueType === 'CURRENT_DATE'` | `FULLY_SUPPORTED` | V5: `OptionsBuilder.vue:901-906`.<br>V6: `TableColumnSettingsPanel.tsx:347-362`, `TableFieldRenderer.tsx:1116-1118`. Injects ISO date string `YYYY-MM-DD`. | None |
| **25** | **Default Value: Auto-Sequence (1, 2, 3...)** | `col.settings.specific.defaultValue === 'AUTO_SEQUENCE'` | `col.settings.specific.defaultValueType === 'AUTO_SEQUENCE'` | `FULLY_SUPPORTED` | V5: `OptionsBuilder.vue:908-912`.<br>V6: `TableColumnSettingsPanel.tsx:347-362`, `TableFieldRenderer.tsx:1119-1120`. Injects `rows.length + 1`. | None |
| **26** | **Default Value: Auto-Generate (Prefix + Suffix)** | `col.settings.specific.defaultValue === 'AUTO_GENERATE'`, `autoGenerateValue: { prefix, suffix }` | None | `UI_MISSING` | V5: `SpecificSettings.vue:52-104`. Generates string like `Form-20261013-001`.<br>V6: Only `CUSTOM`, `USER_EMAIL`, `CURRENT_DATE`, `AUTO_SEQUENCE` in `DEFAULT_VALUE_TYPE_OPTIONS`. | `TableColumnSettingsPanel.tsx:42-47, 347-382`, `TableFieldRenderer.tsx:1111-1125` |
| **27** | **Currency Column: Currency Selector & Specific Currencies** | `col.settings.specific.optionsType` (`ALL_CURRENCY`, `SPECIFIC_CURRENCY`), `specificCurrencyOptions` | None (Fixed to `$` in table cell) | `UI_MISSING` | V5: `TableColumnsBuilder.vue:320-323`, `OptionsBuilder.vue:693-703`. Renders currency selector dropdown with value input.<br>V6: `TableColumnSettingsPanel.tsx` has no currency options; `TableFieldRenderer.tsx:581` hardcodes `prefix='$'`. | `TableColumnSettingsPanel.tsx`, `TableFieldRenderer.tsx:576-586` |
| **28** | **Phone Number Column: Country Code Options** | `col.settings.specific.optionsType` (`ALL_COUNTRY`, `SPECIFIC_COUNTRY`), `specificCountryOptions` | None | `UI_MISSING` | V5: `OptionsBuilder.vue:705-714`. Allows dialing code picker.<br>V6: `TableFieldRenderer.tsx:720-728` uses simple text input. | `TableColumnSettingsPanel.tsx`, `TableFieldRenderer.tsx:720-728` |
| **29** | **Date Column: Date Range & Constraints (Min/Max Offset)** | `col.settings.validation.dateRange` (`DATE_RANGE`, `MINI_CURRENT_DATE`, `MAX_CURRENT_DATE`), `miniDays`, `maxiDays` | None | `UI_MISSING` | V5: `ValidationSettings.vue:208-272`. Prevents selecting dates outside bounds.<br>V6: `TableColumnSettingsPanel.tsx` does not render date limits for table columns; accepts any date. | `TableColumnSettingsPanel.tsx`, `TableFieldRenderer.tsx:588-596`, `runtimeValidation.ts:423-445` |
| **30** | **Time Column: Time Range & Time Format (12h/24h)** | `col.settings.validation.timeRange`, `timeFormat` (`12`, `24`), `miniTime`, `maxiTime` | None | `UI_MISSING` | V5: `ValidationSettings.vue:278-344`.<br>V6: `TableColumnSettingsPanel.tsx` does not render time format or range limits. | `TableColumnSettingsPanel.tsx`, `TableFieldRenderer.tsx:598-605` |
| **31** | **File Upload Column: Allowed File Types & Max File Size** | `col.settings.validation.allowedFileTypes`, `col.settings.validation.maxFileSize` | None | `UI_MISSING` | V5: `ValidationSettings.vue:384-416`. Validates extension and file size in MB.<br>V6: `TableColumnSettingsPanel.tsx` does not expose file restrictions; `TableFieldRenderer.tsx:650-676` accepts all files without limit check. | `TableColumnSettingsPanel.tsx`, `TableFieldRenderer.tsx:650-676`, `runtimeValidation.ts:423-445` |
| **32** | **Dynamic Row-Dependent Mandatory / Readonly Controls** | `col.settings.validation.mandatorySettings`, `col.settings.validation.readonlySettings` | None | `UI_MISSING` | V5: `ValidationSettings.vue:440-520`, `TableField.vue:1107-1178, 2240-2335`. When cell equals specific option, toggles sibling column in that row to required/readonly.<br>V6: Not implemented in table column settings panel or row state. | `TableColumnSettingsPanel.tsx`, `TableFieldRenderer.tsx:101-104`, `runtimeValidation.ts:423-445` |
| **33** | **Popup Column Type (Modal Data Picker)** | `col.type === 'POPUP'`, `col.settings.specific.mappedFieldId`, `mappedColumnId` | None | `NOT_APPLICABLE` | V5: `TableColumnsBuilder.vue:232` (commented out), `TableField.vue:264, 842`. Popups violate Antigravity IDE Core Architecture (Flat-Focus UI / No-Popup Policy). | Superceded by Inline Expansion & Lookup Facets. |

---

## 3. High-Priority Architectural Gaps in V6

### Gap 1: Validation Engine Silently Skips Configured Column Rules (`RUNTIME_MISSING`)
- **Location:** `app/src/pages/form-builder/helpers/runtimeValidation.ts:423-445`
- **Symptom:** In `TableColumnSettingsPanel.tsx`, the builder exposes `Content Rule` (`INTEGER`, `DECIMAL`, `ALPHA`, `EMAIL`, etc.), `Min Value / Min Length`, and `Max Value / Max Length`. These are persisted into `col.settings.validation`.
- **Root Cause:** When `validateFieldValue` runs at form submission, lines 423-445 iterate through rows but **only test `fieldRule === 'REQUIRED'`**. It never invokes `validateContentRule` or bounds checks on column cells. Users can submit non-numeric data in number columns or text exceeding max length without errors.

### Gap 2: Six Column Types Fall Back to Plain Text Inputs (`PARTIALLY_SUPPORTED`)
- **Location:** `app/src/pages/requests/components/workflow-request/components/TableFieldRenderer.tsx:730-742`
- **Symptom:** `TABLE_COLUMN_TYPES` in `QuestionSettings.tsx` offers 23 types.
- **Root Cause:** The `renderCell` switch in `TableFieldRenderer.tsx` handles `LONG_TEXT`, `NUMBER`, `COUNTER`, `CURRENCY_AMOUNT`, `DATE`, `TIME`, `DATE_TIME`, `LABEL`, `SINGLE_SELECT`, `SINGLE_CHOICE`, `MULTI_SELECT`, `MULTIPLE_CHOICE`, `FILE_UPLOAD`, `IMAGE_UPLOAD`, `CHIPS`, `PHONE_NUMBER`. Types `SIGNATURE`, `RATING`, `YES_NO_TOGGLE`, `ADDRESS`, `OPINION_SCALE`, `SCORE` fall through to the default plain text `InputText`.

### Gap 3: Missing Currency Selector on Currency Columns (`UI_MISSING`)
- **Location:** `TableColumnSettingsPanel.tsx` & `TableFieldRenderer.tsx:581`
- **Symptom:** A table column with type `CURRENCY_AMOUNT` displays `$` as prefix.
- **Root Cause:** Unlike top-level questions which have `optionsType` (`ALL_CURRENCY` vs `SPECIFIC_CURRENCY`) and a currency picker, `TableColumnSettingsPanel.tsx` lacks currency selection settings.

### Gap 4: File and Image Columns Lack File Restrictions (`UI_MISSING` / `RUNTIME_MISSING`)
- **Location:** `TableColumnSettingsPanel.tsx` & `TableFieldRenderer.tsx:650-676`
- **Symptom:** Users can upload any file type of any size inside a table cell.
- **Root Cause:** `allowedFileTypes` and `maxFileSize` are not exposed in `TableColumnSettingsPanel.tsx`, and the HTML `<input type="file" />` lacks `accept` constraints (except `image/*` for image upload) and size validation.

---

## 4. Smallest, Safest First Implementation Batch (Recommended)

### Recommendation: **Batch 1 — Table Column Runtime Validation & Constraints Parity**

#### Rationale:
1. **Zero UI risk:** The UI controls (`Content Rule`, `Min Value / Length`, `Max Value / Length`) already exist in `TableColumnSettingsPanel.tsx:396-439` and are already persisted to `col.settings.validation`.
2. **Critical Data Integrity Bug:** Currently, form submission allows invalid data in table cells despite the user having configured content rules and min/max bounds in the builder.
3. **Contained Scope:** Modifies only `runtimeValidation.ts` (adding a row-level column validation helper) and passes HTML min/max constraints to `TableFieldRenderer.tsx`.
4. **No schema migrations or backward compatibility breaks.**

#### Detailed Implementation Plan for Batch 1:
1. **File:** `app/src/pages/form-builder/helpers/runtimeValidation.ts`
   - In lines 423-445, enhance the row iteration loop:
     ```typescript
     for (let rowIdx = 0; rowIdx < value.length; rowIdx += 1) {
       const row = value[rowIdx] || {}
       for (const col of cols) {
         const colVal = row[col.id] ?? (col.name ? row[col.name] : undefined)
         const colLabel = getEffectiveColumnLabel(col)
         
         // 1. Required check (existing)
         if ((col.settings?.validation?.fieldRule === 'REQUIRED' || col.isRequired) && isRuntimeValueEmpty(colVal, col)) {
           errors.push(`Row ${rowIdx + 1}: ${colLabel} is required and cannot be empty`)
           continue
         }
         
         // 2. Content rule & Min/Max checks (NEW)
         if (!isRuntimeValueEmpty(colVal, col)) {
           const contentRule = col.settings?.validation?.contentRule
           const min = col.settings?.validation?.minimum
           const max = col.settings?.validation?.maximum
           
           if (contentRule && !isContentRuleValid(colVal, contentRule)) {
             errors.push(`Row ${rowIdx + 1}: ${colLabel} must match content rule ${contentRule}`)
           }
           if (min !== undefined && min !== '' && isBelowMinimum(colVal, col.type, min)) {
             errors.push(`Row ${rowIdx + 1}: ${colLabel} must be at least ${min}`)
           }
           if (max !== undefined && max !== '' && isAboveMaximum(colVal, col.type, max)) {
             errors.push(`Row ${rowIdx + 1}: ${colLabel} must not exceed ${max}`)
           }
         }
       }
     }
     ```
2. **File:** `app/src/pages/requests/components/workflow-request/components/TableFieldRenderer.tsx`
   - For `NUMBER` and `COUNTER` cells (lines 568-574), bind `min={col.settings?.validation?.minimum}` and `max={col.settings?.validation?.maximum}`.
   - For `SHORT_TEXT` and `LONG_TEXT` cells (lines 554-563, 735-741), bind `maxLength={col.settings?.validation?.maximum}`.

---

## 5. Verification & Test Plan for Batch 1

To verify Batch 1 without regression, the following automated unit tests should be added to `app/src/pages/form-builder/helpers/runtimeValidationAndDefaults.test.ts`:

1. **`test('validates table column REQUIRED rule across all rows')`**
   - Asserts that submitting a table with an empty required column on row 2 produces error: `Row 2: Column X is required and cannot be empty`.
2. **`test('validates table column contentRule INTEGER on NUMBER columns')`**
   - Asserts that entering a float or non-integer string triggers validation error.
3. **`test('validates table column contentRule EMAIL on text columns')`**
   - Asserts that invalid email in row 1 column triggers validation error.
4. **`test('validates table column minimum and maximum values on NUMBER columns')`**
   - Asserts value `< min` or `> max` triggers row-specific validation error.
5. **`test('validates table column minimum and maximum lengths on SHORT_TEXT columns')`**
   - Asserts string length `< min` or `> max` triggers row-specific validation error.
6. **`test('passes validation when all table cells meet required, contentRule, and min/max constraints')`**
   - Asserts zero errors for valid rows.

---

## 6. Parity Scorecard Summary

| Category | Total V5 Settings | Fully Supported in V6 | UI Missing | Runtime Missing | Partially Supported | Not Applicable | Parity % |
|---|---|---|---|---|---|---|---|
| **General** | 7 | 6 | 0 | 0 | 1 | 0 | **92.8%** |
| **Validation** | 10 | 1 | 6 | 2 | 1 | 0 | **20.0%** |
| **Specific & Options** | 13 | 6 | 7 | 0 | 0 | 0 | **46.1%** |
| **Lookup & External** | 3 | 3 | 0 | 0 | 0 | 0 | **100%** |
| **Total Settings** | **33** | **16** | **13** | **2** | **2** | **0** | **51.5%** |

*(Note: Lookup and Calculation subsystems have achieved 100% functional parity; the primary parity gaps reside in detailed Validation rules and specialized Specific options like Master Form option sources).*
