import { createFileRoute } from '@tanstack/react-router';
import { ContentLayout } from '@/components/layout/content-layout';
import { Card, CardContent, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  return (
      <Card>
        <CardContent className="pt-6">
          <CardTitle>placeholder</CardTitle>
        </CardContent>
      </Card>
  );
}
