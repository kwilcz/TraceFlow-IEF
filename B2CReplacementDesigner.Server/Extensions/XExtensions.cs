using System.Xml.Linq;

namespace B2CReplacementDesigner.Server.Extensions
{
    public static class XExtensions
    {
        /// <summary>
        /// Get the absolute XPath to a given XElement
        /// </summary>
        /// <param name="element">The element to derive the XPath for.</param>
        /// <param name="wildcardClaimsProvider">If true and the element (or ancestor) is a TechnicalProfile under a ClaimsProvider,
        /// the ClaimsProvider segment will use a wildcard for stability when TechnicalProfiles may be moved between ClaimsProviders.
        /// Default is false (preserve exact ClaimsProvider identity).</param>
        public static string GetAbsoluteXPath(
            this XElement element,
            bool wildcardClaimsProvider = false
        )
        {
            if (element == null)
                throw new ArgumentNullException(nameof(element));

            Func<XElement, string> relativeXPath = e =>
            {
                int index = e.IndexPosition();

                var currentNamespace = e.Name.Namespace;

                string name;
                if (String.IsNullOrEmpty(currentNamespace.ToString()))
                {
                    name = e.Name.LocalName;
                }
                else
                {
                    name = "*[local-name()='" + e.Name.LocalName + "']";
                    // string namespacePrefix = e.GetPrefixOfNamespace(currentNamespace);
                    // name = namespacePrefix + ":" + e.Name.LocalName;
                }

                // require specific reference attributes to be unique
                if (GetElementXPathByReferenceAttribute(e, name, out var elementXPath))
                    return elementXPath;

                // For ClaimsProvider, use DisplayName to make XPath stable
                if (e.Name.LocalName == "ClaimsProvider")
                {
                    // If requested, use a wildcard ClaimsProvider segment so that TechnicalProfile xpaths
                    // remain valid when a TechnicalProfile is moved between ClaimsProviders.
                    if (wildcardClaimsProvider)
                    {
                        // Use any ClaimsProvider with the same local-name; don't bind to a specific DisplayName or Id
                        return "/*[local-name()='ClaimsProvider']";
                    }

                    if (e.Attribute("DisplayName") != null)
                        return $"/{name}[@DisplayName='{e.Attribute("DisplayName")?.Value}']";
                }

                // if no Id or language, use index when applicable
                return ((index == -1) || (index == -2))
                    ? "/" + name
                    : string.Format(
                        // if has Id or language, use it
                        "/{0}[{1}]",
                        name,
                        index.ToString()
                    );
            };

            var ancestors = from e in element.Ancestors() select relativeXPath(e);

            return string.Concat(ancestors.Reverse().ToArray()) + relativeXPath(element);
        }

        private static bool GetElementXPathByReferenceAttribute(XElement element, string elementXPathName,
            out string xPath)
        {
            xPath = string.Empty;

            foreach (var referenceAttributeName in ReferenceAttributes.Names)
            {
                var referenceAttribute = element.Attribute(referenceAttributeName);
                if (referenceAttribute == null)
                    continue;

                xPath = $"/{elementXPathName}[@{referenceAttributeName}='{referenceAttribute.Value}']";
                return true;
            }

            return false;
        }

        /// <summary>
        /// Get the index of the given XElement relative to its
        /// siblings with identical names. If the given element is
        /// the root, -1 is returned or -2 if element has no sibling elements.
        /// </summary>
        /// <param name="element">
        /// The element to get the index of.
        /// </param>
        public static int IndexPosition(this XElement element)
        {
            if (element == null)
            {
                throw new ArgumentNullException("element");
            }

            if (element.Parent == null)
            {
                // Element is root
                return -1;
            }

            if (element.Parent.Elements(element.Name).Count() == 1)
            {
                // Element has no sibling elements
                return -2;
            }

            int i = 1; // Indexes for nodes start at 1, not 0

            foreach (var sibling in element.Parent.Elements(element.Name))
            {
                if (sibling == element)
                {
                    return i;
                }

                i++;
            }

            throw new InvalidOperationException("element has been removed from its parent.");
        }
    }
}