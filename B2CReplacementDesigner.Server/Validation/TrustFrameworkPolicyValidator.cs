using FluentValidation;

namespace B2CReplacementDesigner.Server.Validation
{
    public class TrustFrameworkPolicyValidator : AbstractValidator<TrustFrameworkPolicy>
    {
        public TrustFrameworkPolicyValidator()
        {
            RuleFor(policy => policy.TenantId).NotEmpty().WithMessage("TenantId is required.");
            RuleFor(policy => policy.PolicyId).NotEmpty().WithMessage("PolicyId is required.");
            RuleFor(policy => policy.PolicySchemaVersion).NotEmpty().WithMessage("PolicySchemaVersion is required.");
        }
    }
}
