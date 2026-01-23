import type { Edge, Node } from "@xyflow/react";

import { NODE_TYPES } from "@/components/nodeTypes/node-types";

export const heroSampleGraph: { nodes: Node[]; edges: Edge[] } = {
    nodes: [
        {
            id: "start",
            type: NODE_TYPES.START,
            position: { x: 175, y: 0 },
            data: {},
        },
        {
            id: "combined-signin",
            type: NODE_TYPES.COMBINED_SIGNIN_SIGNUP,
            position: { x: 0, y: 80 },
            data: {
                label: "SignUpOrSignIn",
                stepOrder: 1,
                orchestrationStep: {
                    order: 1,
                    type: "CombinedSignInAndSignUp",
                    technicalProfiles: [
                        {
                            id: "SelfAsserted-LocalAccountSignin-Email",
                            displayName: "Local Account Sign-In",
                            providerName: "SelfAssertedAttributeProvider",
                        },
                    ],
                    claimsProviderSelections: [{ validationClaimsExchangeId: "LocalAccountSigninEmailExchange" }],
                    claimsExchanges: [
                        {
                            id: "LocalAccountSigninEmailExchange",
                            technicalProfileReferenceId: "SelfAsserted-LocalAccountSignin-Email",
                        },
                    ],
                },
            },
        },
        {
            id: "condition-objectid",
            type: NODE_TYPES.CONDITIONED,
            position: { x: 48, y: 350 },
            data: {
                label: "User Exists?",
                claimTypeReferenceId: "objectId",
                operatorType: "ClaimsExist",
                conditionValue: "",
            },
        },
        {
            id: "signup-exchange",
            type: NODE_TYPES.CLAIMS_EXCHANGE,
            position: { x: -200, y: 450 },
            data: {
                label: "LocalAccountSignUp",
                stepOrder: 2,
                providerName: "SelfAssertedAttributeProvider",
                claimsExchanges: ["LocalAccountSignUpWithLogonEmail"],
                technicalProfiles: [
                    {
                        id: "LocalAccountSignUpWithLogonEmail",
                        displayName: "Email signup",
                        providerName: "SelfAssertedAttributeProvider",
                        protocol: {
                            name: "Proprietary",
                            handler:
                                "Web.TPEngine.Providers.SelfAssertedAttributeProvider, Web.TPEngine, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null",
                        },
                        metadata: [
                            { key: "IpAddressClaimReferenceId", value: "IpAddress" },
                            { key: "ContentDefinitionReferenceId", value: "api.localaccountsignup" },
                        ],
                        cryptographicKeys: [
                            {
                                id: "issuer_secret",
                                storageReferenceId: "B2C_1A_TokenSigningKeyContainer",
                            },
                        ],
                        inputClaims: [{ claimTypeReferenceId: "email" }],
                        outputClaims: [
                            { claimTypeReferenceId: "objectId" },
                            {
                                claimTypeReferenceId: "email",
                                partnerClaimType: "Verified.Email",
                                required: true,
                            },
                            { claimTypeReferenceId: "newPassword", required: true },
                            { claimTypeReferenceId: "reenterPassword", required: true },
                            {
                                claimTypeReferenceId: "executed-SelfAsserted-Input",
                                defaultValue: "true",
                            },
                            { claimTypeReferenceId: "authenticationSource" },
                            { claimTypeReferenceId: "newUser" },
                            { claimTypeReferenceId: "displayName" },
                            { claimTypeReferenceId: "givenName" },
                            { claimTypeReferenceId: "surName" },
                        ],
                        validationTechnicalProfiles: [{ referenceId: "AAD-UserWriteUsingLogonEmail" }],
                        useTechnicalProfileForSessionManagement: "SM-AAD",
                    },
                ],
            },
        },
        {
            id: "read-user-exchange",
            type: NODE_TYPES.CLAIMS_EXCHANGE,
            position: { x: 200, y: 450 },
            data: {
                label: "ReadUserData",
                stepOrder: 5,
                providerName: "AzureActiveDirectoryProvider",
                claimsExchanges: ["AAD-UserReadUsingObjectId"],
                technicalProfiles: [
                    {
                        id: "AAD-UserReadUsingObjectId",
                        displayName: "Read User (by objectId)",
                        providerName: "AzureActiveDirectoryProvider",
                        metadata: [
                            { key: "Operation", value: "Read" },
                            { key: "RaiseErrorIfClaimsPrincipalDoesNotExist", value: "true" },
                        ],
                        inputClaims: [{ claimTypeReferenceId: "objectId", required: true }],
                        outputClaims: [
                            { claimTypeReferenceId: "signInNames.emailAddress" },
                            { claimTypeReferenceId: "displayName" },
                            { claimTypeReferenceId: "otherMails" },
                            { claimTypeReferenceId: "givenName" },
                            { claimTypeReferenceId: "surname" },
                        ],
                        includeTechnicalProfileReferenceId: "AAD-Common",
                    },
                ],
            },
        },
        {
            id: "end",
            type: NODE_TYPES.END,
            position: { x: 175, y: 900 },
            data: {},
        },
    ],
    edges: [
        { id: "e-start-signin", source: "start", target: "combined-signin", animated: true },
        { id: "e-signin-condition", source: "combined-signin", target: "condition-objectid", animated: true },
        {
            id: "e-condition-signup",
            source: "condition-objectid",
            target: "signup-exchange",
            sourceHandle: "false",
            data: { label: "false" },
            type: "condition-edge",
            animated: true,
        },
        {
            id: "e-condition-read",
            source: "condition-objectid",
            target: "read-user-exchange",
            sourceHandle: "true",
            data: { label: "true" },
            type: "condition-edge",
            animated: true,
        },
        { id: "e-signup-end", source: "signup-exchange", target: "end", animated: true },
        { id: "e-read-end", source: "read-user-exchange", target: "end", animated: true },
    ],
};
