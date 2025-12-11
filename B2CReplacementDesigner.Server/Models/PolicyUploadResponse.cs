namespace B2CReplacementDesigner.Server.Models
{
    /// <summary>
    /// Response model for policy upload containing all policy files and metadata
    /// </summary>
    public class PolicyUploadResponse
    {
        /// <summary>
        /// Individual policy files with their content and metadata
        /// </summary>
        public List<PolicyFileInfo> Files { get; set; } = new();

        /// <summary>
        /// Policy inheritance hierarchy
        /// </summary>
        public PolicyInheritanceGraph InheritanceGraph { get; set; } = new();

        /// <summary>
        /// All extracted policy entities (claims, technical profiles, transformations, etc.)
        /// </summary>
        public PolicyEntities Entities { get; set; } = new();

        /// <summary>
        /// Consolidated XML for backward compatibility and visualization
        /// </summary>
        public string ConsolidatedXml { get; set; } = string.Empty;
    }

    /// <summary>
    /// Information about a single policy file
    /// </summary>
    public class PolicyFileInfo
    {
        /// <summary>
        /// Original filename (e.g., "TrustFrameworkBase.xml")
        /// </summary>
        public string FileName { get; set; } = string.Empty;

        /// <summary>
        /// Complete XML content of the file
        /// </summary>
        public string Content { get; set; } = string.Empty;

        /// <summary>
        /// Policy ID from the XML (e.g., "B2C_1A_TrustFrameworkBase")
        /// </summary>
        public string PolicyId { get; set; } = string.Empty;

        /// <summary>
        /// Base policy ID that this policy inherits from (null for root policy)
        /// </summary>
        public string? BasePolicy { get; set; }

        /// <summary>
        /// File size in bytes
        /// </summary>
        public long FileSize { get; set; }

        /// <summary>
        /// Upload timestamp
        /// </summary>
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Policy inheritance hierarchy information
    /// </summary>
    public class PolicyInheritanceGraph
    {
        /// <summary>
        /// Root policy (base of the hierarchy)
        /// </summary>
        public string? RootPolicyId { get; set; }

        /// <summary>
        /// Map of policy ID to its parent policy ID
        /// </summary>
        public Dictionary<string, string> ParentRelationships { get; set; } = new();

        /// <summary>
        /// Map of policy ID to its child policies
        /// </summary>
        public Dictionary<string, List<string>> ChildRelationships { get; set; } = new();

        /// <summary>
        /// Hierarchical depth of each policy (root = 0)
        /// </summary>
        public Dictionary<string, int> HierarchyDepth { get; set; } = new();
    }
}
