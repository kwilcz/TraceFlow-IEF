import { createFileRoute } from '@tanstack/react-router';
import { ContentLayout } from '@/components/layout/content-layout';
import { LogAnalyzer } from '@/components/policy-logs';
import {LogAnalyzerLanding} from "@/features/log-analyzer/landing.tsx";

export const Route = createFileRoute('/b2c/analyze-logs')({
  component: AnalyzeLogsPage,
});

function AnalyzeLogsPage() {
  return (
      // <LogAnalyzer>
      //   <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      //     <div className="col-span-12 lg:col-span-4">
      //       <LogAnalyzer.Settings />
      //     </div>
      //     <div className="col-span-12 lg:col-span-8">
      //       <LogAnalyzer.Table />
      //     </div>
      //     <div className="col-span-12">
      //       <LogAnalyzer.TraceTimeline />
      //     </div>
      //     <div className="col-span-12">
      //       <LogAnalyzer.Viewer />
      //     </div>
      //   </div>
      // </LogAnalyzer>
      <LogAnalyzerLanding />
  );
}
