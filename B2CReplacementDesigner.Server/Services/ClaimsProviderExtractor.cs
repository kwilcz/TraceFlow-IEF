using B2CReplacementDesigner.Server.Models;
using System.Xml;
using System.Xml.Linq;
using System.Xml.XPath;

namespace B2CReplacementDesigner.Server.Services
{
    /// <summary>
    /// Extracts ClaimsProvider entities from XML
    /// </summary>
    public class ClaimsProviderExtractor : IEntityExtractor
    {
        private const string Namespace = "http://schemas.microsoft.com/online/cpim/schemas/2013/06";
        private readonly XmlNamespaceManager _nsManager;

        public ClaimsProviderExtractor()
        {
            _nsManager = new XmlNamespaceManager(new NameTable());
            _nsManager.AddNamespace("tf", Namespace);
        }

        public void ExtractFromElement(
            XElement element,
            PolicyFileContext context,
            HashSet<string> processedEntityIds,
            PolicyEntities entities)
        {
            ExtractClaimsProvider(element, context, processedEntityIds, entities);
        }

        public void ExtractAllFromFile(
            XDocument policyXml,
            PolicyFileContext context,
            HashSet<string> processedEntityIds,
            PolicyEntities entities)
        {
            var claimsProviders = policyXml.XPathSelectElements("//tf:ClaimsProvider", _nsManager);

            foreach (var providerElement in claimsProviders)
            {
                ExtractFromElement(providerElement, context, processedEntityIds, entities);
            }
        }

        private void ExtractClaimsProvider(
            XElement providerElement,
            PolicyFileContext context,
            HashSet<string> processedEntityIds,
            PolicyEntities entities)
        {
            var displayName = providerElement.Element(XName.Get("DisplayName", Namespace))?.Value ?? "Unknown";
            var id = displayName;

            var isOverride = processedEntityIds.Contains($"ClaimsProvider:{id}");
            processedEntityIds.Add($"ClaimsProvider:{id}");

            var entity = new ClaimsProviderEntity
            {
                Id = id,
                EntityType = "ClaimsProvider",
                DisplayName = displayName,
                SourceFile = context.FileName,
                SourcePolicyId = context.PolicyId,
                HierarchyDepth = context.HierarchyDepth,
                IsOverride = isOverride,
                XPath = GetXPath(providerElement),
                RawXml = providerElement.ToString(SaveOptions.DisableFormatting)
            };

            // Extract technical profiles
            var technicalProfiles = providerElement.XPathSelectElements(".//tf:TechnicalProfile", _nsManager);
            foreach (var tp in technicalProfiles)
            {
                var tpId = tp.Attribute("Id")?.Value;
                if (!string.IsNullOrEmpty(tpId))
                {
                    entity.TechnicalProfileIds.Add(tpId);
                }
            }

            if (!entities.ClaimsProviders.ContainsKey(id))
            {
                entities.ClaimsProviders[id] = new List<ClaimsProviderEntity>();
            }
            entities.ClaimsProviders[id].Add(entity);
        }

        private string GetXPath(XElement element)
        {
            var components = new Stack<string>();

            while (element != null)
            {
                var index = element.ElementsBeforeSelf(element.Name).Count() + 1;
                components.Push($"{element.Name.LocalName}[{index}]");
                element = element.Parent!;
            }

            return "/" + string.Join("/", components);
        }
    }
}