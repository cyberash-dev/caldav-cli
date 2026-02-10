import { Command } from "commander"
import dayjs from "dayjs"
import type { PresenterPort } from "../application/ports/presenter.port.js"
import type { AddAccountUseCase } from "../application/use-cases/add-account.usecase.js"
import type { CreateEventUseCase } from "../application/use-cases/create-event.usecase.js"
import type { ListAccountsUseCase } from "../application/use-cases/list-accounts.usecase.js"
import type { ListEventsUseCase } from "../application/use-cases/list-events.usecase.js"
import type { RemoveAccountUseCase } from "../application/use-cases/remove-account.usecase.js"

export type UseCases = {
  addAccount: AddAccountUseCase
  removeAccount: RemoveAccountUseCase
  listAccounts: ListAccountsUseCase
  listEvents: (json: boolean) => ListEventsUseCase
  createEvent: (json: boolean) => CreateEventUseCase
}

export function createCli(useCases: UseCases, errorPresenter: PresenterPort): Command {
  const program = new Command()

  program.name("caldav-cli").description("A command-line CalDAV client for managing calendar events").version("0.1.0")

  const account = program.command("account").description("Manage CalDAV accounts")

  account
    .command("add")
    .description("Add a new CalDAV account via interactive wizard")
    .action(async () => {
      try {
        await useCases.addAccount.execute()
      } catch (err) {
        errorPresenter.renderError(err instanceof Error ? err.message : String(err))
        process.exitCode = 1
      }
    })

  account
    .command("list")
    .description("List all configured accounts")
    .option("--json", "Output as JSON", false)
    .action(async (_opts) => {
      try {
        await useCases.listAccounts.execute()
      } catch (err) {
        errorPresenter.renderError(err instanceof Error ? err.message : String(err))
        process.exitCode = 1
      }
    })

  account
    .command("remove")
    .argument("<name>", "Account name to remove")
    .description("Remove a configured account")
    .action(async (name: string) => {
      try {
        await useCases.removeAccount.execute(name)
      } catch (err) {
        errorPresenter.renderError(err instanceof Error ? err.message : String(err))
        process.exitCode = 1
      }
    })

  const events = program.command("events").description("Manage calendar events")

  events
    .command("list")
    .description("List scheduled events")
    .option("-a, --account <name>", "Account name")
    .option("--from <date>", "Start date (YYYY-MM-DD)", dayjs().format("YYYY-MM-DD"))
    .option("--to <date>", "End date (YYYY-MM-DD)", dayjs().add(7, "day").format("YYYY-MM-DD"))
    .option("-c, --calendar <name>", "Filter by calendar name")
    .option("--json", "Output as JSON", false)
    .action(async (opts) => {
      try {
        const listEvents = useCases.listEvents(opts.json)
        await listEvents.execute({
          accountName: opts.account,
          from: dayjs(opts.from).startOf("day").toDate(),
          to: dayjs(opts.to).endOf("day").toDate(),
          calendarFilter: opts.calendar,
        })
      } catch (err) {
        errorPresenter.renderError(err instanceof Error ? err.message : String(err))
        process.exitCode = 1
      }
    })

  events
    .command("create")
    .description("Create a new event (interactive wizard if options are omitted)")
    .option("-t, --title <title>", "Event title")
    .option("-s, --start <datetime>", "Start datetime (YYYY-MM-DDTHH:mm)")
    .option("-e, --end <datetime>", "End datetime (YYYY-MM-DDTHH:mm)")
    .option("-a, --account <name>", "Account name")
    .option("-c, --calendar <name>", "Calendar name")
    .option("-d, --description <text>", "Event description")
    .option("-l, --location <text>", "Event location")
    .option("--json", "Output as JSON", false)
    .action(async (opts) => {
      try {
        const createEvent = useCases.createEvent(opts.json)
        await createEvent.execute({
          accountName: opts.account,
          calendarName: opts.calendar,
          title: opts.title,
          start: opts.start ? new Date(opts.start) : undefined,
          end: opts.end ? new Date(opts.end) : undefined,
          description: opts.description,
          location: opts.location,
        })
      } catch (err) {
        errorPresenter.renderError(err instanceof Error ? err.message : String(err))
        process.exitCode = 1
      }
    })

  return program
}
