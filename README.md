# TraceFlow-IEF

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.x-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646cff.svg)](https://vite.dev/)

**TraceFlow-IEF** is a powerful visualization and analysis tool for Azure AD B2C Identity Experience Framework (IEF) custom policies. Transform complex XML policies into interactive flow diagrams and debug authentication flows with ease.

## Features

- **Policy Visualization** — Convert B2C IEF custom policies into interactive, zoomable flow diagrams
- **Log Analysis** — Connect to Application Insights and trace user journey executions step-by-step
- **Entity Extraction** — Automatically parse and display Claims, Technical Profiles, User Journeys, and more
- **Dark/Light Theme** — Modern UI with system theme support
- **Offline First** — All policy processing happens client-side; no data leaves your browser

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | React 18 + TypeScript |
| **Build Tool** | Vite 6 |
| **Router** | TanStack Router |
| **State** | Zustand |
| **UI Components** | Radix UI Primitives |
| **Styling** | Tailwind CSS |
| **Flow Visualization** | React Flow (@xyflow/react) |
| **Icons** | Phosphor Icons |
| **Testing** | Vitest + React Testing Library |
| **Component Dev** | Storybook |

## Getting Started

### Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| **Node.js** | 20.x or higher | [Download](https://nodejs.org/) |
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
   cd B2CReplacementDesigner.Client
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

## Project Structure

```
B2CReplacementDesigner.Client/
├── index.html              # Vite entry point
├── vite.config.ts          # Vite configuration
├── tailwind.config.ts      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
├── public/                 # Static assets
│   └── favicon.ico
├── src/
│   ├── main.tsx            # React entry point
│   ├── routes/             # TanStack Router file-based routes
│   │   ├── __root.tsx      # Root layout with providers
│   │   ├── index.tsx       # Home page
│   │   ├── b2c/
│   │   │   ├── policy-template.tsx
│   │   │   ├── analyze-logs.tsx
│   │   │   └── claims.tsx
│   │   ├── entra.tsx
│   │   └── settings.tsx
│   ├── components/         # React components
│   │   ├── ui/             # Radix UI primitives
│   │   ├── layout/         # Layout components
│   │   ├── menu/           # Navigation menu
│   │   ├── nodeTypes/      # React Flow node types
│   │   └── policy-logs/    # Log analyzer components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility libraries
│   │   ├── policyParser/   # XML policy parsing
│   │   └── trace/          # Log trace processing
│   ├── stores/             # Zustand stores
│   ├── types/              # TypeScript type definitions
│   └── styles/             # CSS stylesheets
└── docs/                   # Documentation
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server at localhost:3000 |
| `npm run build` | TypeScript check + production build |
| `npm run preview` | Preview production build locally |
| `npm run test` | Run Vitest tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run storybook` | Start Storybook at localhost:6006 |
| `npm run build-storybook` | Build Storybook for deployment |
| `npm run lint` | Run ESLint |

## Configuration

### Environment Variables

Create a `.env.local` file in the `B2CReplacementDesigner.Client` directory:

```env
# API Configuration (optional - defaults shown)
VITE_API_BASE_URL=https://localhost:7285/api

# Feature Flags (optional)
VITE_ENABLE_DEVTOOLS=true
```

> **Note:** The application processes policies entirely client-side. The backend API is optional and only used for specific features.

## Usage

### Policy Visualization

1. Navigate to **B2C → Policy Template**
2. Upload your B2C custom policy XML files (base, extension, and relying party)
3. The tool will:
   - Parse the XML and resolve inheritance
   - Extract entities (Claims, Technical Profiles, User Journeys)
   - Generate an interactive flow diagram
4. Use mouse wheel to zoom, drag to pan, click nodes for details

### Log Analysis

1. Navigate to **B2C → Analyze Logs**
2. Enter your Application Insights credentials:
   - **Application ID**: Found in Azure Portal → Application Insights → API Access
   - **API Key**: Create one with read permissions
3. Set the timespan (e.g., `PT24H` for last 24 hours)
4. Click **Fetch Logs**
5. Select a user flow to see the step-by-step trace

### Configuring B2C for Journey Recording

Add this to your B2C policy's `TrustFrameworkExtensions.xml`:

```xml
<RelyingParty>
  <UserJourneyBehaviors>
    <JourneyInsights 
      TelemetryEngine="ApplicationInsights" 
      InstrumentationKey="YOUR_INSTRUMENTATION_KEY" 
      DeveloperMode="true" 
      ClientEnabled="true" 
      ServerEnabled="true" 
      TelemetryVersion="1.0.0" />
  </UserJourneyBehaviors>
</RelyingParty>
```

## Documentation

| Document | Description |
|----------|-------------|
| [Quick Start Guide](docs/QUICK_START.md) | Hands-on guide for the Log Analyzer |
| [Logging Architecture](docs/LOGGING_ARCHITECTURE.md) | How log parsing and trace stitching works |
| [Trace Interpreters](docs/TRACE_INTERPRETERS.md) | Guide to adding new log event interpreters |
| [Migration Plan](docs/MIGRATION_PLAN.md) | Technical migration documentation |

## Development

### Component Development with Storybook

```bash
npm run storybook
```

Storybook runs at [http://localhost:6006](http://localhost:6006) and provides an isolated environment for developing and testing UI components.

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

## Deployment

### Static Hosting (Recommended)

TraceFlow-IEF is a pure SPA that can be deployed to any static hosting service:

| Platform | Configuration |
|----------|--------------|
| **Azure Static Web Apps** | Use `staticwebapp.config.json` for SPA routing |
| **Netlify** | Add `_redirects` file: `/* /index.html 200` |
| **Vercel** | Automatic SPA detection |
| **GitHub Pages** | Use 404.html redirect |
| **AWS S3 + CloudFront** | Configure error document to index.html |

### Azure Static Web Apps

Create `staticwebapp.config.json` in the build output:

```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/assets/*", "/*.ico", "/*.svg"]
  }
}
```

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Azure AD B2C Documentation](https://learn.microsoft.com/en-us/azure/active-directory-b2c/)
- [React Flow](https://reactflow.dev/) for the flow visualization library
- [Radix UI](https://www.radix-ui.com/) for accessible UI primitives
- [TanStack](https://tanstack.com/) for the router
- [Phosphor Icons](https://phosphoricons.com/) for the icon set
