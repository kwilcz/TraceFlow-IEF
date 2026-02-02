import { createFileRoute } from '@tanstack/react-router';
import { ContentLayout } from '@/components/layout/content-layout';
import { LogAnalyzer } from '@/components/policy-logs';
import {LogAnalyzerLanding} from "@/features/log-analyzer/log-analyzer-landing.tsx";

export const Route = createFileRoute('/b2c/analyze-logs')({
  component: AnalyzeLogsPage,
});

function AnalyzeLogsPage() {
  return (
      <LogAnalyzerLanding />
  );
}
