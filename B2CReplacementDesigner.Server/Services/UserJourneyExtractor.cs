using B2CReplacementDesigner.Server.Models;
using System.Xml;
using System.Xml.Linq;
using System.Xml.XPath;

namespace B2CReplacementDesigner.Server.Services
{
    /// <summary>
    /// Extracts UserJourney entities from XML
    /// </summary>
    public class UserJourneyExtractor : IEntityExtractor
    {
        private const string Namespace = "http://schemas.microsoft.com/online/cpim/schemas/2013/06";
        private readonly XmlNamespaceManager _nsManager;

        public UserJourneyExtractor()
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
            ExtractUserJourney(element, context, processedEntityIds, entities);
        }

        public void ExtractAllFromFile(
            XDocument policyXml,
            PolicyFileContext context,
            HashSet<string> processedEntityIds,
            PolicyEntities entities)
        {
            var userJourneys = policyXml.XPathSelectElements("//tf:UserJourney", _nsManager);

            foreach (var journeyElement in userJourneys)
            {
                ExtractFromElement(journeyElement, context, processedEntityIds, entities);
            }
        }

        private void ExtractUserJourney(
            XElement journeyElement,
            PolicyFileContext context,
            HashSet<string> processedEntityIds,
            PolicyEntities entities)
        {
            var id = journeyElement.Attribute("Id")?.Value;
            if (string.IsNullOrEmpty(id)) return;

            var isOverride = processedEntityIds.Contains($"UserJourney:{id}");
            processedEntityIds.Add($"UserJourney:{id}");

            var entity = new UserJourneyEntity
            {
                Id = id,
                EntityType = "UserJourney",
                DefaultCpimIssuerTechnicalProfileReferenceId = journeyElement.Attribute("DefaultCpimIssuerTechnicalProfileReferenceId")?.Value,
                SourceFile = context.FileName,
                SourcePolicyId = context.PolicyId,
                HierarchyDepth = context.HierarchyDepth,
                IsOverride = isOverride,
                XPath = GetXPath(journeyElement),
                RawXml = journeyElement.ToString(SaveOptions.DisableFormatting)
            };

            // Extract orchestration steps
            var orchestrationSteps = journeyElement.Element(XName.Get("OrchestrationSteps", Namespace));
            if (orchestrationSteps != null)
            {
                foreach (var stepElement in orchestrationSteps.Elements(XName.Get("OrchestrationStep", Namespace)))
                {
                    entity.OrchestrationSteps.Add(ExtractOrchestrationStep(stepElement));
                }
            }

            if (!entities.UserJourneys.ContainsKey(id))
            {
                entities.UserJourneys[id] = new List<UserJourneyEntity>();
            }
            entities.UserJourneys[id].Add(entity);
        }

        private OrchestrationStepInfo ExtractOrchestrationStep(XElement stepElement)
        {
            var step = new OrchestrationStepInfo
            {
                Order = int.TryParse(stepElement.Attribute("Order")?.Value, out var order) ? order : 0,
                Type = stepElement.Attribute("Type")?.Value ?? "",
                ContentDefinitionReferenceId = stepElement.Attribute("ContentDefinitionReferenceId")?.Value
            };

            // Extract claims exchanges
            var claimsExchanges = stepElement.Element(XName.Get("ClaimsExchanges", Namespace));
            if (claimsExchanges != null)
            {
                foreach (var exchange in claimsExchanges.Elements(XName.Get("ClaimsExchange", Namespace)))
                {
                    step.ClaimsExchanges.Add(new ClaimsExchangeInfo
                    {
                        Id = exchange.Attribute("Id")?.Value ?? "",
                        TechnicalProfileReferenceId = exchange.Attribute("TechnicalProfileReferenceId")?.Value ?? ""
                    });
                }
            }

            // Extract preconditions
            var preconditions = stepElement.Element(XName.Get("Preconditions", Namespace));
            if (preconditions != null)
            {
                foreach (var precondition in preconditions.Elements(XName.Get("Precondition", Namespace)))
                {
                    var preconditionInfo = new PreconditionInfo
                    {
                        Type = precondition.Attribute("Type")?.Value ?? "",
                        ExecuteActionsIf = precondition.Attribute("ExecuteActionsIf")?.Value == "true",
                        Action = precondition.Attribute("Action")?.Value ?? ""
                    };

                    // Extract values
                    var values = precondition.Element(XName.Get("Value", Namespace));
                    if (values != null)
                    {
                        preconditionInfo.Values.Add(values.Value);
                    }

                    step.Preconditions.Add(preconditionInfo);
                }
            }

            return step;
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