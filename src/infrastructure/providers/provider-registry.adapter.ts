import type { ProviderPreset, ProviderRegistryPort } from "../../application/ports/provider-registry.port.js"
import { PRESETS } from "./presets.js"

export class ProviderRegistryAdapter implements ProviderRegistryPort {
  listProviders(): Array<ProviderPreset> {
    return PRESETS
  }

  getProvider(id: string): ProviderPreset | undefined {
    return PRESETS.find((p: ProviderPreset) => p.id === id)
  }

  normalizePassword(providerId: string, password: string): string {
    const preset = this.getProvider(providerId)
    return preset?.normalizePassword?.(password) ?? password
  }
}
