import { PolicyParserService, type PolicyData } from './services/policy-parser-service';

export { PolicyParserService, type PolicyData } from './services/policy-parser-service';
export { type PolicyGraph, type PolicySubgraphs } from './types/graph-types';
export { type PolicyContext, type ExtractionContext } from './types/policy-context';

export async function parsePolicyXml(xmlContent: string): Promise<PolicyData> {
    const parserService = new PolicyParserService();
    return parserService.parsePolicyXml(xmlContent);
}
