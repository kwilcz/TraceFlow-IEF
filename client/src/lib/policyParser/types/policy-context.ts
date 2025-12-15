import { Node } from '@xyflow/react';
import InternalError from '@/types/internal-error';
import { ClaimReference, TechnicalProfile } from '@/types/technical-profile';
import { PolicyGraph } from './graph-types';

export interface RelyingPartyProfile {
    readonly technicalProfileId?: string;
    readonly inputClaims?: ClaimReference[];
    readonly outputClaims?: ClaimReference[];
}

export interface PolicyContext {
    readonly parsedPolicy: any;
    readonly technicalProfiles?: Map<string, TechnicalProfile>;
    readonly relyingPartyProfile?: RelyingPartyProfile;
    readonly errors: Set<InternalError>;
}

export interface ExtractionContext {
    readonly policyContext: PolicyContext;
    readonly graph: PolicyGraph;
    readonly parentNode?: Node;
}
