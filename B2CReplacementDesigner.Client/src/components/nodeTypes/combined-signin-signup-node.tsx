import React, { useMemo } from "react";
import { Node, NodeProps, Position } from "@xyflow/react";
import { UserIcon, Workflow, ArrowRight, LogIn, ShieldCheck } from "lucide-react";
import { PolicyNode } from "./components/policy-node";
import { OrchestrationStepWithTechnicalProfile } from "@/types/technical-profile";
import { ClaimsList, DisplayClaimsList, TransformationsList } from "./node-claim-components";

export type CombinedSignInAndSignUpNode = Node<
    {
        label: string;
        orchestrationStep: OrchestrationStepWithTechnicalProfile;
        stepOrder: number;
    },
    "CombinedSignInAndSignUpNode"
>;

export default function CombinedSignInAndSignUpNode(props: NodeProps<CombinedSignInAndSignUpNode>) {
    const { data } = props;
    const { orchestrationStep, stepOrder } = data;

    // Extract primary technical profile (usually the self-asserted profile)
    const primaryProfile = orchestrationStep.technicalProfiles?.[0];

    // Extract claims exchanges
    const claimsExchanges = orchestrationStep.claimsExchanges || [];

    // Memoize claims provider selections to avoid useMemo dependency issues
    const claimsProviderSelections = useMemo(
        () => orchestrationStep.claimsProviderSelections || [],
        [orchestrationStep.claimsProviderSelections]
    );

    // Separate validation and target selections
    const validationSelections = useMemo(
        () => claimsProviderSelections.filter((s) => s.validationClaimsExchangeId),
        [claimsProviderSelections]
    );

    const targetSelections = useMemo(
        () => claimsProviderSelections.filter((s) => s.targetClaimsExchangeId),
        [claimsProviderSelections]
    );

    // Extract input and display claims
    const inputClaims = useMemo(() => {
        return primaryProfile?.inputClaims || [];
    }, [primaryProfile]);

    const displayClaims = useMemo(() => {
        return primaryProfile?.displayClaims || [];
    }, [primaryProfile]);

    const outputClaims = useMemo(() => {
        return primaryProfile?.outputClaims || [];
    }, [primaryProfile]);

    const outputTransformations = useMemo(() => {
        return primaryProfile?.outputClaimsTransformations || [];
    }, [primaryProfile]);

    const stepLabel = stepOrder ? `Step ${stepOrder}` : "CombinedSignInAndSignUp";
    const nodeTitle = primaryProfile?.displayName || data.label;

    // Get the highest hierarchy file from inheritance chain
    const highestHierarchyFile = useMemo(() => {
        if (!primaryProfile?.inheritance) return undefined;
        const directParents = primaryProfile.inheritance.directParents;
        return directParents.length > 0 ? directParents[directParents.length - 1]?.policyId : undefined;
    }, [primaryProfile]);

    return (
        <PolicyNode
            {...props}
            elevation="lg"
            className="w-96 border-2 bg-sky-100 border-gray-400 shadow-xl shadow-gray-400/50"
        >
            <PolicyNode.Badge className="bg-gradient-to-r from-blue-100 to-purple-100 text-gray-800 font-bold" sticky>
                🔐 Sign In & Sign Up Page
            </PolicyNode.Badge>

            <PolicyNode.Header>
                <PolicyNode.Icon className="text-gray-800 bg-blue-100 shadow-lg">
                    <ShieldCheck className="size-5" />
                </PolicyNode.Icon>
                <div>
                    <PolicyNode.Title className="text-gray-800">{nodeTitle}</PolicyNode.Title>
                    <PolicyNode.SubTitle className="text-gray-600">
                        {stepLabel}: {primaryProfile?.id || "CombinedSignInAndSignUp"}
                    </PolicyNode.SubTitle>
                </div>
            </PolicyNode.Header>

            <PolicyNode.Content>
                {/* Internal Validation Flows */}
                {validationSelections.length > 0 && (
                    <PolicyNode.Section className="bg-blue-50 border border-blue-200">
                        <div className="text-blue-800 font-semibold flex items-center gap-2 mb-2">
                            <LogIn className="size-4" />
                            <span>Internal Sign-In Flows</span>
                        </div>
                        <div className="space-y-1.5">
                            {validationSelections.map((selection, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-blue-100 rounded px-2 py-1">
                                    <span className="text-[10px] text-blue-600 uppercase font-bold">Local</span>
                                    <span className="text-blue-900 text-xs font-mono">
                                        {selection.validationClaimsExchangeId}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </PolicyNode.Section>
                )}

                {/* External Provider Flows */}
                {targetSelections.length > 0 && (
                    <PolicyNode.Section className="bg-purple-50 border border-purple-200">
                        <div className="text-purple-800 font-semibold flex items-center gap-2 mb-2">
                            <Workflow className="size-4" />
                            <span>External Identity Providers</span>
                        </div>
                        <div className="space-y-1.5">
                            {targetSelections.map((selection, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center gap-2 bg-purple-100 rounded px-2 py-1 relative"
                                >
                                    <span className="text-[10px] text-purple-600 uppercase font-bold">External</span>
                                    <span className="text-purple-900 text-xs font-mono">
                                        {selection.targetClaimsExchangeId}
                                    </span>
                                    {/* Dedicated handle for this external provider */}
                                    <PolicyNode.Handle
                                        type="source"
                                        position={Position.Right}
                                        id={`${props.id}-target-${selection.targetClaimsExchangeId}`}
                                        className="!bg-purple-500 !border-purple-300 !w-3 !h-3 !right-[-6px]"
                                    />
                                </div>
                            ))}
                        </div>
                    </PolicyNode.Section>
                )}

                {/* Claims Exchanges */}
                {claimsExchanges.length > 0 && (
                    <PolicyNode.Section className="bg-green-50">
                        <div className="text-green-800 font-semibold flex items-center gap-1 mb-1">
                            <Workflow className="size-3" />
                            <span>Claims Exchanges</span>
                        </div>
                        <div className="space-y-1">
                            {claimsExchanges.map((exchange, idx) => (
                                <div key={idx} className="space-y-0.5">
                                    <div className="text-green-800 text-xs font-semibold">{exchange.id}</div>
                                    <div className="flex items-center gap-1 ml-2">
                                        <ArrowRight className="size-2.5 text-green-600" />
                                        <span className="text-green-700 text-[10px] font-mono">
                                            {exchange.technicalProfileReferenceId}
                                        </span>
                                    </div>
                                    {exchange.technicalProfile && (
                                        <div className="ml-4 text-[9px] text-green-600">
                                            {exchange.technicalProfile.providerName || "Unknown Provider"}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </PolicyNode.Section>
                )}

                {/* Input Claims */}
                {inputClaims.length > 0 && (
                    <PolicyNode.Section className="bg-blue-50">
                        <div className="text-blue-800 font-semibold flex items-center gap-1 mb-1">
                            <ArrowRight className="size-3 rotate-180" />
                            <span>Input Claims</span>
                        </div>
                        <ClaimsList claims={inputClaims} color="blue" />
                    </PolicyNode.Section>
                )}

                {/* Display Claims */}
                {displayClaims.length > 0 && (
                    <PolicyNode.Section className="bg-amber-50">
                        <div className="text-amber-800 font-semibold flex items-center gap-1 mb-1">
                            <UserIcon className="size-3" />
                            <span>Display Claims</span>
                        </div>
                        <DisplayClaimsList claims={displayClaims} />
                    </PolicyNode.Section>
                )}

                {/* Output Claims */}
                {outputClaims.length > 0 && (
                    <PolicyNode.Section className="bg-green-50">
                        <div className="text-green-800 font-semibold flex items-center gap-1 mb-1">
                            <ArrowRight className="size-3" />
                            <span>Output Claims</span>
                        </div>
                        <ClaimsList claims={outputClaims} color="green" />
                    </PolicyNode.Section>
                )}

                {/* Output Transformations */}
                <TransformationsList transformations={outputTransformations} title="Output Transforms" color="amber" />
            </PolicyNode.Content>

            {/* Source File Footer */}
            {highestHierarchyFile && (
                <PolicyNode.Footer>
                    <div className="text-right truncate">
                        <span className="text-[10px] text-purple-600 font-mono bg-gray-200 px-2 py-0.5 rounded truncate">
                            {highestHierarchyFile}
                        </span>
                    </div>
                </PolicyNode.Footer>
            )}

            {/* Input Handle */}
            <PolicyNode.Handle type="target" position={Position.Top} />

            {/* Main Output Handle */}
            <PolicyNode.Handle type="source" position={Position.Bottom} />
        </PolicyNode>
    );
}
