import React from 'react';
import type { ClaimTypeEntity } from '@/types/trust-framework-entities';
import { Badge } from '@/components/ui/badge';
import { Info } from '@phosphor-icons/react';

interface ClaimDetailsViewProps {
    claim: ClaimTypeEntity;
}

const ClaimDetailsView: React.FC<ClaimDetailsViewProps> = ({ claim }) => {
    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Claim Type</h3>
                <div className="space-y-2">
                    <InfoItem label="ID" value={claim.id} />
                    {claim.displayName && <InfoItem label="Display Name" value={claim.displayName} />}
                    {claim.dataType && <InfoItem label="Data Type" value={claim.dataType} />}
                    {claim.userInputType && <InfoItem label="User Input Type" value={claim.userInputType} />}
                </div>
            </div>

            {claim.adminHelpText && (
                <>
                    <Separator />
                    <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                            <Info className="w-3 h-3" />
                            Admin Help Text
                        </h3>
                        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
                            <p className="text-sm text-slate-300 whitespace-pre-wrap">{claim.adminHelpText}</p>
                        </div>
                    </div>
                </>
            )}

            {claim.userHelpText && (
                <>
                    <Separator />
                    <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                            <Info className="w-3 h-3" />
                            User Help Text
                        </h3>
                        <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-500/30">
                            <p className="text-sm text-blue-900 whitespace-pre-wrap">{claim.userHelpText}</p>
                        </div>
                    </div>
                </>
            )}

            {claim.mask && (
                <>
                    <Separator />
                    <InfoItem label="Mask" value={claim.mask} />
                </>
            )}

            {claim.restriction && (
                <>
                    <Separator />
                    <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2">Restrictions</h3>
                        {claim.restriction.pattern && (
                            <div className="mb-2">
                                <InfoItem label="Pattern" value={claim.restriction.pattern} />
                            </div>
                        )}
                        {claim.restriction.enumeration.length > 0 && (
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Enumeration Values</p>
                                <div className="space-y-1">
                                    {claim.restriction.enumeration.map((item, idx) => (
                                        <div key={idx} className="bg-purple-900/20 rounded p-2 border border-purple-500/30">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-purple-200 font-mono">{item.value}</span>
                                                {item.selectByDefault && (
                                                    <Badge className="bg-green-800/40 text-green-200 text-[10px]">
                                                        Default
                                                    </Badge>
                                                )}
                                            </div>
                                            {item.text !== item.value && (
                                                <p className="text-xs text-purple-300 mt-1">{item.text}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {Object.keys(claim.defaultPartnerClaimTypes).length > 0 && (
                <>
                    <Separator />
                    <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2">Default Partner Claim Types</h3>
                        <div className="space-y-1">
                            {Object.entries(claim.defaultPartnerClaimTypes).map(([protocol, partnerClaim]) => (
                                <div key={protocol} className="flex items-center justify-between space-x-2">
                                    <Badge className="bg-cyan-800/40 text-cyan-200">{protocol}</Badge>
                                    <span className="text-sm text-foreground font-mono truncate">{partnerClaim}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {claim.predicateValidationReference && (
                <>
                    <Separator />
                    <InfoItem label="Predicate Validation" value={claim.predicateValidationReference} />
                </>
            )}

            <Separator />
            <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Source Information</h3>
                <div className="space-y-2">
                    <InfoItem label="Source File" value={claim.sourceFile} />
                    <InfoItem label="Source Policy" value={claim.sourcePolicyId} />
                    <InfoItem label="Hierarchy Depth" value={String(claim.hierarchyDepth)} />
                    <InfoItem label="Is Override" value={claim.isOverride ? "Yes" : "No"} />
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

export default ClaimDetailsView;
