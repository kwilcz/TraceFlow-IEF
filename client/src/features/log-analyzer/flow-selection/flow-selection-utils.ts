/** Strips the `B2C_1A_` prefix from a policy ID for display. */
export function formatPolicyName(policyId: string): string {
    return policyId.replace(/^B2C_1A_/i, "");
}
