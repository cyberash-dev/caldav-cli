import ICAL from "ical.js"
import { DAVClient } from "tsdav"
import type { OAuthConfigPort } from "../../application/ports/oauth-config.port.js"
import type { ProviderRegistryPort } from "../../application/ports/provider-registry.port.js"
import type { ServerUrlConfigPort } from "../../application/ports/server-url-config.port.js"
import type { Account } from "../../domain/entities/account.js"
import type { Calendar } from "../../domain/entities/calendar.js"
import type { CalendarEvent } from "../../domain/entities/calendar-event.js"
import type { CalDAVPort, TestConnectionParams, TestConnectionResult } from "../../domain/ports/caldav.port.js"

function calculateDurationMinutes(startAt: Date, endAt: Date): number {
  return Math.round((endAt.getTime() - startAt.getTime()) / 60000)
}

function parseICalEvents(icalData: string, calendarName: string): Array<CalendarEvent> {
  const events: Array<CalendarEvent> = []

  try {
    const jcalData = ICAL.parse(icalData)
    const comp = new ICAL.Component(jcalData)
    const vevents = comp.getAllSubcomponents("vevent")

    for (const vevent of vevents) {
      const event = new ICAL.Event(vevent)
      const startAt = event.startDate?.toJSDate()
      const endAt = event.endDate?.toJSDate()

      if (!startAt || !endAt) continue

      events.push({
        uid: event.uid || crypto.randomUUID(),
        title: event.summary || "(no title)",
        startAt,
        endAt,
        durationMinutes: calculateDurationMinutes(startAt, endAt),
        calendarName,
        description: event.description || undefined,
        location: event.location || undefined,
      })
    }
  } catch {
    // skip unparseable entries
  }

  return events
}

function buildICalString(event: Omit<CalendarEvent, "uid" | "durationMinutes" | "calendarName">): {
  uid: string
  icalString: string
} {
  const uid = crypto.randomUUID()
  const now = new Date()

  const formatDate = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "")

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//caldav-cli//EN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatDate(now)}`,
    `DTSTART:${formatDate(event.startAt)}`,
    `DTEND:${formatDate(event.endAt)}`,
    `SUMMARY:${event.title}`,
  ]

  if (event.description) {
    lines.push(`DESCRIPTION:${event.description}`)
  }
  if (event.location) {
    lines.push(`LOCATION:${event.location}`)
  }

  lines.push("END:VEVENT", "END:VCALENDAR")

  return { uid, icalString: lines.join("\r\n") }
}

enum TsdavAuthMethod {
  Basic = "Basic",
  OAuth = "Oauth",
}

export class TsdavCalDAVAdapter implements CalDAVPort {
  constructor(
    private readonly providerRegistry: ProviderRegistryPort,
    private readonly serverUrlConfig: ServerUrlConfigPort,
    private readonly oauthConfig: OAuthConfigPort,
  ) {}

  private resolveAuthMethod(providerId: string): TsdavAuthMethod {
    const preset = this.providerRegistry.getProvider(providerId)
    if (preset && preset.authMethod === "oauth2") return TsdavAuthMethod.OAuth
    return TsdavAuthMethod.Basic
  }

  private async resolveServerUrl(account: Account): Promise<string> {
    const preset = this.providerRegistry.getProvider(account.providerId)
    if (preset?.serverUrl) return preset.serverUrl

    const stored = await this.serverUrlConfig.getServerUrl(account.name)
    if (stored) return stored

    throw new Error(`No server URL found for account "${account.name}"`)
  }

  private async createClient(
    serverUrl: string,
    username: string,
    password: string,
    providerId: string,
    accountName: string,
  ): Promise<DAVClient> {
    const authMethod = this.resolveAuthMethod(providerId)

    if (authMethod === TsdavAuthMethod.OAuth) {
      const oauth = await this.oauthConfig.getOAuthConfig(accountName)
      if (!oauth) {
        throw new Error(`No OAuth configuration found for account "${accountName}"`)
      }

      return new DAVClient({
        serverUrl,
        credentials: {
          username,
          refreshToken: password,
          clientId: oauth.clientId,
          clientSecret: oauth.clientSecret,
          tokenUrl: oauth.tokenUrl,
        },
        authMethod: TsdavAuthMethod.OAuth,
        defaultAccountType: "caldav",
      })
    }

    return new DAVClient({
      serverUrl,
      credentials: { username, password },
      authMethod: TsdavAuthMethod.Basic,
      defaultAccountType: "caldav",
    })
  }

  async testConnection(params: TestConnectionParams): Promise<TestConnectionResult> {
    try {
      const client = await this.createClient(
        params.serverUrl,
        params.username,
        params.password,
        params.providerId,
        params.accountName,
      )
      await client.login()
      await client.fetchCalendars()
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const detail = err instanceof Error && err.cause ? ` (cause: ${err.cause})` : ""
      return { success: false, error: `${message}${detail}` }
    }
  }

  async fetchCalendars(account: Account, password: string): Promise<Array<Calendar>> {
    const serverUrl = await this.resolveServerUrl(account)
    const client = await this.createClient(serverUrl, account.username, password, account.providerId, account.name)
    await client.login()
    const davCalendars = await client.fetchCalendars()

    return davCalendars.map((c) => {
      const segments = c.url.split("/").filter(Boolean)
      const fallbackName = segments[segments.length - 1] ?? "Unnamed"

      return {
        calendarId: c.url,
        displayName: typeof c.displayName === "string" ? c.displayName : fallbackName,
        color: c.calendarColor ?? undefined,
      }
    })
  }

  async fetchEvents(
    account: Account,
    password: string,
    calendar: Calendar,
    from: Date,
    to: Date,
  ): Promise<Array<CalendarEvent>> {
    const serverUrl = await this.resolveServerUrl(account)
    const client = await this.createClient(serverUrl, account.username, password, account.providerId, account.name)
    await client.login()

    const objects = await client.fetchCalendarObjects({
      calendar: { url: calendar.calendarId },
      timeRange: {
        start: from.toISOString(),
        end: to.toISOString(),
      },
    })

    const allEvents: Array<CalendarEvent> = []

    for (const obj of objects) {
      if (typeof obj.data === "string") {
        allEvents.push(...parseICalEvents(obj.data, calendar.displayName))
      }
    }

    return allEvents
  }

  async createEvent(
    account: Account,
    password: string,
    calendar: Calendar,
    event: Omit<CalendarEvent, "uid" | "durationMinutes" | "calendarName">,
  ): Promise<CalendarEvent> {
    const serverUrl = await this.resolveServerUrl(account)
    const client = await this.createClient(serverUrl, account.username, password, account.providerId, account.name)
    await client.login()

    const { uid, icalString } = buildICalString(event)

    await client.createCalendarObject({
      calendar: { url: calendar.calendarId },
      filename: `${uid}.ics`,
      iCalString: icalString,
    })

    return {
      uid,
      title: event.title,
      startAt: event.startAt,
      endAt: event.endAt,
      durationMinutes: calculateDurationMinutes(event.startAt, event.endAt),
      calendarName: calendar.displayName,
      description: event.description,
      location: event.location,
    }
  }
}
