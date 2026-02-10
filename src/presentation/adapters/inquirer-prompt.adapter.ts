import { confirm, input, password, select } from "@inquirer/prompts"
import type { PromptPort } from "../../application/ports/prompt.port.js"
import type { ProviderPreset } from "../../application/ports/provider-registry.port.js"
import type { Account } from "../../domain/entities/account.js"
import type { Calendar } from "../../domain/entities/calendar.js"

function parseDateTime(value: string): Date | null {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d
}

export class InquirerPromptAdapter implements PromptPort {
  async selectProvider(providers: Array<ProviderPreset>): Promise<ProviderPreset | null> {
    const choices = [
      ...providers.map((p) => ({ name: p.displayName, value: p.id })),
      { name: "Custom CalDAV server", value: "__custom__" },
    ]

    const selected = await select({
      message: "Select a CalDAV provider:",
      choices,
    })

    if (selected === "__custom__") return null
    return providers.find((p) => p.id === selected) ?? null
  }

  async inputServerUrl(hint: string): Promise<string> {
    return await input({
      message: `Server URL (${hint}):`,
      validate: (val) => {
        if (!val.trim()) return "Server URL is required"
        try {
          new URL(val.trim())
          return true
        } catch {
          return "Please enter a valid URL"
        }
      },
    })
  }

  async inputUsername(hint?: string | undefined): Promise<string> {
    const message = hint ? `Username (${hint}):` : "Username:"
    return await input({
      message,
      validate: (val) => (val.trim() ? true : "Username is required"),
    })
  }

  async inputPassword(hint: string): Promise<string> {
    return await password({
      message: `Password (${hint}):`,
      validate: (val) => (val ? true : "Password is required"),
    })
  }

  async inputAccountName(): Promise<string> {
    return await input({
      message: "Account name (a short label for this account):",
      validate: (val) => (val.trim() ? true : "Account name is required"),
    })
  }

  async inputClientId(): Promise<string> {
    return await input({
      message: "OAuth Client ID:",
      validate: (val) => (val.trim() ? true : "Client ID is required"),
    })
  }

  async inputClientSecret(): Promise<string> {
    return await input({
      message: "OAuth Client Secret:",
      validate: (val) => (val.trim() ? true : "Client Secret is required"),
    })
  }

  async confirm(message: string): Promise<boolean> {
    return await confirm({ message })
  }

  async selectAccount(accounts: Array<Account>): Promise<Account> {
    const choices = accounts.map((a) => ({
      name: `${a.name} (${a.username})`,
      value: a.name,
    }))

    const selectedName = await select({
      message: "Select an account:",
      choices,
    })

    const found = accounts.find((a) => a.name === selectedName)
    if (!found) {
      throw new Error(`Account "${selectedName}" not found`)
    }
    return found
  }

  async selectCalendar(calendars: Array<Calendar>): Promise<Calendar> {
    const choices = calendars.map((c) => ({
      name: c.displayName,
      value: c.calendarId,
    }))

    const selectedId = await select({
      message: "Select a calendar:",
      choices,
    })

    const found = calendars.find((c) => c.calendarId === selectedId)
    if (!found) {
      throw new Error(`Calendar with id "${selectedId}" not found`)
    }
    return found
  }

  async inputEventTitle(): Promise<string> {
    return await input({
      message: "Event title:",
      validate: (val) => (val.trim() ? true : "Title is required"),
    })
  }

  async inputEventStart(): Promise<Date> {
    const value = await input({
      message: "Start date and time (YYYY-MM-DDTHH:mm):",
      validate: (val) => {
        const d = parseDateTime(val)
        if (!d) return "Invalid date format. Use YYYY-MM-DDTHH:mm"
        return true
      },
    })
    return parseDateTime(value) as Date
  }

  async inputEventEnd(after: Date): Promise<Date> {
    const value = await input({
      message: "End date and time (YYYY-MM-DDTHH:mm):",
      validate: (val) => {
        const d = parseDateTime(val)
        if (!d) return "Invalid date format. Use YYYY-MM-DDTHH:mm"
        if (d.getTime() <= after.getTime()) return "End must be after start"
        return true
      },
    })
    return parseDateTime(value) as Date
  }

  async inputEventDescription(): Promise<string | undefined> {
    const value = await input({
      message: "Description (press Enter to skip):",
    })
    return value.trim() || undefined
  }

  async inputEventLocation(): Promise<string | undefined> {
    const value = await input({
      message: "Location (press Enter to skip):",
    })
    return value.trim() || undefined
  }
}
