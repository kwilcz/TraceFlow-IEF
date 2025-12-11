import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/entra')({
  component: EntraPage,
});

function EntraPage() {
  return <p>Entra page</p>;
}
