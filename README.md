# TraceFlow-IEF

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.x-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646cff.svg)](https://vite.dev/)

**TraceFlow-IEF** is a powerful visualization and analysis tool for Azure AD B2C Identity Experience Framework (IEF) custom policies. Transform complex XML policies into interactive flow diagrams and debug authentication flows with ease.

## Features

- **Policy Visualization** — Convert B2C IEF custom policies into interactive, zoomable flow diagrams
- **Log Analysis** — Connect to Application Insights and trace user journey executions step-by-step
- **Entity Extraction** — Automatically parse and display Claims, Technical Profiles, User Journeys, and more
- **Offline First** — All policy processing happens client-side; no data leaves your browser

## Getting Started

### Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| **Node.js** | 22.x or higher | [Download](https://nodejs.org/) |
| **npm** | 10.x or higher | Included with Node.js |
| **Git** | Latest | [Download](https://git-scm.com/) |

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/traceflow-ief.git
   cd traceflow-ief
   ```

2. **Install dependencies**
   ```bash
   cd client
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open the application**
   
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
```

The production build will be output to the `dist/` directory. This is a static SPA that can be deployed to any static hosting service.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server at localhost:3000 |
| `npm run build` | TypeScript check + production build |
| `npm run preview` | Preview production build locally |
| `npm run test` | Run Vitest tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Run ESLint |

## Documentation

| Document | Description |
|----------|-------------|
| [Quick Start Guide](docs/QUICK_START.md) | Hands-on guide for the Log Analyzer |
| [Architecture](docs/ARCHITECTURE.md) | System architecture and data flow |
| [Logging Architecture](docs/LOGGING_ARCHITECTURE.md) | How log parsing and trace stitching works |
| [Trace Interpreters](docs/TRACE_INTERPRETERS.md) | Guide to adding new log event interpreters |

## Development

### Running Tests

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

### Code Style

The project uses:
- **ESLint** for linting
- **Prettier** for formatting (via ESLint integration)
- **TypeScript** strict mode

Run linting:
```bash
npm run lint
```

## Acknowledgments

- [Azure AD B2C Documentation](https://learn.microsoft.com/en-us/azure/active-directory-b2c/)
- [React Flow](https://reactflow.dev/) for the flow visualization library
- [Radix UI](https://www.radix-ui.com/) for accessible UI primitives
- [TanStack](https://tanstack.com/) for the router
- [Phosphor Icons](https://phosphoricons.com/) for the icon set
