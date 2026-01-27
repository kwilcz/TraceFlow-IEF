"use client";

import React from 'react';

import PolicyUploadButton from "@components/policy-upload-button";
import PolicyFlow from "@/components/policy-flow";

import {type PolicyData} from "@/lib/policyParser";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import useSessionStore from "@hooks/use-session-store";
import {Button} from "@components/ui/button";
import { Trash as TrashIcon } from '@phosphor-icons/react'

const TabbedPolicyFlow: React.FC = () => {
    const {data: policyData, setData: setPolicyData} = useSessionStore<PolicyData>('policy-data')();
    const {data: activeTab, setData: setActiveTab} = useSessionStore<string>('active-tab')();

    const onParsedData = (parsedData: PolicyData) => {
        setPolicyData(parsedData);
        setActiveTab(Object.keys(parsedData.subgraphs)[0]);
    };

    return (
        // - 8 px due to padding of parent container
        <div className="flex flex-col min-h-fit h-[calc(100vh-calc(var(--navbar-height,72px))-8px)]">
            <div className={`flex flex-col ${policyData && 'grow pb-2 mb-2'}`}>

                {policyData &&
                    <Tabs value={activeTab!} onValueChange={setActiveTab} className="w-full h-full">
                        <TabsList className="px-6 w-full">
                            {policyData &&
                                Object.keys(policyData.subgraphs)
                                    .map((subgraphId) => (
                                        <TabsTrigger key={subgraphId} value={subgraphId} className="grow p-2">
                                            {subgraphId}
                                        </TabsTrigger>
                                    ))}
                        </TabsList>

                        {/* render tab contents */}
                        {policyData &&
                            Object.keys(policyData.subgraphs)
                                .map((subgraphId) => (
                                    <TabsContent key={subgraphId} value={subgraphId} className="flex-auto min-h-80">
                                        <PolicyFlow graph={policyData.subgraphs[subgraphId]} id={subgraphId}/>
                                    </TabsContent>
                                ))
                        }
                    </Tabs>
                }
            </div>
            <div className={"flex flex-row"}>
                <PolicyUploadButton onParsedData={onParsedData}/>
                {policyData &&
                    <Button className={"mx-4 animate-in fade-in zoom-in duration-300"} variant={"destructive"}
                            onClick={() => setPolicyData(null)}><TrashIcon className="mr-2 pb-0.5" size={22}/>Clear
                        Policies</Button>
                }
            </div>
        </div>
    );
};

export default TabbedPolicyFlow;