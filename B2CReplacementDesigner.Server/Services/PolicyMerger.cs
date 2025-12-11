using B2CReplacementDesigner.Server.Extensions;
using B2CReplacementDesigner.Server.Models;
using System.Text;
using System.Text.RegularExpressions;
using System.Xml;
using System.Xml.Linq;
using System.Xml.XPath;
using B2CReplacementDesigner.Server.Exceptions;

namespace B2CReplacementDesigner.Server.Services
{
    /// <summary>
    /// Merges policy XML documents and extracts entities during the merge process.
    /// Uses composition: delegates entity extraction to IPolicyEntityExtractor (Dependency Inversion Principle).
    /// </summary>
    public class PolicyMerger(IPolicyEntityExtractor entityExtractor) : IPolicyMerger
    {
        /// <summary>
        /// Merges two policies into one, extracting entities from elements that are added during the merge.
        /// </summary>
        public XDocument MergePolicies(
            XDocument toMergeInto,
            XDocument toBeMerged,
            PolicyFileContext context,
            PolicyEntities entities,
            HashSet<string> processedEntityIds)
        {
            var mergedDocument = new XDocument(toMergeInto);

            var rootTarget = mergedDocument.Root;
            var rootToBeMerged = toBeMerged.Root;

            // if one of the roots is null, return the other one - no need to merge
            if (rootTarget is null)
                return toBeMerged;

            if (rootToBeMerged is null)
                return toMergeInto;

            // Merge all descendants of root2 into root1
            foreach (var element in rootToBeMerged.Descendants())
            {
                var wildcardElementXPath = element.GetAbsoluteXPath(true);
                XElement? existingElement = null;

                // Special handling for ClaimsProvider and TechnicalProfile
                existingElement = rootTarget.XPathSelectElement(wildcardElementXPath);

                // an element already exist - apply merge logic
                if (existingElement is not null)
                {
                    MergeElements(context, entities, processedEntityIds, element, existingElement);
                    continue;
                }

                // if element with same name and id doesn't exist, add it
                AddElementToDocument(rootTarget, element, context, entities, processedEntityIds);
            }

            return mergedDocument;
        }

        private void MergeElements(PolicyFileContext context, PolicyEntities entities,
            HashSet<string> processedEntityIds,
            XElement element, XElement existingElement)
        {
            const string supportedLanguagePropName =
                nameof(TrustFrameworkPolicy.BuildingBlocks.Localization.SupportedLanguages.SupportedLanguage);


            // if element is SupportedLanguage and it was not added yet, add it to the end of the list
            if (element.Name.LocalName == supportedLanguagePropName &&
                !existingElement.Parent!.Value.Contains(element.Value))
            {
                existingElement.AddAfterSelf(element);
                entityExtractor.ExtractFromElement(element, context, processedEntityIds, entities);
                return;
            }

            if (!element.Attributes().Any())
                return;

            // Merge element attributes: element takes precedence over existingElement
            foreach (var attr in element.Attributes())
            {
                var existingAttr = existingElement.Attribute(attr.Name);
                if (existingAttr != null)
                {
                    if (existingAttr.Value != attr.Value)
                        existingAttr.Value = attr.Value;
                }
                else
                {
                    existingElement.Add(new XAttribute(attr.Name, attr.Value));
                }
            }

            // Notify the extractor about the element being in multiple policies
            entityExtractor.ExtractFromElement(element, context, processedEntityIds, entities);
        }

        /// <summary>
        /// Adds a specified XML element to the target root document and processes the associated policy entities and context.
        /// </summary>
        /// <param name="root1">The root XElement of the target document where the element will be added.</param>
        /// <param name="element">The XElement to be added to the document.</param>
        /// <param name="context">The context of the policy file being processed, containing metadata and relevant details.</param>
        /// <param name="entities">The collection of policy-related entities that will be updated during the process.</param>
        /// <param name="processedEntityIds">A set of entity identifiers that have already been processed, used to prevent duplication.</param>
        private void AddElementToDocument(XElement root1,
            XElement element,
            PolicyFileContext context,
            PolicyEntities entities,
            HashSet<string> processedEntityIds)
        {
            // Direct children of root should be added directly
            if (element.Parent == element.Document?.Root)
            {
                root1.Add(element);
                entityExtractor.ExtractFromElement(element, context, processedEntityIds, entities);
                return;
            }

            var targetParentElement = GetParentMergeElement(
                root1,
                element,
                context,
                entities,
                processedEntityIds
            );

            targetParentElement!.Add(element);
            entityExtractor.ExtractFromElement(element, context, processedEntityIds, entities);
        }

        private XElement GetParentMergeElement(
            XElement root1,
            XElement element,
            PolicyFileContext context,
            PolicyEntities entities,
            HashSet<string> processedEntityIds)
        {
            var elementXPath = element.GetAbsoluteXPath(wildcardClaimsProvider: true);
            var parentXPath = elementXPath[..elementXPath.LastIndexOf('/')];
            var parentElement = root1.XPathSelectElement(parentXPath);

            if (parentElement is not null)
                return parentElement;

            // if parent element doesn't exist, create it
            var parentElementName = element.Parent?.Name.LocalName;
            if (parentElementName is null)
                throw new Exception($"Parent element name is null. Affected element: {elementXPath}");

            var parentElementId = element.Parent?.Attribute("Id")?.Value;

            var newParentElement = new XElement(XName.Get(parentElementName, element.Name.NamespaceName));

            if (parentElementId is not null)
                newParentElement.Add(new XAttribute("Id", parentElementId));

            AddElementToDocument(root1, newParentElement, context, entities, processedEntityIds);

            var addedParent = root1.XPathSelectElement(parentXPath);

            if (addedParent == null)
                throw new Exception($"Failed to find created parent element at {parentXPath}");

            return addedParent;
        }
    }
}