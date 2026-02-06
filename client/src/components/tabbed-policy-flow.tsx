"use client";

import React from 'react';

import PolicyUploadLanding from "@components/policy-upload-landing";
import PolicyFlow from "@/components/policy-flow";

import { type PolicyData } from "@/lib/policyParser";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useSessionStore from "@hooks/use-session-store";
import { Button } from "@components/ui/button";
import { Plus as PlusIcon } from '@phosphor-icons/react';

const TabbedPolicyFlow: React.FC = () => {
    const { data: policyData, setData: setPolicyData } = useSessionStore<PolicyData>('policy-data')();
    const { data: activeTab, setData: setActiveTab } = useSessionStore<string>('active-tab')();

    const onParsedData = (parsedData: PolicyData) => {
        setPolicyData(parsedData);
        setActiveTab(Object.keys(parsedData.subgraphs)[0]);
    };

    const handleClearPolicies = () => {
        setPolicyData(null);
        setActiveTab(null);
    };

    if (!policyData) {
        return <PolicyUploadLanding onParsedData={onParsedData} />;
    }

    return (
        <div className="flex flex-col min-h-fit h-[calc(100vh-var(--navbar-height,72px)-8px)]">
            <div className="flex flex-col grow pb-2 mb-2">
                <Tabs value={activeTab!} onValueChange={setActiveTab} className="w-full h-full">
                    <TabsList className="mx-4">
                        {Object.keys(policyData.subgraphs).map((subgraphId) => (
                            <TabsTrigger key={subgraphId} value={subgraphId} className="grow">
                                {subgraphId}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {Object.keys(policyData.subgraphs).map((subgraphId) => (
                        <TabsContent key={subgraphId} value={subgraphId} className="flex-auto min-h-80">
                            <PolicyFlow graph={policyData.subgraphs[subgraphId]} id={subgraphId} />
                        </TabsContent>
                    ))}
                </Tabs>
            </div>

            <div className="flex flex-row gap-2 px-4 pb-2">
                <Button
                    variant="secondary"
                    className="animate-in fade-in zoom-in duration-300"
                    onClick={handleClearPolicies}
                >
                    <PlusIcon className="mr-2" size={20} />
                    Upload Different Policies
                </Button>
            </div>
        </div>
    );
};

export default TabbedPolicyFlow;