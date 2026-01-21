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
        <section className="relative min-h-screen overflow-hidden">
            <div className="absolute inset-0">
                <HeroPolicyFlow graph={heroSampleGraph} className="bg-transparent" />
            </div>

            <div className="pointer-events-none absolute inset-0 z-10 flex items-start xl:items-center">
                <div className="w-full pt-20">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="flex flex-col text-center xl:text-left pointer-events-auto w-full xl:max-w-xl bg-muted/40 backdrop-blur-sm rounded-xl px-4 sm:px-6 py-6 sm:py-7 border border-white/10">
                            <h1 className="text-6xl xl:text-8xl font-bold tracking-tighter leading-[0.9] mb-6 reveal-up reveal-delay-1 text-ink">
                                Stop Guessing.
                                <br />
                                Start <span className="text-primary">Visualizing.</span>
                            </h1>

                            <p className="text-xl max-w-[44rem] self-center xl:self-start text-gray-600 mb-5 leading-relaxed reveal-up reveal-delay-2 font-medium">
                                The first fully client-side debugger for Azure B2C. Turn thousands of lines of XML
                                spaghetti into a pristine, navigable node graph.
                            </p>

                            <div className="text-left flex flex-col xl:items-start items-center xl:justify-start justify-center">
                                <div className="lg:space-x-4">
                                    <Link to="/b2c/policy-template">
                                        <Button size="lg" className="justify-center xl:w-auto w-full max-w-[44rem]">
                                            Preview policy code visually
                                        </Button>
                                    </Link>
                                    <Link to="/b2c/analyze-logs">
                                        <Button
                                            size="lg"
                                            variant="outline"
                                            className="justify-center xl:w-auto w-full max-w-[44rem] mt-4"
                                        >
                                            Debug your own policies
                                        </Button>
                                    </Link>
                                </div>
                                <p className="mt-4 text-sm text-gray-500 font-mono flex items-center xl:justify-start justify-center">
                                    <KeyIcon className="text-gray-500 mr-1" /> 100% Client-Side Processing. No data
                                    leaves your browser.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-background pointer-events-none" />
        </section>
    );
}

function HomePage() {
    return <HeroSection></HeroSection>;
}
