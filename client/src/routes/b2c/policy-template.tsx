import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { ContentLayout } from '@/components/layout/content-layout';
import { Card, CardContent } from '@/components/ui/card';

const TabbedPolicyFlow = lazy(() => import('@components/tabbed-policy-flow'));

export const Route = createFileRoute('/b2c/policy-template')({
  component: PolicyTemplatePage,
});

function PolicyTemplatePage() {
  return (
    <ContentLayout title="Policy Template">
      <Card>
        <CardContent className="pt-6">
          <ReactFlowProvider>
            <Suspense fallback={<div className="h-96 flex items-center justify-center">Loading policy flow...</div>}>
              <TabbedPolicyFlow />
            </Suspense>
          </ReactFlowProvider>
        </CardContent>
      </Card>
    </ContentLayout>
  );
}
