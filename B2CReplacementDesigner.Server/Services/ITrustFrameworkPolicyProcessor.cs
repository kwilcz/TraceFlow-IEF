using System.Xml.Linq;

using B2CReplacementDesigner.Server.Models;

namespace B2CReplacementDesigner.Server.Services
{
    public interface ITrustFrameworkPolicyProcessor
    {
        Task<PolicyUploadResponse> ProcessPoliciesAsync(IFormFileCollection files);
    }
}
