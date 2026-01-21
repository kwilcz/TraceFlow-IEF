import React, { useMemo } from "react";
import { Node, NodeProps, Position } from "@xyflow/react";
import { TechnicalProfile } from "@/types/technical-profile";
import { getProviderBadgeColor } from "@/types/technical-profile";
import { ArrowLeft, ArrowRight, FlowArrow as Workflow, ChartBar as BarChart3, FloppyDisk as Save, Sparkle as Sparkles, FloppyDisk as SaveAll } from "@phosphor-icons/react";
import PolicyNode from "./components/policy-node";
import { ClaimsList, DisplayClaimsList, DisplayClaimsSection, TransformationsList } from "./node-claim-components";
import { usePolicyStore } from "@/stores/policy-store";
import { getEntity, TechnicalProfileEntity } from "@/types/trust-framework-entities";

export type ClaimsExchangeNode = Node<
    {
        label: string;
        claimsExchanges: string[];
        technicalProfiles?: TechnicalProfile[];
        providerName?: string;
        stepOrder?: number;
        details?: { stepOrder?: number };
    },
    "ClaimsExchangeNode"
>;

export default function ClaimsExchangeNode(props: NodeProps<ClaimsExchangeNode>) {
    const { data } = props;
    const entities = usePolicyStore((state) => state.entities);

    // Get primary technical profile from entities
    const primaryProfileId = data.claimsExchanges?.[0];
    const primaryProfile = (primaryProfileId && entities 
        ? getEntity(entities, 'TechnicalProfile', primaryProfileId) as TechnicalProfileEntity | undefined
        : undefined);

    const fallbackProfile = useMemo(() => {
        if (!data.technicalProfiles || data.technicalProfiles.length === 0) return undefined;
        if (primaryProfileId) {
            return data.technicalProfiles.find((p) => p.id === primaryProfileId) ?? data.technicalProfiles[0];
        }
        return data.technicalProfiles[0];
    }, [data.technicalProfiles, primaryProfileId]);

    const displayProfile = primaryProfile ?? fallbackProfile;

    // Extract data for display
    const providerName = displayProfile?.providerName || data.providerName || "Unknown";
    const providerColor = getProviderBadgeColor(providerName);

    const inheritanceChain = useMemo(() => {
        if (!primaryProfile?.inheritanceChain) return null;

        const chain: Set<string> = new Set();
        primaryProfile.inheritanceChain.forEach((item) => {
            chain.add(item.profileId);
        });

        return chain.size > 0 ? Array.from(chain).join(" → ") : null;
    }, [primaryProfile]);

    const inputClaims = useMemo(() => {
        return primaryProfile?.inputClaims || [];
    }, [primaryProfile]);

    const outputClaims = useMemo(() => {
        return primaryProfile?.outputClaims || [];
    }, [primaryProfile]);

    const persistedClaims = useMemo(() => {
        return primaryProfile?.persistedClaims || [];
    }, [primaryProfile]);

    const inputTransformations = useMemo(() => {
        return primaryProfile?.inputClaimsTransformations || [];
    }, [primaryProfile]);

    const outputTransformations = useMemo(() => {
        return primaryProfile?.outputClaimsTransformations || [];
    }, [primaryProfile]);

    const displayClaims = useMemo(() => {
        return primaryProfile?.displayClaims || [];
    }, [primaryProfile]);

    const highestHierarchyFile =
        primaryProfile?.inheritanceChain?.[primaryProfile.inheritanceChain.length - 1]?.policyId;
    const stepLabel = data.stepOrder ? `Step ${data.stepOrder}` : "ClaimsExchange";

    // Use DisplayName for title, fall back to label
    const nodeTitle = displayProfile?.displayName || data.label;

    // Debug logging
    if (!primaryProfile && !fallbackProfile && data.claimsExchanges?.length > 0) {
        console.log("ClaimsExchangeNode missing profile data:", {
            nodeId: props.id,
            label: data.label,
            claimsExchanges: data.claimsExchanges,
            hasTechnicalProfiles: !!data.technicalProfiles,
            technicalProfileCount: data.technicalProfiles?.length || 0,
        });
    }

    return (
        <PolicyNode {...props} elevation="md" className="w-96 bg-cyan-900/80 border-cyan-500 hover:bg-cyan-700">
            <PolicyNode.Badge className="bg-cyan-100 text-cyan-900 font-semibold border border-cyan-300" sticky>
                ClaimsExchange Step
            </PolicyNode.Badge>

            <PolicyNode.Header>
                <PolicyNode.Icon className="text-cyan-900 bg-cyan-200/40">
                    <Workflow />
                </PolicyNode.Icon>
                <div className="min-w-0">
                    <PolicyNode.Title>{nodeTitle}</PolicyNode.Title>
                    <PolicyNode.SubTitle>
                        {stepLabel}: {displayProfile?.id ?? primaryProfileId ?? ""}
                    </PolicyNode.SubTitle>
                    <PolicyNode.Badge className={`${providerColor} w-fit`}>{providerName}</PolicyNode.Badge>
                </div>
            </PolicyNode.Header>

            {/* Details Content */}
            {primaryProfile && (
                <PolicyNode.Content>
                    {/* Inheritance */}
                    {primaryProfile.inheritanceChain.length > 1 && inheritanceChain && (
                        <PolicyNode.Section>
                            <div className="text-purple-300/80 font-semibold flex items-center gap-1 mb-1">
                                <BarChart3 className="size-3" />
                                <span>Inheritance Chain</span>
                            </div>
                            <div className="text-slate-300 font-mono text-[10px]">{inheritanceChain}</div>
                        </PolicyNode.Section>
                    )}

                    {inputClaims.length > 0 && (
                        <PolicyNode.Section className="bg-blue-900/20">
                            <div className={`text-blue-300/80 font-semibold flex items-center gap-1 mb-1`}>
                                <ArrowLeft className="size-3" />
                                <span>Input Claims</span>
                            </div>
                            <ClaimsList claims={inputClaims} color="blue" />
                        </PolicyNode.Section>
                    )}

                    {displayClaims.length > 0 && (
                        <PolicyNode.Section className="bg-amber-900/20">
                            <div className={`text-amber-300/80 font-semibold flex items-center gap-1 mb-1`}>
                                <Sparkles className="size-3" />
                                <span>Display Claims</span>
                            </div>
                            <DisplayClaimsList claims={displayClaims} />
                        </PolicyNode.Section>
                    )}

                    {outputClaims.length > 0 && (
                        <PolicyNode.Section className="bg-green-900/20">
                            <div className={`text-green-300/80 font-semibold flex items-center gap-1 mb-1`}>
                                <ArrowRight className="size-3" />
                                <span>Output Claims</span>
                            </div>
                            <ClaimsList claims={outputClaims} color="green" />
                        </PolicyNode.Section>
                    )}

                    {persistedClaims.length > 0 && (
                        <PolicyNode.Section className="bg-cyan-900/20">
                            <div className={`text-cyan-300/80 font-semibold flex items-center gap-1 mb-1`}>
                                <SaveAll className="size-3" />
                                <span>Persisted Claims</span>
                            </div>
                            <ClaimsList claims={persistedClaims} color="cyan" />
                        </PolicyNode.Section>
                    )}

                    {/* Input Transformations */}
                    <TransformationsList
                        transformations={inputTransformations}
                        title="Input Transforms"
                        color="violet"
                    />

                    {/* Output Transformations */}
                    <TransformationsList
                        transformations={outputTransformations}
                        title="Output Transforms"
                        color="amber"
                    />
                </PolicyNode.Content>
            )}

            {/* Source File Footer */}
            {highestHierarchyFile && (
                <PolicyNode.Footer>
                    <div className="text-right truncate">
                        <span className="text-[10px] text-purple-400/80 font-mono bg-slate-800/50 px-2 py-0.5 rounded truncate">
                            {highestHierarchyFile}
                        </span>
                    </div>
                </PolicyNode.Footer>
            )}

            {/* Handles */}
            <PolicyNode.Handle type="target" position={Position.Top} />
            <PolicyNode.Handle type="source" position={Position.Bottom} />
        </PolicyNode>
    );
}
