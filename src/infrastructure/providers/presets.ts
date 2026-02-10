import type { ProviderPreset } from "../../application/ports/provider-registry.port.js"

export const PRESETS: Array<ProviderPreset> = [
  {
    id: "icloud",
    displayName: "Apple iCloud",
    serverUrl: "https://caldav.icloud.com",
    authMethod: "basic",
    hint: "Use an app-specific password from appleid.apple.com",
  },
  {
    id: "google",
    displayName: "Google Calendar",
    serverUrl: "https://apidata.googleusercontent.com/caldav/v2",
    authMethod: "oauth2",
    hint: "Create an OAuth client at console.cloud.google.com",
    usernameHint: "full email address, e.g. you@gmail.com",
    oauthConfig: {
      authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scopes: ["https://www.googleapis.com/auth/calendar"],
    },
  },
  {
    id: "yandex",
    displayName: "Yandex Calendar",
    serverUrl: "https://caldav.yandex.ru",
    authMethod: "basic",
    hint: "Use an app password from id.yandex.ru/security/app-passwords",
    usernameHint: "full email address, e.g. you@yandex.ru",
  },
  {
    id: "fastmail",
    displayName: "Fastmail",
    serverUrl: "https://caldav.fastmail.com/dav/calendars",
    authMethod: "basic",
    hint: "Use an app password from Settings > Privacy & Security",
  },
  {
    id: "nextcloud",
    displayName: "Nextcloud",
    serverUrl: "",
    authMethod: "basic",
    hint: "Enter your Nextcloud server URL (e.g. https://cloud.example.com/remote.php/dav)",
  },
  {
    id: "baikal",
    displayName: "Baikal",
    serverUrl: "",
    authMethod: "basic",
    hint: "Enter your Baikal server URL (e.g. https://baikal.example.com/dav.php)",
  },
]
