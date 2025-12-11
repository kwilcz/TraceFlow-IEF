using System.Xml.Linq;

namespace B2CReplacementDesigner.Server.Services
{
    /// <summary>
    /// Factory for creating entity extractors
    /// </summary>
    public class EntityExtractorFactory
    {
        private readonly Dictionary<string, IEntityExtractor> _extractors = new()
        {
            ["ClaimType"] = new ClaimTypeExtractor(),
            ["ClaimsTransformation"] = new ClaimsTransformationExtractor(),
            ["DisplayControl"] = new DisplayControlExtractor(),
            ["ClaimsProvider"] = new ClaimsProviderExtractor(),
            ["TechnicalProfile"] = new TechnicalProfileExtractor(),
            ["UserJourney"] = new UserJourneyExtractor(),
            ["SubJourney"] = new SubJourneyExtractor()
        };

        public IEntityExtractor? GetExtractor(string elementName)
        {
            return _extractors.GetValueOrDefault(elementName);
        }

        public IEnumerable<IEntityExtractor> GetAllExtractors()
        {
            return _extractors.Values;
        }
    }
}