import { createFileRoute, Link } from "@tanstack/react-router";

import HeroPolicyFlow from "@/components/hero/hero-policy-flow";
import { heroSampleGraph } from "@/lib/hero/hero-sample-graph";
import { Button } from "@/components/ui/button";
import { KeyIcon } from "@phosphor-icons/react";

export const Route = createFileRoute("/")({
    component: HomePage,
});

function HeroSection() {
    return (
        <section className="h-[calc(100vh-var(--navbar-height,72px))] bg-grid-pattern text-primary/5">
            {/* Centered container */}
            <div className="h-full max-w-[110rem] mx-auto px-4 lg:px-6 grid grid-rows-[2fr_3fr] lg:grid-cols-[620px_1fr] lg:grid-rows-1 items-center">
                {/* Content Card - fixed width on desktop, full width on mobile */}
                <div className="flex items-center">
                    <div className="w-full backdrop-blur-3xl p-6 lg:p-10 rounded-xl text-center lg:text-left text-primary">
                        <h1 className="text-6xl lg:text-8xl font-bold mb-10">
                            Stop Guessing.
                            <br />
                            Start <span className="text-primary">Visualizing.</span>
                        </h1>

                        <p className="text-lg lg:text-2xl text-gray-600 leading-relaxed font-medium mb-10">
                            The first fully client-side debugger for Azure B2C. Turn thousands of lines of XML spaghetti
                            into a pristine, navigable node graph.
                        </p>

                        <div className="flex flex-col gap-3 ">
                            <Link to="/b2c/policy-graph" tabIndex={-1}>
                                <Button size="xl" className="w-full max-w-lg">
                                    Convert policy code to canvas
                                </Button>
                            </Link>
                            <Link to="/b2c/analyze-logs" tabIndex={-1}>
                                <Button size="xl" variant="outline" className="w-full max-w-lg">
                                    Debug your own policies
                                </Button>
                            </Link>
                        </div>

                        <p className="mt-4 text-sm text-gray-500 font-mono flex items-center justify-center lg:justify-start">
                            <KeyIcon className="text-gray-500 mr-1" />
                            100% Client-Side Processing. No data leaves your browser.
                        </p>
                    </div>
                </div>

                {/* Flow Canvas - purely decorative, completely non-interactive */}
                <div className="h-[calc(100%+4rem)] -my-8 w-full overflow-hidden pointer-events-none" aria-hidden="true" inert>
                    <HeroPolicyFlow graph={heroSampleGraph} />
                </div>
            </div>
        </section>
    );
}

function FeaturesMockup() {
    return (
        <section className="py-20 px-6 bg-muted/30">
            <div className="max-w-4xl mx-auto text-center">
                <h2 className="text-3xl font-bold mb-4">More Features Coming Soon</h2>
                <p className="text-muted-foreground">
                    This section will showcase additional capabilities of TraceFlow.
                </p>
            </div>
        </section>
    );
}

function HomePage() {
    return (
        <>
            <HeroSection />
            <FeaturesMockup />
        </>
    );
}
