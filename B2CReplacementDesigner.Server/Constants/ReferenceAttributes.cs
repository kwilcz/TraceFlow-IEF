namespace B2CReplacementDesigner.Server.Constants
{
    internal static class ReferenceAttributes
    {
        // List of attribute names that should be considered unique identifiers
        public static readonly IReadOnlyList<string> Names =
        [
            "Id",
            "Language",
            "ClaimTypeReferenceId",
            "Key",
            "ReferenceId",
            "TechnicalProfileReferenceId",
            "DisplayControlReferenceId"
        ];
    }
}
