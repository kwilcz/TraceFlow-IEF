import { StoryObj } from '@storybook/react';
import ClaimsExchangeNode from "@components/nodeTypes/claims-exchange-node";
import {ReactFlowProvider} from "@xyflow/react";
import { TechnicalProfile } from '@/types/technical-profile';

const meta = {
    title: 'Components/Nodes/ClaimsExchangeNode',
    component: ClaimsExchangeNode,
};
export default meta;

type Story = StoryObj<typeof meta>;

// Mock TechnicalProfile data - AAD Provider with inheritance
const mockAADProfile: TechnicalProfile = {
    id: 'AAD-UserReadUsingAlternativeSecurityId-NoError',
    displayName: 'AAD User Read Using Alternative Security Id - No Error',
    description: 'Read AAD user profile without throwing error if not found',
    protocol: {
        name: 'Proprietary',
        handler: 'Web.TPEngine.Providers.AzureActiveDirectoryProvider, Web.TPEngine, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null'
    },
    providerName: 'AzureActiveDirectory',
    sourceFile: 'TrustFrameworkBase.xml',
    inputClaims: [
        { claimTypeReferenceId: 'alternativeSecurityId', required: true }
    ],
    outputClaims: [
        { claimTypeReferenceId: 'objectId' },
        { claimTypeReferenceId: 'userPrincipalName' },
        { claimTypeReferenceId: 'displayName' },
        { claimTypeReferenceId: 'otherMails' },
        { claimTypeReferenceId: 'givenName' },
        { claimTypeReferenceId: 'surname' },
        { claimTypeReferenceId: 'email', partnerClaimType: 'mail' }
    ],
    metadata: [
        { key: 'Operation', value: 'Read' },
        { key: 'RaiseErrorIfClaimsPrincipalDoesNotExist', value: 'false' }
    ],
    computed: {
        allInputClaims: [
            { claimTypeReferenceId: 'alternativeSecurityId', required: true }
        ],
        allOutputClaims: [
            { claimTypeReferenceId: 'objectId' },
            { claimTypeReferenceId: 'userPrincipalName' },
            { claimTypeReferenceId: 'displayName' },
            { claimTypeReferenceId: 'otherMails' },
            { claimTypeReferenceId: 'givenName' },
            { claimTypeReferenceId: 'surname' },
            { claimTypeReferenceId: 'email', partnerClaimType: 'mail' }
        ],
        allInputTransformations: [],
        allOutputTransformations: []
    },
    inheritance: {
        directParents: [
            { policyId: 'B2C_1A_TrustFrameworkBase', profileId: 'AAD-Common', fileName: 'TrustFrameworkBase.xml' }
        ],
        includedProfiles: [
            { policyId: 'B2C_1A_TrustFrameworkBase', profileId: 'AAD-UserReadUsingAlternativeSecurityId', fileName: 'TrustFrameworkBase.xml' }
        ]
    }
};

// Mock TechnicalProfile - Utility provider
const mockUtilityProfile: TechnicalProfile = {
    id: 'CreateAlternativeSecurityId',
    displayName: 'Create Alternative Security Id',
    protocol: {
        name: 'Proprietary',
        handler: 'Web.TPEngine.Providers.AzureActiveDirectoryProvider, Web.TPEngine, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null'
    },
    providerName: 'Utility',
    sourceFile: 'TrustFrameworkBase.xml',
    outputClaimsTransformations: [
        { id: 'CreateAlternativeSecurityId' }
    ],
    outputClaims: [
        { claimTypeReferenceId: 'alternativeSecurityId' }
    ],
    computed: {
        allInputClaims: [],
        allOutputClaims: [
            { claimTypeReferenceId: 'alternativeSecurityId' }
        ],
        allInputTransformations: [],
        allOutputTransformations: [
            { id: 'CreateAlternativeSecurityId' }
        ]
    },
    inheritance: {
        directParents: [],
        includedProfiles: []
    }
};

const mockOAuthProfile: TechnicalProfile = {
    id: 'Google-OAUTH',
    displayName: 'Google',
    protocol: {
        name: 'OAuth2',
        handler: 'Web.TPEngine.Providers.OAuth2IdpProvider, Web.TPEngine, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null'
    },
    providerName: 'OAuth2IdpProvider',
    outputClaims: [
        { claimTypeReferenceId: 'issuerUserId', partnerClaimType: 'id' },
        { claimTypeReferenceId: 'email', partnerClaimType: 'email' },
        { claimTypeReferenceId: 'givenName', partnerClaimType: 'given_name' },
        { claimTypeReferenceId: 'surname', partnerClaimType: 'family_name' }
    ],
    metadata: [
        { key: 'client_id', value: 'your_google_client_id' },
        { key: 'ProviderName', value: 'google.com' },
        { key: 'authorization_endpoint', value: 'https://accounts.google.com/o/oauth2/v2/auth' }
    ],
    computed: {
        allOutputClaims: [
            { claimTypeReferenceId: 'issuerUserId', partnerClaimType: 'id' },
            { claimTypeReferenceId: 'email', partnerClaimType: 'email' },
            { claimTypeReferenceId: 'givenName', partnerClaimType: 'given_name' },
            { claimTypeReferenceId: 'surname', partnerClaimType: 'family_name' }
        ]
    },
    inheritance: {
        directParents: [],
        includedProfiles: []
    }
};

export const AADUserReadStory: Story = {
// @ts-ignore
    args: {
        id: 'SignUpOrSignIn-step-3',
// @ts-ignore
        type: 'ClaimsExchangeNode',
        data: {
            label: 'AAD-UserReadUsingAlternativeSecurityId-NoError',
            claimsExchanges: ['AAD-UserReadUsingAlternativeSecurityId-NoError'],
            technicalProfiles: [mockAADProfile],
            details: {
                stepOrder: 3
            }
        },
    },
    decorators: [(Story) => (<ReactFlowProvider><Story/></ReactFlowProvider>)]
};

export const UtilityProviderStory: Story = {
// @ts-ignore
    args: {
        id: 'SignUpOrSignIn-step-2',
// @ts-ignore
        type: 'ClaimsExchangeNode',
        data: {
            label: 'CreateAlternativeSecurityId',
            claimsExchanges: ['CreateAlternativeSecurityId'],
            technicalProfiles: [mockUtilityProfile],
            details: {
                stepOrder: 2
            }
        },
    },
    decorators: [(Story) => (<ReactFlowProvider><Story/></ReactFlowProvider>)]
};

export const MultipleClaimsExchangeNodeStory: Story = {
// @ts-ignore
    args: {
        id: 'claims-exchange-node',
// @ts-ignore
        type: 'ClaimsExchangeNode',
        data: {
            label: 'Claims Exchange',
            claimsExchanges: ['TotpMethodMfa_VerifySelection', 'PhoneMethodMfa_VerifySelection', 'EmailMethodMfa_VerifySelection']
        },
    },
    decorators: [(Story) => (<ReactFlowProvider><Story/></ReactFlowProvider>)]
};

export const MultipleProvidersStory: Story = {
// @ts-ignore
    args: {
        id: 'claims-exchange-multiple-providers',
// @ts-ignore
        type: 'ClaimsExchangeNode',
        data: {
            label: 'Social Login',
            claimsExchanges: ['AAD-UserReadUsingAlternativeSecurityId-NoError', 'Google-OAUTH'],
            technicalProfiles: [mockAADProfile, mockOAuthProfile],
            details: {
                stepOrder: 4
            }
        },
    },
    decorators: [(Story) => (<ReactFlowProvider><Story/></ReactFlowProvider>)]
};