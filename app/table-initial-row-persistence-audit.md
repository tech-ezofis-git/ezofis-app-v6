# Table initial-row persistence audit

> Read-only audit. No application code, tests, dependencies or config changed. Batch 1 and Batch 2A changes are intact.
> Date: 2026-10-13.

## Headline correction to my Batch 2A report

I said the initial blank row showed defaults on screen but wasn't saved. That is only true in a narrow case. The common case is different: **for a new form, the first row never gets column defaults at all** (not on screen, not saved). Details below.

## 1. Where is the initial row created?

There are two separate places.

| # | Location | When it is used | Defaults? |
|---|---|---|---|
| A | `src/pages/requests/components/workflow-request/utils/fieldRendering.ts:278-300` (`buildInitialFormModel`) | Every new form. Seeds the form model with `[{}]` (ON_DEMAND) or N rows with only the LABEL column filled (FIXED). Called from `hooks/useWorkflowForm.ts:153`, `pages/forms/FormEntriesPage.tsx:1629`, `LivePreview.tsx:138`, then merged by `hydrateFormModel` (`runtimeFieldAdapter.ts:958-967`). | **No.** It knows nothing about column defaults. |
| B | `TableFieldRenderer.tsx:~864-868` (`rows` IIFE, `raw.length === 0` branch) | Only when the `value` prop is an empty array. `FieldRenderer.tsx:1771-1779` passes `Array.isArray(value) ? value : []`, so this happens for a saved entry whose table is `[]` or a missing key. | **Yes** (added in Batch 2A via `createBlankRow([])`), but display-only. |

## 2. Why is it absent from the submitted value until edited?

- **Case A (new form):** the row is in the form model, as `{}`. It is submitted as an empty object, with no defaults, because nothing ever puts them there. `TableFieldRenderer` sees `raw.length === 1`, so the derived-row branch (B) never runs and defaults are never displayed either.
- **Case B (empty saved table):** the row is derived inside the render function (new `_rowId` each render) and never reaches the parent. It enters the form value only when some handler calls `onChange(...)` with `rows` (cell edit, add row, delete, approve).

## 3. How does the component report changes to the parent?

`TableFieldRenderer` receives `value` and `onChange` as props (`FieldRenderer.tsx:1771-1779`). Handlers call `onChange(nextRows)`: `handleCellChange` (`TableFieldRenderer.tsx:~1087-1095`), `handleAddRow`, `handleDeleteRow`, bulk delete, approve, `appendRows`/`replaceRows`. `onChange` replaces the whole array in the form model. The only existing effect that calls `onChange` is the CALCULATED-column sync (`~1074-1083`), which compares JSON content so it fires only on real change.

## 4. Can defaults be persisted safely?

**Yes, for case A, with no effect at all.** Seed the defaults where the model is built: in `buildInitialFormModel`, compute each seeded row with `buildTableRowDefaults(columns, rowsSoFar, email)` (already written, pure, skips cells that already have a value, such as the LABEL column).

- **Overwrite user input:** cannot happen. The model is built once at load, before any input. For saved entries `hydrateFormModel` replaces the model with saved values (`runtimeFieldAdapter.ts:961-980`), so seeded rows are discarded there unless `seedMissingDefaults` is set.
- **Repeated updates / render loops:** none. No effect and no `onChange` is involved.
- **Case B (empty saved table):** persisting would need an effect that calls `onChange` when `value` is empty. That is the risky pattern: it would also fire for read-only views and would re-fire if the parent resets the value to `[]`. Recommendation: do not persist here. Instead, make the display match what is saved, which means removing defaults from the derived fallback row and returning to a plain `{ _rowId }` blank row only for the empty-array case. Open question below.

## 5. What happens if the user submits without editing?

- **Today, new form:** the table value is `[{}]`. `isRuntimeValueEmpty` treats it as empty (`runtimeValidation.ts:73-82`). A required table fails the required check, and required columns report `Row 1: <col> is required…` (Batch 1 loop). No defaults are submitted.
- **After seeding defaults (proposed fix):** the row contains default values, so `isRuntimeValueEmpty` returns `false` for the table. **A required table that only has defaults (for example an auto-sequence of 1) would pass the table-level required check without the user entering anything.** Required columns are still checked per cell, so a required column with no default still blocks. This is a behaviour change to confirm with you. I could not check how V5 treated it (V5 source unavailable).

## 6. Fixed-row tables

- Same issue, in case A only. `buildInitialFormModel` seeds N rows with only the LABEL column (`fieldRendering.ts:283-296`). The renderer backfills with labels only (`TableFieldRenderer.tsx:~856-885`) when `raw.length < fixedRowCount`. Defaults are never applied to fixed rows.
- Fixed rows have no derived-row problem like case B, because the backfill adds rows to the display copy only when the saved array is shorter than the count. Those backfilled rows are not persisted either, and would need the same care.

## 7. Side effect of Batch 2A found during this audit

`appendRows` (`TableFieldRenderer.tsx:1203-1207`) drops an untouched first row only when `rows.length === 1 && Object.keys(rows[0]).length <= 1` (that is, `{}` or `{ _rowId }`). A blank row built by `createBlankRow` with defaults has more keys, so **QR/barcode scan, OCR line-item import and file import will now append after a default-only row instead of replacing it**. This affects the delete-last-row, bulk-delete and empty-array cases from 2A, and would also affect seeded rows if defaults are added in `buildInitialFormModel`. It is a real regression risk from my Batch 2A change that I did not catch.

## 8. Smallest safe fix and regression tests

**Fix (one batch, no effects, no schema change):**
1. In `buildInitialFormModel` (`fieldRendering.ts:278-300`), seed ON_DEMAND `[ buildTableRowDefaults(...) ]` and FIXED rows with their label plus defaults, building rows one at a time so AUTO_SEQUENCE advances.
2. Fix blank-row detection in `appendRows` so a row holding only configured default values (and `_rowId`) still counts as blank. Concretely: treat a row as blank if every non-underscore value equals what `buildTableRowDefaults` would produce for it.
3. Remove defaults from the derived empty-array fallback row (case B), or leave it; decide per the open question.

**Tests:**
- `buildInitialFormModel`: ON_DEMAND table with defaults seeds one row containing them; table without defaults still seeds `[{}]` (regression guard).
- `buildInitialFormModel`: FIXED table keeps label values, adds defaults, and AUTO_SEQUENCE is 1, 2, 3…
- A saved entry with its own rows (`hydrateFormModel` with `savedEntryValues`) is not overwritten by seeded defaults.
- A pure `isBlankDefaultRow(row, columns, email)` helper (extracted from the `appendRows` check): default-only row is blank; row with one user-entered value is not.
- `validateFieldValue` on a required table whose only content is defaults: assert the intended outcome once you decide the open question in section 5.

## Open questions for you

1. Should a required table whose rows contain only auto-filled defaults count as "filled"? (Section 5.)
2. For an empty saved table (case B), do you prefer defaults shown but unsaved (current), or no defaults shown (consistent with what is saved)?

## Recommended single next action

Implement the "seed defaults in `buildInitialFormModel` + fix blank-row detection in `appendRows`" batch described in section 8, after you answer the two open questions.
