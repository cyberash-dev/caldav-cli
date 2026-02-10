import chalk from "chalk"
import Table from "cli-table3"
import dayjs from "dayjs"
import type { PresenterPort } from "../../application/ports/presenter.port.js"
import type { Account } from "../../domain/entities/account.js"
import type { Calendar } from "../../domain/entities/calendar.js"
import type { CalendarEvent } from "../../domain/entities/calendar-event.js"

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

export class TablePresenterAdapter implements PresenterPort {
  renderAccounts(accounts: Array<Account>): void {
    const table = new Table({
      head: [chalk.bold("Name"), chalk.bold("Provider"), chalk.bold("Username")],
    })

    for (const a of accounts) {
      table.push([a.name, a.providerId, a.username])
    }

    console.log(table.toString())
  }

  renderEvents(events: Array<CalendarEvent>): void {
    const hasDescription = events.some((e) => e.description)

    const head = [
      chalk.bold("Calendar"),
      chalk.bold("Date"),
      chalk.bold("Time"),
      chalk.bold("Duration"),
      chalk.bold("Title"),
      ...(hasDescription ? [chalk.bold("Description")] : []),
    ]

    const table = new Table({ head })

    for (const e of events) {
      const date = dayjs(e.startAt).format("YYYY-MM-DD")
      const startTime = dayjs(e.startAt).format("HH:mm")
      const endTime = dayjs(e.endAt).format("HH:mm")

      const row = [e.calendarName, date, `${startTime}-${endTime}`, formatDuration(e.durationMinutes), e.title]
      if (hasDescription) {
        row.push(e.description ?? "")
      }
      table.push(row)
    }

    console.log(table.toString())
  }

  renderCalendars(calendars: Array<Calendar>): void {
    const table = new Table({
      head: [chalk.bold("Name"), chalk.bold("ID")],
    })

    for (const c of calendars) {
      table.push([c.displayName, c.calendarId])
    }

    console.log(table.toString())
  }

  renderSuccess(message: string): void {
    console.log(chalk.green(`\u2713 ${message}`))
  }

  renderError(message: string): void {
    console.error(chalk.red(`\u2717 ${message}`))
  }
}
