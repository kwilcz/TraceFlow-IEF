export const MAX_VISIBLE_CLAIMS = 6;

export interface Claim {
    claimTypeReferenceId?: string;
    partnerClaimType?: string;
    defaultValue?: string;
    alwaysUseDefaultValue?: boolean;
    required?: boolean;
    displayControlReferenceId?: string;
}

export interface DisplayControl {
    id: string;
    userInterfaceControlType?: string;
    inputClaims?: Claim[];
    displayClaims?: Claim[];
    outputClaims?: Claim[];
    actions?: Array<{
        id: string;
        validationClaimsExchange?: Array<{
            technicalProfileReferenceId: string;
        }>;
    }>;
}
