# V6 Field Types — Description, HTML Element & Basic Settings

For every V6 field type: what it is, the HTML element it renders as, and the basic settings it needs.

"HTML element" is the native element the control is built on. Pickers (date, time, dropdown) are styled
controls, so the element shown is the closest native equivalent.

- Part 1 — **Folder fields** (metadata on a folder, filled on upload / edit metadata)
- Part 2 — **Form fields** (form builder fields, filled in a request)

---

## Part 1 — Folder Fields

### 1.1 Settings every folder field has

| Setting | What it does |
| --- | --- |
| Field Name | Label of the field (e.g. "Cost Center") |
| Type | One of the 16 types below |
| Folder | Field becomes a level in the folder structure (forces Mandatory on) |
| Mandatory | Value required on upload |
| Icon | Icon shown for folder-structure fields |

### 1.2 Folder field types

| Type | Description | HTML element | Type-specific settings |
| --- | --- | --- | --- |
| `SHORT_TEXT` | Single-line text | `<input type="text">` | — |
| `LONG_TEXT` | Multi-line text | `<textarea>` (upload); `<input type="text">` (edit metadata) | — |
| `NUMBER` | Numeric value | `<input type="number">` | — |
| `BOOLEAN` | Yes / No value | `<input type="checkbox">` | Options source (see 1.3) |
| `DATE` | Calendar date | `<input type="date">` | — |
| `TIME` | Time of day | `<input type="text">` | — |
| `DATE_TIME` | Date and time | `<input type="text">` | — |
| `SINGLE_SELECT` | Pick one value from a list (user may also type a new one) | `<select>` (searchable) | Options source (see 1.3) |
| `TABLE` | Rows of values with fixed columns | `<table>` with inputs per cell | Columns: name, type (Short Text, Long Text, Number, Date, Time, Single Select), mandatory per column |
| `DYNAMIC_TABLE` | Table whose columns can change | `<table>` with inputs per cell | Columns (same as Table) |
| `BARCODE` | Value read from a barcode | `<input type="text">` | Barcode format: QR Code, Code 128, EAN-13 |
| `OMR` | Value read from an OMR sheet | `<input type="text">` | OMR template reference |
| `CALCULATED` | Value computed from other fields | `<input type="text">` | — |
| `AUTO_GENERATED` | System-generated value | `<input type="text">` | — |
| `LINK` | Web link | `<input type="text">` | Default URL |
| `CURRENCY_AMOUNT` | Money amount | `<input type="text">` | — |

**Rendering rules**
- Any field with an options list renders as `<select>`, whatever its type.
- A field whose label contains "address" renders as `<textarea>` on the upload screen.
- Anything unmatched renders as `<input type="text">`.

### 1.3 Options source (Single Select / Boolean)

| Source | Settings |
| --- | --- |
| Predefined | Option values, separated by newline or comma |
| Master | Master form + column to read values from |
| Unique values | Distinct values already stored in this field |

---

## Part 2 — Form Fields

### 2.1 Settings every form field has (Field Setup)

| Setting | Notes |
| --- | --- |
| Field Label | Shown above the control |
| Field Type | Convert to another compatible type |
| Placeholder | Not on Calculated |
| Default Value | Only on types without their own default setting |
| Field Width | 33% / 50% / 100% |
| Hide Label | |
| Help Text / Description | |
| Tooltip | Text, number, date/time, choice and table fields |
| Visibility State | Normal / Read Only / Hidden — text, number, date/time and choice fields |
| Read Only, Hidden Field | Toggles for all other types |
| Mandatory | Validation section — all types except Divider |
| Conditional Mandatory / Read-Only / Show rules | Validation section — all types except Divider |

### 2.2 Form field types

#### Core

| Type | Description | HTML element | Basic settings |
| --- | --- | --- | --- |
| `SHORT_TEXT` | Single-line text | `<input type="text">` | Fill value (custom, auto-generate, logged-in user, current year, master table, another field, request no.), prefix / suffix, content rule (Text, Alpha, Alpha Spaces, Alpha Dash, Alpha Numeric, Email, Web), QR scan, address autocomplete, search field |
| `LONG_TEXT` | Multi-line text | `<textarea>` | Content rule (Text, Alpha, Alpha Spaces, Alpha Dash, Alpha Numeric) |
| `EMAIL` | Email address, optional OTP check | `<input type="email">` | Common settings only |
| `NUMBER` | Numeric value | `<input type="number">` | Number format (Integer, Decimal, Commas, Both), enforce integer, decimal digits, min / max value range, auto-generate number (prefix, suffix), prefix / suffix label, search field |
| `PHONE_NUMBER` | Phone number | `<input type="tel">` | Common settings only |
| `SINGLE_SELECT` | Pick one from a dropdown | `<select>` | Options source (see 2.3), default value (fixed / dynamic / none), allow adding new options, cascading parent filter, search field |
| `SINGLE_CHOICE` | Pick one from visible options | `<input type="radio">` group | Options source, options layout (auto, 1–6 columns), show options wrapper, QR value scan, cascading parent filter |
| `MULTIPLE_CHOICE` | Pick many from visible options | `<input type="checkbox">` group | Same as Single Choice + select all / unselect all, allow custom entries, default selection mode |
| `YES_NO_TOGGLE` | Yes / No switch | `<input type="checkbox" role="switch">` | Yes label, No label, show check / cross icons |
| `DATE` | Calendar date | `<input type="date">` | Default (fixed date, today, from parent field + days offset), date limits (min, max, range, years from current) |
| `FILE_UPLOAD` | Attach documents | `<input type="file">` (drag-and-drop zone) | Allow multiple files, QR upload, file in stage only, allowed file types (pdf, jpg, png, docx, xlsx), max file size (MB), expiry field, auto-fill from document |

#### Secondary

| Type | Description | HTML element | Basic settings |
| --- | --- | --- | --- |
| `MULTI_SELECT` | Pick many from a dropdown | `<select multiple>` (selected shown as tags) | Options source, select all / unselect all, allow custom entries, default selection mode |
| `FULL_NAME` | First + last name | `<input type="text">` | First name required, last name required, show middle name |
| `CURRENCY_AMOUNT` | Amount with currency code | `<input type="number">` with currency prefix | Currency list (all / restricted list), currency parent field, default currency, default amount, require currency unit, decimal precision, min / max value |
| `RATING` | Star feedback | `<input type="radio">` group (stars) | Icon type, icon count, allow half rating |
| `OPINION_SCALE` | 0–10 scale | `<button>` × 11 | Min / mid / max labels, scale range |
| `URL` | Web link | `<input type="url">` | Common settings only |
| `TIME` | Time of day | `<input type="time">` | Default (fixed time, now, none), time format (12 / 24 h), time limits (min, max, range, hours from current) |
| `DATE_TIME` | Date and time | `<input type="datetime-local">` | Default (fixed, today, parent field), time format, date limits |

#### Structural & Layout

| Type | Description | HTML element | Basic settings |
| --- | --- | --- | --- |
| `DIVIDER` | Visual separator | `<hr>` | Field width only |
| `TABLE` | Spreadsheet-style rows | `<table>` with inputs per cell | Columns (add / type / settings), entry type, fixed row count, row labels, row selection, table view, import / export, summary totals, QR / barcode scan-to-fill, fill from master table (parent field, master table, column mapping), auto-fill rows from document |
| `TEXT_BUILDER` | Rich text / dynamic content | `<textarea>` | Default content, insert field placeholders |

#### Smart Templates

| Type | Description | HTML element | Basic settings |
| --- | --- | --- | --- |
| `CONTACT_INFO` | Name, email, phone block | `<input type="text">` | Common settings only |
| `ADDRESS_INFO` | Full address group | `<input type="text">` | Common settings only |
| `ADDRESS` | Street, city, state, zip | `<input type="text">` with autocomplete | Address mode, required parts (street & city always; state, postal code optional) |
| `CONSENT` | Agreement confirmation | `<input type="checkbox" role="switch">` | Common settings only |

#### Specialized

| Type | Description | HTML element | Basic settings |
| --- | --- | --- | --- |
| `COUNTRY_CODE` | International dialing prefix | `<input type="text">` | Default dialing prefix, enable search |
| `PASSWORD` | Hidden text entry | `<input type="password">` | Common settings only |
| `SIGNATURE` | Hand-drawn signature | `<input type="text">` (no drawing pad yet) | Pen color, allow multiple signatures |
| `COUNTER` | Increment / decrement number | `<input type="number">` | Same as Number + prevent negative |

#### Advanced

| Type | Description | HTML element | Basic settings |
| --- | --- | --- | --- |
| `DYNAMIC_TABLE` | Table with runtime-editable columns | `<table>` with inputs per cell | Same as Table |
| `SCORE` | Total score | `<input type="text">` | Common settings only |
| `CALCULATED` | Formula result | `<input type="text" readonly>` | Formula builder, live formula (recalculate on change) |
| `INVOICE_REPORT` | Invoice & PO matching summary | `<input type="text">` | Common settings only |
| `FINANCIAL_AUDIT` | GL matching & audit report | `<input type="text">` | Common settings only |

### 2.3 Options source (Dropdown, Single / Multiple Choice, Multi Select)

| Source | Settings |
| --- | --- |
| Custom List | Options typed manually (newline or comma separated) |
| Master Table | Master form / table, column to display, conditions |
| Data Repository | Repository + column / field |
| Predefined Lists | Entity type, attribute column |
| Unique Column Values | Form + field column |
| Assign Control Field | Target control field |
| User List | Optional user group filter |

---

## Known gaps

- **Folder:** `TIME`, `DATE_TIME` and `CURRENCY_AMOUNT` render as a plain `<input type="text">`.
- **Form:** `SIGNATURE`, `COUNTRY_CODE`, `SCORE`, `ADDRESS_INFO`, `INVOICE_REPORT` and `FINANCIAL_AUDIT` have no dedicated control in the request form and render as `<input type="text">`.
