import type { AccountConfigPort } from "../../domain/ports/account-config.port.js"
import type { CalDAVPort } from "../../domain/ports/caldav.port.js"
import type { CredentialStorePort } from "../../domain/ports/credential-store.port.js"
import type { PresenterPort } from "../ports/presenter.port.js"
import type { PromptPort } from "../ports/prompt.port.js"

export type CreateEventParams = {
  accountName?: string | undefined
  calendarName?: string | undefined
  title?: string | undefined
  start?: Date | undefined
  end?: Date | undefined
  description?: string | undefined
  location?: string | undefined
}

export class CreateEventUseCase {
  constructor(
    private readonly config: AccountConfigPort,
    private readonly credentials: CredentialStorePort,
    private readonly caldav: CalDAVPort,
    private readonly prompt: PromptPort,
    private readonly presenter: PresenterPort,
  ) {}

  async execute(params: CreateEventParams): Promise<void> {
    const accounts = await this.config.loadAll()

    if (accounts.length === 0) {
      this.presenter.renderError("No accounts configured. Run 'caldav-cli account add' to add one.")
      return
    }

    const account = params.accountName
      ? accounts.find((a) => a.name === params.accountName)
      : accounts.length === 1
        ? accounts[0]
        : await this.resolveAccountByDefaultOrPrompt(accounts)

    if (!account) {
      this.presenter.renderError(`Account "${params.accountName}" not found.`)
      return
    }

    const password = await this.credentials.getPassword(account.name)
    if (!password) {
      this.presenter.renderError(`No credentials found for account "${account.name}". Try removing and re-adding it.`)
      return
    }

    const calendars = await this.caldav.fetchCalendars(account, password)

    if (calendars.length === 0) {
      this.presenter.renderError("No calendars found on this account.")
      return
    }

    const targetCalendar = params.calendarName
      ? calendars.find((c) => c.displayName.toLowerCase() === params.calendarName?.toLowerCase())
      : calendars.length === 1
        ? calendars[0]
        : await this.prompt.selectCalendar(calendars)

    if (!targetCalendar) {
      this.presenter.renderError(
        `Calendar "${params.calendarName}" not found. Available: ${calendars.map((c) => c.displayName).join(", ")}`,
      )
      return
    }

    const title = params.title || (await this.prompt.inputEventTitle()).trim()
    const startAt = params.start ?? (await this.prompt.inputEventStart())
    const endAt = params.end ?? (await this.prompt.inputEventEnd(startAt))
    const description = params.description ?? (await this.prompt.inputEventDescription())
    const location = params.location ?? (await this.prompt.inputEventLocation())

    const created = await this.caldav.createEvent(account, password, targetCalendar, {
      title,
      startAt,
      endAt,
      description,
      location,
    })

    this.presenter.renderSuccess(
      `Event "${created.title}" created on calendar "${created.calendarName}" (${created.startAt.toLocaleDateString()}).`,
    )
  }

  private async resolveAccountByDefaultOrPrompt(
    accounts: Array<{ name: string; providerId: string; username: string }>,
  ): Promise<{ name: string; providerId: string; username: string } | undefined> {
    const defaultName = await this.config.getDefault()
    if (defaultName) {
      return accounts.find((a) => a.name === defaultName)
    }
    return await this.prompt.selectAccount(accounts)
  }
}
