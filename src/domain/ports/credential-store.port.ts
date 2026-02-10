export type CredentialStorePort = {
  getPassword(accountName: string): Promise<string | null>
  setPassword(accountName: string, password: string): Promise<void>
  deletePassword(accountName: string): Promise<void>
}
