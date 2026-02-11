# caldav-cli

A command-line CalDAV client for managing calendar events across multiple accounts. Built with TypeScript, following Clean Architecture principles.

## Features

- Multi-account management with secure OS keychain credential storage
- Interactive setup wizard for popular CalDAV providers
- OAuth2 authentication support (Google Calendar)
- Basic auth with app passwords (iCloud, Yandex, etc.)
- Custom CalDAV server support
- Interactive event creation wizard
- List scheduled events in a table or JSON format
- Create events from the command line or interactively

## Installation

```bash
npm install -g caldav-cli
```

Or run directly from the repository:

```bash
git clone <repo-url>
cd caldav-cli
npm install
npm run build
npm start
```

## Usage

### Account Management

Add a new account (interactive wizard):

```bash
caldav-cli account add
```

List all configured accounts:

```bash
caldav-cli account list
```

Remove an account:

```bash
caldav-cli account remove <name>
```

### Events

List events for the next 7 days:

```bash
caldav-cli events list
```

List events for a specific date range:

```bash
caldav-cli events list --from 2026-02-10 --to 2026-02-20
```

List events for a specific account and calendar:

```bash
caldav-cli events list --account work --calendar "Team Calendar"
```

Output as JSON:

```bash
caldav-cli events list --json
```

Create a new event interactively (wizard):

```bash
caldav-cli events create
```

The wizard will prompt for account, calendar, title, start/end times, description, and location.

Create a new event non-interactively:

```bash
caldav-cli events create \
  --title "Team standup" \
  --start "2026-02-10T10:00" \
  --end "2026-02-10T10:30" \
  --account work \
  --calendar "Team Calendar" \
  --location "Room 42" \
  --description "Daily sync"
```

You can mix and match: provide some options via flags and the wizard will prompt for the rest.

## Supported Providers

| Provider | Auth Method | Notes |
|----------|------------|-------|
| Apple iCloud | Basic (app-specific password) | Generate at appleid.apple.com |
| Google Calendar | OAuth2 | Requires OAuth client from Google Cloud Console |
| Yandex Calendar | Basic (app password) | Generate at id.yandex.ru/security/app-passwords |
| Custom | Basic | Any CalDAV-compatible server |

### Google Calendar Setup (OAuth2)

Google Calendar requires OAuth2 authentication. You need to create your own OAuth client credentials:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Enable the **CalDAV API** (navigate to APIs & Services > Library, search for "CalDAV")
4. Go to APIs & Services > Credentials
5. Click "Create Credentials" > "OAuth client ID"
6. Select "Desktop app" as the application type
7. Note down the **Client ID** and **Client Secret**
8. Configure the OAuth consent screen (APIs & Services > OAuth consent screen) with the scope `https://www.googleapis.com/auth/calendar`

Then run:

```bash
caldav-cli account add
```

Select "Google Calendar", enter your Client ID, Client Secret, and email address. A browser window will open for you to authorize access. After granting permission, the CLI stores a refresh token securely in your OS keychain.

## Architecture

The project follows Clean Architecture with strict dependency rules:

```
domain/          Zero external dependencies. Entities + port interfaces.
application/     Depends on domain only. Use cases + application port interfaces.
infrastructure/  Implements domain ports (tsdav, @napi-rs/keyring, fs).
presentation/    Implements application ports (commander, inquirer, cli-table3).
index.ts         Composition root — wires everything together.
```

## Security

All credentials — passwords, OAuth2 refresh tokens, and OAuth2 client credentials (Client ID, Client Secret) — are stored in the OS-native keychain (macOS Keychain, Linux libsecret, Windows Credential Vault) via `@napi-rs/keyring`. Secrets never touch disk in plaintext. Only non-sensitive account metadata (name, provider, server URL, username) is stored in `~/.config/caldav-cli/config.json` (file permissions `0600`).

The npm package is published with [provenance attestation](https://docs.npmjs.com/generating-provenance-statements), allowing you to verify it was built from the source repository via GitHub Actions.

## Development

```bash
npm install
npm run dev -- events list --help    # Run with tsx
npm run build                        # Build with tsdown
npm run typecheck                    # TypeScript strict mode check
npm run lint                         # Biome linting
npm test                             # Jest tests
```

## License

MIT
