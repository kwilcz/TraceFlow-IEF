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
        // 136 -> 56px for header + 2*16px main padding + 2*24px parent padding
        // 106 -> 56px for header + 2*16px main padding, no parent padding
        <div className="flex flex-col min-h-fit lg:h-[calc(100dvh_-_136px)] h-[calc(100dvh_-_106px)]">
            <div className={`flex flex-col ${policyData && 'flex-grow pb-2 mb-2'}`}>

                {policyData &&
                    <Tabs value={activeTab!} onValueChange={setActiveTab}
                          className="flex flex-col flex-grow w-full h-full">
                        <TabsList className="mb-4 flex-wrap h-min">
                            {policyData &&
                                Object.keys(policyData.subgraphs)
                                    .map((subgraphId) => (
                                        <TabsTrigger key={subgraphId} value={subgraphId} className="grow">
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