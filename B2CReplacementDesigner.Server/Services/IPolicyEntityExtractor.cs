using B2CReplacementDesigner.Server.Models;
using System.Xml.Linq;

namespace B2CReplacementDesigner.Server.Services
{
    /// <summary>
    /// Metadata about a policy file for entity extraction
    /// </summary>
    public class PolicyFileContext
    {
        /// <summary>
        /// Original filename (e.g., "TrustFrameworkBase.xml")
        /// </summary>
        public string FileName { get; init; } = string.Empty;

        /// <summary>
        /// Policy ID from the XML
        /// </summary>
        public string PolicyId { get; init; } = string.Empty;

        /// <summary>
        /// Hierarchy depth in policy inheritance (0 = root)
        /// </summary>
        public int HierarchyDepth { get; init; }
    }

    /// <summary>
    /// Extracts policy entities from XML documents.
    /// Follows Single Responsibility Principle - only handles entity extraction.
    /// </summary>
    public interface IPolicyEntityExtractor
    {
        /// <summary>
        /// Extracts all entities from a single policy file.
        /// Source file information is provided via context parameter for accurate tracking.
        /// </summary>
        /// <param name="policyXml">The policy XML document to extract entities from</param>
        /// <param name="context">Context about the source file</param>
        /// <param name="processedEntityIds">Set of already processed entity IDs to detect overrides</param>
        void ExtractFromFile(
            XDocument policyXml, 
            PolicyFileContext context,
            HashSet<string> processedEntityIds,
            PolicyEntities entities);

        /// <summary>
        /// Extracts entity from a single XML element that was added during merge.
        /// </summary>
        /// <param name="element">The XML element to extract entity from</param>
        /// <param name="context">Context about the source file</param>
        /// <param name="processedEntityIds">Set of already processed entity IDs to detect overrides</param>
        /// <param name="entities">The entities collection to add to</param>
        void ExtractFromElement(
            XElement element,
            PolicyFileContext context,
            HashSet<string> processedEntityIds,
            PolicyEntities entities);
    }
}
