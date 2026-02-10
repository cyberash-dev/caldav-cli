import type { CalendarEvent } from "../../domain/entities/calendar-event.js"
import type { AccountConfigPort } from "../../domain/ports/account-config.port.js"
import type { CalDAVPort } from "../../domain/ports/caldav.port.js"
import type { CredentialStorePort } from "../../domain/ports/credential-store.port.js"
import type { PresenterPort } from "../ports/presenter.port.js"

export type ListEventsParams = {
  accountName?: string | undefined
  from: Date
  to: Date
  calendarFilter?: string | undefined
}

export class ListEventsUseCase {
  constructor(
    private readonly config: AccountConfigPort,
    private readonly credentials: CredentialStorePort,
    private readonly caldav: CalDAVPort,
    private readonly presenter: PresenterPort,
  ) {}

  async execute(params: ListEventsParams): Promise<void> {
    const accounts = await this.config.loadAll()

    if (accounts.length === 0) {
      this.presenter.renderError("No accounts configured. Run 'caldav-cli account add' to add one.")
      return
    }

    let targetAccountName = params.accountName
    if (!targetAccountName) {
      targetAccountName = await this.config.getDefault()
    }
    if (!targetAccountName) {
      const first = accounts[0]
      if (!first) {
        this.presenter.renderError("No accounts configured. Run 'caldav-cli account add' to add one.")
        return
      }
      targetAccountName = first.name
    }

    const account = accounts.find((a) => a.name === targetAccountName)
    if (!account) {
      this.presenter.renderError(`Account "${targetAccountName}" not found.`)
      return
    }

    const password = await this.credentials.getPassword(account.name)
    if (!password) {
      this.presenter.renderError(`No credentials found for account "${account.name}". Try removing and re-adding it.`)
      return
    }

    const calendars = await this.caldav.fetchCalendars(account, password)

    const filtered = params.calendarFilter
      ? calendars.filter((c) => c.displayName.toLowerCase() === params.calendarFilter?.toLowerCase())
      : calendars

    if (filtered.length === 0) {
      this.presenter.renderError("No calendars found matching the filter.")
      return
    }

    const allEvents: Array<CalendarEvent> = []

    for (const calendar of filtered) {
      const events = await this.caldav.fetchEvents(account, password, calendar, params.from, params.to)
      allEvents.push(...events)
    }

    allEvents.sort((a, b) => a.startAt.getTime() - b.startAt.getTime())

    if (allEvents.length === 0) {
      this.presenter.renderSuccess("No events found in the specified time range.")
      return
    }

    this.presenter.renderEvents(allEvents)
  }
}
