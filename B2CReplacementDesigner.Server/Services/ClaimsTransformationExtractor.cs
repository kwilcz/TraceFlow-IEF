using B2CReplacementDesigner.Server.Models;
using System.Xml;
using System.Xml.Linq;
using System.Xml.XPath;

namespace B2CReplacementDesigner.Server.Services
{
    /// <summary>
    /// Extracts ClaimsTransformation entities from XML
    /// </summary>
    public class ClaimsTransformationExtractor : IEntityExtractor
    {
        private const string Namespace = "http://schemas.microsoft.com/online/cpim/schemas/2013/06";
        private readonly XmlNamespaceManager _nsManager;

        public ClaimsTransformationExtractor()
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
            ExtractClaimsTransformation(element, context, processedEntityIds, entities);
        }

        public void ExtractAllFromFile(
            XDocument policyXml,
            PolicyFileContext context,
            HashSet<string> processedEntityIds,
            PolicyEntities entities)
        {
            var claimsTransformations = policyXml.XPathSelectElements("//tf:ClaimsTransformation", _nsManager);

            foreach (var transformElement in claimsTransformations)
            {
                ExtractFromElement(transformElement, context, processedEntityIds, entities);
            }
        }

        private void ExtractClaimsTransformation(
            XElement transformElement,
            PolicyFileContext context,
            HashSet<string> processedEntityIds,
            PolicyEntities entities)
        {
            var id = transformElement.Attribute("Id")?.Value;
            if (string.IsNullOrEmpty(id)) return;

            var isOverride = processedEntityIds.Contains($"ClaimsTransformation:{id}");
            processedEntityIds.Add($"ClaimsTransformation:{id}");

            var entity = new ClaimsTransformationEntity
            {
                Id = id,
                EntityType = "ClaimsTransformation",
                TransformationMethod = transformElement.Attribute("TransformationMethod")?.Value ?? "",
                SourceFile = context.FileName,
                SourcePolicyId = context.PolicyId,
                HierarchyDepth = context.HierarchyDepth,
                IsOverride = isOverride,
                XPath = GetXPath(transformElement),
                RawXml = transformElement.ToString(SaveOptions.DisableFormatting)
            };

            // Extract input claims
            var inputClaims = transformElement.Element(XName.Get("InputClaims", Namespace));
            if (inputClaims != null)
            {
                foreach (var claim in inputClaims.Elements(XName.Get("InputClaim", Namespace)))
                {
                    entity.InputClaims.Add(ExtractClaimReference(claim));
                }
            }

            // Extract input parameters
            var inputParameters = transformElement.Element(XName.Get("InputParameters", Namespace));
            if (inputParameters != null)
            {
                foreach (var param in inputParameters.Elements(XName.Get("InputParameter", Namespace)))
                {
                    entity.InputParameters.Add(new InputParameterInfo
                    {
                        Id = param.Attribute("Id")?.Value ?? "",
                        DataType = param.Attribute("DataType")?.Value ?? "",
                        Value = param.Attribute("Value")?.Value ?? ""
                    });
                }
            }

            // Extract output claims
            var outputClaims = transformElement.Element(XName.Get("OutputClaims", Namespace));
            if (outputClaims != null)
            {
                foreach (var claim in outputClaims.Elements(XName.Get("OutputClaim", Namespace)))
                {
                    entity.OutputClaims.Add(ExtractClaimReference(claim));
                }
            }

            if (!entities.ClaimsTransformations.ContainsKey(id))
            {
                entities.ClaimsTransformations[id] = new List<ClaimsTransformationEntity>();
            }
            entities.ClaimsTransformations[id].Add(entity);
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