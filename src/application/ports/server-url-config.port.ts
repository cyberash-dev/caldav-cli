export type ServerUrlConfigPort = {
  getServerUrl(accountName: string): Promise<string | undefined>
  saveServerUrl(accountName: string, url: string): Promise<void>
  removeServerUrl(accountName: string): Promise<void>
}
