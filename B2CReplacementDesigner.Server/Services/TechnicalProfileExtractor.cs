using System.Xml;
using System.Xml.Linq;
using System.Xml.XPath;
using B2CReplacementDesigner.Server.Constants;
using B2CReplacementDesigner.Server.Models;

namespace B2CReplacementDesigner.Server.Services
{
    /// <summary>
    /// Extracts TechnicalProfile entities from XML
    /// </summary>
    public class TechnicalProfileExtractor : IEntityExtractor
    {
        private const string Namespace = "http://schemas.microsoft.com/online/cpim/schemas/2013/06";
        private readonly XmlNamespaceManager _nsManager;

        public TechnicalProfileExtractor()
        {
            _nsManager = new XmlNamespaceManager(new NameTable());
            _nsManager.AddNamespace("tf", Namespace);
        }

        public void ExtractFromElement(
            XElement element,
            PolicyFileContext context,
            HashSet<string> processedEntityIds,
            PolicyEntities entities
        )
        {
            ExtractTechnicalProfile(element, context, processedEntityIds, entities);
        }

        private void ExtractTechnicalProfile(
            XElement profileElement,
            PolicyFileContext context,
            HashSet<string> processedEntityIds,
            PolicyEntities entities
        )
        {
            var id = profileElement.Attribute("Id")?.Value;

            if (string.IsNullOrEmpty(id))
                return;

            var isOverride = processedEntityIds.Contains($"TechnicalProfile:{id}");
            processedEntityIds.Add($"TechnicalProfile:{id}");

            var providerElement = profileElement
                .Ancestors(XName.Get("ClaimsProvider", Namespace))
                .FirstOrDefault();
            var providerDisplayName = providerElement
                ?.Element(XName.Get("DisplayName", Namespace))
                ?.Value;

            var protocolElement = profileElement.XPathSelectElement(".//tf:Protocol", _nsManager);

            var protocolHandler = protocolElement?.Attribute("Handler")?.Value;
            var providerName = protocolHandler
                ?.Split(',')
                .FirstOrDefault()
                ?.Split('.')
                .LastOrDefault();

            var entity = new TechnicalProfileEntity
            {
                Id = id,
                EntityType = "TechnicalProfile",
                DisplayName = profileElement.Element(XName.Get("DisplayName", Namespace))?.Value,
                Description = profileElement.Element(XName.Get("Description", Namespace))?.Value,
                ProtocolName = protocolElement?.Attribute("Name")?.Value,
                ProtocolHandler = protocolHandler,
                ProviderName = providerName,
                ClaimsProviderDisplayName = providerDisplayName,
                SourceFile = context.FileName,
                SourcePolicyId = context.PolicyId,
                HierarchyDepth = context.HierarchyDepth,
                IsOverride = isOverride,
                XPath = GetXPath(profileElement),
                RawXml = profileElement.ToString(SaveOptions.DisableFormatting)
            };

            ExtractMetadata(profileElement, entity);
            ExtractInputClaimsTransformations(profileElement, entity);
            ExtractInputClaims(profileElement, entity);
            ExtractDisplayClaims(profileElement, entity);
            ExtractDisplayControls(profileElement, entity);
            ExtractPersistedClaims(profileElement, entity);
            ExtractOutputClaims(profileElement, entity);
            ExtractOutputClaimsTransformations(profileElement, entity);
            ExtractValidationTechnicalProfiles(profileElement, entity);
            ExtractIncludeTechnicalProfile(profileElement, entity);

            BuildInheritanceChain(entity, entities);

            if (!entities.TechnicalProfiles.ContainsKey(id))
            {
                entities.TechnicalProfiles[id] = new List<TechnicalProfileEntity>();
            }
            entities.TechnicalProfiles[id].Add(entity);
        }

        /// <summary>
        /// Builds the inheritance chain for a technical profile. Inheritance can be:
        ///  - Direct: same Id appears in a base policy file (override scenario)
        ///  - Include: via IncludeTechnicalProfile references forming a chain
        /// For each Id we only keep the highest (root-most) definition's file/policy to avoid duplicates
        /// when the same technical profile is re-defined multiple times.
        /// </summary>
        private void BuildInheritanceChain(TechnicalProfileEntity entity, PolicyEntities entities)
        {
            if (
                entity.SourceFile == ConsolidationConstants.ConsolidatedFileName
                || entity.SourceFile == ConsolidationConstants.ConsolidatedPolicyId
            )
            {
                var highestHierarchyTp = entities
                    .TechnicalProfiles.Values.SelectMany(list => list).Where(tp =>
                        tp.Id == entity.Id
                        && tp.SourceFile != ConsolidationConstants.ConsolidatedFileName
                        && tp.SourcePolicyId != ConsolidationConstants.ConsolidatedPolicyId
                    )
                    .OrderBy(tp => tp.HierarchyDepth)
                    .LastOrDefault();

                if (highestHierarchyTp != null)
                {
                    entity.InheritanceChain = highestHierarchyTp.InheritanceChain;
                    return;
                }
            }
            entity.InheritanceChain.Add(
                new InheritanceInfo
                {
                    ProfileId = entity.Id,
                    PolicyId = entity.SourcePolicyId,
                    FileName = entity.SourceFile,
                    InheritanceType = InheritanceType.Direct
                }
            );

            // Handle direct inheritance (overrides of the same Id across files).
            if (entity.IsOverride)
            {
                // Add all previous definitions (base to closest) to the chain, but ignore the temporary consolidated policy.
                var previousDefinitions = entities
                    .TechnicalProfiles.Values.SelectMany(list => list).Where(tp =>
                        tp.Id == entity.Id
                        && tp.SourceFile != entity.SourceFile
                        && tp.SourceFile != ConsolidationConstants.ConsolidatedFileName
                        && tp.SourcePolicyId != ConsolidationConstants.ConsolidatedPolicyId
                    )
                    .OrderBy(tp => tp.HierarchyDepth)
                    .ToList();
                foreach (var previous in previousDefinitions)
                {
                    entity.InheritanceChain.Add(
                        new InheritanceInfo
                        {
                            ProfileId = previous.Id,
                            PolicyId = previous.SourcePolicyId,
                            FileName = previous.SourceFile,
                            InheritanceType = InheritanceType.Direct
                        }
                    );
                }
            }

            // Traverse IncludeTechnicalProfile chain recursively, selecting root-most definitions.
            var visited = new HashSet<string>();
            var includeId = entity.IncludeTechnicalProfile;
            while (!string.IsNullOrEmpty(includeId) && visited.Add(includeId))
            {
                var includedDefinition = entities
                    .TechnicalProfiles.Values.SelectMany(list => list).Where(tp =>
                        tp.Id == includeId
                        && tp.SourceFile != ConsolidationConstants.ConsolidatedFileName
                        && tp.SourcePolicyId != ConsolidationConstants.ConsolidatedPolicyId
                    )
                    .OrderBy(tp => tp.HierarchyDepth)
                    .FirstOrDefault();
                if (includedDefinition == null)
                {
                    break; // Reference points to a profile not yet loaded or missing.
                }

                entity.InheritanceChain.Add(
                    new InheritanceInfo
                    {
                        ProfileId = includedDefinition.Id,
                        PolicyId = includedDefinition.SourcePolicyId,
                        FileName = includedDefinition.SourceFile,
                        InheritanceType = InheritanceType.Include
                    }
                );

                // Move to next include in the chain.
                includeId = includedDefinition.IncludeTechnicalProfile;
            }
        }

        private void ExtractMetadata(XElement profileElement, TechnicalProfileEntity entity)
        {
            var metadata = profileElement.Element(XName.Get("Metadata", Namespace));
            if (metadata == null)
            {
                return;
            }

            foreach (var item in metadata.Elements(XName.Get("Item", Namespace)))
            {
                var attributeValue = item.Attribute("Value")?.Value;
                var elementValue = item.Value?.Trim();

                entity.Metadata.Add(
                    new MetadataItemInfo
                    {
                        Key = item.Attribute("Key")?.Value ?? string.Empty,
                        Value = string.IsNullOrWhiteSpace(attributeValue)
                            ? elementValue ?? string.Empty
                            : attributeValue
                    }
                );
            }
        }

        private void ExtractInputClaimsTransformations(
            XElement profileElement,
            TechnicalProfileEntity entity
        )
        {
            var inputClaimsTransformations = profileElement.Element(
                XName.Get("InputClaimsTransformations", Namespace)
            );
            if (inputClaimsTransformations != null)
            {
                foreach (
                    var transformation in inputClaimsTransformations.Elements(
                        XName.Get("InputClaimsTransformation", Namespace)
                    )
                )
                {
                    var refId = transformation.Attribute("ReferenceId")?.Value;
                    if (!string.IsNullOrEmpty(refId))
                    {
                        entity.InputClaimsTransformations.Add(refId);
                    }
                }
            }
        }

        private void ExtractInputClaims(XElement profileElement, TechnicalProfileEntity entity)
        {
            var inputClaims = profileElement.Element(XName.Get("InputClaims", Namespace));
            if (inputClaims != null)
            {
                foreach (var claim in inputClaims.Elements(XName.Get("InputClaim", Namespace)))
                {
                    entity.InputClaims.Add(ExtractClaimReference(claim));
                }
            }
        }

        private void ExtractDisplayClaims(XElement profileElement, TechnicalProfileEntity entity)
        {
            var displayClaims = profileElement.Element(XName.Get("DisplayClaims", Namespace));
            if (displayClaims != null)
            {
                foreach (var claim in displayClaims.Elements(XName.Get("DisplayClaim", Namespace)))
                {
                    entity.DisplayClaims.Add(ExtractClaimReference(claim));
                }
            }
        }

        private void ExtractDisplayControls(XElement profileElement, TechnicalProfileEntity entity)
        {
            var displayControls = profileElement.Element(XName.Get("DisplayControls", Namespace));
            if (displayControls != null)
            {
                foreach (
                    var control in displayControls.Elements(XName.Get("DisplayControl", Namespace))
                )
                {
                    var refId = control.Attribute("ReferenceId")?.Value;
                    if (!string.IsNullOrEmpty(refId))
                    {
                        entity.DisplayControls.Add(refId);
                    }
                }
            }
        }

        private void ExtractPersistedClaims(XElement profileElement, TechnicalProfileEntity entity)
        {
            var persistedClaims = profileElement.Element(XName.Get("PersistedClaims", Namespace));
            if (persistedClaims != null)
            {
                foreach (
                    var claim in persistedClaims.Elements(XName.Get("PersistedClaim", Namespace))
                )
                {
                    entity.PersistedClaims.Add(ExtractClaimReference(claim));
                }
            }
        }

        private void ExtractOutputClaims(XElement profileElement, TechnicalProfileEntity entity)
        {
            var outputClaims = profileElement.Element(XName.Get("OutputClaims", Namespace));
            if (outputClaims != null)
            {
                foreach (var claim in outputClaims.Elements(XName.Get("OutputClaim", Namespace)))
                {
                    entity.OutputClaims.Add(ExtractClaimReference(claim));
                }
            }
        }

        private void ExtractOutputClaimsTransformations(
            XElement profileElement,
            TechnicalProfileEntity entity
        )
        {
            var outputClaimsTransformations = profileElement.Element(
                XName.Get("OutputClaimsTransformations", Namespace)
            );
            if (outputClaimsTransformations != null)
            {
                foreach (
                    var transformation in outputClaimsTransformations.Elements(
                        XName.Get("OutputClaimsTransformation", Namespace)
                    )
                )
                {
                    var refId = transformation.Attribute("ReferenceId")?.Value;
                    if (!string.IsNullOrEmpty(refId))
                    {
                        entity.OutputClaimsTransformations.Add(refId);
                    }
                }
            }
        }

        private void ExtractValidationTechnicalProfiles(
            XElement profileElement,
            TechnicalProfileEntity entity
        )
        {
            var validationTechnicalProfiles = profileElement.Element(
                XName.Get("ValidationTechnicalProfiles", Namespace)
            );
            if (validationTechnicalProfiles != null)
            {
                foreach (
                    var validationTp in validationTechnicalProfiles.Elements(
                        XName.Get("ValidationTechnicalProfile", Namespace)
                    )
                )
                {
                    var refId = validationTp.Attribute("ReferenceId")?.Value;
                    if (!string.IsNullOrEmpty(refId))
                    {
                        entity.ValidationTechnicalProfiles.Add(refId);
                    }
                }
            }
        }

        private void ExtractIncludeTechnicalProfile(
            XElement profileElement,
            TechnicalProfileEntity entity
        )
        {
            var includeTechnicalProfile = profileElement.Element(
                XName.Get("IncludeTechnicalProfile", Namespace)
            );
            if (includeTechnicalProfile != null)
            {
                entity.IncludeTechnicalProfile = includeTechnicalProfile
                    .Attribute("ReferenceId")
                    ?.Value;
            }
        }

        private ClaimReferenceInfo ExtractClaimReference(XElement claimElement)
        {
            return new ClaimReferenceInfo
            {
                ClaimTypeReferenceId = claimElement.Attribute("ClaimTypeReferenceId")?.Value,
                PartnerClaimType =
                    claimElement.Attribute("PartnerClaimType")?.Value
                    ?? claimElement.Attribute("TransformationClaimType")?.Value,
                DefaultValue = claimElement.Attribute("DefaultValue")?.Value,
                AlwaysUseDefaultValue =
                    claimElement.Attribute("AlwaysUseDefaultValue")?.Value == "true",
                Required = claimElement.Attribute("Required")?.Value == "true",
                DisplayControlReferenceId = claimElement
                    .Attribute("DisplayControlReferenceId")
                    ?.Value
            };
        }

        public void ExtractAllFromFile(
            XDocument policyXml,
            PolicyFileContext context,
            HashSet<string> processedEntityIds,
            PolicyEntities entities
        )
        {
            var technicalProfiles = policyXml.XPathSelectElements(
                "//tf:TechnicalProfile",
                _nsManager
            );

            foreach (var profileElement in technicalProfiles)
            {
                ExtractFromElement(profileElement, context, processedEntityIds, entities);
            }
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
