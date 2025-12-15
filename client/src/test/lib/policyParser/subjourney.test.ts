import { beforeAll, describe, it, expect } from 'vitest';
import { type PolicyData, type PolicyGraph } from '@/lib/policyParser';
import { USER_JOURNEY_WITH_SUBJOURNEY_XML } from '../../fixtures/policy-xml-fixtures';
import { createPolicyParserFixture } from '../../utils/policy-parser-fixture';

const subJourneyFixture = createPolicyParserFixture(
  USER_JOURNEY_WITH_SUBJOURNEY_XML,
  'SignInWithMFA'
);

describe('PolicyParserService - SubJourneys', () => {
  let policyData: PolicyData;
  let subJourneyGraph: PolicyGraph;

  beforeAll(async () => {
    policyData = await subJourneyFixture.load();
    subJourneyGraph = subJourneyFixture.getGraph();
  });

  it('should parse a user journey with subjourney', () => {
    expect(policyData).toBeDefined();
    expect(policyData.subgraphs['SignInWithMFA']).toBeDefined();
  });

  it('should create a group node for the subjourney', () => {
    const subJourneyNode = subJourneyGraph.nodes.find(n => n.id === 'MFA');
    expect(subJourneyNode).toBeDefined();
    expect(subJourneyNode?.type).toBe('Group');
  });

  it('should create nodes inside the subjourney', () => {
    const subJourneyStart = subJourneyGraph.nodes.find(n => n.id === 'MFA-start');
    const subJourneyStep = subJourneyGraph.nodes.find(n => n.id === 'MFA-Step1');
    const subJourneyEnd = subJourneyGraph.nodes.find(n => n.id === 'MFA-end');

    expect(subJourneyStart).toBeDefined();
    expect(subJourneyStep).toBeDefined();
    expect(subJourneyEnd).toBeDefined();
  });

  it('should set parent relationship for subjourney nodes', () => {
    const subJourneyNode = subJourneyGraph.nodes.find(n => n.id === 'MFA');
    const subJourneyStart = subJourneyGraph.nodes.find(n => n.id === 'MFA-start');
    const subJourneyStep = subJourneyGraph.nodes.find(n => n.id === 'MFA-Step1');

    expect(subJourneyStart?.parentId).toBe('MFA');
    expect(subJourneyStep?.parentId).toBe('MFA');
    expect(subJourneyNode?.parentId).toBeUndefined();
  });

  it('should connect main journey to subjourney', () => {
    const step1ToSubJourney = subJourneyGraph.edges.find(
      e => e.source === 'Step1' && e.target === 'MFA'
    );
    expect(step1ToSubJourney).toBeDefined();
  });

  it('should connect subjourney to next step', () => {
    const subJourneyToStep3 = subJourneyGraph.edges.find(
      e => e.source === 'MFA' && e.target === 'Step3'
    );
    expect(subJourneyToStep3).toBeDefined();
  });

  it('should have correct node count including subjourney nodes', () => {
    expect(subJourneyGraph.nodes.length).toBe(8);
  });

  it('should create edges inside subjourney', () => {
    const startToStep = subJourneyGraph.edges.find(
      e => e.source === 'MFA-start' && e.target === 'MFA-Step1'
    );
    expect(startToStep).toBeDefined();

    const stepToEnd = subJourneyGraph.edges.find(
      e => e.source === 'MFA-Step1' && e.target === 'MFA-end'
    );
    expect(stepToEnd).toBeDefined();
  });
});
