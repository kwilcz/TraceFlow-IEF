import { TechnicalProfile, ClaimReference } from '@/types/technical-profile';
import InternalError from '@/types/internal-error';
import { PolicySubgraphs, PolicyGraph } from '../types/graph-types';
import { PolicyContext, ExtractionContext, RelyingPartyProfile } from '../types/policy-context';
import { XmlParserService } from './xml-parser-service';
import { UserJourneyExtractor } from '../extractors/user-journey-extractor';
import { 
    extractTechnicalProfiles, 
    resolveTechnicalProfileInheritance 
} from '@/lib/policyParser/technical-profile-parser';
import { ensureArray } from '@/lib/utils';

export interface PolicyData {
    errors?: Set<InternalError>;
    subgraphs: PolicySubgraphs;
    technicalProfiles?: Map<string, TechnicalProfile>;
}

export class PolicyParserService {
    private xmlParserService: XmlParserService;
    private userJourneyExtractor: UserJourneyExtractor;

    constructor() {
        this.xmlParserService = new XmlParserService();
        this.userJourneyExtractor = new UserJourneyExtractor();
    }

    async parsePolicyXml(xmlContent: string): Promise<PolicyData> {
        const parsedPolicy = this.xmlParserService.parse(xmlContent);
        const errors: Set<InternalError> = new Set();

        const policyFileName = parsedPolicy.TrustFrameworkPolicy?.['@_PolicyId'] || 'Policy';
        const technicalProfilesMap = extractTechnicalProfiles(parsedPolicy, policyFileName);
        const resolvedProfiles = resolveTechnicalProfileInheritance(technicalProfilesMap);

        const relyingPartyProfile = extractRelyingPartyProfile(parsedPolicy);

        const policyContext: PolicyContext = {
            parsedPolicy,
            technicalProfiles: resolvedProfiles,
            relyingPartyProfile,
            errors,
        };

        if (!parsedPolicy.TrustFrameworkPolicy.UserJourneys?.UserJourney) {
            throw new Error('No UserJourneys found in the policy');
        }

        const subgraphs = this.extractUserJourneys(parsedPolicy, policyContext);

        return {
            subgraphs,
            errors,
            technicalProfiles: resolvedProfiles,
        };
    }

    private extractUserJourneys(parsedPolicy: any, policyContext: PolicyContext): PolicySubgraphs {
        const subgraphs: PolicySubgraphs = {};
        const journeys = ensureArray(parsedPolicy.TrustFrameworkPolicy.UserJourneys.UserJourney);

        journeys.forEach((journey: any) => {
            const journeyId = journey['@_Id'];
            const graph: PolicyGraph = { nodes: [], edges: [] };

            const extractionContext: ExtractionContext = {
                policyContext,
                graph,
                parentNode: undefined,
            };

            this.userJourneyExtractor.extract(journey, extractionContext);
            subgraphs[journeyId] = graph;
        });

        return subgraphs;
    }
}

function extractRelyingPartyProfile(parsedPolicy: any): RelyingPartyProfile | undefined {
    const relyingParty = parsedPolicy.TrustFrameworkPolicy?.RelyingParty;
    if (!relyingParty?.TechnicalProfile) {
        return undefined;
    }

    const profileNode = Array.isArray(relyingParty.TechnicalProfile)
        ? relyingParty.TechnicalProfile[0]
        : relyingParty.TechnicalProfile;

    if (!profileNode) {
        return undefined;
    }

    const profileId =
        profileNode['@_Id'] ??
        profileNode['@_ID'] ??
        profileNode['@_id'] ??
        profileNode['Id'] ??
        profileNode['ID'];

    return {
        technicalProfileId: profileId,
        inputClaims: parseRelyingPartyClaims(profileNode.InputClaims?.InputClaim),
        outputClaims: parseRelyingPartyClaims(profileNode.OutputClaims?.OutputClaim),
    };
}

function parseRelyingPartyClaims(claims: any): ClaimReference[] | undefined {
    if (!claims) {
        return undefined;
    }

    const claimArray = ensureArray(claims);
    const normalized = claimArray
        .map((claim: any) => ({
            claimTypeReferenceId: claim['@_ClaimTypeReferenceId'],
            partnerClaimType: claim['@_PartnerClaimType'],
            defaultValue: claim['@_DefaultValue'],
            alwaysUseDefaultValue: claim['@_AlwaysUseDefaultValue'] === 'true',
            required: claim['@_Required'] === 'true',
        }))
        .filter((claim: ClaimReference) => Boolean(claim.claimTypeReferenceId));

    return normalized.length > 0 ? normalized : undefined;
}
