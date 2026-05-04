# EZOFIS v6

A modern web application built with the latest tools in the JavaScript ecosystem.

---

## 🚀 Tech Stack

- [Node.js v22](https://nodejs.org/en) - JavaScript runtime
- [pnpm](https://pnpm.io/) - Fast, disk space efficient package manager
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [React v19](https://react.dev/) - JavaScript framework
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Mantine](https://mantine.dev/) - React components library
- [Tanstack Router](https://tanstack.com/router/latest) - Type-safe router
- [Tanstack Query](https://tanstack.com/query/latest) - Data fetching and caching
- [Zustand](https://zustand.docs.pmnd.rs) - State management
- [Reactflow](https://reactflow.dev/) - Interactive node-based graphs

## 📦 Getting Started

To run this application:

```bash
pnpm install
pnpm start
```

## 🏗️ Building For Production

To build this application for production:

```bash
pnpm build
```

## 🧪 Testing

This project uses [Vitest](https://vitest.dev/) for testing. You can run the tests with:

```bash
pnpm test
```

## 🎨 Styling

This project uses [Tailwind CSS](https://tailwindcss.com/) for styling and [Mantine](https://mantine.dev/) for components.

## 🔧 Linting & Formatting

This project uses [eslint](https://eslint.org/) and [prettier](https://prettier.io/) for linting and formatting.

```bash
pnpm lint
pnpm format
```

## 🗺️ Routing

This project uses [TanStack Router](https://tanstack.com/router). The initial setup is a file based router. Which means that the routes are managed as files in `src/routes`.

## 📁 Project Structure

```
ezofis-v6/
├── public/               # Static assets (favicon, images, etc.)
├── src/
│   ├── assets/           # Images, fonts, and other static assets
│   ├── components/       # Reusable UI components
│   ├── hooks/            # Custom React hooks
│   ├── layouts/          # Layout components
│   ├── lib/              # Utilities, API clients, helpers
│   ├── routes/           # Route components (file-based routing)
│   ├── stores/           # Zustand stores and state management
│   ├── styles/           # Global and Tailwind CSS files
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Reusable utility functions
│   └── main.tsx          # Entry point
├── .env                  # Environment variables
├── .eslint.config.js     # ESLint configuration
├── .prettier.config.js   # Prettier configuration
├── index.html            # HTML template
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json         # TypeScript configuration
└── vite.config.ts        # Vite configuration
```

## 🧑‍💻 Contribution

We welcome contributions! Follow the steps below to contribute:

1. **Create a branch from the `develop` branch**

   ```bash
   git switch develop
   git branch branch_name
   ```

2. **Make your changes**

3. **Commit your changes** - Follow the conventional commit format:

   ```bash
   git commit -m "feat: add new component"
   ```

4. **Push your changes**

5. **Create a Pull Request**
   - Target branch: `develop`
   - Add a clear title and description
   - Reference any related issues if applicable
