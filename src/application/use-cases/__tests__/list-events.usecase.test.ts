import { describe, expect, it } from "@jest/globals"
import { ListEventsUseCase } from "../list-events.usecase.js"
import {
  createMockCalDAV,
  createMockConfig,
  createMockCredentials,
  createMockPresenter,
  TEST_ACCOUNT,
  TEST_CALENDAR,
  TEST_EVENT,
} from "./helpers.js"

describe("ListEventsUseCase", () => {
  const FROM = new Date("2026-02-10T00:00:00")
  const TO = new Date("2026-02-17T23:59:59")

  const setup = () => {
    const config = createMockConfig()
    const credentials = createMockCredentials()
    const caldav = createMockCalDAV()
    const presenter = createMockPresenter()
    const useCase = new ListEventsUseCase(config, credentials, caldav, presenter)
    return { useCase, config, credentials, caldav, presenter }
  }

  it("lists events from all calendars", async () => {
    const { useCase, config, credentials, caldav, presenter } = setup()

    config.loadAll.mockResolvedValue([TEST_ACCOUNT])
    config.getDefault.mockResolvedValue("work")
    credentials.getPassword.mockResolvedValue("secret")
    caldav.fetchCalendars.mockResolvedValue([TEST_CALENDAR])
    caldav.fetchEvents.mockResolvedValue([TEST_EVENT])

    await useCase.execute({ from: FROM, to: TO })

    expect(caldav.fetchCalendars).toHaveBeenCalledWith(TEST_ACCOUNT, "secret")
    expect(caldav.fetchEvents).toHaveBeenCalledWith(TEST_ACCOUNT, "secret", TEST_CALENDAR, FROM, TO)
    expect(presenter.renderEvents).toHaveBeenCalledWith([TEST_EVENT])
  })

  it("uses specified account name", async () => {
    const { useCase, config, credentials, caldav } = setup()

    config.loadAll.mockResolvedValue([TEST_ACCOUNT])
    credentials.getPassword.mockResolvedValue("secret")
    caldav.fetchCalendars.mockResolvedValue([TEST_CALENDAR])
    caldav.fetchEvents.mockResolvedValue([TEST_EVENT])

    await useCase.execute({ accountName: "work", from: FROM, to: TO })

    expect(config.getDefault).not.toHaveBeenCalled()
    expect(caldav.fetchCalendars).toHaveBeenCalledWith(TEST_ACCOUNT, "secret")
  })

  it("falls back to first account when no default set", async () => {
    const { useCase, config, credentials, caldav } = setup()

    config.loadAll.mockResolvedValue([TEST_ACCOUNT])
    config.getDefault.mockResolvedValue(undefined)
    credentials.getPassword.mockResolvedValue("secret")
    caldav.fetchCalendars.mockResolvedValue([TEST_CALENDAR])
    caldav.fetchEvents.mockResolvedValue([TEST_EVENT])

    await useCase.execute({ from: FROM, to: TO })

    expect(caldav.fetchCalendars).toHaveBeenCalledWith(TEST_ACCOUNT, "secret")
  })

  it("filters calendars by name", async () => {
    const { useCase, config, credentials, caldav } = setup()

    const personalCalendar = { ...TEST_CALENDAR, calendarId: "/personal/", displayName: "Personal" }
    config.loadAll.mockResolvedValue([TEST_ACCOUNT])
    config.getDefault.mockResolvedValue("work")
    credentials.getPassword.mockResolvedValue("secret")
    caldav.fetchCalendars.mockResolvedValue([TEST_CALENDAR, personalCalendar])
    caldav.fetchEvents.mockResolvedValue([TEST_EVENT])

    await useCase.execute({ from: FROM, to: TO, calendarFilter: "Work" })

    expect(caldav.fetchEvents).toHaveBeenCalledTimes(1)
    expect(caldav.fetchEvents).toHaveBeenCalledWith(TEST_ACCOUNT, "secret", TEST_CALENDAR, FROM, TO)
  })

  it("sorts events by start time", async () => {
    const { useCase, config, credentials, caldav, presenter } = setup()

    const laterEvent = { ...TEST_EVENT, uid: "later", startAt: new Date("2026-02-11T10:00:00") }
    const earlierEvent = { ...TEST_EVENT, uid: "earlier", startAt: new Date("2026-02-09T10:00:00") }

    config.loadAll.mockResolvedValue([TEST_ACCOUNT])
    config.getDefault.mockResolvedValue("work")
    credentials.getPassword.mockResolvedValue("secret")
    caldav.fetchCalendars.mockResolvedValue([TEST_CALENDAR])
    caldav.fetchEvents.mockResolvedValue([laterEvent, earlierEvent])

    await useCase.execute({ from: FROM, to: TO })

    const renderedEvents = presenter.renderEvents.mock.calls[0]?.[0]
    expect(renderedEvents?.[0]?.uid).toBe("earlier")
    expect(renderedEvents?.[1]?.uid).toBe("later")
  })

  it("shows error when no accounts configured", async () => {
    const { useCase, config, presenter } = setup()

    config.loadAll.mockResolvedValue([])

    await useCase.execute({ from: FROM, to: TO })

    expect(presenter.renderError).toHaveBeenCalledWith(expect.stringContaining("No accounts configured"))
  })

  it("shows error when account not found", async () => {
    const { useCase, config, presenter } = setup()

    config.loadAll.mockResolvedValue([TEST_ACCOUNT])

    await useCase.execute({ accountName: "nonexistent", from: FROM, to: TO })

    expect(presenter.renderError).toHaveBeenCalledWith(expect.stringContaining("nonexistent"))
  })

  it("shows error when no credentials found", async () => {
    const { useCase, config, credentials, presenter } = setup()

    config.loadAll.mockResolvedValue([TEST_ACCOUNT])
    config.getDefault.mockResolvedValue("work")
    credentials.getPassword.mockResolvedValue(null)

    await useCase.execute({ from: FROM, to: TO })

    expect(presenter.renderError).toHaveBeenCalledWith(expect.stringContaining("No credentials found"))
  })

  it("shows success message when no events in range", async () => {
    const { useCase, config, credentials, caldav, presenter } = setup()

    config.loadAll.mockResolvedValue([TEST_ACCOUNT])
    config.getDefault.mockResolvedValue("work")
    credentials.getPassword.mockResolvedValue("secret")
    caldav.fetchCalendars.mockResolvedValue([TEST_CALENDAR])
    caldav.fetchEvents.mockResolvedValue([])

    await useCase.execute({ from: FROM, to: TO })

    expect(presenter.renderSuccess).toHaveBeenCalledWith(expect.stringContaining("No events found"))
  })

  it("shows error when calendar filter matches nothing", async () => {
    const { useCase, config, credentials, caldav, presenter } = setup()

    config.loadAll.mockResolvedValue([TEST_ACCOUNT])
    config.getDefault.mockResolvedValue("work")
    credentials.getPassword.mockResolvedValue("secret")
    caldav.fetchCalendars.mockResolvedValue([TEST_CALENDAR])

    await useCase.execute({ from: FROM, to: TO, calendarFilter: "Nonexistent" })

    expect(presenter.renderError).toHaveBeenCalledWith(expect.stringContaining("No calendars found"))
  })
})
