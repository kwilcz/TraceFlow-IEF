namespace B2CReplacementDesigner.Server.Models
{
    /// <summary>
    /// Base class for all TrustFramework policy entities
    /// </summary>
    public abstract class TrustFrameworkEntity
    {
        /// <summary>
        /// Unique identifier of the entity
        /// </summary>
        public string Id { get; set; } = string.Empty;

        /// <summary>
        /// Type of the entity (ClaimType, TechnicalProfile, etc.)
        /// </summary>
        public string EntityType { get; set; } = string.Empty;

        /// <summary>
        /// Source file where this entity is defined
        /// </summary>
        public string SourceFile { get; set; } = string.Empty;

        /// <summary>
        /// Source policy ID where this entity is defined
        /// </summary>
        public string SourcePolicyId { get; set; } = string.Empty;

        /// <summary>
        /// XPath to this element in the source file
        /// </summary>
        public string XPath { get; set; } = string.Empty;

        /// <summary>
        /// Hierarchy depth in policy inheritance (0 = root)
        /// </summary>
        public int HierarchyDepth { get; set; }

        /// <summary>
        /// Whether this entity overrides one from a base policy
        /// </summary>
        public bool IsOverride { get; set; }

        /// <summary>
        /// Raw XML content of this entity
        /// </summary>
        public string RawXml { get; set; } = string.Empty;
    }

    /// <summary>
    /// Represents a ClaimType from the ClaimsSchema
    /// </summary>
    public class ClaimTypeEntity : TrustFrameworkEntity
    {
        public string? DisplayName { get; set; }
        public string? DataType { get; set; }
        public string? UserInputType { get; set; }
        public string? Mask { get; set; }
        public string? AdminHelpText { get; set; }
        public string? UserHelpText { get; set; }
        public Dictionary<string, string> DefaultPartnerClaimTypes { get; set; } = new();
        public RestrictionInfo? Restriction { get; set; }
        public string? PredicateValidationReference { get; set; }
    }

    public class RestrictionInfo
    {
        public string? Pattern { get; set; }
        public List<EnumerationItem> Enumeration { get; set; } = new();
    }

    public class EnumerationItem
    {
        public string Value { get; set; } = string.Empty;
        public string Text { get; set; } = string.Empty;
        public bool SelectByDefault { get; set; }
    }

    /// <summary>
    /// Represents a TechnicalProfile
    /// </summary>
    public class TechnicalProfileEntity : TrustFrameworkEntity
    {
        public string? DisplayName { get; set; }
        public string? Description { get; set; }
        public string? ProtocolName { get; set; }
        public string? ProtocolHandler { get; set; }
        public string? ProviderName { get; set; }
        public string? ClaimsProviderDisplayName { get; set; }
        public List<MetadataItemInfo> Metadata { get; set; } = new();
        public List<string> InputClaimsTransformations { get; set; } = new();
        public List<ClaimReferenceInfo> InputClaims { get; set; } = new();
        public List<ClaimReferenceInfo> DisplayClaims { get; set; } = new();
        public List<string> DisplayControls { get; set; } = new();
        public List<ClaimReferenceInfo> PersistedClaims { get; set; } = new();
        public List<ClaimReferenceInfo> OutputClaims { get; set; } = new();
        public List<string> OutputClaimsTransformations { get; set; } = new();
        public List<string> ValidationTechnicalProfiles { get; set; } = new();
        public string? IncludeTechnicalProfile { get; set; }
        public List<InheritanceInfo> InheritanceChain { get; set; } = new();
    }

    public class MetadataItemInfo
    {
        public string Key { get; set; } = string.Empty;
        public string Value { get; set; } = string.Empty;
    }

    public class ClaimReferenceInfo
    {
        public string? ClaimTypeReferenceId { get; set; }
        public string? PartnerClaimType { get; set; }
        public string? DefaultValue { get; set; }
        public bool? AlwaysUseDefaultValue { get; set; }
        public bool? Required { get; set; }
        public string? DisplayControlReferenceId { get; set; }
    }

    public class InheritanceInfo
    {
        public string ProfileId { get; set; } = string.Empty;
        public string PolicyId { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public InheritanceType InheritanceType { get; set; }
    }

    public enum InheritanceType
    {
        Direct,
        Include
    }

    /// <summary>
    /// Represents a ClaimsTransformation
    /// </summary>
    public class ClaimsTransformationEntity : TrustFrameworkEntity
    {
        public string TransformationMethod { get; set; } = string.Empty;
        public List<ClaimReferenceInfo> InputClaims { get; set; } = new();
        public List<InputParameterInfo> InputParameters { get; set; } = new();
        public List<ClaimReferenceInfo> OutputClaims { get; set; } = new();
    }

    public class InputParameterInfo
    {
        public string Id { get; set; } = string.Empty;
        public string DataType { get; set; } = string.Empty;
        public string Value { get; set; } = string.Empty;
    }

    /// <summary>
    /// Represents a DisplayControl
    /// </summary>
    public class DisplayControlEntity : TrustFrameworkEntity
    {
        public string UserInterfaceControlType { get; set; } = string.Empty;
        public List<ClaimReferenceInfo> InputClaims { get; set; } = new();
        public List<ClaimReferenceInfo> DisplayClaims { get; set; } = new();
        public List<ClaimReferenceInfo> OutputClaims { get; set; } = new();
        public List<DisplayControlActionInfo> Actions { get; set; } = new();
    }

    public class DisplayControlActionInfo
    {
        public string Id { get; set; } = string.Empty;
        public List<string> ValidationClaimsExchanges { get; set; } = new();
    }

    /// <summary>
    /// Represents a UserJourney
    /// </summary>
    public class UserJourneyEntity : TrustFrameworkEntity
    {
        public string? DefaultCpimIssuerTechnicalProfileReferenceId { get; set; }
        public List<OrchestrationStepInfo> OrchestrationSteps { get; set; } = new();
    }

    public class OrchestrationStepInfo
    {
        public int Order { get; set; }
        public string Type { get; set; } = string.Empty;
        public string? ContentDefinitionReferenceId { get; set; }
        public List<ClaimsExchangeInfo> ClaimsExchanges { get; set; } = new();
        public List<PreconditionInfo> Preconditions { get; set; } = new();
    }

    public class ClaimsExchangeInfo
    {
        public string Id { get; set; } = string.Empty;
        public string TechnicalProfileReferenceId { get; set; } = string.Empty;
    }

    public class PreconditionInfo
    {
        public string Type { get; set; } = string.Empty;
        public bool ExecuteActionsIf { get; set; }
        public List<string> Values { get; set; } = new();
        public string Action { get; set; } = string.Empty;
    }

    /// <summary>
    /// Represents a SubJourney
    /// </summary>
    public class SubJourneyEntity : TrustFrameworkEntity
    {
        public string Type { get; set; } = string.Empty;
        public List<OrchestrationStepInfo> OrchestrationSteps { get; set; } = new();
    }

    /// <summary>
    /// Represents a ClaimsProvider
    /// </summary>
    public class ClaimsProviderEntity : TrustFrameworkEntity
    {
        public string? DisplayName { get; set; }
        public List<string> TechnicalProfileIds { get; set; } = new();
    }

    /// <summary>
    /// Collection of all extracted policy entities
    /// </summary>
    public class PolicyEntities
    {
        public Dictionary<string, List<ClaimTypeEntity>> ClaimTypes { get; set; } = new();
        public Dictionary<string, List<TechnicalProfileEntity>> TechnicalProfiles { get; set; } = new();
        public Dictionary<string, List<ClaimsTransformationEntity>> ClaimsTransformations { get; set; } = new();
        public Dictionary<string, List<DisplayControlEntity>> DisplayControls { get; set; } = new();
        public Dictionary<string, List<UserJourneyEntity>> UserJourneys { get; set; } = new();
        public Dictionary<string, List<SubJourneyEntity>> SubJourneys { get; set; } = new();
        public Dictionary<string, List<ClaimsProviderEntity>> ClaimsProviders { get; set; } = new();
    }
}
