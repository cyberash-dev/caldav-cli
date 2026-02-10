import type { Account } from "../../domain/entities/account.js"
import type { AccountConfigPort } from "../../domain/ports/account-config.port.js"
import type { CalDAVPort } from "../../domain/ports/caldav.port.js"
import type { CredentialStorePort } from "../../domain/ports/credential-store.port.js"
import type { OAuthPort } from "../ports/oauth.port.js"
import type { OAuthConfigPort } from "../ports/oauth-config.port.js"
import type { PresenterPort } from "../ports/presenter.port.js"
import type { PromptPort } from "../ports/prompt.port.js"
import type { ProviderRegistryPort } from "../ports/provider-registry.port.js"
import type { ServerUrlConfigPort } from "../ports/server-url-config.port.js"

export class AddAccountUseCase {
  constructor(
    private readonly providerRegistry: ProviderRegistryPort,
    private readonly prompt: PromptPort,
    private readonly caldav: CalDAVPort,
    private readonly credentials: CredentialStorePort,
    private readonly config: AccountConfigPort,
    private readonly serverUrlConfig: ServerUrlConfigPort,
    private readonly oauthPort: OAuthPort,
    private readonly oauthConfig: OAuthConfigPort,
    private readonly presenter: PresenterPort,
  ) {}

  async execute(): Promise<void> {
    const presets = this.providerRegistry.listProviders()
    const preset = await this.prompt.selectProvider(presets)

    let serverUrl: string
    let providerId: string
    let hint: string

    if (preset) {
      providerId = preset.id
      hint = preset.hint
      const inputUrl = preset.serverUrl || (await this.prompt.inputServerUrl(preset.hint))
      serverUrl = inputUrl.trim()
    } else {
      providerId = "custom"
      hint = "Enter your password"
      serverUrl = (await this.prompt.inputServerUrl("Enter the CalDAV server URL")).trim()
    }

    const name = (await this.prompt.inputAccountName()).trim()
    const username = (await this.prompt.inputUsername(preset?.usernameHint)).trim()

    const oauthPresetConfig = preset?.authMethod === "oauth2" ? preset.oauthConfig : undefined

    if (oauthPresetConfig) {
      await this.executeOAuthFlow(oauthPresetConfig, name, username, serverUrl, providerId)
    } else {
      await this.executeBasicFlow(hint, name, username, serverUrl, providerId)
    }
  }

  private async executeBasicFlow(
    hint: string,
    name: string,
    username: string,
    serverUrl: string,
    providerId: string,
  ): Promise<void> {
    const rawPassword = (await this.prompt.inputPassword(hint)).trim()
    const password = this.providerRegistry.normalizePassword(providerId, rawPassword)

    const result = await this.caldav.testConnection({ serverUrl, username, password, providerId, accountName: name })
    if (!result.success) {
      this.presenter.renderError(`Connection failed: ${result.error}`)
      return
    }

    const account: Account = { name, providerId, username }
    await this.credentials.setPassword(name, password)
    await this.config.save(account)
    await this.serverUrlConfig.saveServerUrl(name, serverUrl)
    await this.setDefaultIfFirst(name)
    this.presenter.renderSuccess(`Account "${name}" added successfully.`)
  }

  private async executeOAuthFlow(
    oauthPresetConfig: { authorizationUrl: string; tokenUrl: string; scopes: Array<string> },
    name: string,
    username: string,
    serverUrl: string,
    providerId: string,
  ): Promise<void> {
    const clientId = (await this.prompt.inputClientId()).trim()
    const clientSecret = (await this.prompt.inputClientSecret()).trim()

    let tokens: { accessToken: string; refreshToken: string; expiration: number }
    try {
      tokens = await this.oauthPort.authorize({
        clientId,
        clientSecret,
        authorizationUrl: oauthPresetConfig.authorizationUrl,
        tokenUrl: oauthPresetConfig.tokenUrl,
        scopes: oauthPresetConfig.scopes,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.presenter.renderError(`OAuth authorization failed: ${message}`)
      return
    }

    await this.oauthConfig.saveOAuthConfig(name, {
      clientId,
      clientSecret,
      tokenUrl: oauthPresetConfig.tokenUrl,
    })
    await this.credentials.setPassword(name, tokens.refreshToken)

    const result = await this.caldav.testConnection({
      serverUrl,
      username,
      password: tokens.refreshToken,
      providerId,
      accountName: name,
    })

    if (!result.success) {
      await this.oauthConfig.removeOAuthConfig(name)
      await this.credentials.deletePassword(name)
      this.presenter.renderError(`Connection failed: ${result.error}`)
      return
    }

    const account: Account = { name, providerId, username }
    await this.config.save(account)
    await this.serverUrlConfig.saveServerUrl(name, serverUrl)
    await this.setDefaultIfFirst(name)
    this.presenter.renderSuccess(`Account "${name}" added successfully.`)
  }

  private async setDefaultIfFirst(name: string): Promise<void> {
    const accounts = await this.config.loadAll()
    if (accounts.length === 1) {
      await this.config.setDefault(name)
    }
  }
}
