using B2CReplacementDesigner.Server.Models;
using System.Xml.Linq;

namespace B2CReplacementDesigner.Server.Services
{
    /// <summary>
    /// Merges policy XML documents and extracts entities during the merge process.
    /// Follows Single Responsibility Principle - handles policy merging with entity extraction.
    /// </summary>
    public interface IPolicyMerger
    {
        /// <summary>
        /// Merges two policy documents and extracts entities from elements that are added during the merge.
        /// </summary>
        /// <param name="toMergeInto">The target policy document to merge into</param>
        /// <param name="toBeMerged">The source policy document to be merged</param>
        /// <param name="context">Context about the source file being merged</param>
        /// <param name="entities">The entities collection to add extracted entities to</param>
        /// <param name="processedEntityIds">Set of already processed entity IDs to detect overrides</param>
        /// <returns>The merged policy document</returns>
        XDocument MergePolicies(
            XDocument toMergeInto,
            XDocument toBeMerged,
            PolicyFileContext context,
            PolicyEntities entities,
            HashSet<string> processedEntityIds);
    }
}