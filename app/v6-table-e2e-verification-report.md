# V6 Form Builder: table column end-to-end verification

**Overall status: PARTIALLY VERIFIED.**

The shared runtime table (`TableFieldRenderer`) was exercised as a real component and behaves as configured. The audit found that two of the screens did **not** use it (Live Preview and Form Entry), that New Request did not stop a submit on table validation errors, and that files attached inside table cells are never uploaded. The first three are fixed. The file persistence gap is open and needs a product/backend decision.

No browser automation exists in the project (no Playwright or Cypress), and there is no backend or test account available to the agent. Nothing here was run in a real browser against real APIs. Verification used the real React components rendered in jsdom (Testing Library) plus code review. Anything not driven that way is labelled CODE-REVIEW ONLY or BLOCKED.

## 1. Lifecycle (traced from code)

```
BUILDER
  QuestionSettings / TableColumnSettingsPanel  -> formStore (zustand)
  save: cleanFormPayload -> serializeFormPayload (v5SchemaAdapter) -> API
  load: formStore -> normalizeV5FormJson
        runtime loaders -> ensureNormalizedRuntimeFormJson -> normalizeV5FormJson

LIVE PREVIEW   LivePreview.tsx -> renderPreviewInput -> TableFieldRenderer          (was: own TextInput table)
NEW REQUEST    WorkflowFormRenderer -> FieldRenderer -> TableFieldRenderer
               submit: useWorkflowForm.submit -> getMissingMandatoryFields
                       + getTableFieldErrors (new) -> buildStartWorkflowPayload
                       -> workflowsApiV6.startWorkflowJson
FORM ENTRY     FormEntriesPage -> FormEntryTableField -> TableFieldRenderer          (was: FormLineItemsEditor, name-guessing inputs)
               save: validateFormModel(withParsedTableValues) -> formApi.saveFormEntry
               (table stored as a JSON string)
EXISTING REQ.  GenericRequestOverview -> WorkflowFormRenderer -> shared renderer      (code review only)
               legacy sections/form/Form.tsx: plain read-only table, rendered as <Form /> with no props
PORTAL         PortalWizard -> buildStartWorkflowPayload                             (renderer not examined)
```

Builder load and save do use `normalizeV5FormJson` / `serializeFormPayload`, so the round-trip tests below run on the real paths.

## 2. Defects found

| # | Defect | Screen | Status |
|---|---|---|---|
| D1 | Live Preview rendered tables as plain text inputs: no column types, placeholders, defaults, choices, files, rules, limits | Live Preview | **FIXED**: uses the shared renderer |
| D2 | Form Entry editor guessed input types from column *names* ("qty", "price", "description"), marked the first column required, and ignored column type and settings | Form Entry | **FIXED** for tables with configured columns (legacy editor kept for loose JSON lists) |
| D3 | Form Entry saves tables as a JSON string, and table validation only ran on arrays, so no column rule was ever checked on save | Form Entry | **FIXED**: table strings are parsed before validation |
| D4 | New Request showed rich table errors after a submit attempt but only required-presence blocked the submit | New Request | **FIXED**: table errors now block (`getTableFieldErrors`) |
| D5 | A file attached in a table cell is a `File` object inside the row. It serializes as `{}` and is never uploaded: staging only handles top-level file fields. The cell's OCR fill works, but the file itself is lost on submit. | New Request, Form Entry | **OPEN**: needs a backend/product decision on how table-cell files are staged (Form Entry now strips `rawFile`; New Request still sends `rawFile: {}`) |
| D6 | New Request blocks only on table errors. Top-level field rules (format, length, ranges) are shown but still do not block a submit | New Request | **OPEN**: product decision (enabling it could block submissions that pass today) |
| D7 | Legacy `sections/form/Form.tsx` renders `{row[column.id]}` directly, which would throw for structured values (currency object, file object) | Existing request (legacy view) | **UNVERIFIED RISK**: not reproduced, it is rendered with no props |

## 3. Feature-by-screen matrix

Legend: PASS = driven as a real component and matched; FAIL = reproduced mismatch; CODE = code review only; BLOCKED = needs API / browser / data.

| Setting | Builder | Live Preview | New Request | Form Entry | Existing request |
|---|---|---|---|---|---|
| Display label, hidden column | CODE | PASS (after fix; before: FAIL) | PASS | PASS (after fix; before: FAIL) | CODE |
| Placeholder | CODE | PASS (after fix) | PASS | PASS (after fix) | CODE |
| Tooltip | CODE | CODE | PASS (attribute in DOM; browser tooltip behavior unverified) | CODE | CODE |
| Read-only visibility | CODE | CODE (same component) | PASS | CODE (same component) | CODE |
| Defaults: add row, delete row, saved precedence, fixed rows | n/a | CODE (same component) | PASS | CODE (same component) | CODE |
| Initial-row seeding for a new form | n/a | CODE | unit only (`buildInitialFormModel`) | CODE | n/a |
| Max length, integer, decimal digits, prefix/suffix, commas | CODE | CODE (same component) | PASS | PASS (max length, prefix) | CODE |
| Min/max, range from another column, totals, calculated rounding | CODE | CODE | PASS | CODE | CODE |
| Currency: default / restricted currency | CODE | CODE | unit only | CODE | CODE |
| Date / time constraints in the picker | CODE | CODE | CODE (jsdom could not drive the pickers) | CODE | CODE |
| Date / time / currency rejected at submit | n/a | n/a | PASS (validation); blocking added (D4) | PASS | n/a |
| Choice: saved selection stays visible | CODE | CODE | PASS | CODE | CODE |
| Choice: master / user list / cascade loading | CODE | CODE | BLOCKED (APIs) | BLOCKED | BLOCKED |
| File: picker types, type/size errors, previous file kept, multiple | CODE | CODE | PASS | CODE | CODE |
| File: upload / persistence on submit | n/a | n/a | **FAIL (D5)** | **FAIL (D5)** | not examined |
| Image previews | CODE | CODE | CODE | CODE | CODE |
| Conditional read-only: per row, unlock, value kept | CODE | CODE | PASS | CODE | CODE |
| Conditional mandatory: error names row and column | CODE | CODE | PASS (validation); blocks submit | PASS | CODE |

"CODE (same component)" means the screen now renders the same `TableFieldRenderer` that passed in the New Request column; the Live Preview and Form Entry screens were each driven with their own render test.

## 4. Test evidence

- **27 scenario tests** drive the real `TableFieldRenderer` in jsdom and read what it emits as the form value (`TableFieldRenderer.runtime.test.tsx`).
- **1 test** renders the real `LivePreview` with a table form.
- **8 tests** render `FormEntryTableField` and check the JSON-string round trip and save validation.
- **5 tests** cover the New Request submit gate (`getTableFieldErrors`).
- **Earlier unit tests** cover helpers and adapter round trips.
- **Full suite:** 23 files, 258 tests, all passing. **`tsc -b`: exit 0** (85s).
- **Lint:** my new and changed files add no new messages against `HEAD`. The `LivePreview.tsx` "new" message is an existing duplicate whose line number moved.

## 5. Persistence and schema

- All new settings survive builder save, reload and the adapter round trip (tested). Column references are re-keyed correctly on load. Forms without the new keys behave as before (tested).
- Form entries store tables as a JSON string; the renderer and the validator now both handle it.
- **V5 compatibility: UNVERIFIED.** `e:\v5` was never available; the keys reuse the top-level V6 keys.

## 6. Missing UI or functionality

- **Stored but not enforced:** the file AI Settings tab, File In Stage Only, Answer Status Indicator, Document Expiry Field, Same Master, Year-Based options.
- **Not built:** Fill Value from a master table or another field, "Unique column values" and "Use values from another field" option sources, Workspace and Workflow predefined lists (no list API), the lookup tab.
- **DATE_TIME columns** and a date display format.

## 7. Blockers

- No browser automation, test account or backend access, so no real-browser or real-API run.
- jsdom cannot drive the date/time pickers or open the choice dropdowns, so those are code review only.
- Master tables, user list, repositories, `uploadForOcr` and Photon address search need live services.
- **Environment note:** the locale catalogs (`src/locales/*/messages.po` / `.ts`) show as modified in git. That is extraction output from tooling, not from these edits, and was left untouched.

## 8. Prioritized next steps

1. **Decide how table-cell files are staged and saved (D5).** Until then, a file in a table cell is lost on submit.
2. Run a real browser smoke test of Live Preview, Form Entry and New Request on a staging form that covers each setting.
3. Decide whether top-level field rules should also block a New Request submit (D6).
4. Check the Portal renderer and the legacy `Form.tsx` view (D7).
5. Exercise the date/time pickers and the choice dropdowns in a browser.
