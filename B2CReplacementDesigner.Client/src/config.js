/* eslint-disable no-undef */

const config = {
    apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "https://localhost:7285/api",
    policiesMergeEndpoint: process.env.NEXT_POLICIES_MERGE_ENDPOINT || "policies/merge",
};

export default config;