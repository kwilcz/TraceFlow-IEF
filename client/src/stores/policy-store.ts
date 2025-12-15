import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  PolicyStoreState,
  PolicyStoreActions,
  PolicyUploadResponse,
  PolicyElementType,
  ChangeOperation,
  ExportResult,
  ModifiedFile,
  ChangeType,
} from '@/types/policy-store';

type PolicyStore = PolicyStoreState & PolicyStoreActions;

const initialState: PolicyStoreState = {
  originalFiles: new Map(),
  inheritanceGraph: null,
  entities: null,
  consolidatedXml: null,
  pendingChanges: [],
  changeHistory: [],
  isLoading: false,
  error: null,
};

export const usePolicyStore = create<PolicyStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

      loadPolicyData: (response: PolicyUploadResponse) => {
        set({ isLoading: true, error: null });

        try {
          const filesMap = new Map(
            response.files.map(file => [file.fileName, file])
          );

          set({
            originalFiles: filesMap,
            inheritanceGraph: response.inheritanceGraph,
            entities: response.entities,
            consolidatedXml: response.consolidatedXml,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load policy data',
            isLoading: false,
          });
        }
      },

      queueChange: (change) => {
        const newChange: ChangeOperation = {
          ...change,
          id: crypto.randomUUID(),
          timestamp: new Date(),
          validationStatus: 'pending',
        };

        set(state => ({
          pendingChanges: [...state.pendingChanges, newChange],
        }));

        // Auto-validate the change
        setTimeout(() => get().validateChange(newChange.id), 0);
      },

      updateChangeTargetFile: (changeId: string, newTargetFile: string) => {
        set(state => ({
          pendingChanges: state.pendingChanges.map(change =>
            change.id === changeId
              ? { ...change, targetFile: newTargetFile, validationStatus: 'pending' as const }
              : change
          ),
        }));

        // Re-validate after file change
        setTimeout(() => get().validateChange(changeId), 0);
      },

      validateChange: async (changeId: string) => {
        const state = get();
        const change = state.pendingChanges.find(c => c.id === changeId);
        
        if (!change) return;

        // Validate target file exists
        const targetFile = state.originalFiles.get(change.targetFile);
        if (!targetFile) {
          set(state => ({
            pendingChanges: state.pendingChanges.map(c =>
              c.id === changeId
                ? {
                    ...c,
                    validationStatus: 'invalid' as const,
                    validationError: `Target file '${change.targetFile}' not found`,
                  }
                : c
            ),
          }));
          return;
        }

        // Validate XML structure if modifying/adding
        if (change.type !== 'delete' && change.payload.newContent) {
          try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(change.payload.newContent, 'text/xml');
            const parseError = doc.querySelector('parsererror');
            
            if (parseError) {
              throw new Error('Invalid XML structure');
            }
          } catch (error) {
            set(state => ({
              pendingChanges: state.pendingChanges.map(c =>
                c.id === changeId
                  ? {
                      ...c,
                      validationStatus: 'invalid' as const,
                      validationError: error instanceof Error ? error.message : 'XML validation failed',
                    }
                  : c
              ),
            }));
            return;
          }
        }

        // Mark as valid
        set(state => ({
          pendingChanges: state.pendingChanges.map(c =>
            c.id === changeId
              ? {
                  ...c,
                  validationStatus: 'valid' as const,
                  validationError: undefined,
                }
              : c
          ),
        }));
      },

      exportChanges: async () => {
        const state = get();
        const invalidChanges = state.pendingChanges.filter(c => c.validationStatus === 'invalid');
        
        if (invalidChanges.length > 0) {
          return {
            modifiedFiles: [],
            summary: {
              totalChanges: 0,
              filesAffected: 0,
              changesByType: { modify: 0, add: 0, delete: 0 },
            },
            errors: invalidChanges.map(c => `${c.description}: ${c.validationError}`),
          };
        }

        // Group changes by target file
        const changesByFile = new Map<string, ChangeOperation[]>();
        for (const change of state.pendingChanges) {
          if (!changesByFile.has(change.targetFile)) {
            changesByFile.set(change.targetFile, []);
          }
          changesByFile.get(change.targetFile)!.push(change);
        }

        const modifiedFiles: ModifiedFile[] = [];

        // Apply changes to each file
        for (const fileName of Array.from(changesByFile.keys())) {
          const changes = changesByFile.get(fileName)!;
          const fileInfo = state.originalFiles.get(fileName);
          if (!fileInfo) continue;

          const modifiedContent = fileInfo.content;

          // Apply each change
          // TODO: Implement actual XML modification logic using XPath
          // For now, this is a placeholder that would need XML manipulation
          
          modifiedFiles.push({
            fileName,
            policyId: fileInfo.policyId,
            originalContent: fileInfo.content,
            modifiedContent,
            changes,
          });
        }

        // Calculate summary
        const changesByType = state.pendingChanges.reduce(
          (acc, change) => {
            acc[change.type]++;
            return acc;
          },
          { modify: 0, add: 0, delete: 0 } as Record<ChangeType, number>
        );

        const result: ExportResult = {
          modifiedFiles,
          summary: {
            totalChanges: state.pendingChanges.length,
            filesAffected: changesByFile.size,
            changesByType,
          },
          errors: [],
        };

        // Move pending changes to history
        set({
          changeHistory: [...state.changeHistory, ...state.pendingChanges],
          pendingChanges: [],
        });

        return result;
      },

      discardChange: (changeId: string) => {
        set(state => ({
          pendingChanges: state.pendingChanges.filter(c => c.id !== changeId),
        }));
      },

      clearPendingChanges: () => {
        set({ pendingChanges: [] });
      },

      reset: () => {
        set(initialState);
      },
    }),
      {
        name: 'policy-store',
        partialize: (state) => ({
          originalFiles: state.originalFiles,
          inheritanceGraph: state.inheritanceGraph,
          entities: state.entities,
          consolidatedXml: state.consolidatedXml,
        }),
      }
    ),
    {
      name: 'policy-store-devtools',
    }
  )
);
