import { Entry } from "@napi-rs/keyring"
import type { CredentialStorePort } from "../../domain/ports/credential-store.port.js"

const SERVICE_NAME = "caldav-cli"

export class KeyringCredentialAdapter implements CredentialStorePort {
  getPassword(accountName: string): Promise<string | null> {
    try {
      const entry = new Entry(SERVICE_NAME, accountName)
      return Promise.resolve(entry.getPassword())
    } catch {
      return Promise.resolve(null)
    }
  }

  setPassword(accountName: string, password: string): Promise<void> {
    const entry = new Entry(SERVICE_NAME, accountName)
    entry.setPassword(password)
    return Promise.resolve()
  }

  deletePassword(accountName: string): Promise<void> {
    try {
      const entry = new Entry(SERVICE_NAME, accountName)
      entry.deletePassword()
    } catch {
      // ignore if not found
    }
    return Promise.resolve()
  }
}
