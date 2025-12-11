/**
 * Test fixtures for policy parser tests
 * Contains sample XML policies for various scenarios
 */

export const SIMPLE_USER_JOURNEY_XML = `<?xml version="1.0" encoding="UTF-8"?>
<TrustFrameworkPolicy xmlns="http://schemas.microsoft.com/online/cpim/schemas/2013/06" PolicyId="B2C_1A_TEST">
  <ClaimsProviders>
    <ClaimsProvider>
      <DisplayName>Test Provider</DisplayName>
      <TechnicalProfiles>
        <TechnicalProfile Id="SelfAsserted-LocalAccountSignin">
          <DisplayName>Local Account Signin</DisplayName>
          <Protocol Name="Proprietary" Handler="Web.TPEngine.Providers.SelfAssertedAttributeProvider" />
        </TechnicalProfile>
        <TechnicalProfile Id="AAD-UserReadUsingObjectId">
          <DisplayName>Read User</DisplayName>
          <Protocol Name="Proprietary" Handler="Web.TPEngine.Providers.AzureActiveDirectoryProvider" />
        </TechnicalProfile>
        <TechnicalProfile Id="JwtIssuer">
          <DisplayName>JWT Token Issuer</DisplayName>
          <Protocol Name="OpenIdConnect" Handler="Web.TPEngine.Providers.JwtIssuer" />
        </TechnicalProfile>
      </TechnicalProfiles>
    </ClaimsProvider>
  </ClaimsProviders>
  <UserJourneys>
    <UserJourney Id="SignIn">
      <OrchestrationSteps>
        <OrchestrationStep Order="1" Type="CombinedSignInAndSignUp">
          <ClaimsProviderSelections>
            <ClaimsProviderSelection ValidationClaimsExchangeId="LocalAccountSigninEmailExchange" />
          </ClaimsProviderSelections>
          <ClaimsExchanges>
            <ClaimsExchange Id="LocalAccountSigninEmailExchange" TechnicalProfileReferenceId="SelfAsserted-LocalAccountSignin" />
          </ClaimsExchanges>
        </OrchestrationStep>
        <OrchestrationStep Order="2" Type="ClaimsExchange">
          <ClaimsExchanges>
            <ClaimsExchange Id="AADUserReadWithObjectId" TechnicalProfileReferenceId="AAD-UserReadUsingObjectId" />
          </ClaimsExchanges>
        </OrchestrationStep>
        <OrchestrationStep Order="3" Type="SendClaims" CpimIssuerTechnicalProfileReferenceId="JwtIssuer" />
      </OrchestrationSteps>
    </UserJourney>
  </UserJourneys>
</TrustFrameworkPolicy>`;

export const USER_JOURNEY_WITH_PRECONDITIONS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<TrustFrameworkPolicy xmlns="http://schemas.microsoft.com/online/cpim/schemas/2013/06" PolicyId="B2C_1A_TEST_PRECONDITIONS">
  <UserJourneys>
    <UserJourney Id="SignInWithCondition">
      <OrchestrationSteps>
        <OrchestrationStep Order="1" Type="CombinedSignInAndSignUp">
          <ClaimsProviderSelections>
            <ClaimsProviderSelection ValidationClaimsExchangeId="LocalAccountSigninEmailExchange" />
          </ClaimsProviderSelections>
          <ClaimsExchanges>
            <ClaimsExchange Id="LocalAccountSigninEmailExchange" TechnicalProfileReferenceId="SelfAsserted-LocalAccountSignin" />
          </ClaimsExchanges>
        </OrchestrationStep>
        <OrchestrationStep Order="2" Type="ClaimsExchange">
          <Preconditions>
            <Precondition Type="ClaimsExist" ExecuteActionsIf="true">
              <Value>objectId</Value>
              <Action>SkipThisOrchestrationStep</Action>
            </Precondition>
          </Preconditions>
          <ClaimsExchanges>
            <ClaimsExchange Id="CheckUserExistsExchange" TechnicalProfileReferenceId="CheckUserExists" />
          </ClaimsExchanges>
        </OrchestrationStep>
        <OrchestrationStep Order="3" Type="ClaimsExchange">
          <ClaimsExchanges>
            <ClaimsExchange Id="AADUserReadWithObjectId" TechnicalProfileReferenceId="AAD-UserReadUsingObjectId" />
          </ClaimsExchanges>
        </OrchestrationStep>
        <OrchestrationStep Order="4" Type="ClaimsExchange">
          <Preconditions>
            <Precondition Type="ClaimsExist" ExecuteActionsIf="true">
              <Value>objectId</Value>
              <Action>SkipThisOrchestrationStep</Action>
            </Precondition>
            <Precondition Type="ClaimsExist" ExecuteActionsIf="false">
              <Value>userJourney</Value>
              <Action>SkipThisOrchestrationStep</Action>
            </Precondition>
            <Precondition Type="ClaimEquals" ExecuteActionsIf="false">
              <Value>userJourney</Value>
              <Value>pwd</Value>
              <Action>SkipThisOrchestrationStep</Action>
            </Precondition>
          </Preconditions>
          <ClaimsExchanges>
            <ClaimsExchange Id="CheckUserExistsExchange" TechnicalProfileReferenceId="CheckUserExists" />
          </ClaimsExchanges>
        </OrchestrationStep>
        <OrchestrationStep Order="5" Type="SendClaims" CpimIssuerTechnicalProfileReferenceId="JwtIssuer" />
      </OrchestrationSteps>
    </UserJourney>
  </UserJourneys>
</TrustFrameworkPolicy>`;

export const USER_JOURNEY_WITH_SUBJOURNEY_XML = `<?xml version="1.0" encoding="UTF-8"?>
<TrustFrameworkPolicy xmlns="http://schemas.microsoft.com/online/cpim/schemas/2013/06" PolicyId="B2C_1A_TEST_SUBJOURNEY">
  <ClaimsProviders>
    <ClaimsProvider>
      <DisplayName>Test Provider</DisplayName>
      <TechnicalProfiles>
        <TechnicalProfile Id="SelfAsserted-LocalAccountSignin">
          <DisplayName>Local Account Signin</DisplayName>
          <Protocol Name="Proprietary" Handler="Web.TPEngine.Providers.SelfAssertedAttributeProvider" />
        </TechnicalProfile>
        <TechnicalProfile Id="PhoneFactor-InputOrVerify">
          <DisplayName>Phone Factor</DisplayName>
          <Protocol Name="Proprietary" Handler="Web.TPEngine.Providers.PhoneFactorProtocolProvider" />
        </TechnicalProfile>
        <TechnicalProfile Id="JwtIssuer">
          <DisplayName>JWT Token Issuer</DisplayName>
          <Protocol Name="OpenIdConnect" Handler="Web.TPEngine.Providers.JwtIssuer" />
        </TechnicalProfile>
      </TechnicalProfiles>
    </ClaimsProvider>
  </ClaimsProviders>
  <SubJourneys>
    <SubJourney Id="MFA" Type="Call">
      <OrchestrationSteps>
        <OrchestrationStep Order="1" Type="ClaimsExchange">
          <ClaimsExchanges>
            <ClaimsExchange Id="PhoneFactorExchange" TechnicalProfileReferenceId="PhoneFactor-InputOrVerify" />
          </ClaimsExchanges>
        </OrchestrationStep>
      </OrchestrationSteps>
    </SubJourney>
  </SubJourneys>
  <UserJourneys>
    <UserJourney Id="SignInWithMFA">
      <OrchestrationSteps>
        <OrchestrationStep Order="1" Type="CombinedSignInAndSignUp">
          <ClaimsProviderSelections>
            <ClaimsProviderSelection ValidationClaimsExchangeId="LocalAccountSigninEmailExchange" />
          </ClaimsProviderSelections>
          <ClaimsExchanges>
            <ClaimsExchange Id="LocalAccountSigninEmailExchange" TechnicalProfileReferenceId="SelfAsserted-LocalAccountSignin" />
          </ClaimsExchanges>
        </OrchestrationStep>
        <OrchestrationStep Order="2" Type="InvokeSubJourney">
          <JourneyList>
            <Candidate SubJourneyReferenceId="MFA" />
          </JourneyList>
        </OrchestrationStep>
        <OrchestrationStep Order="3" Type="SendClaims" CpimIssuerTechnicalProfileReferenceId="JwtIssuer" />
      </OrchestrationSteps>
    </UserJourney>
  </UserJourneys>
</TrustFrameworkPolicy>`;

export const MULTIPLE_PRECONDITIONS_SAME_CONDITION_XML = `<?xml version="1.0" encoding="UTF-8"?>
<TrustFrameworkPolicy xmlns="http://schemas.microsoft.com/online/cpim/schemas/2013/06" PolicyId="B2C_1A_TEST_MULTIPLE_PRECONDITIONS">
  <ClaimsProviders>
    <ClaimsProvider>
      <DisplayName>Test Provider</DisplayName>
      <TechnicalProfiles>
        <TechnicalProfile Id="Step1TP">
          <DisplayName>Step 1</DisplayName>
          <Protocol Name="Proprietary" Handler="Web.TPEngine.Providers.ClaimsTransformationProtocolProvider" />
        </TechnicalProfile>
        <TechnicalProfile Id="Step2TP">
          <DisplayName>Step 2</DisplayName>
          <Protocol Name="Proprietary" Handler="Web.TPEngine.Providers.ClaimsTransformationProtocolProvider" />
        </TechnicalProfile>
        <TechnicalProfile Id="Step3TP">
          <DisplayName>Step 3</DisplayName>
          <Protocol Name="Proprietary" Handler="Web.TPEngine.Providers.ClaimsTransformationProtocolProvider" />
        </TechnicalProfile>
        <TechnicalProfile Id="JwtIssuer">
          <DisplayName>JWT Token Issuer</DisplayName>
          <Protocol Name="OpenIdConnect" Handler="Web.TPEngine.Providers.JwtIssuer" />
        </TechnicalProfile>
      </TechnicalProfiles>
    </ClaimsProvider>
  </ClaimsProviders>
  <UserJourneys>
    <UserJourney Id="MultipleSkips">
      <OrchestrationSteps>
        <OrchestrationStep Order="1" Type="ClaimsExchange">
          <Preconditions>
            <Precondition Type="ClaimsExist" ExecuteActionsIf="true">
              <Value>objectId</Value>
              <Action>SkipThisOrchestrationStep</Action>
            </Precondition>
          </Preconditions>
          <ClaimsExchanges>
            <ClaimsExchange Id="Step1" TechnicalProfileReferenceId="Step1TP" />
          </ClaimsExchanges>
        </OrchestrationStep>
        <OrchestrationStep Order="2" Type="ClaimsExchange">
          <Preconditions>
            <Precondition Type="ClaimsExist" ExecuteActionsIf="true">
              <Value>objectId</Value>
              <Action>SkipThisOrchestrationStep</Action>
            </Precondition>
          </Preconditions>
          <ClaimsExchanges>
            <ClaimsExchange Id="Step2" TechnicalProfileReferenceId="Step2TP" />
          </ClaimsExchanges>
        </OrchestrationStep>
        <OrchestrationStep Order="3" Type="ClaimsExchange">
          <ClaimsExchanges>
            <ClaimsExchange Id="Step3" TechnicalProfileReferenceId="Step3TP" />
          </ClaimsExchanges>
        </OrchestrationStep>
        <OrchestrationStep Order="4" Type="SendClaims" CpimIssuerTechnicalProfileReferenceId="JwtIssuer" />
      </OrchestrationSteps>
    </UserJourney>
  </UserJourneys>
</TrustFrameworkPolicy>`;

export const USER_JOURNEY_WITH_GET_CLAIMS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<TrustFrameworkPolicy xmlns="http://schemas.microsoft.com/online/cpim/schemas/2013/06" PolicyId="B2C_1A_TEST_GETCLAIMS">
  <ClaimsProviders>
    <ClaimsProvider>
      <DisplayName>Query Provider</DisplayName>
      <TechnicalProfiles>
        <TechnicalProfile Id="CollectQueryParams">
          <DisplayName>Collect Query Parameters</DisplayName>
          <Protocol Name="Proprietary" Handler="Web.TPEngine.Providers.ClaimsTransformationProtocolProvider" />
          <InputClaims>
            <InputClaim ClaimTypeReferenceId="campaignId" DefaultValue="{QueryString:campaign}" />
            <InputClaim ClaimTypeReferenceId="trackingId" DefaultValue="{QueryString:trackingId}" Required="true" />
          </InputClaims>
          <OutputClaims>
            <OutputClaim ClaimTypeReferenceId="campaignId" />
            <OutputClaim ClaimTypeReferenceId="trackingId" />
          </OutputClaims>
          <Metadata>
            <Item Key="SendClaimsIn">QueryString</Item>
            <Item Key="SendClaimsDestination">ClaimsPrincipal</Item>
          </Metadata>
        </TechnicalProfile>
        <TechnicalProfile Id="JwtIssuer">
          <DisplayName>JWT Token Issuer</DisplayName>
          <Protocol Name="OpenIdConnect" Handler="Web.TPEngine.Providers.JwtIssuer" />
        </TechnicalProfile>
        <TechnicalProfile Id="SelfAsserted-LocalAccountSignin">
          <DisplayName>Local Account Signin</DisplayName>
          <Protocol Name="Proprietary" Handler="Web.TPEngine.Providers.SelfAssertedAttributeProvider" />
          <OutputClaims>
            <OutputClaim ClaimTypeReferenceId="objectId" />
          </OutputClaims>
        </TechnicalProfile>
      </TechnicalProfiles>
    </ClaimsProvider>
  </ClaimsProviders>
  <UserJourneys>
    <UserJourney Id="CollectQuery">
      <OrchestrationSteps>
        <OrchestrationStep Order="1" Type="CombinedSignInAndSignUp">
          <ClaimsProviderSelections>
            <ClaimsProviderSelection ValidationClaimsExchangeId="LocalAccountSigninEmailExchange" />
          </ClaimsProviderSelections>
          <ClaimsExchanges>
            <ClaimsExchange Id="LocalAccountSigninEmailExchange" TechnicalProfileReferenceId="SelfAsserted-LocalAccountSignin" />
          </ClaimsExchanges>
        </OrchestrationStep>
        <OrchestrationStep Order="2" Type="GetClaims" CpimIssuerTechnicalProfileReferenceId="CollectQueryParams" />
        <OrchestrationStep Order="3" Type="SendClaims" CpimIssuerTechnicalProfileReferenceId="JwtIssuer" />
      </OrchestrationSteps>
    </UserJourney>
  </UserJourneys>
</TrustFrameworkPolicy>`;

export const USER_JOURNEY_WITH_GET_CLAIMS_RELYING_PARTY_INPUT_XML = `<?xml version="1.0" encoding="UTF-8"?>
<TrustFrameworkPolicy xmlns="http://schemas.microsoft.com/online/cpim/schemas/2013/06" PolicyId="B2C_1A_TEST_GETCLAIMS_RP">
  <ClaimsProviders>
    <ClaimsProvider>
      <DisplayName>Token Hint Provider</DisplayName>
      <TechnicalProfiles>
        <TechnicalProfile Id="IdTokenHint_ExtractClaims">
          <DisplayName>My ID Token Hint TechnicalProfile</DisplayName>
          <Protocol Name="None" />
          <Metadata>
            <Item Key="METADATA">https://contoso.example/.well-known/openid-configuration</Item>
            <Item Key="issuer">https://localhost/</Item>
          </Metadata>
          <OutputClaims>
            <OutputClaim ClaimTypeReferenceId="email" />
          </OutputClaims>
        </TechnicalProfile>
      </TechnicalProfiles>
    </ClaimsProvider>
  </ClaimsProviders>
  <RelyingParty>
    <DefaultUserJourney ReferenceId="SignUp" />
    <TechnicalProfile Id="PolicyProfile">
      <DisplayName>PolicyProfile</DisplayName>
      <Protocol Name="OpenIdConnect" />
      <InputClaims>
        <InputClaim ClaimTypeReferenceId="email" PartnerClaimType="userId" />
        <InputClaim ClaimTypeReferenceId="displayName" PartnerClaimType="name" />
      </InputClaims>
      <OutputClaims>
        <OutputClaim ClaimTypeReferenceId="displayName" />
        <OutputClaim ClaimTypeReferenceId="givenName" />
        <OutputClaim ClaimTypeReferenceId="surname" />
        <OutputClaim ClaimTypeReferenceId="email" />
        <OutputClaim ClaimTypeReferenceId="objectId" PartnerClaimType="sub" />
        <OutputClaim ClaimTypeReferenceId="identityProvider" />
      </OutputClaims>
      <SubjectNamingInfo ClaimType="sub" />
    </TechnicalProfile>
  </RelyingParty>
  <UserJourneys>
    <UserJourney Id="SignUp">
      <OrchestrationSteps>
        <OrchestrationStep Order="1" Type="GetClaims" CpimIssuerTechnicalProfileReferenceId="IdTokenHint_ExtractClaims" />
      </OrchestrationSteps>
    </UserJourney>
  </UserJourneys>
</TrustFrameworkPolicy>`;
