"use client";

import { ContentLayout } from "@/components/layout/content-layout";
import { LogAnalyzer } from "@/components/policy-logs";

export default function AnalyzeLogsPage() {
    return (
        <ContentLayout title="Analyze Logs">
            <LogAnalyzer>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    <div className="col-span-12 lg:col-span-4">
                        <LogAnalyzer.Settings />
                    </div>
                    <div className="col-span-12 lg:col-span-8">
                        <LogAnalyzer.Table />
                    </div>
                    {/* Trace Timeline - Shows above log viewer when logs are available */}
                    <div className="col-span-12">
                        <LogAnalyzer.TraceTimeline />
                    </div>
                    {/* Statebag Inspector - Shows detailed state at selected step */}
                    {/* <div className="col-span-12">
                        <LogAnalyzer.StatebagInspector />
                    </div> */}
                    <div className="col-span-12">
                        <LogAnalyzer.Viewer />
                    </div>
                </div>
            </LogAnalyzer>
        </ContentLayout>
    );
}
