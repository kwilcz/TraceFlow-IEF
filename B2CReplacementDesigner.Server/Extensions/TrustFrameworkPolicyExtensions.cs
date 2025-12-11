using System.Xml.Linq;
using System.Xml.Serialization;

namespace B2CReplacementDesigner.Server.Extensions
{
    public static class TrustFrameworkPolicyExtensions
    {
        public static XDocument ToXDocument(this TrustFrameworkPolicy policy)
        {
            var doc = new XDocument();
            var xmlSerializer = new XmlSerializer(typeof(TrustFrameworkPolicy));
            using var writer = doc.CreateWriter();

            xmlSerializer.Serialize(writer, policy);
            return doc;
        }
    }
}
