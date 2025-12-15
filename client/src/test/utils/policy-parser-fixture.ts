import { parsePolicyXml, type PolicyData, type PolicyGraph } from '@/lib/policyParser';

interface PolicyParserFixtureOptions {
    xml: string;
    defaultJourneyId?: string;
}

export class PolicyParserFixture {
    private cachedResult?: PolicyData;

    constructor(private readonly options: PolicyParserFixtureOptions) {}

    async load(): Promise<PolicyData> {
        if (!this.cachedResult) {
            this.cachedResult = await parsePolicyXml(this.options.xml);
        }
        return this.cachedResult;
    }

    getResult(): PolicyData {
        if (!this.cachedResult) {
            throw new Error('Policy parser fixture not loaded. Call load() in a beforeAll hook first.');
        }
        return this.cachedResult;
    }

    getGraph(journeyId?: string): PolicyGraph {
        const result = this.getResult();
        const resolvedJourneyId = journeyId ?? this.options.defaultJourneyId;

        if (!resolvedJourneyId) {
            throw new Error('No journey id provided. Pass a journeyId to getGraph or configure defaultJourneyId.');
        }

        const graph = result.subgraphs[resolvedJourneyId];

        if (!graph) {
            throw new Error(`Journey '${resolvedJourneyId}' not found in parsed policy data.`);
        }

        return graph;
    }
}

export const createPolicyParserFixture = (xml: string, defaultJourneyId?: string) =>
    new PolicyParserFixture({ xml, defaultJourneyId });
