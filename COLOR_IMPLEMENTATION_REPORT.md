# Color Implementation Report: Badges & Status Indicators

## Executive Summary
Found **3 main status systems** with **hardcoded colors** in GridView and **data-driven colors** in Badge components. Total of **8 files** involved in rendering these statuses.

---

## 1. AI SCORE Column/Badge

### Location
- **File**: [src/pages/requests/components/GridView.tsx](src/pages/requests/components/GridView.tsx#L336-L355)
- **Lines**: 336-355

### Rendering
- Displays as a **progress bar with percentage** (e.g., "98%")
- Shows score label with icon (tabler:sparkles)
- Progress bar with animated fill

### Current Color Implementation (HARDCODED)
```tsx
// Percentage text color
index % 3 === 0 ? "text-emerald-600" : index % 3 === 1 ? "text-orange-600" : "text-teal-600"

// Progress bar fill color
index % 3 === 0 ? "bg-emerald-500" : index % 3 === 1 ? "bg-orange-500" : "bg-teal-500"
```

| Variant | Percentage Color | Bar Fill Color | Usage |
|---------|-----------------|----------------|-------|
| 0 (mod 3) | `text-emerald-600` | `bg-emerald-500` | Cycle 0, 3, 6... |
| 1 (mod 3) | `text-orange-600` | `bg-orange-500` | Cycle 1, 4, 7... |
| 2 (mod 3) | `text-teal-600` | `bg-teal-500` | Cycle 2, 5, 8... |

### Color Type
**HARDCODED** - Uses modulo index cycling, not data-driven

---

## 2. Match Status Badge

### Locations (Multiple)

#### A. GridView Component
- **File**: [src/pages/requests/components/GridView.tsx](src/pages/requests/components/GridView.tsx#L320-L329)
- **Lines**: 320-329

#### B. Form Field (Matched Status)
- **File**: [src/pages/requests/components/request/components/sections/form/Form.tsx](src/pages/requests/components/request/components/sections/form/Form.tsx#L76-L88)
- **Lines**: 76-88

#### C. Overview Card (AnalysisCard)
- **File**: [src/pages/requests/components/request/components/sections/overview/Overview.tsx](src/pages/requests/components/request/components/sections/overview/Overview.tsx#L340-L365)
- **Lines**: 340-365

### Display Values
- **"Matched"** 
- **"No Match"**
- **"Partial Match"**

### Current Color Implementation (HARDCODED in GridView)
```tsx
// GridView.tsx lines 320-329
index % 3 === 0 ? (
  <div className="...bg-emerald-50 text-emerald-700 border-emerald-100">Matched</div>
) : index % 3 === 1 ? (
  <div className="...bg-red-50 text-red-700 border-red-100">No Match</div>
) : (
  <div className="...bg-orange-50 text-orange-700 border-orange-100">Partial Match</div>
)
```

| Status | Background | Text | Border |
|--------|-----------|------|--------|
| Matched | `bg-emerald-50` | `text-emerald-700` | `border-emerald-100` |
| No Match | `bg-red-50` | `text-red-700` | `border-red-100` |
| Partial Match | `bg-orange-50` | `text-orange-700` | `border-orange-100` |

### Form Field Implementation
```tsx
// Form.tsx - Hardcoded green for "Fully Matched" status
<div className="...bg-[var(--green-1)] border border-[var(--green-4)] ...">
  <span className="text-[13px] font-medium text-[var(--green-11)]">
    {formModel[control.id] || 'Fully Matched'}
  </span>
</div>
```

### AnalysisCard Implementation
```tsx
// Overview.tsx - Uses statusType prop
<AnalysisCard
  icon={Paperclip}
  title="PO Matching"
  value={...}
  status={formModel?.['PO Number'] || formModel?.['po_number'] ? "Matched" : "Not Matched"}
  statusType={formModel?.['PO Number'] || formModel?.['po_number'] ? "success" : "warning"}
/>

// AnalysisCard component (lines 30-45)
statusType === 'success' ? "bg-[var(--green-1)] text-[var(--green-9)]" :
  statusType === 'warning' ? "bg-[var(--orange-1)] text-[var(--orange-9)]" :
    "bg-[var(--gray-1)] text-[var(--gray-11)]"
```

### Color Type
**HARDCODED** in GridView (index-based cycling)  
**DATA-DRIVEN** in AnalysisCard (statusType prop: success/warning/default)  
**HARDCODED** in Form.tsx (always green)

---

## 3. Risk Level Badge

### Location
- **File**: [src/pages/requests/components/GridView.tsx](src/pages/requests/components/GridView.tsx#L359-L368)
- **Lines**: 359-368

### Display Values
- **"High Risk"**
- **"Medium Risk"**
- **"Low Risk"**

### Current Color Implementation (HARDCODED)
```tsx
// GridView.tsx lines 359-368
index % 3 === 0 ? "bg-red-50 text-red-600 border-red-100" :
  index % 3 === 1 ? "bg-orange-50 text-orange-600 border-orange-100" :
    "bg-emerald-50 text-emerald-600 border-emerald-100"
```

| Risk Level | Background | Text | Border |
|-----------|-----------|------|--------|
| High Risk | `bg-red-50` | `text-red-600` | `border-red-100` |
| Medium Risk | `bg-orange-50` | `text-orange-600` | `border-orange-100` |
| Low Risk | `bg-emerald-50` | `text-emerald-600` | `border-emerald-100` |

### Color Type
**HARDCODED** - Uses modulo index cycling, not actual risk level data

---

## 4. Badge Components

### Base Badge Component
- **File**: [src/components/base/Badge.tsx](src/components/base/Badge.tsx)
- **Type**: DATA-DRIVEN via props

### Color System
```tsx
type BadgeColor = 'blue' | 'bronze' | 'cyan' | 'gold' | 'gray' | 'green' | 
                  'indigo' | 'orange' | 'pink' | 'purple' | 'red' | 'teal' | 
                  'violet' | 'yellow'

const colorClassName: Record<BadgeColor, string> = {
  blue: 'bg-blue-3 text-blue-11',
  green: 'bg-green-3 text-green-11',
  orange: 'bg-orange-3 text-orange-11',
  red: 'bg-red-3 text-red-11',
  // ... others
}
```

### Badge Variants

#### RequestStatusBadge
- **File**: [src/components/common/RequestStatusBadge.tsx](src/components/common/RequestStatusBadge.tsx)
- **Type**: DATA-DRIVEN via status prop

```tsx
switch (status) {
  case 'Rejected':
  case 'Duplicated': return 'red'
  case 'Pending': return 'orange'
  case 'Approved':
  case 'Completed':
  case 'Verifier': return 'green'
  case 'Start':
  case 'AI Agent':
  case 'Extracting':
  case 'Processing': return 'blue'
  default: return 'gray'
}
```

#### FormStatusBadge
- **File**: [src/components/common/FormStatusBadge.tsx](src/components/common/FormStatusBadge.tsx)
- **Type**: DATA-DRIVEN via status prop

```tsx
switch (status?.toUpperCase()) {
  case 'DRAFT': return 'orange'
  case 'PUBLISHED': return 'green'
  default: return 'gray'
}
```

#### SummaryBadge
- **File**: [src/components/common/SummaryBadge.tsx](src/components/common/SummaryBadge.tsx)
- **Type**: DATA-DRIVEN via theme prop

```tsx
interface Props {
  theme: 'green' | 'orange' | 'red' | 'blue'
  variant?: 'soft' | 'outline'
}

const softStyles = {
  blue: 'bg-blue-3 text-blue-11',
  green: 'bg-green-3 text-green-11',
  orange: 'bg-orange-3 text-orange-11',
  red: 'bg-red-3 text-red-11',
}
```

#### Other Badge Components
- **UserRoleBadge**: [src/components/common/UserRoleBadge.tsx](src/components/common/UserRoleBadge.tsx) - Uses switch statement for color mapping
- **FormTypeBadge**: [src/components/common/FormTypeBadge.tsx](src/components/common/FormTypeBadge.tsx) - Uses switch statement for color mapping

---

## 5. AnalysisCard Component

### Location
- **File**: [src/pages/requests/components/request/components/sections/overview/Overview.tsx](src/pages/requests/components/request/components/sections/overview/Overview.tsx#L30-L47)
- **Type**: DATA-DRIVEN via statusType prop

### Color System
```tsx
interface Props {
  statusType?: 'success' | 'warning' | 'default'
}

// Icon background
statusType === 'success' ? "bg-[var(--green-1)] text-[var(--green-9)]" :
  statusType === 'warning' ? "bg-[var(--orange-1)] text-[var(--orange-9)]" :
    "bg-[var(--gray-1)] text-[var(--gray-11)]"

// Status badge
statusType === 'success' ? "bg-[var(--green-1)] text-[var(--green-9)] border-[var(--green-3)]" :
  statusType === 'warning' ? "bg-[var(--orange-1)] text-[var(--orange-9)] border-[var(--orange-3)]" :
    "bg-[var(--gray-1)] text-[var(--gray-11)] border-[var(--gray-3)]"
```

---

## Summary Table

| Component | File | Rendering | Current Colors | Type | Needs Update |
|-----------|------|-----------|-----------------|------|--------------|
| AI Score | GridView.tsx | Progress bar + % | emerald/orange/teal | HARDCODED | ✅ |
| Match Status | GridView.tsx | Badges | emerald/red/orange | HARDCODED | ✅ |
| Match Status | Form.tsx | Field display | Green only | HARDCODED | ✅ |
| Match Status | Overview.tsx | AnalysisCard | Based on statusType | DATA-DRIVEN | ⚠️ |
| Risk Level | GridView.tsx | Badges | Red/orange/emerald | HARDCODED | ✅ |
| RequestStatusBadge | Badge component | Badge | Based on status | DATA-DRIVEN | ⚠️ |
| FormStatusBadge | Badge component | Badge | Based on status | DATA-DRIVEN | ⚠️ |
| SummaryBadge | Badge component | Badge | Based on theme | DATA-DRIVEN | ⚠️ |

**Legend:**
- ✅ **Needs Update** - Contains hardcoded colors based on index cycling (not real data)
- ⚠️ **Review** - Already data-driven but verify if colors match design system

---

## Key Issues

### 1. Index-Based Color Cycling (GridView.tsx)
The GridView component cycles through colors based on item index (`index % 3`), not actual data:
- AI Score uses percentage but colors don't reflect the value
- Match Status uses fake cycling (no actual data mapping)
- Risk Level uses cycling (not real risk data)

### 2. Inconsistent Color Usage
- Same statuses rendered differently in different components
- Form.tsx always uses green for matched status
- GridView uses emerald for matched, but could be any color in the cycle

### 3. CSS Variables vs Tailwind
- GridView uses Tailwind colors (`bg-emerald-50`, `text-emerald-700`)
- AnalysisCard uses CSS variables (`bg-[var(--green-1)]`)
- Inconsistent approach across the application

---

## Recommendations

1. **Migrate GridView colors** from index-based to data-driven using actual data values
2. **Standardize color usage** across all components (use CSS variables or consistent Tailwind approach)
3. **Create a color mapping system** for Match Status and Risk Level that ties to actual data
4. **Review Badge components** to ensure they use the design system consistently
