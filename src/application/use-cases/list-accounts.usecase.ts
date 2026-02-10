import type { AccountConfigPort } from "../../domain/ports/account-config.port.js"
import type { PresenterPort } from "../ports/presenter.port.js"

export class ListAccountsUseCase {
  constructor(
    private readonly config: AccountConfigPort,
    private readonly presenter: PresenterPort,
  ) {}

  async execute(): Promise<void> {
    const accounts = await this.config.loadAll()

    if (accounts.length === 0) {
      this.presenter.renderError("No accounts configured. Run 'caldav-cli account add' to add one.")
      return
    }

    this.presenter.renderAccounts(accounts)
  }
}
