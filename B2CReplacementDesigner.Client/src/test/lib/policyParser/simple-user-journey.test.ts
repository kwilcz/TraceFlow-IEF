import { beforeAll, describe, it, expect } from 'vitest';
import { type PolicyData, type PolicyGraph } from '@/lib/policyParser';
import { SIMPLE_USER_JOURNEY_XML } from '../../fixtures/policy-xml-fixtures';
import { createPolicyParserFixture } from '../../utils/policy-parser-fixture';

const simpleJourneyFixture = createPolicyParserFixture(SIMPLE_USER_JOURNEY_XML, 'SignIn');

describe('PolicyParserService - Simple User Journey', () => {
  let policyData: PolicyData;
  let signInGraph: PolicyGraph;

  beforeAll(async () => {
    policyData = await simpleJourneyFixture.load();
    signInGraph = simpleJourneyFixture.getGraph();
  });

  it('should parse a simple user journey XML', () => {
    expect(policyData).toBeDefined();
    expect(policyData.subgraphs).toBeDefined();
    expect(policyData.errors).toBeDefined();
  });

  it('should create a subgraph for the SignIn journey', () => {
    expect(signInGraph).toBeDefined();
    expect(signInGraph.nodes).toBeDefined();
    expect(signInGraph.edges).toBeDefined();
  });

  it('should create start and end nodes', () => {
    const startNode = signInGraph.nodes.find(n => n.id === 'root-start');
    const endNode = signInGraph.nodes.find(n => n.id === 'root-end');

    expect(startNode).toBeDefined();
    expect(endNode).toBeDefined();
  });

  it('should create orchestration step nodes', () => {
    const step1 = signInGraph.nodes.find(n => n.id === 'Step1');
    const step2 = signInGraph.nodes.find(n => n.id === 'Step2');
    const step3 = signInGraph.nodes.find(n => n.id === 'Step3');

    expect(step1).toBeDefined();
    expect(step2).toBeDefined();
    expect(step3).toBeDefined();
  });

  it('should connect nodes in sequence', () => {
    const startToStep1 = signInGraph.edges.find(
      e => e.source === 'root-start' && e.target === 'Step1'
    );
    expect(startToStep1).toBeDefined();

    const step1ToStep2 = signInGraph.edges.find(
      e => e.source === 'Step1' && e.target === 'Step2'
    );
    expect(step1ToStep2).toBeDefined();

    const step2ToStep3 = signInGraph.edges.find(
      e => e.source === 'Step2' && e.target === 'Step3'
    );
    expect(step2ToStep3).toBeDefined();

    const step3ToEnd = signInGraph.edges.find(
      e => e.source === 'Step3' && e.target === 'root-end'
    );
    expect(step3ToEnd).toBeDefined();
  });

  it('should extract technical profiles', () => {
    expect(policyData.technicalProfiles).toBeDefined();
    expect(policyData.technicalProfiles?.size).toBeGreaterThan(0);

    const signinProfile = policyData.technicalProfiles?.get('SelfAsserted-LocalAccountSignin');
    expect(signinProfile).toBeDefined();
    expect(signinProfile?.displayName).toBe('Local Account Signin');
  });

  it('should have no errors for valid XML', () => {
    expect(policyData.errors?.size).toBe(0);
  });

  it('should create correct node count', () => {
    expect(signInGraph.nodes.length).toBe(5);
  });

  it('should create correct edge count', () => {
    expect(signInGraph.edges.length).toBe(4);
  });
});
