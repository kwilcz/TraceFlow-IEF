import React from "react";
import { Node, NodeProps, Position } from "@xyflow/react";
import { GitFork as Split } from "@phosphor-icons/react";
import PolicyNode from "./components/policy-node";
import type { ConditionedNodeData } from "@/types/nodes";
import { ClaimItem } from "./node-claim-components";

export type ConditionedNode = Node<ConditionedNodeData, "ConditionedNode">;

export default function ConditionedNode(props: NodeProps<ConditionedNode>) {
    const { data } = props;
    const conditionText = GetConditionText(data);
    return (
        <PolicyNode {...props} className="min-w-72 bg-orange-900/60 border-orange-500 hover:bg-orange-700">
            <div className="absolute blur-md inset-0 border-4 bg-orange-700/50 -z-10" />
            <PolicyNode.Content className="flex items-center space-x-3 justify-center space-y-0">
                <PolicyNode.Icon className="text-orange-300 bg-orange-200/10">
                    <Split />
                </PolicyNode.Icon>
                <PolicyNode.Title className="text-sm flex-1 flex space-x-2">
                    <ClaimItem className="text-white bg-orange-600/40 hover:bg-orange-500/60 max-w-fit text-sm" claim={{ claimTypeReferenceId: props.data.claimTypeReferenceId }} color="amber" />
                    <span className="flex-grow text-sm flex items-center">{conditionText}</span>
                </PolicyNode.Title>
            </PolicyNode.Content>

            <PolicyNode.Handle type="target" position={Position.Top} />
            <PolicyNode.Handle
                type="source"
                id="false"
                position={Position.Bottom}
                className="bg-red-700"
                leftOffset="25%"
            />
            <PolicyNode.Handle
                type="source"
                id="true"
                position={Position.Bottom}
                className="bg-green-700"
                leftOffset="75%"
            />
        </PolicyNode>
    );
}

const GetConditionText = (data: ConditionedNodeData) => {
    switch (data.operatorType) {
        case "ClaimsExist":
            return "has value";
        case "ClaimEquals":
            return `equals "${data.conditionValue}"`;
        default:
            return data.operatorType || "unknown condition";
    }
}