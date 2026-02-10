export type AuthMethod = "basic" | "oauth2"

export type OAuthPresetConfig = {
  authorizationUrl: string
  tokenUrl: string
  scopes: Array<string>
}

export type ProviderPreset = {
  id: string
  displayName: string
  serverUrl: string
  authMethod: AuthMethod
  hint: string
  usernameHint?: string | undefined
  normalizePassword?: ((password: string) => string) | undefined
  oauthConfig?: OAuthPresetConfig | undefined
}

export type ProviderRegistryPort = {
  listProviders(): Array<ProviderPreset>
  getProvider(id: string): ProviderPreset | undefined
  normalizePassword(providerId: string, password: string): string
}
