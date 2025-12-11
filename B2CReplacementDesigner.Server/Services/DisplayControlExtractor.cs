using B2CReplacementDesigner.Server.Models;
using System.Xml;
using System.Xml.Linq;
using System.Xml.XPath;

namespace B2CReplacementDesigner.Server.Services
{
    /// <summary>
    /// Extracts DisplayControl entities from XML
    /// </summary>
    public class DisplayControlExtractor : IEntityExtractor
    {
        private const string Namespace = "http://schemas.microsoft.com/online/cpim/schemas/2013/06";
        private readonly XmlNamespaceManager _nsManager;

        public DisplayControlExtractor()
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
            ExtractDisplayControl(element, context, processedEntityIds, entities);
        }

        public void ExtractAllFromFile(
            XDocument policyXml,
            PolicyFileContext context,
            HashSet<string> processedEntityIds,
            PolicyEntities entities)
        {
            var displayControls = policyXml.XPathSelectElements("//tf:DisplayControl", _nsManager);

            foreach (var controlElement in displayControls)
            {
                ExtractFromElement(controlElement, context, processedEntityIds, entities);
            }
        }

        private void ExtractDisplayControl(
            XElement controlElement,
            PolicyFileContext context,
            HashSet<string> processedEntityIds,
            PolicyEntities entities)
        {
            var id = controlElement.Attribute("Id")?.Value;
            if (string.IsNullOrEmpty(id)) return;

            var isOverride = processedEntityIds.Contains($"DisplayControl:{id}");
            processedEntityIds.Add($"DisplayControl:{id}");

            var entity = new DisplayControlEntity
            {
                Id = id,
                EntityType = "DisplayControl",
                UserInterfaceControlType = controlElement.Attribute("UserInterfaceControlType")?.Value ?? "",
                SourceFile = context.FileName,
                SourcePolicyId = context.PolicyId,
                HierarchyDepth = context.HierarchyDepth,
                IsOverride = isOverride,
                XPath = GetXPath(controlElement),
                RawXml = controlElement.ToString(SaveOptions.DisableFormatting)
            };

            // Extract display claims
            var displayClaims = controlElement.Element(XName.Get("DisplayClaims", Namespace));
            if (displayClaims != null)
            {
                foreach (var claim in displayClaims.Elements(XName.Get("DisplayClaim", Namespace)))
                {
                    entity.DisplayClaims.Add(ExtractClaimReference(claim));
                }
            }

            // Extract input claims
            var inputClaims = controlElement.Element(XName.Get("InputClaims", Namespace));
            if (inputClaims != null)
            {
                foreach (var claim in inputClaims.Elements(XName.Get("InputClaim", Namespace)))
                {
                    entity.InputClaims.Add(ExtractClaimReference(claim));
                }
            }

            // Extract output claims
            var outputClaims = controlElement.Element(XName.Get("OutputClaims", Namespace));
            if (outputClaims != null)
            {
                foreach (var claim in outputClaims.Elements(XName.Get("OutputClaim", Namespace)))
                {
                    entity.OutputClaims.Add(ExtractClaimReference(claim));
                }
            }

            // Extract actions
            var actions = controlElement.Element(XName.Get("Actions", Namespace));
            if (actions != null)
            {
                foreach (var action in actions.Elements(XName.Get("Action", Namespace)))
                {
                    var actionInfo = new DisplayControlActionInfo
                    {
                        Id = action.Attribute("Id")?.Value ?? ""
                    };

                    var validationClaimsExchanges = action.Element(XName.Get("ValidationClaimsExchange", Namespace));
                    if (validationClaimsExchanges != null)
                    {
                        foreach (var exchange in validationClaimsExchanges.Elements(XName.Get("ClaimsExchange", Namespace)))
                        {
                            var refId = exchange.Attribute("TechnicalProfileReferenceId")?.Value;
                            if (!string.IsNullOrEmpty(refId))
                            {
                                actionInfo.ValidationClaimsExchanges.Add(refId);
                            }
                        }
                    }

                    entity.Actions.Add(actionInfo);
                }
            }

            if (!entities.DisplayControls.ContainsKey(id))
            {
                entities.DisplayControls[id] = new List<DisplayControlEntity>();
            }
            entities.DisplayControls[id].Add(entity);
        }

        private ClaimReferenceInfo ExtractClaimReference(XElement claimElement)
        {
            return new ClaimReferenceInfo
            {
                ClaimTypeReferenceId = claimElement.Attribute("ClaimTypeReferenceId")?.Value,
                PartnerClaimType = claimElement.Attribute("PartnerClaimType")?.Value ?? claimElement.Attribute("TransformationClaimType")?.Value,
                DefaultValue = claimElement.Attribute("DefaultValue")?.Value,
                AlwaysUseDefaultValue = claimElement.Attribute("AlwaysUseDefaultValue")?.Value == "true",
                Required = claimElement.Attribute("Required")?.Value == "true",
                DisplayControlReferenceId = claimElement.Attribute("DisplayControlReferenceId")?.Value
            };
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