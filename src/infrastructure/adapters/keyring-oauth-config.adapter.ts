import { Entry } from "@napi-rs/keyring"
import type { OAuthAccountConfig, OAuthConfigPort } from "../../application/ports/oauth-config.port.js"

const SERVICE_NAME = "caldav-cli"
const OAUTH_CONFIG_PREFIX = "oauth-config"

export class KeyringOAuthConfigAdapter implements OAuthConfigPort {
  private entryKey(accountName: string): string {
    return `${OAUTH_CONFIG_PREFIX}:${accountName}`
  }

  getOAuthConfig(accountName: string): Promise<OAuthAccountConfig | undefined> {
    try {
      const entry = new Entry(SERVICE_NAME, this.entryKey(accountName))
      const raw = entry.getPassword()
      if (!raw) return Promise.resolve(undefined)
      return Promise.resolve(JSON.parse(raw) as OAuthAccountConfig)
    } catch {
      return Promise.resolve(undefined)
    }
  }

  saveOAuthConfig(accountName: string, config: OAuthAccountConfig): Promise<void> {
    const entry = new Entry(SERVICE_NAME, this.entryKey(accountName))
    entry.setPassword(JSON.stringify(config))
    return Promise.resolve()
  }

  removeOAuthConfig(accountName: string): Promise<void> {
    try {
      const entry = new Entry(SERVICE_NAME, this.entryKey(accountName))
      entry.deletePassword()
    } catch {
      // ignore if not found
    }
    return Promise.resolve()
  }
}
