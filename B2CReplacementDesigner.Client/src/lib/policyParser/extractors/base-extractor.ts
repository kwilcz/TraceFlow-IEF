import { Node } from '@xyflow/react';
import { ExtractionContext } from '../types/policy-context';
import { addInternalError } from '@/types/internal-error';

export interface IExtractor {
    extract(rawData: unknown, context: ExtractionContext): Node[];
}

export abstract class BaseExtractor implements IExtractor {
    abstract extract(rawData: unknown, context: ExtractionContext): Node[];

    protected addError(message: string, severity: 'error' | 'warning', context: ExtractionContext): void {
        context.policyContext.errors.add(addInternalError(message, severity));
    }
}
