import React, { useMemo } from "react";
import { Node, NodeProps, Position } from "@xyflow/react";
import { Link2, Shield, ArrowRightLeft, ListChecks, KeyRound } from "lucide-react";
import { PolicyNode } from "./components/policy-node";
import {
    OrchestrationStepWithTechnicalProfile,
    ClaimReference,
    ClaimsTransformationReference,
} from "@/types/technical-profile";
import { ClickableReference } from "@/components/node-details";
import { ClaimsList, TransformationsList } from "./node-claim-components";
import type { Claim } from "./node-claim-components";

type TokenClaimMapping = {
    claim: ClaimReference;
    paramName?: string;
};

type GetClaimsNodeData = {
    label: string;
    stepOrder: number;
    orchestrationStep: OrchestrationStepWithTechnicalProfile;
    relyingPartyInputClaims?: ClaimReference[];
};

export type GetClaimsNode = Node<GetClaimsNodeData, "GetClaimsNode">;

export default function GetClaimsNode(props: NodeProps<GetClaimsNode>) {
    const { data } = props;
    const { orchestrationStep, stepOrder } = data;
    const primaryProfile = orchestrationStep.technicalProfiles?.[0];

    const tokenClaimMappings = useMemo<TokenClaimMapping[]>(() => {
        const hasProfileInputClaims = Boolean(primaryProfile?.inputClaims?.length);
        const sourceClaims = hasProfileInputClaims
            ? primaryProfile?.inputClaims ?? []
            : data.relyingPartyInputClaims ?? [];

        return sourceClaims.map((claim) => ({
            claim,
            paramName: extractQueryParamName(claim.defaultValue) ?? claim.partnerClaimType,
        }));
    }, [data.relyingPartyInputClaims, primaryProfile?.inputClaims]);

    const usingRelyingPartyInputClaims =
        (!primaryProfile?.inputClaims || primaryProfile.inputClaims.length === 0) &&
        Boolean(data.relyingPartyInputClaims?.length);

    const metadata = (primaryProfile?.metadata ?? []);

    const outputClaims = (primaryProfile?.outputClaims ?? []) as Claim[];
    const outputTransforms = (primaryProfile?.outputClaimsTransformations ?? []) as ClaimsTransformationReference[];

    const nodeTitle = primaryProfile?.displayName || data.label || "Get Claims";
    const issuerReference =
        orchestrationStep.cpimIssuerTechnicalProfileReferenceId || primaryProfile?.id || "GetClaims";

    return (
        <PolicyNode {...props} elevation="lg" className="max-w-[520px] bg-white text-slate-900">
            <PolicyNode.Badge sticky className="bg-sky-100 text-sky-900 font-semibold border border-sky-300">
                GetClaims Step
            </PolicyNode.Badge>

            <PolicyNode.Header className="gap-3">
                <PolicyNode.Icon className="bg-sky-50 text-sky-700 border border-sky-200">
                    <Link2 className="w-5 h-5" />
                </PolicyNode.Icon>
                <div className="min-w-0 space-y-1">
                    <PolicyNode.Title className="text-slate-900">{nodeTitle}</PolicyNode.Title>
                    <PolicyNode.SubTitle>
                        Step {stepOrder}: {issuerReference}
                    </PolicyNode.SubTitle>
                    <PolicyNode.Description>
                        <p>Retrieves claims from id_token_hint parameter and adds to session statebag.</p>
                    </PolicyNode.Description>
                </div>
            </PolicyNode.Header>

            <PolicyNode.Content className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <PolicyNode.Section className="bg-sky-50 shadow-sm col-span-1">
                        <div className="font-semibold text-sky-900 mb-1 flex items-center gap-1 text-sm">
                            <KeyRound className="w-4 h-4" /> id_token_hint Claims
                        </div>
                        {usingRelyingPartyInputClaims && (
                            <p className="text-[8px] tracking-wide text-slate-400">
                                Derived from Relying Party PolicyProfile
                            </p>
                        )}
                        <div className="space-y-2">
                            {tokenClaimMappings.length === 0 && (
                                <p className="text-sky-700/70 text-xs">No inbound claims configured.</p>
                            )}
                            {tokenClaimMappings.map((mapping, idx) => {
                                const { claim } = mapping;
                                return (
                                    <div
                                        key={`${claim.claimTypeReferenceId ?? idx}-${idx}`}
                                        className="flex items-center gap-2"
                                    >
                                        <span className="text-xs text-sky-800 font-mono">{getParamLabel(mapping)}</span>
                                        <ArrowRightLeft className="w-3 h-3 text-sky-400" />
                                        <ClickableReference
                                            value={claim.claimTypeReferenceId ?? "claim"}
                                            type="claim"
                                            color="cyan"
                                            required={claim.required}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </PolicyNode.Section>

                    <PolicyNode.Section className="bg-cyan-50 shadow-sm col-span-1">
                        <div className="font-semibold text-cyan-900 mb-1 flex items-center gap-1 text-sm">
                            <ListChecks className="w-3 h-3" /> Output Claims
                        </div>
                        {outputClaims.length > 0 ? (
                            <ClaimsList claims={outputClaims as ClaimReference[]} color="cyan" />
                        ) : (
                            <p className="text-cyan-700/70 text-xs">No output claims defined.</p>
                        )}
                    </PolicyNode.Section>
                </div>

                {outputTransforms.length > 0 && (
                    <TransformationsList
                        transformations={outputTransforms}
                        title="Transformations"
                        color="violet"
                        className="bg-violet-50 shadow-sm"
                    />
                )}

                {metadata.length > 0 && (
                    <PolicyNode.Section className="bg-slate-50 shadow-inner">
                        <div className="font-semibold text-slate-700 mb-1 flex items-center gap-1 text-sm">
                            <Shield className="w-3 h-3 -translate-y-[1px]" /> Metadata
                        </div>
                        <dl className="space-y-1 text-[11px] text-slate-700">
                            {metadata.map((item) => (
                                <div key={item.key} className="flex items-center justify-between gap-2">
                                    <dt className="font-medium">{item.key}</dt>
                                    <dd className="text-right font-mono text-[10px]">{item.value || "(empty)"}</dd>
                                </div>
                            ))}
                        </dl>
                    </PolicyNode.Section>
                )}
            </PolicyNode.Content>

            {primaryProfile?.sourcePolicyId && (
                <PolicyNode.Footer className="text-right text-sky-700">
                    <div>Defined in {primaryProfile.sourcePolicyId}</div>
                </PolicyNode.Footer>
            )}

            <PolicyNode.Handle type="target" position={Position.Top} className="bg-sky-400" />
            <PolicyNode.Handle type="source" position={Position.Bottom} className="bg-sky-500" />
        </PolicyNode>
    );
}

function extractQueryParamName(defaultValue?: string): string | undefined {
    if (!defaultValue) return undefined;

    const braceMatch = defaultValue.match(/\{\s*(?:QueryString)\s*:\s*([^}]+)\}/i);
    if (braceMatch?.[1]) {
        return braceMatch[1].trim();
    }

    const prefixMatch = defaultValue.match(/^(?:QueryString)\s*:\s*(.+)$/i);
    if (prefixMatch?.[1]) {
        return prefixMatch[1].trim();
    }

    return undefined;
}

const getParamLabel = (mapping: TokenClaimMapping) =>
    mapping.paramName ?? mapping.claim.partnerClaimType ?? mapping.claim.defaultValue ?? "(custom)";
