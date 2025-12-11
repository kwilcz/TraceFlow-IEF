using System.Xml.Linq;
using B2CReplacementDesigner.Server.Constants;
using B2CReplacementDesigner.Server.Extensions;
using B2CReplacementDesigner.Server.Models;

namespace B2CReplacementDesigner.Server.Services
{
    /// <summary>
    /// Orchestrates policy consolidation and entity extraction.
    /// Uses composition: delegates entity extraction to IPolicyEntityExtractor and merging to IPolicyMerger (Dependency Inversion Principle).
    /// Coordinates the flow: extract entities from initial file, then merge with entity extraction.
    /// </summary>
    public class PolicyConsolidator : IPolicyConsolidator
    {
        private readonly IPolicyEntityExtractor _entityExtractor;
        private readonly IPolicyMerger _merger;

        public PolicyConsolidator(IPolicyEntityExtractor entityExtractor, IPolicyMerger merger)
        {
            _entityExtractor = entityExtractor;
            _merger = merger;
        }

        public ConsolidationResult Consolidate(IEnumerable<PolicyFileMetadata> policyFiles)
        {
            XDocument? consolidatedDocument = null;
            var entities = new PolicyEntities();
            var processedEntityIds = new HashSet<string>();

            foreach (var policyFile in policyFiles)
            {
                var context = new PolicyFileContext
                {
                    FileName = policyFile.FileName,
                    PolicyId = policyFile.PolicyId,
                    HierarchyDepth = policyFile.HierarchyDepth
                };

                if (consolidatedDocument == null)
                {
                    consolidatedDocument = policyFile.Document;
                    _entityExtractor.ExtractFromFile(
                        consolidatedDocument,
                        context,
                        processedEntityIds,
                        entities
                    );
                }
                else
                {
                    consolidatedDocument = _merger.MergePolicies(
                        consolidatedDocument,
                        policyFile.Document,
                        context,
                        entities,
                        processedEntityIds
                    );
                }
            }

            if (consolidatedDocument == null)
            {
                return new ConsolidationResult
                {
                    ConsolidatedXml = new XDocument(),
                    Entities = entities
                };
            }

            // add final entities to result
            var contextFinal = new PolicyFileContext
            {
                FileName = ConsolidationConstants.ConsolidatedFileName,
                PolicyId = ConsolidationConstants.ConsolidatedPolicyId
            };
            _entityExtractor.ExtractFromFile(
                consolidatedDocument,
                contextFinal,
                processedEntityIds,
                entities
            );

            return new ConsolidationResult
            {
                ConsolidatedXml = consolidatedDocument,
                Entities = entities
            };
        }
    }
}
