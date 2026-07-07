---
trigger: always_on
---

# Antigravity IDE: Core Architecture & UI Manifesto (Source of Truth)

Antigravity IDE is built to maximize developer throughput and minimize context-switching. The UI must feel **“weightless”**: no layered UI, only contextual layout shifts, inline expansion, and composable modules that snap together cleanly.

This document is the **single source of truth** for UI behavior, component architecture, styling, and module boundaries.

---

## 1. Flat-Focus UI: The Antigravity Rule (No-Popup Policy)

### Forbidden UI Patterns

These are **not allowed** under any circumstances:

- **Modals**
- **Drawers / Sheets**
- **Popovers**
- **Lightboxes**
- Any overlay that steals focus or blocks the layout behind it.

### Allowed UI Patterns

- **Toasts:** Ephemeral feedback only (the only sanctioned floating UI).
- **Inline Alerts:** Critical blocking validation embedded directly in the layout.
- **Inline Expansion:** Panels expand/collapse by shifting the layout (never overlaying it).
- **Contextual Composition:** New UI appears by composing adjacent modules, not stacking layers.

> **Mandate:** If a design “wants a modal,” translate it into **inline expansion** or **contextual layout reflow**.

---

## 2. Design System & Styling Rules

### Tailwind Only, Token Only

All styling must use Tailwind classes mapped to project tokens from `/styles`.

- **No arbitrary hex codes.**
- **No inline styles.**
- **No one-off colors.**

**Approved Token Examples:**

- **Surface:** `bg-surface-primary`, `bg-surface-secondary`
- **Actions:** `text-accent-primary`, `bg-accent-soft`
- **Feedback:** `text-error-main`, `bg-success-subtle`

### Animation Is a First-Class Feature

Every interaction must feel fluid and intentional. Animation is **not optional**.

- **Entrance:** `animate-in fade-in slide-in-from-left-4 duration-300`
- **Interaction:** `hover:bg-opacity-80 active:scale-95 transition-all`
- **Feedback / Exit:** `animate-out zoom-out-95`

> **Mandate:** Any component with user interaction must implement a **visual hover state**, an **active/tap state**, and an **entrance/exit animation**.

---

## 3. Component Architecture: SOLID + Composition-First

Antigravity components are designed for scalability: small units, composable primitives, and predictable extension points.

### S — Single Responsibility

One file, one reason to change.

- `FileIcon.tsx`: Icon logic only.
- `FileLabel.tsx`: Truncation/typography only.
- `FileRow.tsx`: Layout composition only.
  > **Mandate:** If a component owns two concerns, split it.

### O — Open/Closed via Composition

Components must be extensible through composition, not edits.

- Prefer `children`, `slots`, and “headless” patterns.
- Avoid boolean prop explosions (`hasFoo`, `enableBar`, `showBaz`).
  > **Mandate:** Extension happens by adding modules, not modifying existing ones.

### L — Liskov Substitution

Custom components must extend native HTML semantics.

- `IDEButton` must accept all native button props.
- `IDEInput` must accept all native input props.
  > **Mandate:** No custom wrapper should reduce the capabilities of its native counterpart.

### I — Interface Segregation

Avoid huge “context objects” passed as props.

- Use focused props.
- Use specialized hooks for narrow responsibilities.
  > **Mandate:** Data contracts must be lean, explicit, and feature-scoped.

### D — Dependency Inversion

UI depends on abstractions, not implementations.

- Use providers/interfaces for cross-cutting concerns (notifications, telemetry, theming).
  > **Mandate:** Any cross-app behavior must be accessed via an interface (e.g., `NotificationProvider`).

---

## 4. Modularization: Everything Is a Module

Antigravity’s UI is a set of swappable, independently testable modules.

### Module Boundary Rules

1. A module owns **one domain slice** (e.g., “File Tree”, “Editor Tabs”).
2. Modules expose clean **public APIs** (props, events, types).
3. Modules **do not reach across boundaries** (no grabbing internals of neighbors).
4. Modules remain **replaceable** without rewriting unrelated code.

### Folder Strategy

- `components/primitives/` — Buttons, inputs, text, icons.
- `components/layout/` — Stacks, grids, resizable panes, split views.
- `components/feedback/` — Toasts, inline alerts, status banners.
- `features/<feature-name>/` — Feature modules composed from primitives/layout.
- `providers/` — Notification provider, keyboard routing, telemetry, etc.
- `styles/` — Tokens and Tailwind mappings.

---

## 5. The Only Floating UI: Toasts

Toasts are the only allowed “floating” element.

### Toast Requirements

- Ephemeral and non-blocking.
- No actions requiring deep user decision-making.
- Triggered via abstraction (provider/hook), never hardcoded.
- **Must** be animated in/out.

```tsx
// components/feedback/Toast.tsx
export const Toast = ({ message, type, icon: Icon }) => (
  <div className='animate-in slide-in-from-bottom-10 fade-in fixed right-6 bottom-6 flex items-center gap-3 rounded-lg border border-accent-soft bg-surface-primary p-4 shadow-xl duration-500'>
    {Icon && <Icon className='h-5 w-5 animate-pulse text-accent-primary' />}
    <span className='text-sm font-medium'>{message}</span>
  </div>
)
```
