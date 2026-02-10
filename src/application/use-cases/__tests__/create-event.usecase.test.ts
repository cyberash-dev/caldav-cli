import { describe, expect, it } from "@jest/globals"
import { CreateEventUseCase } from "../create-event.usecase.js"
import {
  createMockCalDAV,
  createMockConfig,
  createMockCredentials,
  createMockPresenter,
  createMockPrompt,
  TEST_ACCOUNT,
  TEST_CALENDAR,
  TEST_EVENT,
} from "./helpers.js"

describe("CreateEventUseCase", () => {
  const setup = () => {
    const config = createMockConfig()
    const credentials = createMockCredentials()
    const caldav = createMockCalDAV()
    const prompt = createMockPrompt()
    const presenter = createMockPresenter()
    const useCase = new CreateEventUseCase(config, credentials, caldav, prompt, presenter)
    return { useCase, config, credentials, caldav, prompt, presenter }
  }

  it("creates event with all params provided (no prompts)", async () => {
    const { useCase, config, credentials, caldav, prompt, presenter } = setup()

    config.loadAll.mockResolvedValue([TEST_ACCOUNT])
    credentials.getPassword.mockResolvedValue("secret")
    caldav.fetchCalendars.mockResolvedValue([TEST_CALENDAR])
    caldav.createEvent.mockResolvedValue(TEST_EVENT)
    prompt.inputEventDescription.mockResolvedValue(undefined)
    prompt.inputEventLocation.mockResolvedValue(undefined)

    await useCase.execute({
      accountName: "work",
      calendarName: "Work",
      title: "Team standup",
      start: new Date("2026-02-10T10:00:00"),
      end: new Date("2026-02-10T10:30:00"),
      description: "Daily sync",
      location: "Room 1",
    })

    expect(prompt.inputEventTitle).not.toHaveBeenCalled()
    expect(prompt.inputEventStart).not.toHaveBeenCalled()
    expect(prompt.inputEventEnd).not.toHaveBeenCalled()
    expect(caldav.createEvent).toHaveBeenCalledWith(
      TEST_ACCOUNT,
      "secret",
      TEST_CALENDAR,
      expect.objectContaining({
        title: "Team standup",
        description: "Daily sync",
        location: "Room 1",
      }),
    )
    expect(presenter.renderSuccess).toHaveBeenCalledWith(expect.stringContaining("Team standup"))
  })

  it("uses single account automatically without prompting", async () => {
    const { useCase, config, credentials, caldav, prompt, presenter } = setup()

    config.loadAll.mockResolvedValue([TEST_ACCOUNT])
    credentials.getPassword.mockResolvedValue("secret")
    caldav.fetchCalendars.mockResolvedValue([TEST_CALENDAR])
    caldav.createEvent.mockResolvedValue(TEST_EVENT)
    prompt.inputEventDescription.mockResolvedValue(undefined)
    prompt.inputEventLocation.mockResolvedValue(undefined)

    await useCase.execute({
      title: "Quick meeting",
      start: new Date("2026-02-10T10:00:00"),
      end: new Date("2026-02-10T10:30:00"),
    })

    expect(prompt.selectAccount).not.toHaveBeenCalled()
    expect(caldav.createEvent).toHaveBeenCalled()
    expect(presenter.renderSuccess).toHaveBeenCalled()
  })

  it("prompts to select account when multiple accounts and no default", async () => {
    const { useCase, config, credentials, caldav, prompt, presenter } = setup()

    const secondAccount = { ...TEST_ACCOUNT, name: "personal", username: "me@gmail.com" }
    config.loadAll.mockResolvedValue([TEST_ACCOUNT, secondAccount])
    config.getDefault.mockResolvedValue(undefined)
    prompt.selectAccount.mockResolvedValue(secondAccount)
    credentials.getPassword.mockResolvedValue("secret")
    caldav.fetchCalendars.mockResolvedValue([TEST_CALENDAR])
    caldav.createEvent.mockResolvedValue(TEST_EVENT)
    prompt.inputEventDescription.mockResolvedValue(undefined)
    prompt.inputEventLocation.mockResolvedValue(undefined)

    await useCase.execute({
      title: "Event",
      start: new Date("2026-02-10T10:00:00"),
      end: new Date("2026-02-10T10:30:00"),
    })

    expect(prompt.selectAccount).toHaveBeenCalledWith([TEST_ACCOUNT, secondAccount])
    expect(caldav.createEvent).toHaveBeenCalledWith(secondAccount, "secret", expect.anything(), expect.anything())
    expect(presenter.renderSuccess).toHaveBeenCalled()
  })

  it("prompts to select calendar when multiple calendars exist", async () => {
    const { useCase, config, credentials, caldav, prompt } = setup()

    const personalCalendar = { ...TEST_CALENDAR, calendarId: "/personal/", displayName: "Personal" }
    config.loadAll.mockResolvedValue([TEST_ACCOUNT])
    credentials.getPassword.mockResolvedValue("secret")
    caldav.fetchCalendars.mockResolvedValue([TEST_CALENDAR, personalCalendar])
    prompt.selectCalendar.mockResolvedValue(personalCalendar)
    caldav.createEvent.mockResolvedValue({ ...TEST_EVENT, calendarName: "Personal" })
    prompt.inputEventDescription.mockResolvedValue(undefined)
    prompt.inputEventLocation.mockResolvedValue(undefined)

    await useCase.execute({
      title: "Gym",
      start: new Date("2026-02-10T18:00:00"),
      end: new Date("2026-02-10T19:00:00"),
    })

    expect(prompt.selectCalendar).toHaveBeenCalledWith([TEST_CALENDAR, personalCalendar])
    expect(caldav.createEvent).toHaveBeenCalledWith(
      TEST_ACCOUNT,
      "secret",
      personalCalendar,
      expect.objectContaining({ title: "Gym" }),
    )
  })

  it("runs full wizard when no params provided", async () => {
    const { useCase, config, credentials, caldav, prompt, presenter } = setup()

    config.loadAll.mockResolvedValue([TEST_ACCOUNT])
    credentials.getPassword.mockResolvedValue("secret")
    caldav.fetchCalendars.mockResolvedValue([TEST_CALENDAR])
    caldav.createEvent.mockResolvedValue(TEST_EVENT)

    prompt.inputEventTitle.mockResolvedValue("Wizard event")
    prompt.inputEventStart.mockResolvedValue(new Date("2026-03-01T09:00:00"))
    prompt.inputEventEnd.mockResolvedValue(new Date("2026-03-01T10:00:00"))
    prompt.inputEventDescription.mockResolvedValue("Created via wizard")
    prompt.inputEventLocation.mockResolvedValue("Office")

    await useCase.execute({})

    expect(prompt.inputEventTitle).toHaveBeenCalled()
    expect(prompt.inputEventStart).toHaveBeenCalled()
    expect(prompt.inputEventEnd).toHaveBeenCalledWith(new Date("2026-03-01T09:00:00"))
    expect(caldav.createEvent).toHaveBeenCalledWith(
      TEST_ACCOUNT,
      "secret",
      TEST_CALENDAR,
      expect.objectContaining({
        title: "Wizard event",
        startAt: new Date("2026-03-01T09:00:00"),
        endAt: new Date("2026-03-01T10:00:00"),
        description: "Created via wizard",
        location: "Office",
      }),
    )
    expect(presenter.renderSuccess).toHaveBeenCalled()
  })

  it("skips optional fields in wizard when user presses enter", async () => {
    const { useCase, config, credentials, caldav, prompt } = setup()

    config.loadAll.mockResolvedValue([TEST_ACCOUNT])
    credentials.getPassword.mockResolvedValue("secret")
    caldav.fetchCalendars.mockResolvedValue([TEST_CALENDAR])
    caldav.createEvent.mockResolvedValue(TEST_EVENT)

    prompt.inputEventTitle.mockResolvedValue("No extras")
    prompt.inputEventStart.mockResolvedValue(new Date("2026-03-01T09:00:00"))
    prompt.inputEventEnd.mockResolvedValue(new Date("2026-03-01T10:00:00"))
    prompt.inputEventDescription.mockResolvedValue(undefined)
    prompt.inputEventLocation.mockResolvedValue(undefined)

    await useCase.execute({})

    expect(caldav.createEvent).toHaveBeenCalledWith(
      TEST_ACCOUNT,
      "secret",
      TEST_CALENDAR,
      expect.objectContaining({
        title: "No extras",
        description: undefined,
        location: undefined,
      }),
    )
  })

  it("shows error when no accounts configured", async () => {
    const { useCase, config, presenter } = setup()

    config.loadAll.mockResolvedValue([])

    await useCase.execute({})

    expect(presenter.renderError).toHaveBeenCalledWith(expect.stringContaining("No accounts configured"))
  })

  it("shows error when account not found", async () => {
    const { useCase, config, presenter } = setup()

    config.loadAll.mockResolvedValue([TEST_ACCOUNT])

    await useCase.execute({ accountName: "nonexistent" })

    expect(presenter.renderError).toHaveBeenCalledWith(expect.stringContaining("nonexistent"))
  })

  it("shows error when no credentials found", async () => {
    const { useCase, config, credentials, presenter } = setup()

    config.loadAll.mockResolvedValue([TEST_ACCOUNT])
    credentials.getPassword.mockResolvedValue(null)

    await useCase.execute({ accountName: "work" })

    expect(presenter.renderError).toHaveBeenCalledWith(expect.stringContaining("No credentials found"))
  })

  it("shows error when no calendars exist", async () => {
    const { useCase, config, credentials, caldav, presenter } = setup()

    config.loadAll.mockResolvedValue([TEST_ACCOUNT])
    credentials.getPassword.mockResolvedValue("secret")
    caldav.fetchCalendars.mockResolvedValue([])

    await useCase.execute({ accountName: "work" })

    expect(presenter.renderError).toHaveBeenCalledWith(expect.stringContaining("No calendars found"))
  })

  it("shows error when specified calendar not found", async () => {
    const { useCase, config, credentials, caldav, presenter } = setup()

    config.loadAll.mockResolvedValue([TEST_ACCOUNT])
    credentials.getPassword.mockResolvedValue("secret")
    caldav.fetchCalendars.mockResolvedValue([TEST_CALENDAR])

    await useCase.execute({
      accountName: "work",
      calendarName: "Nonexistent",
      title: "Test",
      start: new Date(),
      end: new Date(),
    })

    expect(presenter.renderError).toHaveBeenCalledWith(expect.stringContaining("Nonexistent"))
    expect(presenter.renderError).toHaveBeenCalledWith(expect.stringContaining("Work"))
  })
})
