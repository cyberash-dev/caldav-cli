import type { PresenterPort } from "../../application/ports/presenter.port.js"
import type { Account } from "../../domain/entities/account.js"
import type { Calendar } from "../../domain/entities/calendar.js"
import type { CalendarEvent } from "../../domain/entities/calendar-event.js"

export class JsonPresenterAdapter implements PresenterPort {
  renderAccounts(accounts: Array<Account>): void {
    console.log(JSON.stringify(accounts, null, 2))
  }

  renderEvents(events: Array<CalendarEvent>): void {
    const output = events.map((e) => ({
      calendarName: e.calendarName,
      title: e.title,
      startAt: e.startAt.toISOString(),
      endAt: e.endAt.toISOString(),
      durationMinutes: e.durationMinutes,
      description: e.description ?? null,
      location: e.location ?? null,
    }))

    console.log(JSON.stringify(output, null, 2))
  }

  renderCalendars(calendars: Array<Calendar>): void {
    console.log(JSON.stringify(calendars, null, 2))
  }

  renderSuccess(message: string): void {
    console.log(JSON.stringify({ status: "success", message }))
  }

  renderError(message: string): void {
    console.error(JSON.stringify({ status: "error", message }))
  }
}
