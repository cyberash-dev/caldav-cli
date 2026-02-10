import type { Account } from "../entities/account.js"
import type { Calendar } from "../entities/calendar.js"
import type { CalendarEvent } from "../entities/calendar-event.js"

export type TestConnectionParams = {
  serverUrl: string
  username: string
  password: string
  providerId: string
  accountName: string
}

export type TestConnectionResult = { success: true } | { success: false; error: string }

export type CalDAVPort = {
  testConnection(params: TestConnectionParams): Promise<TestConnectionResult>
  fetchCalendars(account: Account, password: string): Promise<Array<Calendar>>
  fetchEvents(
    account: Account,
    password: string,
    calendar: Calendar,
    from: Date,
    to: Date,
  ): Promise<Array<CalendarEvent>>
  createEvent(
    account: Account,
    password: string,
    calendar: Calendar,
    event: Omit<CalendarEvent, "uid" | "durationMinutes" | "calendarName">,
  ): Promise<CalendarEvent>
}
