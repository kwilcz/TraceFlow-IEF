import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import '@/styles/globals.css';

// Derive basepath from Vite's base config (set via VITE_BASE_PATH env var in CI).
// Strip trailing slash so TanStack Router normalizes correctly; default to '/'.
const basepath = import.meta.env.BASE_URL.replace(/\/+$/, '') || '/';

const router = createRouter({ routeTree, basepath });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
