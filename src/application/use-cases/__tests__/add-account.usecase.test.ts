import { describe, expect, it } from "@jest/globals"
import { AddAccountUseCase } from "../add-account.usecase.js"
import {
  createMockCalDAV,
  createMockConfig,
  createMockCredentials,
  createMockOAuth,
  createMockOAuthConfig,
  createMockPresenter,
  createMockPrompt,
  createMockProviderRegistry,
  createMockServerUrlConfig,
  TEST_ACCOUNT,
  TEST_OAUTH_PRESET,
  TEST_PRESET,
} from "./helpers.js"

describe("AddAccountUseCase", () => {
  const setup = () => {
    const providerRegistry = createMockProviderRegistry()
    const prompt = createMockPrompt()
    const caldav = createMockCalDAV()
    const credentials = createMockCredentials()
    const config = createMockConfig()
    const serverUrlConfig = createMockServerUrlConfig()
    const oauth = createMockOAuth()
    const oauthConfig = createMockOAuthConfig()
    const presenter = createMockPresenter()

    const useCase = new AddAccountUseCase(
      providerRegistry,
      prompt,
      caldav,
      credentials,
      config,
      serverUrlConfig,
      oauth,
      oauthConfig,
      presenter,
    )

    return {
      useCase,
      providerRegistry,
      prompt,
      caldav,
      credentials,
      config,
      serverUrlConfig,
      oauth,
      oauthConfig,
      presenter,
    }
  }

  it("adds account with known provider preset", async () => {
    const { useCase, providerRegistry, prompt, caldav, credentials, config, serverUrlConfig, presenter } = setup()

    providerRegistry.listProviders.mockReturnValue([TEST_PRESET])
    prompt.selectProvider.mockResolvedValue(TEST_PRESET)
    prompt.inputAccountName.mockResolvedValue("work")
    prompt.inputUsername.mockResolvedValue("user@icloud.com")
    prompt.inputPassword.mockResolvedValue("secret")
    caldav.testConnection.mockResolvedValue({ success: true })
    config.loadAll.mockResolvedValue([TEST_ACCOUNT])

    await useCase.execute()

    expect(providerRegistry.listProviders).toHaveBeenCalled()
    expect(prompt.selectProvider).toHaveBeenCalledWith([TEST_PRESET])
    expect(prompt.inputServerUrl).not.toHaveBeenCalled()
    expect(caldav.testConnection).toHaveBeenCalledWith({
      serverUrl: "https://caldav.icloud.com",
      username: "user@icloud.com",
      password: "secret",
      providerId: "icloud",
      accountName: "work",
    })
    expect(credentials.setPassword).toHaveBeenCalledWith("work", "secret")
    expect(config.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "work",
        providerId: "icloud",
      }),
    )
    expect(serverUrlConfig.saveServerUrl).toHaveBeenCalledWith("work", "https://caldav.icloud.com")
    expect(config.setDefault).toHaveBeenCalledWith("work")
    expect(presenter.renderSuccess).toHaveBeenCalled()
  })

  it("adds account with custom provider", async () => {
    const { useCase, providerRegistry, prompt, caldav, config, serverUrlConfig, presenter } = setup()

    providerRegistry.listProviders.mockReturnValue([TEST_PRESET])
    prompt.selectProvider.mockResolvedValue(null)
    prompt.inputServerUrl.mockResolvedValue("https://custom.server.com/dav")
    prompt.inputAccountName.mockResolvedValue("custom-acc")
    prompt.inputUsername.mockResolvedValue("admin")
    prompt.inputPassword.mockResolvedValue("pass123")
    caldav.testConnection.mockResolvedValue({ success: true })
    config.loadAll.mockResolvedValue([])

    await useCase.execute()

    expect(prompt.inputServerUrl).toHaveBeenCalledWith("Enter the CalDAV server URL")
    expect(config.save).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: "custom",
      }),
    )
    expect(serverUrlConfig.saveServerUrl).toHaveBeenCalledWith("custom-acc", "https://custom.server.com/dav")
    expect(presenter.renderSuccess).toHaveBeenCalled()
  })

  it("asks for server URL when preset has no serverUrl", async () => {
    const { useCase, providerRegistry, prompt, caldav, config } = setup()

    const nextcloudPreset = { ...TEST_PRESET, id: "nextcloud", serverUrl: "", hint: "Enter Nextcloud URL" }
    providerRegistry.listProviders.mockReturnValue([nextcloudPreset])
    prompt.selectProvider.mockResolvedValue(nextcloudPreset)
    prompt.inputServerUrl.mockResolvedValue("https://my.nextcloud.com/remote.php/dav")
    prompt.inputAccountName.mockResolvedValue("nc")
    prompt.inputUsername.mockResolvedValue("user")
    prompt.inputPassword.mockResolvedValue("pass")
    caldav.testConnection.mockResolvedValue({ success: true })
    config.loadAll.mockResolvedValue([])

    await useCase.execute()

    expect(prompt.inputServerUrl).toHaveBeenCalledWith("Enter Nextcloud URL")
  })

  it("shows error when connection fails", async () => {
    const { useCase, providerRegistry, prompt, caldav, credentials, config, presenter } = setup()

    providerRegistry.listProviders.mockReturnValue([TEST_PRESET])
    prompt.selectProvider.mockResolvedValue(TEST_PRESET)
    prompt.inputAccountName.mockResolvedValue("work")
    prompt.inputUsername.mockResolvedValue("user")
    prompt.inputPassword.mockResolvedValue("wrong")
    caldav.testConnection.mockResolvedValue({ success: false, error: "Invalid credentials" })

    await useCase.execute()

    expect(presenter.renderError).toHaveBeenCalledWith(
      expect.stringContaining("Connection failed: Invalid credentials"),
    )
    expect(credentials.setPassword).not.toHaveBeenCalled()
    expect(config.save).not.toHaveBeenCalled()
  })

  it("does not set default when multiple accounts exist", async () => {
    const { useCase, providerRegistry, prompt, caldav, config } = setup()

    providerRegistry.listProviders.mockReturnValue([TEST_PRESET])
    prompt.selectProvider.mockResolvedValue(TEST_PRESET)
    prompt.inputAccountName.mockResolvedValue("second")
    prompt.inputUsername.mockResolvedValue("user2")
    prompt.inputPassword.mockResolvedValue("pass2")
    caldav.testConnection.mockResolvedValue({ success: true })
    config.loadAll.mockResolvedValue([TEST_ACCOUNT, { ...TEST_ACCOUNT, name: "second" }])

    await useCase.execute()

    expect(config.setDefault).not.toHaveBeenCalled()
  })

  it("adds account with OAuth2 provider", async () => {
    const {
      useCase,
      providerRegistry,
      prompt,
      caldav,
      credentials,
      config,
      serverUrlConfig,
      oauth,
      oauthConfig,
      presenter,
    } = setup()

    providerRegistry.listProviders.mockReturnValue([TEST_OAUTH_PRESET])
    prompt.selectProvider.mockResolvedValue(TEST_OAUTH_PRESET)
    prompt.inputAccountName.mockResolvedValue("google-acc")
    prompt.inputUsername.mockResolvedValue("user@gmail.com")
    prompt.inputClientId.mockResolvedValue("my-client-id")
    prompt.inputClientSecret.mockResolvedValue("my-client-secret")
    oauth.authorize.mockResolvedValue({
      accessToken: "access-token-123",
      refreshToken: "refresh-token-456",
      expiration: Date.now() + 3600000,
    })
    caldav.testConnection.mockResolvedValue({ success: true })
    config.loadAll.mockResolvedValue([])

    await useCase.execute()

    expect(prompt.inputPassword).not.toHaveBeenCalled()
    expect(oauth.authorize).toHaveBeenCalledWith({
      clientId: "my-client-id",
      clientSecret: "my-client-secret",
      authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scopes: ["https://www.googleapis.com/auth/calendar"],
    })
    expect(oauthConfig.saveOAuthConfig).toHaveBeenCalledWith("google-acc", {
      clientId: "my-client-id",
      clientSecret: "my-client-secret",
      tokenUrl: "https://oauth2.googleapis.com/token",
    })
    expect(credentials.setPassword).toHaveBeenCalledWith("google-acc", "refresh-token-456")
    expect(caldav.testConnection).toHaveBeenCalledWith({
      serverUrl: "https://apidata.googleusercontent.com/caldav/v2",
      username: "user@gmail.com",
      password: "refresh-token-456",
      providerId: "google",
      accountName: "google-acc",
    })
    expect(config.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "google-acc",
        providerId: "google",
        username: "user@gmail.com",
      }),
    )
    expect(serverUrlConfig.saveServerUrl).toHaveBeenCalledWith(
      "google-acc",
      "https://apidata.googleusercontent.com/caldav/v2",
    )
    expect(presenter.renderSuccess).toHaveBeenCalled()
  })

  it("rolls back OAuth config on connection failure", async () => {
    const { useCase, providerRegistry, prompt, caldav, credentials, config, oauth, oauthConfig, presenter } = setup()

    providerRegistry.listProviders.mockReturnValue([TEST_OAUTH_PRESET])
    prompt.selectProvider.mockResolvedValue(TEST_OAUTH_PRESET)
    prompt.inputAccountName.mockResolvedValue("google-acc")
    prompt.inputUsername.mockResolvedValue("user@gmail.com")
    prompt.inputClientId.mockResolvedValue("my-client-id")
    prompt.inputClientSecret.mockResolvedValue("my-client-secret")
    oauth.authorize.mockResolvedValue({
      accessToken: "access-token-123",
      refreshToken: "refresh-token-456",
      expiration: Date.now() + 3600000,
    })
    caldav.testConnection.mockResolvedValue({ success: false, error: "CalDAV service unreachable" })

    await useCase.execute()

    expect(oauthConfig.removeOAuthConfig).toHaveBeenCalledWith("google-acc")
    expect(credentials.deletePassword).toHaveBeenCalledWith("google-acc")
    expect(config.save).not.toHaveBeenCalled()
    expect(presenter.renderError).toHaveBeenCalledWith(expect.stringContaining("Connection failed"))
  })

  it("shows error when OAuth authorization fails", async () => {
    const { useCase, providerRegistry, prompt, oauth, config, presenter } = setup()

    providerRegistry.listProviders.mockReturnValue([TEST_OAUTH_PRESET])
    prompt.selectProvider.mockResolvedValue(TEST_OAUTH_PRESET)
    prompt.inputAccountName.mockResolvedValue("google-acc")
    prompt.inputUsername.mockResolvedValue("user@gmail.com")
    prompt.inputClientId.mockResolvedValue("my-client-id")
    prompt.inputClientSecret.mockResolvedValue("my-client-secret")
    oauth.authorize.mockRejectedValue(new Error("Browser timeout"))

    await useCase.execute()

    expect(presenter.renderError).toHaveBeenCalledWith(
      expect.stringContaining("OAuth authorization failed: Browser timeout"),
    )
    expect(config.save).not.toHaveBeenCalled()
  })
})
