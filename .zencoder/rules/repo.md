---
description: Repository Information Overview
alwaysApply: true
---

# ezofis-v6 Information

## Summary

A modern web application built with the latest tools in the JavaScript ecosystem, featuring React v19, TypeScript, Tailwind CSS, and Mantine components. The application uses Tanstack Router for routing, Tanstack Query for data fetching, and Zustand for state management.

## Structure

- **public/**: Static assets (favicon, images, etc.)
- **src/**: Main source code
  - **assets/**: Images, fonts, and other static assets
  - **components/**: Reusable UI components
  - **hooks/**: Custom React hooks
  - **layouts/**: Layout components
  - **lib/**: Utilities, API clients, helpers
  - **routes/**: Route components (file-based routing)
  - **stores/**: Zustand stores and state management
  - **styles/**: Global and Tailwind CSS files
  - **types/**: TypeScript type definitions
  - **utils/**: Reusable utility functions

## Language & Runtime

**Language**: TypeScript
**Version**: TypeScript 5.8.3
**Runtime**: Node.js v22
**Build System**: Vite 6.3.5
**Package Manager**: pnpm

## Dependencies

**Main Dependencies**:

- React v19.1.1
- Mantine v8.2.2 (UI components)
- Tanstack Router v1.130.12 (routing)
- Tanstack Query v5.84.1 (data fetching)
- Tailwind CSS v4.1.11 (styling)
- Zustand v5.0.7 (state management)
- Axios v1.11.0 (HTTP client)
- Zod v4.0.14 (schema validation)
- @xyflow/react v12.8.2 (interactive node-based graphs)

**Development Dependencies**:

- Vitest v3.2.4 (testing)
- ESLint v9.32.0 (linting)
- Prettier v3.6.2 (formatting)
- TypeScript v5.8.3 (type checking)

## Build & Installation

```bash
# Install dependencies
pnpm install

# Development server
pnpm dev

# Build for production
pnpm build

# Type checking
pnpm type-check

# Linting and formatting
pnpm lint
pnpm format

# Run all checks and start development server
pnpm start
```

## Testing

**Framework**: Vitest
**Run Command**:

```bash
pnpm test
```

## Project Entry Points

**Main Entry**: src/main.tsx
**Routing**: File-based routing in src/routes directory
**API Client**: src/api/axios.ts
