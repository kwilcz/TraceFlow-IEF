const config = {
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "https://localhost:7285/api",
    policiesMergeEndpoint: import.meta.env.VITE_POLICIES_MERGE_ENDPOINT || "policies/merge",
};

export default config;