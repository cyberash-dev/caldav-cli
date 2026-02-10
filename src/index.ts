import type { PresenterPort } from "./application/ports/presenter.port.js"
import { AddAccountUseCase } from "./application/use-cases/add-account.usecase.js"
import { CreateEventUseCase } from "./application/use-cases/create-event.usecase.js"
import { ListAccountsUseCase } from "./application/use-cases/list-accounts.usecase.js"
import { ListEventsUseCase } from "./application/use-cases/list-events.usecase.js"
import { RemoveAccountUseCase } from "./application/use-cases/remove-account.usecase.js"
import { JsonFileConfigAdapter } from "./infrastructure/adapters/json-file-config.adapter.js"
import { KeyringCredentialAdapter } from "./infrastructure/adapters/keyring-credential.adapter.js"
import { LocalServerOAuthAdapter } from "./infrastructure/adapters/local-server-oauth.adapter.js"
import { TsdavCalDAVAdapter } from "./infrastructure/adapters/tsdav-caldav.adapter.js"
import { ProviderRegistryAdapter } from "./infrastructure/providers/provider-registry.adapter.js"
import { InquirerPromptAdapter } from "./presentation/adapters/inquirer-prompt.adapter.js"
import { JsonPresenterAdapter } from "./presentation/adapters/json-presenter.adapter.js"
import { TablePresenterAdapter } from "./presentation/adapters/table-presenter.adapter.js"
import { createCli } from "./presentation/cli.js"

const providerRegistry = new ProviderRegistryAdapter()
const config = new JsonFileConfigAdapter()
const caldav = new TsdavCalDAVAdapter(providerRegistry, config, config)
const credentials = new KeyringCredentialAdapter()
const prompt = new InquirerPromptAdapter()
const oauth = new LocalServerOAuthAdapter()

const tablePresenter = new TablePresenterAdapter()
const jsonPresenter = new JsonPresenterAdapter()

const presenter = (json: boolean): PresenterPort => (json ? jsonPresenter : tablePresenter)

const addAccount = new AddAccountUseCase(
  providerRegistry,
  prompt,
  caldav,
  credentials,
  config,
  config,
  oauth,
  config,
  tablePresenter,
)

const removeAccount = new RemoveAccountUseCase(config, credentials, config, tablePresenter)
const listAccounts = new ListAccountsUseCase(config, tablePresenter)

const program = createCli(
  {
    addAccount,
    removeAccount,
    listAccounts,
    listEvents: (json: boolean) => new ListEventsUseCase(config, credentials, caldav, presenter(json)),
    createEvent: (json: boolean) => new CreateEventUseCase(config, credentials, caldav, prompt, presenter(json)),
  },
  tablePresenter,
)

program.parse()
