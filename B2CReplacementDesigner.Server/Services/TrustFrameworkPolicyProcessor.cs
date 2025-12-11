using B2CReplacementDesigner.Server.Exceptions;
using B2CReplacementDesigner.Server.Models;
using FluentValidation;
using System.ComponentModel.DataAnnotations;
using System.Xml.Linq;
using System.Xml.Serialization;

namespace B2CReplacementDesigner.Server.Services
{
    public class TrustFrameworkPolicyProcessor : ITrustFrameworkPolicyProcessor
    {
        private readonly IPolicyConsolidator _policyConsolidator;
        private readonly IValidator<TrustFrameworkPolicy> _validator;

        public TrustFrameworkPolicyProcessor(
            IPolicyConsolidator policyConsolidator, 
            IValidator<TrustFrameworkPolicy> validator)
        {
            _policyConsolidator = policyConsolidator;
            _validator = validator;
        }

        public async Task<PolicyUploadResponse> ProcessPoliciesAsync(IFormFileCollection files)
        {
            var policyFiles = new List<(IFormFile file, XDocument document, TrustFrameworkPolicy policy)>();

            // First pass: Load, parse, and validate all files
            foreach (var file in files)
            {
                using var stream = file.OpenReadStream();
                using var memoryStream = new MemoryStream();
                await stream.CopyToAsync(memoryStream);
                memoryStream.Position = 0;

                var document = await XDocument.LoadAsync(memoryStream, LoadOptions.PreserveWhitespace, default);
                var policy = DeserializePolicy(document);

                // Validate policy before processing
                var validationResult = _validator.Validate(policy);
                if (!validationResult.IsValid)
                {
                    var errors = validationResult.Errors
                        .Select(e => $"File: {file.FileName} - {e.ErrorMessage}")
                        .ToArray();
                    throw new PolicyValidationException(string.Join("; ", errors));
                }

                policyFiles.Add((file, document, policy));
            }

            // Sort policy files by inheritance hierarchy
            var sortedPolicyFiles = SortByInheritance(policyFiles);

            // Prepare policy metadata for consolidation
            var policyMetadata = sortedPolicyFiles.Select((pf, index) => new PolicyFileMetadata
            {
                FileName = pf.file.FileName,
                PolicyId = pf.policy.PolicyId ?? string.Empty,
                Document = pf.document,
                HierarchyDepth = index
            }).ToList();

            // Consolidate policies and extract entities in a single pass
            var consolidationResult = _policyConsolidator.Consolidate(policyMetadata);

            // Build response
            var response = new PolicyUploadResponse
            {
                ConsolidatedXml = consolidationResult.ConsolidatedXml.ToString(),
                Entities = consolidationResult.Entities,
                InheritanceGraph = BuildInheritanceGraph(sortedPolicyFiles)
            };

            // Add file info
            foreach (var (file, document, policy) in sortedPolicyFiles)
            {
                var fileInfo = new PolicyFileInfo
                {
                    FileName = file.FileName,
                    Content = document.ToString(SaveOptions.DisableFormatting),
                    PolicyId = policy.PolicyId ?? string.Empty,
                    BasePolicy = policy.BasePolicy?.PolicyId,
                    FileSize = file.Length,
                    UploadedAt = DateTime.UtcNow
                };

                response.Files.Add(fileInfo);
            }

            return response;
        }

        private List<(IFormFile file, XDocument document, TrustFrameworkPolicy policy)> SortByInheritance(
            List<(IFormFile file, XDocument document, TrustFrameworkPolicy policy)> policyFiles)
        {
            var sorted = new List<(IFormFile, XDocument, TrustFrameworkPolicy)>();
            var remaining = new List<(IFormFile, XDocument, TrustFrameworkPolicy)>(policyFiles);

            // Find root policy (no base policy)
            var root = remaining.FirstOrDefault(p => p.Item3.BasePolicy == null);
            if (root.Item1 != null)
            {
                sorted.Add(root);
                remaining.Remove(root);
            }

            // Add policies in dependency order
            while (remaining.Any())
            {
                var added = false;
                foreach (var policy in remaining.ToList())
                {
                    var basePolicyId = policy.Item3.BasePolicy?.PolicyId;
                    if (sorted.Any(s => s.Item3.PolicyId == basePolicyId))
                    {
                        sorted.Add(policy);
                        remaining.Remove(policy);
                        added = true;
                    }
                }

                if (!added && remaining.Any())
                {
                    // Circular dependency or orphaned policy - add first remaining
                    sorted.Add(remaining[0]);
                    remaining.RemoveAt(0);
                }
            }

            return sorted;
        }

        private PolicyInheritanceGraph BuildInheritanceGraph(
            List<(IFormFile file, XDocument document, TrustFrameworkPolicy policy)> policyFiles)
        {
            var graph = new PolicyInheritanceGraph();

            foreach (var (file, _, policy) in policyFiles)
            {
                var policyId = policy.PolicyId ?? string.Empty;
                var basePolicyId = policy.BasePolicy?.PolicyId;

                if (basePolicyId != null)
                {
                    graph.ParentRelationships[policyId] = basePolicyId;

                    if (!graph.ChildRelationships.TryGetValue(basePolicyId, out List<string>? value))
                    {
                        value = new List<string>();
                        graph.ChildRelationships[basePolicyId] = value;
                    }

                    value.Add(policyId);
                }
                else
                {
                    graph.RootPolicyId = policyId;
                }
            }

            // Calculate hierarchy depth
            if (graph.RootPolicyId != null)
            {
                CalculateHierarchyDepth(graph, graph.RootPolicyId, 0);
            }

            return graph;
        }

        private void CalculateHierarchyDepth(PolicyInheritanceGraph graph, string policyId, int depth)
        {
            graph.HierarchyDepth[policyId] = depth;

            if (graph.ChildRelationships.TryGetValue(policyId, out var children))
            {
                foreach (var child in children)
                {
                    CalculateHierarchyDepth(graph, child, depth + 1);
                }
            }
        }

        private TrustFrameworkPolicy DeserializePolicy(XDocument document)
        {
            XmlSerializer serializer = new XmlSerializer(typeof(TrustFrameworkPolicy));
            using (var reader = document.CreateReader())
            {
                var result = serializer.Deserialize(reader) as TrustFrameworkPolicy;
                if (result == null)
                {
                    throw new InvalidOperationException("Failed to deserialize TrustFrameworkPolicy from XML document.");
                }
                return result;
            }
        }
    }

}
