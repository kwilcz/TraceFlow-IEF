/**
 * Test fixtures for PolicyProcessor tests
 * Contains sample B2C policy XML files for various scenarios
 */

export const BASE_POLICY_XML = `<?xml version="1.0" encoding="UTF-8"?>
<TrustFrameworkPolicy 
    xmlns="http://schemas.microsoft.com/online/cpim/schemas/2013/06" 
    PolicyId="B2C_1A_TrustFrameworkBase"
    TenantId="yourtenant.onmicrosoft.com">
  <BuildingBlocks>
    <ClaimsSchema>
      <ClaimType Id="objectId">
        <DisplayName>User's Object ID</DisplayName>
        <DataType>string</DataType>
      </ClaimType>
      <ClaimType Id="email">
        <DisplayName>Email Address</DisplayName>
        <DataType>string</DataType>
        <UserInputType>TextBox</UserInputType>
      </ClaimType>
      <ClaimType Id="displayName">
        <DisplayName>Display Name</DisplayName>
        <DataType>string</DataType>
      </ClaimType>
    </ClaimsSchema>
    <ClaimsTransformations>
      <ClaimsTransformation Id="CreateDisplayNameFromFirstAndLast" TransformationMethod="FormatStringMultipleClaims">
        <InputClaims>
          <InputClaim ClaimTypeReferenceId="givenName" TransformationClaimType="inputClaim1" />
          <InputClaim ClaimTypeReferenceId="surname" TransformationClaimType="inputClaim2" />
        </InputClaims>
        <InputParameters>
          <InputParameter Id="stringFormat" DataType="string" Value="{0} {1}" />
        </InputParameters>
        <OutputClaims>
          <OutputClaim ClaimTypeReferenceId="displayName" TransformationClaimType="outputClaim" />
        </OutputClaims>
      </ClaimsTransformation>
    </ClaimsTransformations>
  </BuildingBlocks>
  <ClaimsProviders>
    <ClaimsProvider>
      <DisplayName>Local Account SignIn</DisplayName>
      <TechnicalProfiles>
        <TechnicalProfile Id="login-NonInteractive">
          <DisplayName>Local Account SignIn</DisplayName>
          <Protocol Name="OpenIdConnect" />
          <Metadata>
            <Item Key="UserMessageIfClaimsPrincipalDoesNotExist">User not found</Item>
          </Metadata>
        </TechnicalProfile>
      </TechnicalProfiles>
    </ClaimsProvider>
  </ClaimsProviders>
</TrustFrameworkPolicy>`;

export const EXTENSION_POLICY_XML = `<?xml version="1.0" encoding="UTF-8"?>
<TrustFrameworkPolicy 
    xmlns="http://schemas.microsoft.com/online/cpim/schemas/2013/06" 
    PolicyId="B2C_1A_TrustFrameworkExtensions"
    TenantId="yourtenant.onmicrosoft.com">
  <BasePolicy>
    <TenantId>yourtenant.onmicrosoft.com</TenantId>
    <PolicyId>B2C_1A_TrustFrameworkBase</PolicyId>
  </BasePolicy>
  <BuildingBlocks>
    <ClaimsSchema>
      <ClaimType Id="givenName">
        <DisplayName>Given Name</DisplayName>
        <DataType>string</DataType>
      </ClaimType>
      <ClaimType Id="surname">
        <DisplayName>Surname</DisplayName>
        <DataType>string</DataType>
      </ClaimType>
    </ClaimsSchema>
  </BuildingBlocks>
  <ClaimsProviders>
    <ClaimsProvider>
      <DisplayName>Azure Active Directory</DisplayName>
      <TechnicalProfiles>
        <TechnicalProfile Id="AAD-UserReadUsingObjectId">
          <DisplayName>Azure Active Directory - Read User</DisplayName>
          <Protocol Name="Proprietary" Handler="Web.TPEngine.Providers.AzureActiveDirectoryProvider" />
          <Metadata>
            <Item Key="Operation">Read</Item>
          </Metadata>
        </TechnicalProfile>
        <TechnicalProfile Id="AAD-UserWriteProfileUsingObjectId">
          <DisplayName>Azure Active Directory - Write User</DisplayName>
          <Protocol Name="Proprietary" Handler="Web.TPEngine.Providers.AzureActiveDirectoryProvider" />
        </TechnicalProfile>
      </TechnicalProfiles>
    </ClaimsProvider>
  </ClaimsProviders>
  <UserJourneys>
    <UserJourney Id="SignIn">
      <OrchestrationSteps>
        <OrchestrationStep Order="1" Type="CombinedSignInAndSignUp">
          <ClaimsExchanges>
            <ClaimsExchange Id="LocalAccountSigninEmailExchange" TechnicalProfileReferenceId="login-NonInteractive" />
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

export const RELYING_PARTY_POLICY_XML = `<?xml version="1.0" encoding="UTF-8"?>
<TrustFrameworkPolicy 
    xmlns="http://schemas.microsoft.com/online/cpim/schemas/2013/06" 
    PolicyId="B2C_1A_signup_signin"
    TenantId="yourtenant.onmicrosoft.com">
  <BasePolicy>
    <TenantId>yourtenant.onmicrosoft.com</TenantId>
    <PolicyId>B2C_1A_TrustFrameworkExtensions</PolicyId>
  </BasePolicy>
  <RelyingParty>
    <DefaultUserJourney ReferenceId="SignIn" />
    <TechnicalProfile Id="PolicyProfile">
      <DisplayName>PolicyProfile</DisplayName>
      <Protocol Name="OpenIdConnect" />
      <OutputClaims>
        <OutputClaim ClaimTypeReferenceId="displayName" />
        <OutputClaim ClaimTypeReferenceId="email" />
        <OutputClaim ClaimTypeReferenceId="objectId" PartnerClaimType="sub" />
      </OutputClaims>
      <SubjectNamingInfo ClaimType="sub" />
    </TechnicalProfile>
  </RelyingParty>
</TrustFrameworkPolicy>`;

export const INVALID_POLICY_XML = `<?xml version="1.0" encoding="UTF-8"?>
<TrustFrameworkPolicy 
    xmlns="http://schemas.microsoft.com/online/cpim/schemas/2013/06" 
    PolicyId=""
    TenantId="yourtenant.onmicrosoft.com">
  <BuildingBlocks>
    <ClaimsSchema>
    </ClaimsSchema>
  </BuildingBlocks>
</TrustFrameworkPolicy>`;

export const POLICY_WITH_SUBJOURNEY_XML = `<?xml version="1.0" encoding="UTF-8"?>
<TrustFrameworkPolicy 
    xmlns="http://schemas.microsoft.com/online/cpim/schemas/2013/06" 
    PolicyId="B2C_1A_WithSubJourney"
    TenantId="yourtenant.onmicrosoft.com">
  <ClaimsProviders>
    <ClaimsProvider>
      <DisplayName>MFA Provider</DisplayName>
      <TechnicalProfiles>
        <TechnicalProfile Id="PhoneFactor-InputOrVerify">
          <DisplayName>Phone Factor</DisplayName>
          <Protocol Name="Proprietary" Handler="Web.TPEngine.Providers.PhoneFactorProtocolProvider" />
        </TechnicalProfile>
      </TechnicalProfiles>
    </ClaimsProvider>
  </ClaimsProviders>
  <SubJourneys>
    <SubJourney Id="MFA-StepUp" Type="Call">
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
          <ClaimsExchanges>
            <ClaimsExchange Id="LocalAccountSignin" TechnicalProfileReferenceId="login-NonInteractive" />
          </ClaimsExchanges>
        </OrchestrationStep>
        <OrchestrationStep Order="2" Type="InvokeSubJourney">
          <JourneyList>
            <Candidate SubJourneyReferenceId="MFA-StepUp" />
          </JourneyList>
        </OrchestrationStep>
        <OrchestrationStep Order="3" Type="SendClaims" CpimIssuerTechnicalProfileReferenceId="JwtIssuer" />
      </OrchestrationSteps>
    </UserJourney>
  </UserJourneys>
</TrustFrameworkPolicy>`;

export const MALFORMED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<TrustFrameworkPolicy 
    xmlns="http://schemas.microsoft.com/online/cpim/schemas/2013/06">
  <BuildingBlocks>
    <ClaimsSchema>
      <ClaimType Id="test">
        <DisplayName>Unclosed element`;

export const NOT_A_POLICY_XML = `<?xml version="1.0" encoding="UTF-8"?>
<SomeOtherDocument>
  <NotATrustFrameworkPolicy>
    <Element>Value</Element>
  </NotATrustFrameworkPolicy>
</SomeOtherDocument>`;

/**
 * Helper to create a mock File object from XML string
 */
export function createMockFile(content: string, fileName: string): File {
    const blob = new Blob([content], { type: 'application/xml' });
    return new File([blob], fileName, { type: 'application/xml' });
}

/**
 * Helper to create a set of mock policy files
 */
export function createPolicyFileSet(): File[] {
    return [
        createMockFile(BASE_POLICY_XML, 'TrustFrameworkBase.xml'),
        createMockFile(EXTENSION_POLICY_XML, 'TrustFrameworkExtensions.xml'),
        createMockFile(RELYING_PARTY_POLICY_XML, 'SignUpOrSignIn.xml'),
    ];
}

/**
 * Helper to create files in wrong order (should be sorted correctly by processor)
 */
export function createUnorderedPolicyFileSet(): File[] {
    return [
        createMockFile(RELYING_PARTY_POLICY_XML, 'SignUpOrSignIn.xml'),
        createMockFile(BASE_POLICY_XML, 'TrustFrameworkBase.xml'),
        createMockFile(EXTENSION_POLICY_XML, 'TrustFrameworkExtensions.xml'),
    ];
}
