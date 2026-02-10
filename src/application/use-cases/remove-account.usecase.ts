import type { AccountConfigPort } from "../../domain/ports/account-config.port.js"
import type { CredentialStorePort } from "../../domain/ports/credential-store.port.js"
import type { OAuthConfigPort } from "../ports/oauth-config.port.js"
import type { PresenterPort } from "../ports/presenter.port.js"

export class RemoveAccountUseCase {
  constructor(
    private readonly config: AccountConfigPort,
    private readonly credentials: CredentialStorePort,
    private readonly oauthConfig: OAuthConfigPort,
    private readonly presenter: PresenterPort,
  ) {}

  async execute(accountName: string): Promise<void> {
    const accounts = await this.config.loadAll()
    const exists = accounts.some((a) => a.name === accountName)

    if (!exists) {
      this.presenter.renderError(`Account "${accountName}" not found.`)
      return
    }

    await this.credentials.deletePassword(accountName)
    await this.oauthConfig.removeOAuthConfig(accountName)
    await this.config.remove(accountName)
    this.presenter.renderSuccess(`Account "${accountName}" removed.`)
  }
}
