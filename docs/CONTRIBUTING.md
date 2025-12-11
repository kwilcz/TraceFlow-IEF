# Contributing to TraceFlow-IEF

Thank you for your interest in contributing to TraceFlow-IEF! This document provides guidelines and instructions for contributing.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Pull Request Process](#pull-request-process)
5. [Coding Standards](#coding-standards)
6. [Testing Guidelines](#testing-guidelines)
7. [Documentation](#documentation)

---

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please be respectful, inclusive, and constructive in all interactions.

---

## Getting Started

### Prerequisites

- **Node.js:** 18.x or later
- **npm:** 9.x or later
- **Git:** Latest version recommended

### Setup

1. **Fork the repository** on GitHub

2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR-USERNAME/TraceFlow-IEF.git
   cd TraceFlow-IEF
   ```

3. **Install dependencies:**
   ```bash
   cd B2CReplacementDesigner.Client
   npm install
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Verify tests pass:**
   ```bash
   npm run test
   ```

---

## Development Workflow

### Branch Naming

Use descriptive branch names following this pattern:

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/short-description` | `feature/add-policy-export` |
| Bug Fix | `fix/short-description` | `fix/trace-parser-null-check` |
| Documentation | `docs/short-description` | `docs/update-quick-start` |
| Refactor | `refactor/short-description` | `refactor/log-store-cleanup` |

### Workflow Steps

1. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** with descriptive commits:
   ```bash
   git add .
   git commit -m "feat: add policy export functionality"
   ```

3. **Keep your branch updated:**
   ```bash
   git fetch origin
   git rebase origin/main
   ```

4. **Push your branch:**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Open a Pull Request** on GitHub

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): short description

[optional body]

[optional footer]
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Build process or auxiliary tool changes

**Examples:**
```
feat(trace): add support for custom claims transformations
fix(log-analyzer): handle null correlation IDs gracefully
docs: update installation instructions for Windows
```

---

## Pull Request Process

### Before Submitting

- [ ] All tests pass (`npm run test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Documentation updated (if applicable)
- [ ] No unnecessary console.log statements

### PR Template

When opening a PR, please include:

1. **Description:** What does this PR do?
2. **Related Issue:** Link to any related issues
3. **Testing:** How was this tested?
4. **Screenshots:** For UI changes, include before/after screenshots

### Review Process

1. At least one maintainer must approve the PR
2. All CI checks must pass
3. No merge conflicts with `main`
4. Squash and merge is preferred for clean history

---

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Define interfaces for props and state
- Avoid `any` type - use `unknown` when needed

```typescript
// ✅ Good
interface UserFlowProps {
  flowId: string;
  onSelect: (flow: UserFlow) => void;
}

// ❌ Avoid
function processData(data: any): any { ... }
```

### React

- Use functional components with hooks
- Use descriptive component names (PascalCase)
- Keep components focused and small
- Extract reusable logic into custom hooks

```typescript
// ✅ Good
export function TraceTimeline({ steps, onStepSelect }: TraceTimelineProps) {
  const [activeStep, setActiveStep] = useState<number | null>(null);
  // ...
}

// ❌ Avoid class components
class TraceTimeline extends React.Component { ... }
```

### File Organization

```
src/
├── components/           # React components
│   ├── ui/              # Generic UI primitives
│   └── [feature]/       # Feature-specific components
├── hooks/               # Custom React hooks
├── lib/                 # Non-React utilities
├── routes/              # TanStack Router routes
├── stores/              # Zustand stores
├── styles/              # Global styles
└── types/               # TypeScript type definitions
```

### Import Order

```typescript
// 1. React and third-party imports
import { useState, useEffect } from "react";
import { useRouter } from "@tanstack/react-router";

// 2. Internal components and hooks
import { Button } from "@/components/ui/button";
import { useLogStore } from "@/stores/log-store";

// 3. Types
import type { TraceStep } from "@/types/trace";

// 4. Relative imports
import { formatTimestamp } from "./utils";
```

---

## Testing Guidelines

### Unit Tests

Write tests for:
- Utility functions
- Custom hooks
- Store actions
- Complex logic

```typescript
import { describe, it, expect } from "vitest";
import { parseTrace } from "@/lib/trace";

describe("parseTrace", () => {
  it("should return empty steps for empty input", () => {
    const result = parseTrace([]);
    expect(result.traceSteps).toHaveLength(0);
  });

  it("should handle orchestration step clips", () => {
    const logs = [createMockLog(orchestrationClips)];
    const result = parseTrace(logs);
    expect(result.traceSteps[0].stepOrder).toBe(1);
  });
});
```

### Component Tests

Test user interactions and rendered output:

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { FlowSelector } from "./flow-selector";

it("should call onSelect when flow is clicked", () => {
  const onSelect = vi.fn();
  render(<FlowSelector flows={mockFlows} onSelect={onSelect} />);
  
  fireEvent.click(screen.getByText("TestFlow"));
  
  expect(onSelect).toHaveBeenCalledWith(mockFlows[0]);
});
```

### Running Tests

```bash
# Run all tests
npm run test

# Run with coverage
npm run test -- --coverage

# Run specific file
npm run test -- trace-parser.test.ts

# Watch mode
npm run test -- --watch
```

---

## Documentation

### When to Update Docs

- Adding new features
- Changing existing behavior
- Fixing confusing or outdated documentation
- Adding examples or clarifications

### Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Project overview and quick start |
| `docs/QUICK_START.md` | Detailed getting started guide |
| `docs/ARCHITECTURE.md` | Technical architecture overview |
| `docs/LOGGING_ARCHITECTURE.md` | Log analyzer feature architecture |
| `docs/TRACE_INTERPRETERS.md` | Interpreter reference |
| `docs/CLIP_REFERENCE.md` | B2C clip type reference |

### Writing Style

- Use clear, concise language
- Include code examples where helpful
- Use tables for structured information
- Add links to related documentation

---

## Questions?

If you have questions about contributing:

1. Check existing issues and discussions
2. Open a new discussion on GitHub
3. Review existing documentation

Thank you for contributing to TraceFlow-IEF! 🎉
