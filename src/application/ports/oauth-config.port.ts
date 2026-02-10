export type OAuthAccountConfig = {
  clientId: string
  clientSecret: string
  tokenUrl: string
}

export type OAuthConfigPort = {
  getOAuthConfig(accountName: string): Promise<OAuthAccountConfig | undefined>
  saveOAuthConfig(accountName: string, config: OAuthAccountConfig): Promise<void>
  removeOAuthConfig(accountName: string): Promise<void>
}
