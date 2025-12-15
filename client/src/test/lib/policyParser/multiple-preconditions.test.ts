import { beforeAll, describe, it, expect } from 'vitest';
import { type PolicyData, type PolicyGraph } from '@/lib/policyParser';
import { MULTIPLE_PRECONDITIONS_SAME_CONDITION_XML } from '../../fixtures/policy-xml-fixtures';
import { createPolicyParserFixture } from '../../utils/policy-parser-fixture';

const multiplePreconditionsFixture = createPolicyParserFixture(
  MULTIPLE_PRECONDITIONS_SAME_CONDITION_XML,
  'MultipleSkips'
);

describe('PolicyParserService - Multiple Preconditions with Same Condition', () => {
  let policyData: PolicyData;
  let multiplePreconditionsGraph: PolicyGraph;

  beforeAll(async () => {
    policyData = await multiplePreconditionsFixture.load();
    multiplePreconditionsGraph = multiplePreconditionsFixture.getGraph();
  });

  it('should parse user journey with multiple steps having same precondition', () => {
    expect(policyData).toBeDefined();
    expect(policyData.subgraphs['MultipleSkips']).toBeDefined();
  });

  it('should create separate precondition nodes for each step (current behavior)', () => {
    const preconditionNodes = multiplePreconditionsGraph.nodes.filter(n => n.id.includes('Precondition'));
    expect(preconditionNodes.length).toBe(2);
  });

  it('should have precondition for Step1', () => {
    const step1Precondition = multiplePreconditionsGraph.nodes.find(
      n => n.id.includes('Step1') && n.id.includes('Precondition')
    );
    expect(step1Precondition).toBeDefined();
  });

  it('should have precondition for Step2', () => {
    const step2Precondition = multiplePreconditionsGraph.nodes.find(
      n => n.id.includes('Step2') && n.id.includes('Precondition')
    );
    expect(step2Precondition).toBeDefined();
  });

  it('should connect both preconditions to their respective steps', () => {
    const step1Precondition = multiplePreconditionsGraph.nodes.find(
      n => n.id.includes('Step1') && n.id.includes('Precondition')
    );
    const step2Precondition = multiplePreconditionsGraph.nodes.find(
      n => n.id.includes('Step2') && n.id.includes('Precondition')
    );

    const precond1ToStep1 = multiplePreconditionsGraph.edges.find(
      e => e.source === step1Precondition?.id && e.target === 'Step1'
    );
    const precond2ToStep2 = multiplePreconditionsGraph.edges.find(
      e => e.source === step2Precondition?.id && e.target === 'Step2'
    );

    expect(precond1ToStep1).toBeDefined();
    expect(precond2ToStep2).toBeDefined();
  });

  it('should have correct total node count', () => {
    expect(multiplePreconditionsGraph.nodes.length).toBe(8);
  });
});
