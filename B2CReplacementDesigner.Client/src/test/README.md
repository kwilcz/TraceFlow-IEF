# Frontend Testing Guide

This project uses **Vitest** with **React Testing Library** (RTL) for unit and integration tests.
The top-level `src/test` folder acts as the test toolkit, providing fixtures and helpers for comprehensive test coverage.

## Folder layout

- `src/test/setup.ts` – global Vitest setup (RTL matchers, etc.) configured via `vitest.config.ts`.
- `src/test/components/` – React component/unit specs (e.g., `components/nodeTypes/group-node.test.tsx`).
- `src/test/hooks/` – hook/store specs (e.g., `hooks/use-react-flow-store.test.ts`).
- `src/test/fixtures/` – reusable test fixtures (XML policies, node factories, etc.).
- `src/test/utils/` – higher level helpers (e.g., `PolicyParserFixture`) that orchestrate complex setup.

### New UI/node fixtures

`src/test/fixtures/node-fixtures.ts` now provides:

```ts
resetFixtureCounters();            // deterministic IDs across tests
createNodeFixture(options);        // generic node factory
createGroupNodeFixture(options);   // group-node specific factory
createEdgeFixture(options);        // edges with optional handles
createHandlePositions(overrides);  // { targetPosition, sourcePosition }
```

Use these factories in Vitest suites to keep setup terse and consistent.

## Writing React component tests

1. **Wrap components with `ReactFlowProvider`** (or any other provider) inside the test.
2. Prefer the shared fixture helpers for nodes/edges instead of ad-hoc literals.
3. Drive user behavior via RTL `render`, `fireEvent`, or `userEvent`.
4. Assert DOM changes or store state changes.

Example (`group-node.test.tsx`):

```tsx
const props = createGroupProps();
render(
  <ReactFlowProvider>
    <GroupNodeComponent {...props} />
  </ReactFlowProvider>
);
expect(updateNodeInternalsMock).toHaveBeenCalledWith("group-1");
```

## Running tests

```
npm run test -- run path/to/testfile.tsx
```

Or use `npm run test` for watch mode.
