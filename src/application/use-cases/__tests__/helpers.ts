import { jest } from "@jest/globals"
import type { Account } from "../../../domain/entities/account.js"
import type { Calendar } from "../../../domain/entities/calendar.js"
import type { CalendarEvent } from "../../../domain/entities/calendar-event.js"
import type { AccountConfigPort } from "../../../domain/ports/account-config.port.js"
import type { CalDAVPort } from "../../../domain/ports/caldav.port.js"
import type { CredentialStorePort } from "../../../domain/ports/credential-store.port.js"
import type { OAuthPort } from "../../ports/oauth.port.js"
import type { OAuthConfigPort } from "../../ports/oauth-config.port.js"
import type { PresenterPort } from "../../ports/presenter.port.js"
import type { PromptPort } from "../../ports/prompt.port.js"
import type { ProviderPreset, ProviderRegistryPort } from "../../ports/provider-registry.port.js"
import type { ServerUrlConfigPort } from "../../ports/server-url-config.port.js"

export const TEST_ACCOUNT: Account = {
  name: "work",
  providerId: "icloud",
  username: "user@icloud.com",
}

export const TEST_CALENDAR: Calendar = {
  calendarId: "https://caldav.icloud.com/calendars/work/",
  displayName: "Work",
}

export const TEST_EVENT: CalendarEvent = {
  uid: "abc-123",
  title: "Team standup",
  startAt: new Date("2026-02-10T10:00:00"),
  endAt: new Date("2026-02-10T10:30:00"),
  durationMinutes: 30,
  calendarName: "Work",
}

export const TEST_PRESET: ProviderPreset = {
  id: "icloud",
  displayName: "Apple iCloud",
  serverUrl: "https://caldav.icloud.com",
  authMethod: "basic",
  hint: "Use an app-specific password",
}

export const TEST_OAUTH_PRESET: ProviderPreset = {
  id: "google",
  displayName: "Google Calendar",
  serverUrl: "https://apidata.googleusercontent.com/caldav/v2",
  authMethod: "oauth2",
  hint: "Create an OAuth client at console.cloud.google.com",
  usernameHint: "full email address, e.g. you@gmail.com",
  oauthConfig: {
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/calendar"],
  },
}

export function createMockPresenter(): jest.Mocked<PresenterPort> {
  return {
    renderAccounts: jest.fn(),
    renderEvents: jest.fn(),
    renderCalendars: jest.fn(),
    renderSuccess: jest.fn(),
    renderError: jest.fn(),
  }
}

export function createMockConfig(): jest.Mocked<AccountConfigPort> {
  return {
    loadAll: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    getDefault: jest.fn(),
    setDefault: jest.fn(),
  }
}

export function createMockCredentials(): jest.Mocked<CredentialStorePort> {
  return {
    getPassword: jest.fn(),
    setPassword: jest.fn(),
    deletePassword: jest.fn(),
  }
}

export function createMockCalDAV(): jest.Mocked<CalDAVPort> {
  return {
    testConnection: jest.fn(),
    fetchCalendars: jest.fn(),
    fetchEvents: jest.fn(),
    createEvent: jest.fn(),
  }
}

export function createMockPrompt(): jest.Mocked<PromptPort> {
  return {
    selectProvider: jest.fn(),
    inputServerUrl: jest.fn(),
    inputUsername: jest.fn(),
    inputPassword: jest.fn(),
    inputAccountName: jest.fn(),
    inputClientId: jest.fn(),
    inputClientSecret: jest.fn(),
    confirm: jest.fn(),
    selectAccount: jest.fn(),
    selectCalendar: jest.fn(),
    inputEventTitle: jest.fn(),
    inputEventStart: jest.fn(),
    inputEventEnd: jest.fn(),
    inputEventDescription: jest.fn(),
    inputEventLocation: jest.fn(),
  }
}

export function createMockProviderRegistry(): jest.Mocked<ProviderRegistryPort> {
  return {
    listProviders: jest.fn(),
    getProvider: jest.fn(),
    normalizePassword: jest.fn((_id: string, password: string) => password),
  }
}

export function createMockServerUrlConfig(): jest.Mocked<ServerUrlConfigPort> {
  return {
    getServerUrl: jest.fn(),
    saveServerUrl: jest.fn(),
    removeServerUrl: jest.fn(),
  }
}

export function createMockOAuth(): jest.Mocked<OAuthPort> {
  return {
    authorize: jest.fn(),
  }
}

export function createMockOAuthConfig(): jest.Mocked<OAuthConfigPort> {
  return {
    getOAuthConfig: jest.fn(),
    saveOAuthConfig: jest.fn(),
    removeOAuthConfig: jest.fn(),
  }
}
