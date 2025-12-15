import { StoryObj } from '@storybook/react';
import CombinedSignInAndSignUpNode from "@components/nodeTypes/combined-signin-signup-node";
import {ReactFlowProvider} from "@xyflow/react";

const meta = {
    title: 'Components/Nodes/CombinedSignInAndSignUpNode',
    component: CombinedSignInAndSignUpNode,
};
export default meta;

type Story = StoryObj<typeof meta>;

export const CombinedSignInAndSignUpNodeStory: Story = {
// @ts-ignore
    args: {
        id: 'combined-signin-signup-node',
// @ts-ignore
        type: 'CombinedSignInAndSignUpNode',
        data: {
            label: 'Sign In or Sign Up',
            stepOrder: 1,
            orchestrationStep: {
                order: 1,
                type: 'CombinedSignInAndSignUp',
                claimsProviderSelections: [
                    { validationClaimsExchangeId: 'LocalAccountSigninEmailExchange' },
                    { targetClaimsExchangeId: 'FacebookExchange' },
                    { targetClaimsExchangeId: 'GoogleExchange' }
                ],
                claimsExchanges: [
                    {
                        id: 'LocalAccountSigninEmailExchange',
                        technicalProfileReferenceId: 'SelfAsserted-LocalAccountSignin-Email'
                    }
                ],
                technicalProfiles: [
                    {
                        id: 'SelfAsserted-LocalAccountSignin-Email',
                        displayName: 'Local Account Sign In',
                        providerName: 'SelfAsserted',
                        inputClaims: [],
                        outputClaims: [],
                        displayClaims: []
                    }
                ]
            }
        },
    },
    decorators: [(Story) => (<ReactFlowProvider><Story/></ReactFlowProvider>)]
}