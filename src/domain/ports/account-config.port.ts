import type { Account } from "../entities/account.js"

export type AccountConfigPort = {
  loadAll(): Promise<Array<Account>>
  save(account: Account): Promise<void>
  remove(accountName: string): Promise<void>
  getDefault(): Promise<string | undefined>
  setDefault(accountName: string): Promise<void>
}
