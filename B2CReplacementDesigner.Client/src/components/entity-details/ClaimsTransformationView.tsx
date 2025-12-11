import React from 'react';
import type { ClaimsTransformationEntity } from '@/types/trust-framework-entities';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Settings, Database } from 'lucide-react';
import { ClaimItem } from '../nodeTypes/node-claim-components';

interface ClaimsTransformationViewProps {
    transformation: ClaimsTransformationEntity;
}

const ClaimsTransformationView: React.FC<ClaimsTransformationViewProps> = ({ transformation }) => {
    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Claims Transformation</h3>
                <div className="space-y-2">
                    <InfoItem label="ID" value={transformation.id} />
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground flex-shrink-0">Transformation Method</span>
                        <Badge className="bg-purple-800/40 text-purple-200 font-mono">
                            {transformation.transformationMethod}
                        </Badge>
                    </div>
                </div>
            </div>

            {transformation.inputClaims.length > 0 && (
                <>
                    <Separator />
                    <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                            <Database className="w-3 h-3" />
                            Input Claims ({transformation.inputClaims.length})
                        </h3>
                        <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-500/30">
                            <div className="space-y-2">
                                {transformation.inputClaims.map((claim, idx) => (
                                    <div key={idx} className="flex items-center justify-between">
                                        <ClaimItem claim={claim} color="blue" />
                                        {claim.partnerClaimType && (
                                            <Badge className="bg-cyan-800/40 text-cyan-200 text-[10px] ml-2">
                                                {claim.partnerClaimType}
                                            </Badge>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {transformation.inputParameters.length > 0 && (
                <>
                    <Separator />
                    <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                            <Settings className="w-3 h-3" />
                            Input Parameters ({transformation.inputParameters.length})
                        </h3>
                        <div className="bg-amber-900/20 rounded-lg p-3 border border-amber-500/30">
                            <div className="space-y-2">
                                {transformation.inputParameters.map((param, idx) => (
                                    <div key={idx} className="bg-amber-800/30 rounded p-2">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm text-amber-200 font-mono">{param.id}</span>
                                            <Badge className="bg-orange-800/40 text-orange-200 text-[10px]">
                                                {param.dataType}
                                            </Badge>
                                        </div>
                                        <div className="text-xs text-amber-300 font-mono bg-amber-900/40 px-2 py-1 rounded">
                                            {param.value}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {transformation.outputClaims.length > 0 && (
                <>
                    <Separator />
                    <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                            <ArrowRight className="w-3 h-3" />
                            Output Claims ({transformation.outputClaims.length})
                        </h3>
                        <div className="bg-green-900/20 rounded-lg p-3 border border-green-500/30">
                            <div className="space-y-2">
                                {transformation.outputClaims.map((claim, idx) => (
                                    <div key={idx} className="flex items-center justify-between">
                                        <ClaimItem claim={claim} color="green" />
                                        {claim.partnerClaimType && (
                                            <Badge className="bg-cyan-800/40 text-cyan-200 text-[10px] ml-2">
                                                {claim.partnerClaimType}
                                            </Badge>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}

            <Separator />
            <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Source Information</h3>
                <div className="space-y-2">
                    <InfoItem label="Source File" value={transformation.sourceFile} />
                    <InfoItem label="Source Policy" value={transformation.sourcePolicyId} />
                    <InfoItem label="Hierarchy Depth" value={String(transformation.hierarchyDepth)} />
                    <InfoItem label="Is Override" value={transformation.isOverride ? "Yes" : "No"} />
                </div>
            </div>
        </div>
    );
};

const InfoItem: React.FC<{ label: string; value: string }> = ({ label, value }) => {
    return (
        <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground flex-shrink-0">{label}</span>
            <span className="text-sm text-foreground font-mono truncate text-right">{value}</span>
        </div>
    );
};

const Separator: React.FC = () => {
    return <div className="border-t border-border" />;
};

export default ClaimsTransformationView;