/* eslint-disable @typescript-eslint/no-explicit-any */

import React from 'react';
import { X, FileCode, GitBranch, ArrowsLeftRight as ArrowRightLeft, Key, Database } from '@phosphor-icons/react';
import { TechnicalProfile } from '@/types/technical-profile';
import { ProtocolBadges } from '@/components/provider-badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface TechnicalProfileDetailsSidebarProps {
    profile: TechnicalProfile | null;
    onClose: () => void;
}

export function TechnicalProfileDetailsSidebar({ profile, onClose }: TechnicalProfileDetailsSidebarProps) {
    if (!profile) return null;

    return (
        <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl border-l border-gray-200 z-50">
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="p-4 border-b border-gray-200">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <FileCode className="w-5 h-5" />
                                <h2 className="text-lg font-semibold">{profile.displayName || profile.id}</h2>
                            </div>
                            <ProtocolBadges protocol={profile.protocol} className="mb-2" />
                        </div>
                        <Button variant="ghost" size="sm" onClick={onClose}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                    {profile.description && (
                        <p className="text-sm text-gray-600 mt-2">{profile.description}</p>
                    )}
                </div>

                {/* Content */}
                <ScrollArea className="flex-1 p-4">
                    <div className="space-y-6">
                        {/* Protocol Info */}
                        {profile.protocol && (
                            <Section title="Protocol">
                                <div className="text-sm">
                                    <div className="font-medium">{profile.protocol.name}</div>
                                    {profile.protocol.handler && (
                                        <div className="text-xs text-gray-500 mt-1 font-mono break-all">
                                            {profile.protocol.handler}
                                        </div>
                                    )}
                                </div>
                            </Section>
                        )}

                        {/* Source */}
                        <Section title="Source">
                            <div className="text-sm space-y-1">
                                {profile.sourcePolicyId && (
                                    <div><span className="font-medium">Policy:</span> {profile.sourcePolicyId}</div>
                                )}
                                {profile.sourceFile && (
                                    <div><span className="font-medium">File:</span> {profile.sourceFile}</div>
                                )}
                            </div>
                        </Section>

                        {/* Inheritance */}
                        {profile.inheritance && (profile.inheritance.directParents.length > 0 || profile.inheritance.includedProfiles.length > 0) && (
                            <Section title="Inheritance" icon={GitBranch}>
                                {profile.inheritance.directParents.length > 0 && (
                                    <div className="mb-3">
                                        <div className="text-xs font-medium text-gray-600 mb-1">Direct (BasePolicy)</div>
                                        <div className="space-y-1">
                                            {profile.inheritance.directParents.map((parent, idx) => (
                                                <div key={idx} className="text-sm p-2 bg-gray-50 rounded">
                                                    <div className="font-mono">{parent.profileId}</div>
                                                    <div className="text-xs text-gray-500">{parent.fileName}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {profile.inheritance.includedProfiles.length > 0 && (
                                    <div>
                                        <div className="text-xs font-medium text-gray-600 mb-1">Included Profiles</div>
                                        <div className="space-y-1">
                                            {profile.inheritance.includedProfiles.map((included, idx) => (
                                                <div key={idx} className="text-sm p-2 bg-gray-50 rounded">
                                                    <div className="font-mono">{included.profileId}</div>
                                                    <div className="text-xs text-gray-500">{included.fileName}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </Section>
                        )}

                        {/* Input Claims */}
                        {(profile.computed?.allInputClaims || profile.inputClaims) && (
                            <Section title="Input Claims" icon={ArrowRightLeft}>
                                <ClaimsList claims={profile.computed?.allInputClaims || profile.inputClaims || []} />
                            </Section>
                        )}

                        {/* Output Claims */}
                        {(profile.computed?.allOutputClaims || profile.outputClaims) && (
                            <Section title="Output Claims" icon={ArrowRightLeft}>
                                <ClaimsList claims={profile.computed?.allOutputClaims || profile.outputClaims || []} />
                            </Section>
                        )}

                        {/* Persisted Claims */}
                        {(profile.computed?.allPersistedClaims || profile.persistedClaims) && (
                            <Section title="Persisted Claims" icon={Database}>
                                <ClaimsList claims={profile.computed?.allPersistedClaims || profile.persistedClaims || []} showOverwrite />
                            </Section>
                        )}

                        {/* Input Transformations */}
                        {(profile.computed?.allInputTransformations || profile.inputClaimsTransformations) && (
                            <Section title="Input Transformations">
                                <TransformationsList transformations={profile.computed?.allInputTransformations || profile.inputClaimsTransformations || []} />
                            </Section>
                        )}

                        {/* Output Transformations */}
                        {(profile.computed?.allOutputTransformations || profile.outputClaimsTransformations) && (
                            <Section title="Output Transformations">
                                <TransformationsList transformations={profile.computed?.allOutputTransformations || profile.outputClaimsTransformations || []} />
                            </Section>
                        )}

                        {/* Metadata */}
                        {(profile.computed?.allMetadata || profile.metadata) && (
                            <Section title="Metadata" icon={Key}>
                                <MetadataList metadata={profile.computed?.allMetadata || profile.metadata || []} />
                            </Section>
                        )}

                        {/* Cryptographic Keys */}
                        {profile.cryptographicKeys && profile.cryptographicKeys.length > 0 && (
                            <Section title="Cryptographic Keys" icon={Key}>
                                <div className="space-y-1">
                                    {profile.cryptographicKeys.map((key: any, idx: number) => (
                                        <div key={idx} className="text-sm p-2 bg-gray-50 rounded">
                                            <div className="font-mono">{key.id}</div>
                                            <div className="text-xs text-gray-500">Storage: {key.storageReferenceId}</div>
                                        </div>
                                    ))}
                                </div>
                            </Section>
                        )}

                        {/* Validation Technical Profiles */}
                        {profile.validationTechnicalProfiles && profile.validationTechnicalProfiles.length > 0 && (
                            <Section title="Validation Profiles">
                                <div className="space-y-1">
                                    {profile.validationTechnicalProfiles.map((vtp, idx) => (
                                        <div key={idx} className="text-sm p-2 bg-gray-50 rounded">
                                            <div className="font-mono">{vtp.referenceId}</div>
                                            <div className="text-xs text-gray-500 space-x-2">
                                                {vtp.continueOnSuccess && <Badge variant="outline" className="text-xs">Continue on success</Badge>}
                                                {vtp.continueOnError && <Badge variant="outline" className="text-xs">Continue on error</Badge>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Section>
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}

interface SectionProps {
    title: string;
    icon?: React.ElementType;
    children: React.ReactNode;
}

function Section({ title, icon: Icon, children }: SectionProps) {
    return (
        <div>
            <div className="flex items-center gap-2 mb-2">
                {Icon && <Icon className="w-4 h-4 text-gray-600" />}
                <h3 className="font-semibold text-sm">{title}</h3>
            </div>
            <div className="border-b border-gray-200 mb-3" />
            {children}
        </div>
    );
}

interface ClaimsListProps {
    claims: any[];
    showOverwrite?: boolean;
}

function ClaimsList({ claims, showOverwrite }: ClaimsListProps) {
    return (
        <div className="space-y-1">
            {claims.map((claim, idx) => (
                <div key={idx} className="text-sm p-2 bg-gray-50 rounded">
                    <div className="font-mono">{claim.claimTypeReferenceId}</div>
                    {claim.partnerClaimType && claim.partnerClaimType !== claim.claimTypeReferenceId && (
                        <div className="text-xs text-gray-500">Partner: {claim.partnerClaimType}</div>
                    )}
                    {claim.defaultValue && (
                        <div className="text-xs text-gray-500">Default: {claim.defaultValue}</div>
                    )}
                    <div className="flex gap-1 mt-1">
                        {claim.required && <Badge variant="outline" className="text-xs">Required</Badge>}
                        {showOverwrite && claim.overwriteIfExists && <Badge variant="outline" className="text-xs">Overwrite</Badge>}
                    </div>
                </div>
            ))}
        </div>
    );
}

interface TransformationsListProps {
    transformations: any[];
}

function TransformationsList({ transformations }: TransformationsListProps) {
    return (
        <div className="space-y-1">
            {transformations.map((transform, idx) => (
                <div key={idx} className="text-sm p-2 bg-gray-50 rounded">
                    <div className="font-mono">{transform.id}</div>
                    {transform.transformationMethod && (
                        <div className="text-xs text-gray-500">{transform.transformationMethod}</div>
                    )}
                </div>
            ))}
        </div>
    );
}

interface MetadataListProps {
    metadata: any[];
}

function MetadataList({ metadata }: MetadataListProps) {
    return (
        <div className="space-y-1">
            {metadata.map((item, idx) => (
                <div key={idx} className="text-sm p-2 bg-gray-50 rounded">
                    <div className="font-medium">{item.key}</div>
                    <div className="text-xs text-gray-600 break-all mt-1">{item.value}</div>
                </div>
            ))}
        </div>
    );
}
