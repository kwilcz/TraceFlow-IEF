import { OrchestrationStepWithTechnicalProfile } from '@/types/technical-profile';

export interface ParsedOrchestrationStep {
    stepType: string;
    stepOrder: number;
    orchestrationStep: OrchestrationStepWithTechnicalProfile;
    rawStep: any;
}

export interface StepExtractionResult {
    createdNodes: Node[];
}

import { Node } from '@xyflow/react';

export const STEP_TYPES = {
    INVOKE_SUB_JOURNEY: 'InvokeSubJourney',
    COMBINED_SIGNIN_SIGNUP: 'CombinedSignInAndSignUp',
    CLAIMS_EXCHANGE: 'ClaimsExchange',
    CLAIMS_PROVIDER_SELECTION: 'ClaimsProviderSelection',
    GET_CLAIMS: 'GetClaims',
    SEND_CLAIMS: 'SendClaims',
} as const;

export type StepType = typeof STEP_TYPES[keyof typeof STEP_TYPES];
