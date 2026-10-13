# V6 Form Builder — Complete Table Column Settings Inventory

> **Audit Type:** Source-code-backed, read-only audit of V6 table column configuration, persistence, and runtime behavior.  
> **Repository Root File:** `v6-table-column-settings-inventory.md`  
> **Verification Date:** 2026-10-13  
> **Audited By:** Antigravity AI  

---

## Executive Summary

This document provides a comprehensive, source-verified inventory of every individual table column setting in the V6 Form Builder. All findings are verified directly from active source code across UI settings components, stores, serializers/adapters, formula engines, validation engines, and runtime table field renderers.

### Key Metrics Discovered
- **Distinct Column-Level Settings in V6 UI:** **16** distinct settings across 4 categories (General, Validation, Specific, Lookup).
- **Table-Level Settings Affecting Columns in V6 UI:** **10** settings (Rows Type, Fixed Row Count, Row Labels, Row Selection, Table View, Import/Export, Show Summary Totals, QR Code Scan, Master Table Sync + Column Mappings, AI Line-Item Extraction).
- **Supported Column Types in Builder Dropdown (`TABLE_COLUMN_TYPES`):** **23** column types.
- **Runtime-Recognized / Rendered Column Types (`TableFieldRenderer.tsx` & `runtimeFieldAdapter.ts`):** **17** natively rendered cell types + legacy aliases mapped via `resolveRuntimeFieldType` (e.g. `CURRENCY` -> `CURRENCY_AMOUNT`, `CHECKBOX` -> `MULTIPLE_CHOICE`, `RADIO` -> `SINGLE_CHOICE`, `DROPDOWN` -> `SINGLE_SELECT`, `LINE_ITEM` -> `TABLE`).
- **Column Types in Builder but Falling Back to Generic Text Input at Runtime:** **6** types (`SIGNATURE`, `RATING`, `YES_NO_TOGGLE`, `ADDRESS`, `OPINION_SCALE`, `SCORE`).

---

## A. Complete Settings Inventory

The following table documents every setting available for an individual table column in V6.

| Category | UI Label | JSON Path | Control Type | Options | Default | Applicable Column Types | Visibility Conditions | Store Update | JSON Persistence | Runtime Effect | Source File:Lines |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **General** | Column Name | `name` (and synced to `label`) | `input` (Text) | Freeform text | `Column ${N}` | All (23 types) | Always visible in column header card | `YES` (`handleUpdateTableColumn(col.id, { name })`) | `YES` (Preserved in `tableColumns[].name` & `label`) | `YES` (Header fallback if `displayLabel` missing; export header) | `QuestionSettings.tsx:3236-3246`, `v5SchemaAdapter.ts:1036-1044`, `TableFieldRenderer.tsx:1660-1671` |
| **General** | Column Type | `type` | `select` (Mantine Select) | 23 types: `Label`, `Serial Number`, `Short Text`, `Long Text`, `Number`, `Currency`, `Date`, `Time`, `Date & Time`, `Single Select`, `Multi Select`, `Single Choice`, `Multiple Choice`, `Chips`, `File Upload`, `Image Upload`, `Image`, `Signature`, `Rating`, `Yes/No Toggle`, `Phone Number`, `Email`, `URL`, `Calculated`, `Address`, `Counter`, `Opinion Scale`, `Score` | `'SHORT_TEXT'` | All (23 types) | Always visible in column card header | `YES` (`handleUpdateTableColumn(col.id, { type })`) | `YES` (Normalized to uppercase string) | `YES` (Drives cell renderer switch, summary eligibility, validation rules) | `QuestionSettings.tsx:52-81, 3283-3301`, `v5SchemaAdapter.ts:650-658`, `TableFieldRenderer.tsx:506-743` |
| **General** | Size / Column Width | `size` | `segmented control` | `SMALL` ("S"), `MEDIUM` ("M"), `LARGE` ("L") | `'MEDIUM'` | All (23 types) | Always visible in column card header | `YES` (`handleUpdateTableColumn(col.id, { size })`) | `YES` (Preserved; defaulted to `'MEDIUM'` if empty) | `YES` (Maps to Tailwind width classes: `w-24`, `w-40`, `w-64`) | `QuestionSettings.tsx:3304-3318`, `v5SchemaAdapter.ts:1045`, `TableFieldRenderer.tsx:1586-1590` |
| **General** | Display Label | `settings.general.displayLabel` | `input` (Text) | Freeform text | `''` | All (23 types) | Always visible when column settings expanded | `YES` (`onUpdate({ general: { displayLabel } })`) | `YES` (Bi-directionally synced with `col.displayLabel`) | `YES` (Used by `getEffectiveColumnLabel()` in table header and card views) | `TableColumnSettingsPanel.tsx:155-162`, `v5SchemaAdapter.ts:673-685`, `fieldRendering.ts:144-161` |
| **General** | Visibility | `settings.general.visibility` | `select` (InputSelect) | `NORMAL` ("Normal (Editable)"), `READ_ONLY` ("Read Only (Visible but locked)"), `DISABLE` ("Disable (Grayed out)"), `HIDDEN` ("Hidden (Not shown in table)") | `'NORMAL'` | All (23 types) | Always visible when column settings expanded | `YES` (`onUpdate({ general: { visibility } })`) | `YES` (Synced with `col.settings.general.readOnly`) | `YES` (`HIDDEN` filters column from rendering; `READ_ONLY` / `DISABLE` renders cell in non-editable display mode) | `TableColumnSettingsPanel.tsx:164-185`, `v5SchemaAdapter.ts:698-712`, `TableFieldRenderer.tsx:101-103, 874, 1764` |
| **General** | Tooltip | `settings.general.tooltip` | `input` (Text) | Freeform text | `''` | All (23 types) | Always visible when column settings expanded | `YES` (`onUpdate({ general: { tooltip } })`) | `YES` (Preserved in `col.settings.general.tooltip`) | `YES` (Renders info icon with tooltip beside header title) | `TableColumnSettingsPanel.tsx:187-192`, `TableFieldRenderer.tsx:1662-1670` |
| **Validation** | Required | `settings.validation.fieldRule` | `switch` (InputSwitch) | `true` -> `'REQUIRED'`, `false` -> `'OPTIONAL'` | `'OPTIONAL'` | All (23 types) | Always visible when column settings expanded | `YES` (`onUpdate({ validation: { fieldRule } })`) | `YES` (Preserved in `col.settings.validation.fieldRule`) | `YES` (`validateFieldValue` checks all rows for non-empty values; blocks form submission) | `TableColumnSettingsPanel.tsx:194-202`, `v5SchemaAdapter.ts:1122-1124`, `runtimeValidation.ts:425-445` |
| **Specific** | Placeholder | `settings.specific.placeholder` | `input` (Text) | Freeform text | `''` | All (23 types) | Always visible when column settings expanded | `YES` (`onUpdate({ specific: { placeholder } })`) | `YES` (Preserved in `col.settings.specific.placeholder`) | `YES` (`getColumnPlaceholder()` passes string to input component placeholder) | `TableColumnSettingsPanel.tsx:204-211`, `TableFieldRenderer.tsx:96-97, 479, 490, 558, 724, 737` |
| **Specific** | Options (Static Choices) | `settings.specific.customOptions` | `textarea` (InputTextarea) | Comma-separated strings (e.g. `Option 1, Option 2`) | `''` | `SINGLE_SELECT`, `MULTI_SELECT`, `SINGLE_CHOICE`, `MULTIPLE_CHOICE` | Visible when column type is select/choice (`OPTIONS_COLUMN_TYPES`) | `YES` (`onUpdate({ specific: { customOptions } })`) | `YES` (Preserved in `col.settings.specific.customOptions`) | `YES` (`parseColumnOptions` splits on comma and populates dropdown options) | `TableColumnSettingsPanel.tsx:215-224`, `TableFieldRenderer.tsx:124-129, 625, 638` |
| **Lookup** | Options Source | `settings.lookupSettings.optionsSource` | `radio group` (InputRadioGroup) | `LOOKUP` (ID 1: "Load options from a repository field"), `API` (ID 2: "Load DATA From API") | `'LOOKUP'` | `SINGLE_SELECT`, `MULTI_SELECT`, `SINGLE_CHOICE`, `MULTIPLE_CHOICE` | Visible when column type is select/choice (`OPTIONS_COLUMN_TYPES`) | `YES` (`onUpdate({ lookupSettings: { optionsSource, ... } })`) | `YES` (Preserved in `col.settings.lookupSettings.optionsSource`) | `YES` (`LOOKUP` queries facets; `API` triggers FTL Catalog async product search on focus/select) | `TableColumnSettingsPanel.tsx:226-244`, `TableFieldRenderer.tsx:105-106, 524-540, 914-930` |
| **Lookup** | Repository | `settings.lookupSettings.repositoryId` | `select` (InputSelect) | Dynamic list of repositories from API | `''` | `SINGLE_SELECT`, `MULTI_SELECT`, `SINGLE_CHOICE`, `MULTIPLE_CHOICE` | Visible when `OPTIONS_COLUMN_TYPES` AND `optionsSource === 'LOOKUP'` | `YES` (`onUpdate({ lookupSettings: { repositoryId, repositoryField: '' } })`) | `YES` (Preserved in `col.settings.lookupSettings.repositoryId`) | `YES` (`getRepositoryItemFacets` called at runtime to fetch distinct repository values) | `TableColumnSettingsPanel.tsx:251-266`, `TableFieldRenderer.tsx:914-930, 1022-1035` |
| **Lookup** | Repository Field | `settings.lookupSettings.repositoryField` | `select` (InputSelect) | Fields from selected repository (`getRepositoryItemFilterFields`) | `''` | `SINGLE_SELECT`, `MULTI_SELECT`, `SINGLE_CHOICE`, `MULTIPLE_CHOICE` | Visible when `OPTIONS_COLUMN_TYPES` AND `optionsSource === 'LOOKUP'` (disabled until repository selected) | `YES` (`onUpdate({ lookupSettings: { repositoryField } })`) | `YES` (Preserved in `col.settings.lookupSettings.repositoryField`) | `YES` (Specifies which facet field to query from repository) | `TableColumnSettingsPanel.tsx:267-293`, `TableFieldRenderer.tsx:955-961, 1024` |
| **Lookup** | Filter by column (Cascade) | `settings.lookupSettings.cascadeFromColumn` | `select` (InputSelect, clearable) | List of sibling table columns in this table | `''` | `SINGLE_SELECT`, `MULTI_SELECT`, `SINGLE_CHOICE`, `MULTIPLE_CHOICE` | Visible when `OPTIONS_COLUMN_TYPES` AND `optionsSource === 'LOOKUP'` | `YES` (`onUpdate({ lookupSettings: { cascadeFromColumn } })`) | `YES` (Preserved; also remapped during duplication in `v5SchemaAdapter.ts:1631`) | `YES` (`TableFieldRenderer` queries facets filtered by parent column's current row value; caches per row) | `TableColumnSettingsPanel.tsx:295-322`, `v5SchemaAdapter.ts:1631-1633`, `TableFieldRenderer.tsx:919-1014` |
| **Specific** | Formula Tokens (Calculated Column) | `settings.specific.formulaTokens` | `formula builder` (FormulaBuilder) | Token array: `FIELD` (sibling column), `OPERATOR` (`+`, `-`, `*`, `/`, `(` , `)`), `NUMBER`, `FUNCTION` | `[]` | `CALCULATED` | Visible ONLY when `column.type === 'CALCULATED'` | `YES` (`onUpdate({ specific: { formulaTokens } })`) | `YES` (Stored in `formulaTokens`, and synced to `formJson.settings.rules` calculations) | `YES` (`evaluateTableRows` runs formula per row across sibling columns on every change) | `TableColumnSettingsPanel.tsx:332-345`, `v5SchemaAdapter.ts:1282-1297, 1451-1467`, `runtimeFieldAdapter.ts:790-833` |
| **Specific** | Default Value Type | `settings.specific.defaultValueType` | `select` (InputSelect) | `CUSTOM` ("Static Value"), `USER_EMAIL` ("Logged in user's email"), `CURRENT_DATE` ("Current date"), `AUTO_SEQUENCE` ("Auto-generated sequence (1, 2, 3...)") | `'CUSTOM'` | All types EXCEPT `CALCULATED`, `SINGLE_SELECT`, `MULTI_SELECT`, `SINGLE_CHOICE`, `MULTIPLE_CHOICE` | Visible when `!isCalculated && !showOptions` | `YES` (`onUpdate({ specific: { defaultValueType } })`) | `YES` (Preserved in `col.settings.specific.defaultValueType`) | `YES` (`resolveColumnDefaultValue()` in `TableFieldRenderer` seeds new row with email, ISO date, sequence #, or custom string) | `TableColumnSettingsPanel.tsx:347-362`, `TableFieldRenderer.tsx:1111-1124` |
| **Specific** | Custom Default Value | `settings.specific.customDefaultValue` | `input` (Text) | Freeform text | `''` | All types EXCEPT `CALCULATED`, `SINGLE_SELECT`, `MULTI_SELECT`, `SINGLE_CHOICE`, `MULTIPLE_CHOICE` | Visible when `!isCalculated && !showOptions` AND `defaultValueType === 'CUSTOM'` | `YES` (`onUpdate({ specific: { customDefaultValue } })`) | `YES` (Preserved in `col.settings.specific.customDefaultValue`) | `YES` (Pre-fills cell value when a new row is added) | `TableColumnSettingsPanel.tsx:363-371`, `TableFieldRenderer.tsx:1121-1123, 1126-1132` |
| **Specific** | Show Column Total | `settings.specific.showColumnTotal` | `switch` (InputSwitch) | `true` / `false` | `false` | `NUMBER`, `COUNTER`, `CURRENCY_AMOUNT`, `CALCULATED` (`SUMMABLE_COLUMN_TYPES`) | Visible ONLY when `SUMMABLE_COLUMN_TYPES.includes(column.type)` | `YES` (`onUpdate({ specific: { showColumnTotal: checked } })`) | `YES` (Preserved; also auto-enables table-level `showSummaryRow` if undefined) | `YES` (`computeTableColumnTotals()` sums column rows and displays total in footer) | `TableColumnSettingsPanel.tsx:385-394`, `v5SchemaAdapter.ts:1046-1051`, `runtimeFieldAdapter.ts:720-785`, `TableFieldRenderer.tsx:1822-1841` |
| **Validation** | Content Rule | `settings.validation.contentRule` | `select` (InputSelect) | For `NUMBER`/`COUNTER`: `INTEGER`, `DECIMAL`. For `SHORT_TEXT`/`LONG_TEXT`: `TEXT`, `ALPHA`, `ALPHA_SPACES`, `ALPHA_DASH`, `ALPHA_NUMERIC`, `EMAIL`, `WEB` | `'TEXT'` | `SHORT_TEXT`, `LONG_TEXT`, `NUMBER`, `COUNTER` (`VALIDATABLE_COLUMN_TYPES`) | Visible ONLY when `VALIDATABLE_COLUMN_TYPES.includes(column.type)` | `YES` (`onUpdate({ validation: { contentRule } })`) | `YES` (Preserved in `col.settings.validation.contentRule`) | `NO` / `PARTIAL` (Form-level validator in `runtimeValidation.ts:423-445` only validates `fieldRule === 'REQUIRED'`; `contentRule` is ignored for table cells at runtime) | `TableColumnSettingsPanel.tsx:396-418`, `runtimeValidation.ts:423-445` |
| **Validation** | Min Value / Min Length | `settings.validation.minimum` | `input` (InputNumber) | Number or empty | `''` | `SHORT_TEXT`, `LONG_TEXT`, `NUMBER`, `COUNTER` (`VALIDATABLE_COLUMN_TYPES`) | Visible ONLY when `VALIDATABLE_COLUMN_TYPES.includes(column.type)` | `YES` (`onUpdate({ validation: { minimum } })`) | `YES` (Preserved in `col.settings.validation.minimum`) | `NO` (Table column validation loop in `runtimeValidation.ts:423-445` does not check `minimum`) | `TableColumnSettingsPanel.tsx:420-428`, `runtimeValidation.ts:423-445` |
| **Validation** | Max Value / Max Length | `settings.validation.maximum` | `input` (InputNumber) | Number or empty | `''` | `SHORT_TEXT`, `LONG_TEXT`, `NUMBER`, `COUNTER` (`VALIDATABLE_COLUMN_TYPES`) | Visible ONLY when `VALIDATABLE_COLUMN_TYPES.includes(column.type)` | `YES` (`onUpdate({ validation: { maximum } })`) | `YES` (Preserved in `col.settings.validation.maximum`) | `NO` (Table column validation loop in `runtimeValidation.ts:423-445` does not check `maximum`) | `TableColumnSettingsPanel.tsx:429-438`, `runtimeValidation.ts:423-445` |

---

## B. Column-Type-to-Settings Matrix

### 1. Types Exposed in V6 Builder Dropdown (`TABLE_COLUMN_TYPES`)
Source: `QuestionSettings.tsx:52-81`

| Column Type | Available UI Settings | Runtime-Supported Settings | Missing or Partial Behaviors |
|---|---|---|---|
| **LABEL** | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Value Type (`CUSTOM`, `USER_EMAIL`, `CURRENT_DATE`, `AUTO_SEQUENCE`), Custom Default Value | Name, Size, Display Label, Visibility, Tooltip, Placeholder, Default Values | Rendered as text label (cannot be edited by user directly unless prefilled by fixed rows). |
| **SERIAL_NUMBER** | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Value Type, Custom Default Value | Name, Size, Display Label, Tooltip | Renders automatic row number `(rowIndex + 1)`. User input and default value ignored. |
| **SHORT_TEXT** | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Value Type, Custom Default Value, Content Rule, Min/Max Length | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Value Type, Custom Default Value | **Content Rule & Min/Max Length are ignored at runtime.** |
| **LONG_TEXT** | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Value Type, Custom Default Value, Content Rule, Min/Max Length | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Value Type, Custom Default Value | Rendered with `InputTextarea` autosize. **Content Rule & Min/Max Length are ignored at runtime.** |
| **NUMBER** | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Value Type, Custom Default Value, Show Column Total, Content Rule (`INTEGER`, `DECIMAL`), Min/Max Value | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Values, Show Column Total | Rendered with `InputNumber`. Totals summed in footer. **Content Rule & Min/Max Value ignored by runtime validation.** |
| **COUNTER** | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Value Type, Custom Default Value, Show Column Total, Content Rule, Min/Max Value | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Values, Show Column Total | Renders with `InputNumber`. **Content Rule & Min/Max Value ignored by runtime validation.** |
| **CURRENCY_AMOUNT** | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Value Type, Custom Default Value, Show Column Total | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Values, Show Column Total | Renders with `InputNumber` with `$` prefix and `,` separators. Value stored and summed correctly. Specific currency selector (EUR, GBP, etc.) is NOT exposed at column level. |
| **DATE** | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Value Type (`CUSTOM`, `CURRENT_DATE`, etc.), Custom Default Value | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Values | Renders with `InputDate` (YYYY-MM-DD). Date limits (Min/Max date offset) not exposed for column. |
| **TIME** | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Value Type, Custom Default Value | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Values | Renders with `InputTime`. Time format (12/24h) and offsets not exposed for column. |
| **DATE_TIME** | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Value Type, Custom Default Value | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Values | Renders with `InputDateTime`. |
| **SINGLE_SELECT** | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Custom Options, Options Source (`LOOKUP` / `API`), Repository, Repository Field, Cascade Filter Column | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Custom Options, Repository Lookup, Cascade Filtering, API Product Catalog | Full support for static options, repository facet lookup, cascade filtering from sibling column, and FTL API catalog select. |
| **MULTI_SELECT** | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Custom Options, Options Source, Repository, Repository Field, Cascade Filter Column | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Custom Options, Repository Lookup, Cascade Filtering | Renders `InputSelectMultiple`. Stores array of option strings. |
| **SINGLE_CHOICE** | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Custom Options, Options Source, Repository, Repository Field, Cascade Filter Column | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Custom Options, Repository Lookup, Cascade Filtering, API Product Catalog | Reuses `TableCellSelect` (rendered as select inside table cells for density). |
| **MULTIPLE_CHOICE**| Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Custom Options, Options Source, Repository, Repository Field, Cascade Filter Column | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Custom Options, Repository Lookup, Cascade Filtering | Reuses `TableCellSelect` with `isMulti={true}`. |
| **CHIPS** | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Value Type, Custom Default Value | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder | Renders interactive inline tag pills with Enter-to-add and delete buttons. |
| **FILE_UPLOAD** | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Value Type, Custom Default Value | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder | Renders file upload trigger; triggers automatic Advance (card) view when present. File type and max size restrictions not exposed in column UI. |
| **IMAGE_UPLOAD** | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Value Type, Custom Default Value | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder | Renders image upload trigger (`accept="image/*"`). Triggers Advance view. |
| **IMAGE** | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Value Type, Custom Default Value | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder | Aliased to `IMAGE_UPLOAD` at runtime. |
| **PHONE_NUMBER** | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Value Type, Custom Default Value | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Values | Renders `InputText` with phone extraction/update helpers. Country code picker not exposed for column. |
| **EMAIL** | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Value Type, Custom Default Value | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Values | Renders `InputText`. Email regex validation is NOT applied to column cells at runtime. |
| **URL** | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Value Type, Custom Default Value | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Values | Renders `InputText`. URL regex validation is NOT applied to column cells at runtime. |
| **CALCULATED** | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Formula Tokens (FormulaBuilder), Show Column Total | Name, Type, Size, Display Label, Visibility, Tooltip, Placeholder, Formula Tokens, Show Column Total | Formula evaluation runs per row on any sibling column change. Cell is locked/read-only at runtime. Column can be summed in footer total. |
| **ADDRESS** | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Value Type, Custom Default Value | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Values | **Falls back to generic text input at runtime** (`TableFieldRenderer.tsx:733-741`). Multi-line structured address fields not rendered. |
| **SIGNATURE** | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Value Type, Custom Default Value | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Values | **Falls back to generic text input at runtime.** No canvas signature pad rendered inside table cells. |
| **RATING** | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Value Type, Custom Default Value | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Values | **Falls back to generic text input at runtime.** No star/heart icons rendered inside table cells. |
| **YES_NO_TOGGLE** | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Value Type, Custom Default Value | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Values | **Falls back to generic text input at runtime.** No toggle switch rendered inside table cells. |
| **OPINION_SCALE** | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Value Type, Custom Default Value | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Values | **Falls back to generic text input at runtime.** No scale buttons rendered inside table cells. |
| **SCORE** | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Value Type, Custom Default Value | Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Default Values | **Falls back to generic text input at runtime.** |

---

## C. Settings Data-Flow Map

### 1. General Settings (`name`, `type`, `size`, `displayLabel`, `visibility`, `tooltip`)
- **UI Control:** `QuestionSettings.tsx:3236-3319` and `TableColumnSettingsPanel.tsx:155-192`.
- **Store Update:** `handleUpdateTableColumn(colId, { name, type, size })` and `handleUpdateTableColumnSettings(colId, { general: { displayLabel, visibility, tooltip } })` in `formStore.ts`.
- **Saved JSON:** Stored under `fields[].settings.specific.tableColumns[colIndex]`. When saving via `serializeFormPayload` / `serializeFieldForSave`, `normalizeFieldSchema(rawField, 'save')` runs:
  - Synchronizes `col.displayLabel` <-> `col.settings.general.displayLabel` (`v5SchemaAdapter.ts:673-685`).
  - Synchronizes `col.settings.general.readOnly` with `col.settings.general.visibility === 'READ_ONLY'` (`v5SchemaAdapter.ts:698-712`).
  - Ensures `col.size` defaults to `'MEDIUM'` if omitted (`v5SchemaAdapter.ts:1045`).
- **Runtime Consumer:** `TableFieldRenderer.tsx`:
  - `col.settings.general.visibility === 'HIDDEN'` excludes the column from `effectiveColumns` (`TableFieldRenderer.tsx:874`).
  - `col.settings.general.visibility === 'READ_ONLY' | 'DISABLE'` flags cell as read-only (`TableFieldRenderer.tsx:101-103`).
  - `col.size` translates to Tailwind width classes (`TableFieldRenderer.tsx:1588`).
  - `col.settings.general.tooltip` renders an info icon beside the column header (`TableFieldRenderer.tsx:1662-1670`).

### 2. Validation Settings (`fieldRule` / Required, `contentRule`, `minimum`, `maximum`)
- **UI Control:** `TableColumnSettingsPanel.tsx:194-202` (Required Switch) and `TableColumnSettingsPanel.tsx:396-439` (Content Rule and Min/Max inputs).
- **Store Update:** `handleUpdateTableColumnSettings(colId, { validation: { fieldRule, contentRule, minimum, maximum } })`.
- **Saved JSON:** Stored in `col.settings.validation`. `normalizeFieldSchema` normalizes `MANDATORY` to `REQUIRED` (`v5SchemaAdapter.ts:1122`).
- **Runtime Consumer:**
  - **Required:** `runtimeValidation.ts:425-445` iterates through all table rows on form submission and verifies that every column with `settings.validation.fieldRule === 'REQUIRED'` has a non-empty value. If empty, raises error `Row ${rowIdx + 1}: ${colLabel} is required and cannot be empty`. **(Working link)**
  - **Content Rule & Min/Max:** `runtimeValidation.ts` does **not** evaluate `contentRule`, `minimum`, or `maximum` for table cells. Furthermore, `TableFieldRenderer.tsx` does not attach HTML input constraints (`min`, `max`, `pattern`) or inline cell validation error indicators. **(Broken link — UI and JSON exist, but runtime ignores them)**

### 3. Specific: Calculation Settings (`formulaTokens`, `showColumnTotal`)
- **UI Control:** `TableColumnSettingsPanel.tsx:332-345` (FormulaBuilder) and `TableColumnSettingsPanel.tsx:385-394` (Show Column Total switch).
- **Store Update:** Updates `col.settings.specific.formulaTokens` and `col.settings.specific.showColumnTotal`.
- **Saved JSON:**
  - `syncFormulaTokensToRules` in `v5SchemaAdapter.ts:1451-1467` extracts every column with `type === 'CALCULATED'` and a non-empty `formulaTokens` array, converting them into top-level V5 rule calculations (`settings.rules[].calculations[]` with `columnId: col.id`).
  - On load, `normalizeV5FormJson` / `convertV5FormulaToV6Tokens` in `v5SchemaAdapter.ts:1282-1297` hydrates `formulaTokens` back into the table column.
  - If any column has `showColumnTotal: true`, `normalizeFieldSchema` auto-sets `showSummaryRow: true` on the table (`v5SchemaAdapter.ts:1046-1051`).
- **Runtime Consumer:**
  - **Row Calculations:** On every row change, `evaluateTableRows` in `runtimeFieldAdapter.ts:790-833` runs `evaluateFormula` using row cell values and stores calculated results into `row[col.id]`.
  - **Totals:** `computeTableColumnTotals` in `runtimeFieldAdapter.ts:740-785` sums all rows for summable columns having `showColumnTotal: true` and displays them in the footer `Tr` (`TableFieldRenderer.tsx:1822-1841`). **(Fully functioning link)**

### 4. Specific: Default Value Settings (`defaultValueType`, `customDefaultValue`, `placeholder`)
- **UI Control:** `TableColumnSettingsPanel.tsx:204-211` (Placeholder) and `347-382` (Default Value Type + Custom Default Value).
- **Store Update:** Updates `col.settings.specific.defaultValueType`, `customDefaultValue`, `placeholder`.
- **Saved JSON:** Preserved directly in `col.settings.specific`.
- **Runtime Consumer:**
  - `resolveColumnDefaultValue` in `TableFieldRenderer.tsx:1111-1124` checks `defaultValueType`:
    - `USER_EMAIL`: Reads email from `authUserStore`.
    - `CURRENT_DATE`: Produces current ISO date `YYYY-MM-DD`.
    - `AUTO_SEQUENCE`: Produces `rows.length + 1`.
    - `CUSTOM`: Returns `customDefaultValue`.
  - `handleAddRow` calls `resolveColumnDefaultValue` for each column and seeds the new row object (`TableFieldRenderer.tsx:1126-1132`). **(Fully functioning link)**

### 5. Lookup Settings (`optionsSource`, `repositoryId`, `repositoryField`, `cascadeFromColumn`)
- **UI Control:** `TableColumnSettingsPanel.tsx:226-328`.
- **Store Update:** Updates `col.settings.lookupSettings`.
- **Saved JSON:** Preserved in `col.settings.lookupSettings`. During panel or field duplication, `v5SchemaAdapter.ts:1631-1633` remaps `cascadeFromColumn` to the new sibling column ID.
- **Runtime Consumer:**
  - Non-cascaded lookup columns query facets via `getRepositoryItemFacets` (`TableFieldRenderer.tsx:1022-1035`).
  - Cascaded columns watch sibling column values per row and dynamically query facets filtered by `parentFieldName = row[parentColId]` (`TableFieldRenderer.tsx:919-1014`).
  - If `optionsSource === 'API'`, renders `ApiCatalogSelect` which queries FTL product catalogs and auto-populates price and description columns (`TableFieldRenderer.tsx:524-540, 1092-1109`). **(Fully functioning link)**

---

## D. Existing Gaps and Uncertainties

1. **Exposed in UI but Ignored by Runtime Validation:**
   - **Column Content Rules (`contentRule`):** The UI exposes `TEXT`, `ALPHA`, `ALPHA_SPACES`, `ALPHA_DASH`, `ALPHA_NUMERIC`, `EMAIL`, `WEB`, `INTEGER`, `DECIMAL` for `SHORT_TEXT`, `LONG_TEXT`, `NUMBER`, and `COUNTER` columns. However, `runtimeValidation.ts:423-445` only validates `fieldRule === 'REQUIRED'`. A user can input non-numeric strings into integer columns or invalid emails into email-ruled text columns without encountering validation errors.
   - **Column Min/Max Bounds (`minimum`, `maximum`):** The UI exposes Min Length / Min Value and Max Length / Max Value for text and number columns, but `runtimeValidation.ts` does not inspect these fields during table validation.

2. **Column Types Offered in UI but Falling Back to Plain Text Inputs:**
   - Six column types selectable in the builder dropdown (`SIGNATURE`, `RATING`, `YES_NO_TOGGLE`, `ADDRESS`, `OPINION_SCALE`, `SCORE`) do not have dedicated cell rendering components in `TableFieldRenderer.tsx:551-742`. At runtime, they fall through to the default `InputText` case.

3. **Currency Column Configuration Missing Currency Selector:**
   - At the top-level question settings, a `CURRENCY_AMOUNT` field provides currency selection (`currencyOptionsType`, `specificCurrencies`, default currency). For a table column of type `CURRENCY_AMOUNT`, the column settings panel does not expose a currency selector, defaulting the runtime cell renderer to `$` (`TableFieldRenderer.tsx:581`).

4. **Date / Time Column Limits Not Exposed at Column Level:**
   - Top-level `DATE` and `TIME` questions expose date/time boundary pickers (`minDate`, `maxDate`, `minDateOffset`, `maxDateOffset`, `RANGE`). In table columns, these settings are not present in `TableColumnSettingsPanel.tsx`, allowing arbitrary dates/times in table cells.

5. **Static Options Separator Restriction:**
   - In `TableColumnSettingsPanel.tsx:215-224`, static options are entered as a comma-separated string (`customOptions`). Options containing commas cannot be defined through the UI.

---

## E. Test Coverage Audit

The existing unit tests in `src/pages/form-builder/helpers/` cover several key aspects of table column schema serialization, formula calculations, and validation:

| Test File | Verified Table Column Behavior | Limitations / Non-Verified Aspects |
|---|---|---|
| `phase5ComplexFieldsAndTables.test.ts:16-139` | Table & column settings lossless round-trip serialization between V5 and V6 (`tableColumns`, `tableRowsType`, `tableFixedRowCount`, `tableRowChooseType`, `importOption`, `showColumnTotal`). | Tests JSON transformation and normalization only; does not mount UI components or verify runtime DOM interactions. |
| `phase5ComplexFieldsAndTables.test.ts:140-184` | Pre-population of `LABEL` columns from `tableFixedRowLabels` during row initialization. | Verified logic; does not verify manual cell editing behavior. |
| `phase5ComplexFieldsAndTables.test.ts:185-249` | Column ID regeneration and internal reference remapping (`cascadeFromColumn`, `formulaTokens`, `masterFormTableColumns`) during duplication. | Verified schema remapping logic. |
| `phase5ComplexFieldsAndTables.test.ts:250-286` | Row-level calculations (`evaluateTableRows`) across rows, including sibling column dependencies and multi-pass evaluation. | Verified calculation engine; does not test UI `FormulaBuilder` component. |
| `runtimeValidationAndDefaults.test.ts:180-209` | Runtime table validation enforcing `fieldRule: 'REQUIRED'` / `isRequired: true` on column cells across all rows. | **Confirms that `contentRule`, `minimum`, and `maximum` are untested and unsupported for table columns.** |
| `v5SchemaAdapter.test.ts:770-800` | Synchronization of `CALCULATED` table columns into top-level V5 rule calculations (`settings.rules`). | Verified schema adapter; does not test runtime trigger. |

---

## Conclusion & Parity Assessment

1. **Active UI Settings in Column Panel:** **16** distinct controls are implemented in `TableColumnSettingsPanel.tsx`.
2. **Fully Functional End-to-End Settings:** **13** settings (Name, Type, Size, Display Label, Visibility, Tooltip, Required, Placeholder, Options, Options Source, Repository Lookup & Cascade, Formula Tokens, Default Value Type & Custom Default, Show Column Total).
3. **Persisted but Ignored at Runtime:** **3** settings (`contentRule`, `minimum`, `maximum`).
4. **Column Types:** **23** selectable in builder; **17** distinct runtime behaviors, with 6 types falling back to generic text inputs.

*This concludes the read-only audit of V6 table column settings.*
