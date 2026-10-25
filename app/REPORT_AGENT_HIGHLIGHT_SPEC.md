# Report Agent — Column Highlight Spec

**Audience:** Report agent team
**Applies to:** the `reportSpec.columns[]` array in the report builder agent response
**Status:** frontend support is implemented and ready to consume this format

---

## 1. What this is

The report table can color the values of a column (shown as a colored pill), for example:

- `Total` in **red** when it is higher than `ALT_Total`
- `is_marked` in **purple** when it is `true`
- `Compare` in **red** when it contains "mismatch"

To make this happen, the agent adds an optional **`highlight`** object to any column in `reportSpec.columns`. Columns without `highlight` show as plain text, so nothing changes for existing responses.

---

## 2. Where it goes

Add `highlight` **inside the column object**, next to `key`, `label`, `formula`, and the rest:

```json
{
  "reportSpec": {
    "columns": [
      {
        "key": "Total",
        "label": "Total",
        "formula": null,
        "editable": true,
        "kind": "userdefined",
        "selected": true,
        "highlight": {
          "default": null,
          "rules": [
            { "op": "gte", "value": 10000, "color": "orange" }
          ]
        }
      }
    ]
  }
}
```

Only `reportSpec.columns` is read for highlights. Do **not** add `highlight` to `userdefinedColumns`, `defaultColumns`, `agentColumns` or the stringified `reportPrompt`.

---

## 3. The `highlight` object

```json
"highlight": {
  "default": "<color id> | null",
  "rules": [
    {
      "op": "<operator>",
      "value": "<string | number | boolean>",
      "value2": "<string | number>",
      "compareField": "<another column key>",
      "color": "<color id>",
      "label": "<text to display>"
    }
  ]
}
```

| Field | Required | Type | Description |
|---|---|---|---|
| `rules` | **Yes** | array | List of conditions. Checked **top to bottom; the first match wins.** |
| `default` | No | color id or `null` | Color for values that match no rule. `null` or missing means `gray`. |

### Rule fields

| Field | Required | Type | Description |
|---|---|---|---|
| `op` | **Yes** | string | The comparison operator (see section 4). |
| `color` | **Yes** | string | A color id from section 5. **Never a hex code.** |
| `value` | Depends on `op` | string / number / boolean | The value to compare with. For `between` it is the **minimum**. Not needed for `empty` / `notEmpty` or when `compareField` is used. |
| `value2` | Only for `between` | string / number | The **maximum** for `between`. |
| `compareField` | No | string | Another column `key` in the same row to compare with **instead of** `value`, e.g. `"ALT_Total"`. |
| `label` | No | string | Text shown in the pill. **Leave it out to show the cell's own value** (recommended for amounts). |

---

## 4. Operators (`op`)

| `op` | Meaning | Uses | Example |
|---|---|---|---|
| `eq` | equals | `value` | `{ "op": "eq", "value": "Net 30" }` |
| `neq` | not equal | `value` | `{ "op": "neq", "value": "Standard" }` |
| `contains` | text contains | `value` | `{ "op": "contains", "value": "mismatch" }` |
| `notContains` | text does not contain | `value` | `{ "op": "notContains", "value": "ok" }` |
| `gt` | greater than | `value` or `compareField` | `{ "op": "gt", "value": 10000 }` |
| `gte` | greater than or equal | `value` or `compareField` | `{ "op": "gte", "value": 5000 }` |
| `lt` | less than | `value` or `compareField` | `{ "op": "lt", "compareField": "ALT_Total" }` |
| `lte` | less than or equal | `value` or `compareField` | `{ "op": "lte", "value": 0 }` |
| `between` | between min and max, inclusive | `value` + `value2` | `{ "op": "between", "value": 1000, "value2": 5000 }` |
| `empty` | blank / missing | nothing | `{ "op": "empty" }` |
| `notEmpty` | has any value | nothing | `{ "op": "notEmpty" }` |

### Matching behavior

- **Numbers:** `gt`, `gte`, `lt`, `lte` and `between` compare **as numbers**. Currency symbols, commas and spaces are ignored, so `"$12,500.00"` is read as `12500`. Monetary fields can stay as text.
- **Text:** `eq`, `neq`, `contains` and `notContains` **ignore upper/lower case** and surrounding spaces, so `"True"`, `"true"` and `true` all match `{ "op": "eq", "value": true }`.
- **Non-numbers:** if a numeric comparison gets a value that isn't a number (e.g. empty), that rule is skipped.
- **Order:** the **first matching rule wins**, so put the most specific rule first.

---

## 5. Color ids

Use **only the `id`** in `color` and `default`. The hex values are for reference: they show how the pill looks in light mode. The UI picks matching colors for dark mode automatically.

| id | Use it for | Solid | Pill background | Pill text |
|---|---|---|---|---|
| `gray` | Neutral, inactive, draft, not started, unknown | `#8181a0` | `#f6f6f9` | `#67678a` |
| `green` | Success, approved, completed, active, paid, within budget | `#30a46c` | `#e6f6eb` | `#218358` |
| `red` | Error, rejected, overdue, failed, escalated, over budget | `#e5484d` | `#feebec` | `#ce2c31` |
| `orange` | Warning, pending, on hold, due soon | `#f76b15` | `#ffefd6` | `#cc4e00` |
| `yellow` | Attention, needs review, partially done | `#ffc53d` | `#fff7c2` | `#ab6400` |
| `blue` | Info, in progress, submitted, open | `#0090ff` | `#e6f4fe` | `#0d74ce` |
| `primary` | Brand highlight (purple), featured, current, marked | `#7c5cff` | `#f3f0ff` | `#5b3ed6` |
| `secondary` | Secondary brand highlight (cyan) | `#00bcd4` | `#dbf7fd` | `#007f94` |
| `tertiary` | Tertiary brand highlight (green) | `#30a46c` | `#ccefd9` | `#218358` |
| `purple` | Category / grouping | `#8e4ec6` | `#f7edfe` | `#8145b5` |
| `violet` | Category / grouping | `#6e56cf` | `#f4f0fe` | `#6550b9` |
| `indigo` | Category / grouping | `#3e63dd` | `#edf2fe` | `#3a5bc7` |
| `cyan` | Category / grouping | `#00a2c7` | `#def7f9` | `#107d98` |
| `teal` | Category / grouping | `#12a594` | `#e0f8f3` | `#008573` |
| `pink` | Category / grouping | `#d6409f` | `#fee9f5` | `#c2298a` |
| `bronze` | Category / grouping | `#a18072` | `#f6edea` | `#7d5e54` |
| `gold` | Category / grouping, premium tier | `#978365` | `#f2f0e7` | `#71624b` |

**Guidelines**
- Use `green` / `orange` / `red` for good / warning / bad. Users read these meanings first.
- Use the category colors (`purple`, `violet`, `indigo`, `cyan`, `teal`, `pink`, `bronze`, `gold`) when values are **kinds of things**, not good or bad, e.g. different invoice types.
- Keep each column to about **5 colors at most**.
- If unsure, use `gray`.

**Fallback:** the frontend accepts small variations, but please send the exact ids above.
- `"Red"`, `"red-9"` are read as `red`
- `"success"` is read as `green`; `"error"` and `"danger"` as `red`; `"warning"` as `orange`; `"info"` as `blue`; `"neutral"` and `"grey"` as `gray`
- Anything else (including hex codes) is shown as `gray`.

---

## 6. Full sample — RFQ Estimation Report

This is the `reportSpec` from the RFQ sample with `highlight` added. Columns without color needs have no `highlight`. Unchanged fields (`userdefinedColumns`, `defaultColumns`, `availableColumns`, etc.) are left out here for length; keep sending them as today.

```json
{
  "reportType": "specific_workflow",
  "title": "RFQ Estimation Report",
  "reportSpec": {
    "title": "RFQ Estimation Report",
    "objective": "Summarize RFQ estimation details captured in the RFQ Process workflow, including customer and financial totals. Help reviewers compare provided estimation amounts and review notes/traceability per RFQ item.",
    "reportType": "specific_workflow",
    "columns": [
      { "key": "Company_Name", "label": "Company", "formula": null, "editable": true, "kind": "userdefined", "selected": true },
      { "key": "Date", "label": "RFQ Date", "formula": null, "editable": true, "kind": "userdefined", "selected": true },
      { "key": "Order_Number", "label": "Order Number", "formula": null, "editable": true, "kind": "userdefined", "selected": true },
      {
        "key": "Invoice_Type",
        "label": "Invoice Type",
        "formula": null,
        "editable": true,
        "kind": "userdefined",
        "selected": true,
        "highlight": {
          "default": "gray",
          "rules": [
            { "op": "eq", "value": "Standard", "color": "blue" },
            { "op": "eq", "value": "Proforma", "color": "violet" },
            { "op": "eq", "value": "Credit Note", "color": "teal" }
          ]
        }
      },
      {
        "key": "Payment_Terms",
        "label": "Payment Terms",
        "formula": null,
        "editable": true,
        "kind": "userdefined",
        "selected": true,
        "highlight": {
          "default": null,
          "rules": [
            { "op": "contains", "value": "advance", "color": "orange" },
            { "op": "eq", "value": "Net 30", "color": "blue" },
            { "op": "empty", "color": "yellow", "label": "Not set" }
          ]
        }
      },
      {
        "key": "today_task",
        "label": "Today Task",
        "formula": null,
        "editable": true,
        "kind": "userdefined",
        "selected": true,
        "highlight": {
          "default": null,
          "rules": [
            { "op": "eq", "value": true, "color": "orange", "label": "Due today" }
          ]
        }
      },
      {
        "key": "is_marked",
        "label": "Is Marked",
        "formula": null,
        "editable": true,
        "kind": "userdefined",
        "selected": true,
        "highlight": {
          "default": "gray",
          "rules": [
            { "op": "eq", "value": true, "color": "primary", "label": "Marked" },
            { "op": "eq", "value": false, "color": "gray", "label": "No" }
          ]
        }
      },
      { "key": "Reasoning", "label": "Reasoning", "formula": null, "editable": true, "kind": "userdefined", "selected": true },
      {
        "key": "Matched_Items",
        "label": "Matched Items",
        "formula": null,
        "editable": true,
        "kind": "userdefined",
        "selected": true,
        "highlight": {
          "default": null,
          "rules": [
            { "op": "empty", "color": "red", "label": "None matched" },
            { "op": "notEmpty", "color": "green" }
          ]
        }
      },
      {
        "key": "Excluded_Items",
        "label": "Excluded Items",
        "formula": null,
        "editable": true,
        "kind": "userdefined",
        "selected": true,
        "highlight": {
          "default": null,
          "rules": [
            { "op": "notEmpty", "color": "yellow" }
          ]
        }
      },
      { "key": "Subtotal", "label": "Subtotal", "formula": null, "editable": true, "kind": "userdefined", "selected": true },
      {
        "key": "Freight",
        "label": "Freight",
        "formula": null,
        "editable": true,
        "kind": "userdefined",
        "selected": true,
        "highlight": {
          "default": null,
          "rules": [
            { "op": "lte", "value": 0, "color": "green", "label": "Free" }
          ]
        }
      },
      { "key": "HST", "label": "HST", "formula": null, "editable": true, "kind": "userdefined", "selected": true },
      {
        "key": "Total",
        "label": "Total",
        "formula": null,
        "editable": true,
        "kind": "userdefined",
        "selected": true,
        "highlight": {
          "default": null,
          "rules": [
            { "op": "gte", "value": 50000, "color": "red" },
            { "op": "between", "value": 10000, "value2": 49999.99, "color": "orange" },
            { "op": "lt", "value": 10000, "color": "green" }
          ]
        }
      },
      { "key": "ALT_Subtotal", "label": "ALT Subtotal", "formula": null, "editable": true, "kind": "userdefined", "selected": true },
      {
        "key": "ALT_Total",
        "label": "ALT Total",
        "formula": null,
        "editable": true,
        "kind": "userdefined",
        "selected": true,
        "highlight": {
          "default": null,
          "rules": [
            { "op": "lt", "compareField": "Total", "color": "green" },
            { "op": "gt", "compareField": "Total", "color": "red" }
          ]
        }
      },
      { "key": "OPT_Subtotal", "label": "OPT Subtotal", "formula": null, "editable": true, "kind": "userdefined", "selected": true },
      {
        "key": "OPT_Total",
        "label": "OPT Total",
        "formula": null,
        "editable": true,
        "kind": "userdefined",
        "selected": true,
        "highlight": {
          "default": null,
          "rules": [
            { "op": "lt", "compareField": "Total", "color": "green" },
            { "op": "gt", "compareField": "Total", "color": "red" }
          ]
        }
      },
      { "key": "quote2_Subtotal", "label": "Quote2 Subtotal", "formula": null, "editable": true, "kind": "userdefined", "selected": true },
      { "key": "quote3_Subtotal", "label": "Quote3 Subtotal", "formula": null, "editable": true, "kind": "userdefined", "selected": true },
      {
        "key": "quote2_Total",
        "label": "Quote2 Total",
        "formula": null,
        "editable": true,
        "kind": "userdefined",
        "selected": true,
        "highlight": {
          "default": null,
          "rules": [
            { "op": "lt", "compareField": "Total", "color": "green" },
            { "op": "gt", "compareField": "Total", "color": "red" }
          ]
        }
      },
      {
        "key": "quote3_Total",
        "label": "Quote3 Total",
        "formula": null,
        "editable": true,
        "kind": "userdefined",
        "selected": true,
        "highlight": {
          "default": null,
          "rules": [
            { "op": "lt", "compareField": "Total", "color": "green" },
            { "op": "gt", "compareField": "Total", "color": "red" }
          ]
        }
      },
      {
        "key": "Compare",
        "label": "Compare",
        "formula": null,
        "editable": true,
        "kind": "userdefined",
        "selected": true,
        "highlight": {
          "default": "gray",
          "rules": [
            { "op": "contains", "value": "mismatch", "color": "red" },
            { "op": "contains", "value": "partial", "color": "orange" },
            { "op": "contains", "value": "match", "color": "green" }
          ]
        }
      },
      { "key": "Line_Traceability", "label": "Line Traceability", "formula": null, "editable": true, "kind": "userdefined", "selected": true },
      { "key": "Internal_Notes", "label": "Internal Notes", "formula": null, "editable": true, "kind": "userdefined", "selected": true },
      { "key": "Quote_Number", "label": "Quote Number", "formula": null, "editable": true, "kind": "userdefined", "selected": true }
    ],
    "filters": [
      { "field": "is_deleted", "op": "=", "value": false, "editable": true }
    ],
    "groupBy": [],
    "sort": { "field": "Date", "direction": "desc" },
    "sourceSchema": "dbo",
    "sourceTable": "ezfb_787372d8_items",
    "schemaTables": ["dbo.ezfb_787372d8_items"]
  }
}
```

### What the sample shows on screen

| Row values | Column | Pill |
|---|---|---|
| `Total = "$62,000.00"` | Total | **red** "$62,000.00" |
| `Total = "$12,500.00"` | Total | **orange** "$12,500.00" |
| `Total = "$12,500.00"`, `ALT_Total = "$11,800.00"` | ALT Total | **green** "$11,800.00" (cheaper than Total) |
| `Total = "$12,500.00"`, `quote2_Total = "$13,100.00"` | Quote2 Total | **red** "$13,100.00" (more than Total) |
| `is_marked = "True"` | Is Marked | **primary** "Marked" |
| `Compare = "Line 3 MISMATCH"` | Compare | **red** "Line 3 MISMATCH" |
| `Compare = "All lines match"` | Compare | **green** "All lines match" |
| `Payment_Terms = ""` | Payment Terms | **yellow** "Not set" |
| `Excluded_Items = "Bolt M8 x 20"` | Excluded Items | **yellow** "Bolt M8 x 20" |

Note: in `Compare`, `"mismatch"` is listed **before** `"match"`. `"mismatch"` contains `"match"`, so if the order were reversed every mismatch would show green.

---

## 7. Checklist for the agent

- [ ] `highlight` sits **inside the column object** in `reportSpec.columns`.
- [ ] Every rule has `op` and `color`.
- [ ] `color` / `default` use an **id from section 5**, never a hex code.
- [ ] `between` has both `value` (min) and `value2` (max).
- [ ] `compareField` is a `key` of another **selected** column in the same report.
- [ ] Rules are ordered most specific → least specific.
- [ ] `label` is left out for amounts and free text, so the real value shows.
- [ ] Columns that need no color have **no** `highlight` (or `"highlight": null`).

---

## 8. Prompt snippet for the agent

Paste this into the report agent's system prompt:

```text
To highlight a column's values, add a "highlight" object to that column in reportSpec.columns:
"highlight": { "default": "<color id or null>", "rules": [ { "op": "...", "value": ..., "value2": ..., "compareField": "...", "color": "<color id>", "label": "..." } ] }
- op: eq | neq | contains | notContains | gt | gte | lt | lte | between | empty | notEmpty
- gt/gte/lt/lte/between compare numerically (currency symbols and commas are ignored); text ops are case-insensitive.
- between uses value (min) and value2 (max).
- compareField: another column key to compare against instead of value (e.g. Total gt ALT_Total).
- label is optional; omit it to show the cell value itself.
- Rules are checked in order and the first match wins, so put the most specific rule first.
- default: color for values that match no rule; null leaves them gray.
- Omit "highlight" (or use null) for columns that need no color.

color must be exactly one of these ids:
- gray: Neutral, inactive, draft, not started, unknown
- green: Success, approved, completed, active, paid
- red: Error, rejected, overdue, failed, escalated
- orange: Warning, pending, on hold, due soon
- yellow: Attention, needs review, partially done
- blue: Info, in progress, submitted, open
- primary: Brand highlight, featured, current
- secondary: Secondary brand highlight
- tertiary: Tertiary brand highlight
- purple: Category / grouping
- violet: Category / grouping
- indigo: Category / grouping
- cyan: Category / grouping
- teal: Category / grouping
- pink: Category / grouping
- bronze: Category / grouping
- gold: Category / grouping, premium tier
If unsure, use "gray". Return the id only, never a hex code.
```

---

## 9. Reference (frontend)

| File | Purpose |
|---|---|
| `src/pages/report-builder/highlightColors.ts` | Color ids, pill classes, `REPORT_AGENT_COLOR_PROMPT` |
| `src/api/v6/reportBuilder.ts` | `ReportSpecColumn` / `ReportSpecHighlight` types (this contract) |
| `src/pages/report-builder/utils/fromReportSpec.ts` | Converts `reportSpec.columns` into report column settings |
| `src/pages/report-builder/utils/matchHighlightRule.ts` | Rule matching logic |
