import { mkdir, readFile, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"
import type { OAuthAccountConfig } from "../../application/ports/oauth-config.port.js"
import type { ServerUrlConfigPort } from "../../application/ports/server-url-config.port.js"
import type { Account } from "../../domain/entities/account.js"
import type { AccountConfigPort } from "../../domain/ports/account-config.port.js"

type ConfigFile = {
  accounts: Array<Account>
  serverUrls: Record<string, string>
  defaultAccount?: string | undefined
}

export class JsonFileConfigAdapter implements AccountConfigPort, ServerUrlConfigPort {
  private readonly configDir: string
  private readonly configPath: string

  constructor() {
    this.configDir = join(homedir(), ".config", "caldav-cli")
    this.configPath = join(this.configDir, "config.json")
  }

  private async read(): Promise<ConfigFile> {
    try {
      const raw = await readFile(this.configPath, "utf-8")
      const parsed = JSON.parse(raw) as Partial<ConfigFile>
      return {
        accounts: parsed.accounts ?? [],
        serverUrls: parsed.serverUrls ?? {},
        defaultAccount: parsed.defaultAccount,
      }
    } catch {
      return { accounts: [], serverUrls: {} }
    }
  }

  private async write(config: ConfigFile): Promise<void> {
    await mkdir(this.configDir, { recursive: true })
    await writeFile(this.configPath, JSON.stringify(config, null, 2), { encoding: "utf-8", mode: 0o600 })
  }

  async drainOAuthConfigs(): Promise<Record<string, OAuthAccountConfig>> {
    try {
      const raw = await readFile(this.configPath, "utf-8")
      const parsed = JSON.parse(raw) as Record<string, unknown>
      const oauthConfigs = (parsed["oauthConfigs"] ?? {}) as Record<string, OAuthAccountConfig>
      if (Object.keys(oauthConfigs).length === 0) return {}
      const { ["oauthConfigs"]: _, ...rest } = parsed
      await mkdir(this.configDir, { recursive: true })
      await writeFile(this.configPath, JSON.stringify(rest, null, 2), { encoding: "utf-8", mode: 0o600 })
      return oauthConfigs
    } catch {
      return {}
    }
  }

  async loadAll(): Promise<Array<Account>> {
    const config = await this.read()
    return config.accounts
  }

  async save(account: Account): Promise<void> {
    const config = await this.read()
    const idx = config.accounts.findIndex((a) => a.name === account.name)

    if (idx >= 0) {
      config.accounts[idx] = account
    } else {
      config.accounts.push(account)
    }

    await this.write(config)
  }

  async remove(accountName: string): Promise<void> {
    const config = await this.read()
    config.accounts = config.accounts.filter((a) => a.name !== accountName)

    const { [accountName]: _removedUrl, ...remainingUrls } = config.serverUrls
    config.serverUrls = remainingUrls

    if (config.defaultAccount === accountName) {
      config.defaultAccount = config.accounts[0]?.name
    }

    await this.write(config)
  }

  async getDefault(): Promise<string | undefined> {
    const config = await this.read()
    return config.defaultAccount
  }

  async setDefault(accountName: string): Promise<void> {
    const config = await this.read()
    config.defaultAccount = accountName
    await this.write(config)
  }

  async getServerUrl(accountName: string): Promise<string | undefined> {
    const config = await this.read()
    return config.serverUrls[accountName]
  }

  async saveServerUrl(accountName: string, url: string): Promise<void> {
    const config = await this.read()
    config.serverUrls[accountName] = url
    await this.write(config)
  }

  async removeServerUrl(accountName: string): Promise<void> {
    const config = await this.read()
    const { [accountName]: _removed, ...remainingUrls } = config.serverUrls
    config.serverUrls = remainingUrls
    await this.write(config)
  }
}
