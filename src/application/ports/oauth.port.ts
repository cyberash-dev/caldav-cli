export type OAuthConfig = {
  clientId: string
  clientSecret: string
  authorizationUrl: string
  tokenUrl: string
  scopes: Array<string>
}

export type OAuthTokens = {
  accessToken: string
  refreshToken: string
  expiration: number
}

export type OAuthPort = {
  authorize(config: OAuthConfig): Promise<OAuthTokens>
}
