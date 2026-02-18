import {
    ArrowRightIcon,
    BugIcon,
    CloudCheckIcon,
    FileArrowUpIcon,
} from "@phosphor-icons/react";
import * as card from "@/components/ui/card";
import { Button } from "@components/ui/button.tsx";
import { Badge } from "@components/ui/badge.tsx";
import { disabledAll } from "@lib/styles.ts";

/** Props for the {@link LogAnalyzerLanding} component. */
export type LogAnalyzerLandingProps = {
    /** Called when the user clicks the "Configure" button on the API card. */
    onConnectClick: () => void;
};

/**
 * Landing page for the log analyzer — shown when no credentials are connected.
 *
 * Displays a hero section and two feature cards: "Connect to API" (active)
 * and "Upload logs manually" (coming soon).
 */
export const LogAnalyzerLanding = ({ onConnectClick }: LogAnalyzerLandingProps) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen-navbar gap-8 px-4 py-8">
            {/* ---------- Landing hero ---------- */}
            <header className="text-center space-y-6 items-center justify-center">
                <div className="bg-primary/10 w-fit h-fit p-6 rounded-full mx-auto">
                    <BugIcon weight="fill" className="size-12 text-primary" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">Start Debugging</h1>
                <h2 className="text-xl md:text-2xl text-foreground max-w-4xl">
                    Connect to your Azure AD B2C Application Insights to visualize user journeys,
                    or upload your own logs to analyze them.
                </h2>
            </header>

            {/* ---------- Landing cards ---------- */}
            <div className="grid grid-cols-2 gap-8">
                <card.Card className="p-8 gap-8 max-w-sm">
                    <card.CardHeader className="gap-3">
                        <div className="bg-primary/10 w-fit h-fit rounded-2xl p-3 mb-2">
                            <CloudCheckIcon weight="fill" className="size-8 text-primary" />
                        </div>
                        <card.CardTitle className="text-2xl">Connect to API</card.CardTitle>
                        <card.CardDescription>
                            Real-time connection to AppInsights.
                            Requires Application Insights connection details and permissions.
                        </card.CardDescription>
                    </card.CardHeader>
                    <card.CardFooter>
                        <Button variant="link" className="text-primary" onClick={onConnectClick}>
                            Configure
                            <ArrowRightIcon />
                        </Button>
                    </card.CardFooter>
                </card.Card>

                <card.Card className={`p-8 max-w-sm ${disabledAll}`} aria-disabled={true}>
                    <Badge variant="warning" className="z-10 absolute w-fit self-end top-4 right-4">Coming Soon</Badge>
                    <card.CardHeader className="gap-3">
                        <div className="bg-primary/10 w-fit h-fit rounded-2xl p-3 mb-2">
                            <FileArrowUpIcon weight="fill" className="size-8 text-primary" />
                        </div>
                        <card.CardTitle className="text-2xl">Upload logs manually</card.CardTitle>
                        <card.CardDescription>
                            JSON-formatted logs, exported from Application Insights.
                            Allows working with no network connection.
                        </card.CardDescription>
                    </card.CardHeader>
                    <card.CardFooter>
                        <Button variant="link" className="text-primary">
                            Configure
                            <ArrowRightIcon />
                        </Button>
                    </card.CardFooter>
                </card.Card>
            </div>
        </div>
    );
};