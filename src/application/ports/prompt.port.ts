import type { Account } from "../../domain/entities/account.js"
import type { Calendar } from "../../domain/entities/calendar.js"
import type { ProviderPreset } from "./provider-registry.port.js"

export type PromptPort = {
  selectProvider(providers: Array<ProviderPreset>): Promise<ProviderPreset | null>
  inputServerUrl(hint: string): Promise<string>
  inputUsername(hint?: string | undefined): Promise<string>
  inputPassword(hint: string): Promise<string>
  inputAccountName(): Promise<string>
  inputClientId(): Promise<string>
  inputClientSecret(): Promise<string>
  confirm(message: string): Promise<boolean>
  selectAccount(accounts: Array<Account>): Promise<Account>
  selectCalendar(calendars: Array<Calendar>): Promise<Calendar>
  inputEventTitle(): Promise<string>
  inputEventStart(): Promise<Date>
  inputEventEnd(after: Date): Promise<Date>
  inputEventDescription(): Promise<string | undefined>
  inputEventLocation(): Promise<string | undefined>
}
