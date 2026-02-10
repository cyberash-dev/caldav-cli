import type { Account } from "../../domain/entities/account.js"
import type { Calendar } from "../../domain/entities/calendar.js"
import type { CalendarEvent } from "../../domain/entities/calendar-event.js"

export type PresenterPort = {
  renderAccounts(accounts: Array<Account>): void
  renderEvents(events: Array<CalendarEvent>): void
  renderCalendars(calendars: Array<Calendar>): void
  renderSuccess(message: string): void
  renderError(message: string): void
}
