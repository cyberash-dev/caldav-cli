import { describe, expect, it } from "@jest/globals"
import { RemoveAccountUseCase } from "../remove-account.usecase.js"
import {
  createMockConfig,
  createMockCredentials,
  createMockOAuthConfig,
  createMockPresenter,
  TEST_ACCOUNT,
} from "./helpers.js"

describe("RemoveAccountUseCase", () => {
  const setup = () => {
    const config = createMockConfig()
    const credentials = createMockCredentials()
    const oauthConfig = createMockOAuthConfig()
    const presenter = createMockPresenter()
    const useCase = new RemoveAccountUseCase(config, credentials, oauthConfig, presenter)
    return { useCase, config, credentials, oauthConfig, presenter }
  }

  it("removes existing account and its credentials", async () => {
    const { useCase, config, credentials, oauthConfig, presenter } = setup()

    config.loadAll.mockResolvedValue([TEST_ACCOUNT])

    await useCase.execute("work")

    expect(credentials.deletePassword).toHaveBeenCalledWith("work")
    expect(oauthConfig.removeOAuthConfig).toHaveBeenCalledWith("work")
    expect(config.remove).toHaveBeenCalledWith("work")
    expect(presenter.renderSuccess).toHaveBeenCalledWith(expect.stringContaining("work"))
  })

  it("shows error when account does not exist", async () => {
    const { useCase, config, credentials, presenter } = setup()

    config.loadAll.mockResolvedValue([TEST_ACCOUNT])

    await useCase.execute("nonexistent")

    expect(presenter.renderError).toHaveBeenCalledWith(expect.stringContaining("nonexistent"))
    expect(credentials.deletePassword).not.toHaveBeenCalled()
    expect(config.remove).not.toHaveBeenCalled()
  })

  it("shows error when no accounts configured", async () => {
    const { useCase, config, presenter } = setup()

    config.loadAll.mockResolvedValue([])

    await useCase.execute("any")

    expect(presenter.renderError).toHaveBeenCalledWith(expect.stringContaining("not found"))
  })
})
