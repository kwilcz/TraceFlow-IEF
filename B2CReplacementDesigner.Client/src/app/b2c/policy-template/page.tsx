import React from 'react';
import {ReactFlowProvider} from "@xyflow/react";
import {ContentLayout} from "@/components/layout/content-layout";
import {Card, CardContent} from "@/components/ui/card";
import TabbedPolicyFlow from "@components/tabbed-policy-flow";
import {Metadata} from "next";

export const metadata: Metadata = {
    title: "Policy Flow",
}

const Page: React.FC = () => {
    return (
        <ContentLayout title="Policy Template">
            <Card>
                <CardContent className={"pt-6"}>
                    <ReactFlowProvider>
                        <TabbedPolicyFlow/>
                    </ReactFlowProvider>
                </CardContent>
            </Card>
        </ContentLayout>
    );
};

export default Page;