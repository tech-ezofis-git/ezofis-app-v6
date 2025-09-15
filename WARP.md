# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Installation & Setup

```bash
pnpm install
```

### Development Server

```bash
pnpm dev          # Runs on port 3000
pnpm start        # Full development flow: type-check, lint, format, then dev
```

### Build & Deployment

```bash
pnpm build        # Production build with TypeScript compilation
pnpm serve        # Preview production build locally
```

### Code Quality

```bash
pnpm lint         # ESLint with auto-fix
pnpm format       # Prettier formatting
pnpm type-check   # TypeScript type checking
pnpm pre-commit   # Run all quality checks (type-check, lint, format)
```

### Testing

```bash
pnpm test         # Run Vitest tests
```

### Development Tools

```bash
pnpm scan         # Run react-scan performance analysis on localhost:3000
```

## Architecture Overview

### Tech Stack

- **Runtime**: Node.js v22, pnpm package manager
- **Frontend**: React 19 with TypeScript, built with Vite
- **UI Framework**: Mantine components with Tailwind CSS for styling
- **Routing**: TanStack Router with file-based routing
- **Data Fetching**: TanStack Query for server state management
- **State Management**: Zustand for client state, Jotai for atomic state
- **Form Handling**: Mantine Form with Zod validation
- **Icons**: Iconify React
- **Animations**: Motion (Framer Motion successor)
- **Node Editor**: ReactFlow for interactive graphs
- **Rich Text**: TipTap editor

### Project Structure

```
src/
├── api/              # API client setup (axios instance)
├── assets/           # Static assets
├── components/
│   ├── base/         # Base UI components (extended Mantine components)
│   └── common/       # Shared business components
├── constants/        # Application constants
├── hooks/            # Custom React hooks
├── layouts/          # Layout components
├── lib/              # Third-party library configurations
│   ├── mantine/      # Mantine theme and CSS variables
│   ├── tanstack-query/  # Query client setup
│   ├── tanstack-router/ # Router configuration
│   └── web-vitals/   # Performance monitoring
├── pages/            # Page components
├── routes/           # File-based routes (TanStack Router)
├── stores/           # Zustand stores
├── styles/           # Global CSS and Tailwind
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
├── env.ts            # Environment variable validation
└── main.tsx          # Application entry point
```

### Key Architectural Patterns

#### Provider Setup

The application is wrapped in multiple providers in this order:

1. `MantineProvider` - UI theme and components
2. `TanstackQueryProvider` - Server state management
3. `TanstackRouterProvider` - Client-side routing

#### Routing Architecture

- File-based routing using TanStack Router
- Routes are defined in `src/routes/` directory
- `__root.tsx` defines the root layout
- Route tree is auto-generated in `routeTree.gen.ts`
- Router context includes QueryClient for integration between routing and data fetching

#### State Management Strategy

- **Server State**: TanStack Query for API data
- **Client State**: Zustand for global application state
- **Atomic State**: Jotai for component-level state
- **Form State**: Mantine Form with Zod schemas

#### API Integration

- Centralized axios instance in `src/api/axios.ts`
- Environment-based API URL configuration via `VITE_API_URL`
- Type-safe environment variables using `@t3-oss/env-core` and Zod

#### Component Architecture

- **Base Components**: Located in `components/base/`, these extend Mantine components with custom styling
- **Common Components**: Business logic components in `components/common/`
- Components follow atomic design principles
- Custom components use Tailwind utilities with Mantine's component system

#### Development Workflow

- Branch from `develop` branch for new features
- Follow conventional commit format
- Pre-commit hooks run type checking, linting, and formatting
- Pull requests target `develop` branch

#### Code Style & Quality

- **ESLint**: Uses `@eslint/js`, TypeScript ESLint, and Perfectionist plugin for sorting
- **Prettier**: Configured with Tailwind plugin for class sorting
- **Import Organization**: Perfectionist plugin enforces consistent import/export sorting
- **Path Aliases**: `@/` maps to `./src/` for clean imports

#### Environment Configuration

- Environment variables must be prefixed with `VITE_`
- Type-safe validation using Zod schemas in `env.ts`
- Required: `VITE_API_URL` for API endpoint configuration

## Development Guidelines

### File-based Routing

- Routes are automatically generated from files in `src/routes/`
- Use `__root.tsx` for layout components
- Nested routes follow directory structure
- Route components should export a Route object using TanStack Router's API

### Component Development

- Extend Mantine components rather than building from scratch
- Use Tailwind utilities for custom styling
- Follow the established pattern in `components/base/` for reusable components
- Implement proper TypeScript interfaces for component props

### State Management

- Use TanStack Query for all server-side data
- Implement Zustand stores for complex client state
- Use React's built-in state for simple component state
- Leverage Jotai for atomic state requirements

### API Integration

- Use the configured axios instance from `src/api/axios.ts`
- Integrate with TanStack Query for data fetching
- Implement proper error handling and loading states
- Follow REST conventions for endpoint design

### Testing Strategy

- Write tests using Vitest and Testing Library
- Focus on component behavior rather than implementation details
- Test API integrations with proper mocking
- Use the existing test setup for consistency
