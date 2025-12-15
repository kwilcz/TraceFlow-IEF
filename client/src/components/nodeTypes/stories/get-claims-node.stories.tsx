import type { Meta, StoryObj } from "@storybook/react";
import { ReactFlowProvider } from "@xyflow/react";
import GetClaimsNode from "@components/nodeTypes/get-claims-node";
import type { ClaimReference, TechnicalProfile } from "@/types/technical-profile";
import { SidebarNavigationProvider } from "@/contexts/SidebarNavigationContext";

const meta: Meta<typeof GetClaimsNode> = {
    title: "Components/Nodes/GetClaimsNode",
    component: GetClaimsNode,
    decorators: [
        (Story) => (
            <ReactFlowProvider>
                <SidebarNavigationProvider>
                    <Story />
                </SidebarNavigationProvider>
            </ReactFlowProvider>
        ),
    ],
};

export default meta;

type Story = StoryObj<typeof meta>;

const mockGetClaimsProfile: TechnicalProfile = {
    id: "CollectQueryParams",
    displayName: "Collect Query Parameters",
    protocol: {
        name: "Proprietary",
        handler: "Web.TPEngine.Providers.ClaimsTransformationProtocolProvider",
    },
    inputClaims: [
        { claimTypeReferenceId: "campaignId", defaultValue: "{QueryString:campaign}", required: false },
        { claimTypeReferenceId: "trackingId", defaultValue: "{QueryString:trackingId}", required: true },
        { claimTypeReferenceId: "channel", defaultValue: "QueryString:channel", required: false },
    ],
    outputClaims: [
        { claimTypeReferenceId: "campaignId" },
        { claimTypeReferenceId: "trackingId" },
        { claimTypeReferenceId: "channel" },
    ],
    outputClaimsTransformations: [{ id: "NormalizeCampaign" }],
    metadata: [
        { key: "SendClaimsIn", value: "QueryString" },
        { key: "SendClaimsDestination", value: "ClaimsPrincipal" },
        { key: "IncludeClaimResolvingInClaimsHandling", value: "true" },
    ],
    sourcePolicyId: "B2C_1A_Test",
};

const baseNodeArgs = {
    id: "Step2",
    type: "GetClaimsNode" as const,
    data: {
        label: "Collect Query Claims",
        stepOrder: 2,
        orchestrationStep: {
            order: 2,
            type: "GetClaims",
            cpimIssuerTechnicalProfileReferenceId: "CollectQueryParams",
            technicalProfiles: [mockGetClaimsProfile],
            claimsExchanges: [],
            claimsProviderSelections: [],
        },
    },
};

const baseTechnicalProfile =
    (baseNodeArgs.data.orchestrationStep.technicalProfiles?.[0] as TechnicalProfile | undefined) ?? mockGetClaimsProfile;

export const Blueprint: Story = {
    args: baseNodeArgs,
};

const relyingPartyInputClaims: ClaimReference[] = [
    { claimTypeReferenceId: "email", partnerClaimType: "userId", required: true },
    { claimTypeReferenceId: "displayName", partnerClaimType: "name" },
];

export const BlueprintFromRelyingParty: Story = {
    args: {
        ...baseNodeArgs,
        data: {
            ...baseNodeArgs.data,
            relyingPartyInputClaims,
            orchestrationStep: {
                ...baseNodeArgs.data.orchestrationStep,
                technicalProfiles: [
                    {
                        ...baseTechnicalProfile,
                        inputClaims: undefined,
                        displayName: "IdTokenHint Extract Claims",
                    } as TechnicalProfile,
                ],
            },
        },
    },
};