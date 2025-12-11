using B2CReplacementDesigner.Server.Models;
using System.Xml.Linq;

namespace B2CReplacementDesigner.Server.Services
{
    /// <summary>
    /// Result of policy consolidation containing both merged XML and extracted entities
    /// </summary>
    public class ConsolidationResult
    {
        public XDocument ConsolidatedXml { get; init; } = new XDocument();
        public PolicyEntities Entities { get; init; } = new PolicyEntities();
    }

    /// <summary>
    /// Metadata about a policy file being consolidated
    /// </summary>
    public class PolicyFileMetadata
    {
        public string FileName { get; init; } = string.Empty;
        public string PolicyId { get; init; } = string.Empty;
        public XDocument Document { get; init; } = new XDocument();
        public int HierarchyDepth { get; init; }
    }

    /// <summary>
    /// Consolidates multiple policy XML documents into a single merged document
    /// and extracts entities with accurate source tracking.
    /// Uses composition - delegates entity extraction to IPolicyEntityExtractor.
    /// </summary>
    public interface IPolicyConsolidator
    {
        /// <summary>
        /// Consolidates policy files and extracts entities in a single pass.
        /// Orchestrates the flow: for each file, extract entities, then merge XML.
        /// </summary>
        /// <param name="policyFiles">Policy files in inheritance order (base to extension)</param>
        /// <returns>Consolidation result with merged XML and extracted entities</returns>
        ConsolidationResult Consolidate(IEnumerable<PolicyFileMetadata> policyFiles);
    }
}
