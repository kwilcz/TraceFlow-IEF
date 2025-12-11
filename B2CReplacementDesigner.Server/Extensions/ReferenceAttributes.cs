using System.Collections.Generic;

namespace B2CReplacementDesigner.Server.Extensions
{
    internal static class ReferenceAttributes
    {
        // List of attribute names that should be considered unique identifiers
        public static readonly IReadOnlyList<string> Names = new[]
        {
            "Id",
            "Language",
            "ClaimTypeReferenceId",
            "Key",
            "ReferenceId",
            "TechnicalProfileReferenceId",
            "DisplayControlReferenceId"
        };
    }
}
