using B2CReplacementDesigner.Server.Models;
using System.Xml.Linq;

namespace B2CReplacementDesigner.Server.Services
{
    /// <summary>
    /// Interface for entity extractors
    /// </summary>
    public interface IEntityExtractor
    {
        void ExtractFromElement(
            XElement element,
            PolicyFileContext context,
            HashSet<string> processedEntityIds,
            PolicyEntities entities);

        void ExtractAllFromFile(
            XDocument policyXml,
            PolicyFileContext context,
            HashSet<string> processedEntityIds,
            PolicyEntities entities);
    }
}