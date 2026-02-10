import { describe, expect, it } from "@jest/globals"
import { ListAccountsUseCase } from "../list-accounts.usecase.js"
import { createMockConfig, createMockPresenter, TEST_ACCOUNT } from "./helpers.js"

describe("ListAccountsUseCase", () => {
  const setup = () => {
    const config = createMockConfig()
    const presenter = createMockPresenter()
    const useCase = new ListAccountsUseCase(config, presenter)
    return { useCase, config, presenter }
  }

  it("renders accounts when they exist", async () => {
    const { useCase, config, presenter } = setup()

    config.loadAll.mockResolvedValue([TEST_ACCOUNT])

    await useCase.execute()

    expect(presenter.renderAccounts).toHaveBeenCalledWith([TEST_ACCOUNT])
    expect(presenter.renderError).not.toHaveBeenCalled()
  })

  it("shows error when no accounts configured", async () => {
    const { useCase, config, presenter } = setup()

    config.loadAll.mockResolvedValue([])

    await useCase.execute()

    expect(presenter.renderError).toHaveBeenCalledWith(expect.stringContaining("No accounts configured"))
    expect(presenter.renderAccounts).not.toHaveBeenCalled()
  })

  it("renders multiple accounts", async () => {
    const { useCase, config, presenter } = setup()

    const secondAccount = { ...TEST_ACCOUNT, name: "personal", providerId: "google" }
    config.loadAll.mockResolvedValue([TEST_ACCOUNT, secondAccount])

    await useCase.execute()

    expect(presenter.renderAccounts).toHaveBeenCalledWith([TEST_ACCOUNT, secondAccount])
  })
})
