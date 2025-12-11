import { STEP_TYPES } from '../types/orchestration-step';
import { BaseExtractor } from './base-extractor';
import { DefaultStepExtractor } from './step-extractors/default-step-extractor';
import { CombinedSignInAndSignUpExtractor } from './step-extractors/combined-signin-signup-extractor';
import { ClaimsExchangeExtractor } from './step-extractors/claims-exchange-extractor';
import { InvokeSubJourneyExtractor } from './step-extractors/invoke-subjourney-extractor';
import { GetClaimsExtractor } from './step-extractors/get-claims-extractor';

export class StepExtractorFactory {
    private extractors: Map<string, BaseExtractor>;
    private defaultExtractor: BaseExtractor;

    constructor() {
        this.extractors = new Map();
        this.defaultExtractor = new DefaultStepExtractor();

        this.extractors.set(STEP_TYPES.COMBINED_SIGNIN_SIGNUP, new CombinedSignInAndSignUpExtractor());
        this.extractors.set(STEP_TYPES.CLAIMS_EXCHANGE, new ClaimsExchangeExtractor());
        this.extractors.set(STEP_TYPES.INVOKE_SUB_JOURNEY, new InvokeSubJourneyExtractor());
        this.extractors.set(STEP_TYPES.GET_CLAIMS, new GetClaimsExtractor());
    }

    getExtractor(stepType: string): BaseExtractor {
        return this.extractors.get(stepType) ?? this.defaultExtractor;
    }
}
