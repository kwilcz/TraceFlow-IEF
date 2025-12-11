using B2CReplacementDesigner.Server.Models;
using System.Xml;
using System.Xml.Linq;
using System.Xml.XPath;

namespace B2CReplacementDesigner.Server.Services
{
    /// <summary>
    /// Extracts policy entities from XML documents.
    /// Follows Single Responsibility Principle - focused solely on entity extraction.
    /// </summary>
    public class PolicyEntityExtractor : IPolicyEntityExtractor
    {
        private const string Namespace = "http://schemas.microsoft.com/online/cpim/schemas/2013/06";
        private readonly XmlNamespaceManager _nsManager;
        private readonly EntityExtractorFactory _extractorFactory;

        public PolicyEntityExtractor()
        {
            _nsManager = new XmlNamespaceManager(new NameTable());
            _nsManager.AddNamespace("tf", Namespace);
            _extractorFactory = new EntityExtractorFactory();
        }

        public void ExtractFromFile(
            XDocument policyXml,
            PolicyFileContext context,
            HashSet<string> processedEntityIds,
            PolicyEntities entities)
        {
            foreach (var extractor in _extractorFactory.GetAllExtractors())
            {
                extractor.ExtractAllFromFile(policyXml, context, processedEntityIds, entities);
            }
        }

        public void ExtractFromElement(
            XElement element,
            PolicyFileContext context,
            HashSet<string> processedEntityIds,
            PolicyEntities entities)
        {
            var extractor = _extractorFactory.GetExtractor(element.Name.LocalName);
            extractor?.ExtractFromElement(element, context, processedEntityIds, entities);
        }
    }
}
