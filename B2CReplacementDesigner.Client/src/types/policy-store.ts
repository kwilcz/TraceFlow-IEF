/**
 * Client-side types for Policy DOM and change tracking system
 */

import { PolicyEntities } from './trust-framework-entities';

export interface PolicyUploadResponse {
  files: PolicyFileInfo[];
  inheritanceGraph: PolicyInheritanceGraph;
  entities: PolicyEntities;
  consolidatedXml: string;
}

export interface PolicyFileInfo {
  fileName: string;
  policyId: string;
  content: string;
  basePolicy: string | null;
  fileSize: number;
  uploadedAt: string;
}

export interface PolicyInheritanceGraph {
  rootPolicyId: string | null;
  parentRelationships: Record<string, string>;
  childRelationships: Record<string, string[]>;
  hierarchyDepth: Record<string, number>;
}

/**
 * Policy DOM: Client-side representation of policy structure with source tracking
 */
export interface PolicyElement {
  /** Unique identifier for this element (e.g., "TechnicalProfile:SelfAsserted-LocalAccountSignin-Email") */
  id: string;
  
  /** Element type (TechnicalProfile, ClaimsProvider, OrchestrationStep, etc.) */
  type: PolicyElementType;
  
  /** Source file where this element was originally defined */
  sourceFile: string;
  
  /** PolicyId where this element was originally defined */
  sourcePolicyId: string;
  
  /** XPath to element in source file */
  xpath: string;
  
  /** Raw XML content of this element */
  content: string;
  
  /** Parsed element data (varies by type) */
  data: unknown;
  
  /** Whether this element overrides one from a base policy */
  hasOverrides: boolean;
  
  /** Base policy element ID if this is an override */
  overridesElementId?: string;
  
  /** Hierarchy depth (0 for root policy elements) */
  hierarchyDepth: number;
  
  /** Pending changes to this element */
  pendingChanges?: ChangeOperation[];
}

export type PolicyElementType = 
  | 'TechnicalProfile'
  | 'ClaimsProvider'
  | 'OrchestrationStep'
  | 'ClaimsSchema'
  | 'ClaimType'
  | 'ClaimsTransformation'
  | 'UserJourney';

/**
 * Change operation tracking
 */
export interface ChangeOperation {
  /** Unique ID for this change */
  id: string;
  
  /** Timestamp when change was created */
  timestamp: Date;
  
  /** Type of change */
  type: ChangeType;
  
  /** Target policy element */
  elementId: string;
  
  /** File where change will be applied (user can select different file) */
  targetFile: string;
  
  /** XPath where change will be applied */
  targetXPath: string;
  
  /** Change payload */
  payload: ChangePayload;
  
  /** Change description for UI */
  description: string;
  
  /** Validation status */
  validationStatus: ValidationStatus;
  
  /** Validation error message if invalid */
  validationError?: string;
}

export type ChangeType = 'modify' | 'add' | 'delete';

export interface ChangePayload {
  /** New XML content for modify/add operations */
  newContent?: string;
  
  /** Original content for rollback */
  originalContent?: string;
  
  /** Specific property changes for partial updates */
  propertyChanges?: Record<string, unknown>;
}

export type ValidationStatus = 'pending' | 'valid' | 'invalid';

/**
 * Policy store state
 */
export interface PolicyStoreState {
  /** Original uploaded files */
  originalFiles: Map<string, PolicyFileInfo>;
  
  /** Inheritance graph */
  inheritanceGraph: PolicyInheritanceGraph | null;
  
  /** All policy entities (claims, technical profiles, etc.) */
  entities: PolicyEntities | null;
  
  /** Consolidated XML for parsing (backward compatibility) */
  consolidatedXml: string | null;
  
  /** Pending changes queue */
  pendingChanges: ChangeOperation[];
  
  /** Change history (applied changes) */
  changeHistory: ChangeOperation[];
  
  /** Load state */
  isLoading: boolean;
  error: string | null;
}

/**
 * Policy store actions
 */
export interface PolicyStoreActions {
  /** Load policy data from upload response */
  loadPolicyData: (response: PolicyUploadResponse) => void;
  
  /** Queue a change operation */
  queueChange: (change: Omit<ChangeOperation, 'id' | 'timestamp' | 'validationStatus'>) => void;
  
  /** Update change target file */
  updateChangeTargetFile: (changeId: string, newTargetFile: string) => void;
  
  /** Validate a pending change */
  validateChange: (changeId: string) => Promise<void>;
  
  /** Apply pending changes and generate export data */
  exportChanges: () => Promise<ExportResult>;
  
  /** Discard a pending change */
  discardChange: (changeId: string) => void;
  
  /** Clear all pending changes */
  clearPendingChanges: () => void;
  
  /** Reset store to initial state */
  reset: () => void;
}

/**
 * Export result containing modified files
 */
export interface ExportResult {
  /** Modified files with updated XML */
  modifiedFiles: ModifiedFile[];
  
  /** Summary of changes */
  summary: ExportSummary;
  
  /** Validation errors if any */
  errors: string[];
}

export interface ModifiedFile {
  fileName: string;
  policyId: string;
  originalContent: string;
  modifiedContent: string;
  changes: ChangeOperation[];
}

export interface ExportSummary {
  totalChanges: number;
  filesAffected: number;
  changesByType: Record<ChangeType, number>;
}
