using B2CReplacementDesigner.Server.Models;
using System.Xml;
using System.Xml.Linq;
using System.Xml.XPath;

namespace B2CReplacementDesigner.Server.Services
{
    /// <summary>
    /// Extracts ClaimType entities from XML
    /// </summary>
    public class ClaimTypeExtractor : IEntityExtractor
    {
        private const string Namespace = "http://schemas.microsoft.com/online/cpim/schemas/2013/06";
        private readonly XmlNamespaceManager _nsManager;

        public ClaimTypeExtractor()
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
            ExtractClaimType(element, context, processedEntityIds, entities);
        }

        public void ExtractAllFromFile(
            XDocument policyXml,
            PolicyFileContext context,
            HashSet<string> processedEntityIds,
            PolicyEntities entities)
        {
            var claimTypes = policyXml.XPathSelectElements("//tf:ClaimType", _nsManager);

            foreach (var claimElement in claimTypes)
            {
                ExtractFromElement(claimElement, context, processedEntityIds, entities);
            }
        }

        private void ExtractClaimType(
            XElement claimElement,
            PolicyFileContext context,
            HashSet<string> processedEntityIds,
            PolicyEntities entities)
        {
            var id = claimElement.Attribute("Id")?.Value;
            if (string.IsNullOrEmpty(id)) return;

            var isOverride = processedEntityIds.Contains($"ClaimType:{id}");
            processedEntityIds.Add($"ClaimType:{id}");

            var entity = new ClaimTypeEntity
            {
                Id = id,
                EntityType = "ClaimType",
                DisplayName = claimElement.Element(XName.Get("DisplayName", Namespace))?.Value,
                DataType = claimElement.Element(XName.Get("DataType", Namespace))?.Value,
                UserInputType = claimElement.Element(XName.Get("UserInputType", Namespace))?.Value,
                Mask = claimElement.Element(XName.Get("Mask", Namespace))?.Value,
                AdminHelpText = claimElement.Element(XName.Get("AdminHelpText", Namespace))?.Value,
                UserHelpText = claimElement.Element(XName.Get("UserHelpText", Namespace))?.Value,
                PredicateValidationReference = claimElement.Element(XName.Get("PredicateValidationReference", Namespace))?.Attribute("ReferenceId")?.Value,
                SourceFile = context.FileName,
                SourcePolicyId = context.PolicyId,
                HierarchyDepth = context.HierarchyDepth,
                IsOverride = isOverride,
                XPath = GetXPath(claimElement),
                RawXml = claimElement.ToString(SaveOptions.DisableFormatting)
            };

            // Extract restriction
            var restriction = claimElement.Element(XName.Get("Restriction", Namespace));
            if (restriction != null)
            {
                entity.Restriction = new RestrictionInfo
                {
                    Pattern = restriction.Element(XName.Get("Pattern", Namespace))?.Value
                };

                var enumeration = restriction.Element(XName.Get("Enumeration", Namespace));
                if (enumeration != null)
                {
                    foreach (var item in enumeration.Elements(XName.Get("Item", Namespace)))
                    {
                        entity.Restriction.Enumeration.Add(new Models.EnumerationItem
                        {
                            Value = item.Attribute("Value")?.Value ?? "",
                            Text = item.Attribute("Text")?.Value ?? item.Attribute("Value")?.Value ?? "",
                            SelectByDefault = item.Attribute("SelectByDefault")?.Value == "true"
                        });
                    }
                }
            }

            // Extract default partner claim types
            var defaultPartners = claimElement.Element(XName.Get("DefaultPartnerClaimTypes", Namespace));
            if (defaultPartners != null)
            {
                foreach (var protocol in defaultPartners.Elements(XName.Get("Protocol", Namespace)))
                {
                    var protocolName = protocol.Attribute("Name")?.Value;
                    var partnerClaimType = protocol.Attribute("PartnerClaimType")?.Value;
                    if (!string.IsNullOrEmpty(protocolName) && !string.IsNullOrEmpty(partnerClaimType))
                    {
                        entity.DefaultPartnerClaimTypes[protocolName] = partnerClaimType;
                    }
                }
            }

            if (!entities.ClaimTypes.ContainsKey(id))
            {
                entities.ClaimTypes[id] = new List<ClaimTypeEntity>();
            }
            entities.ClaimTypes[id].Add(entity);
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