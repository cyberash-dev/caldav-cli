import { exec } from "node:child_process"
import { createHash, randomBytes } from "node:crypto"
import { createServer } from "node:http"
import { platform } from "node:os"
import type { OAuthConfig, OAuthPort, OAuthTokens } from "../../application/ports/oauth.port.js"

function generateCodeVerifier(): string {
  return randomBytes(32)
    .toString("base64url")
    .replace(/[^A-Za-z0-9\-._~]/g, "")
    .slice(0, 128)
}

function generateCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url")
}

function openBrowser(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const os = platform()
    let command: string

    if (os === "darwin") {
      command = `open "${url}"`
    } else if (os === "win32") {
      command = `start "" "${url}"`
    } else {
      command = `xdg-open "${url}"`
    }

    exec(command, (err) => {
      if (err) {
        reject(new Error(`Failed to open browser: ${err.message}`))
        return
      }
      resolve()
    })
  })
}

type TokenResponse = {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  scope: string
}

function waitForAuthorizationCode(port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`)
      const code = url.searchParams.get("code")
      const error = url.searchParams.get("error")

      if (error) {
        res.writeHead(400, { "Content-Type": "text/html" })
        res.end("<html><body><h1>Authorization denied</h1><p>You can close this window.</p></body></html>")
        server.close()
        reject(new Error(`OAuth authorization denied: ${error}`))
        return
      }

      if (code) {
        res.writeHead(200, { "Content-Type": "text/html" })
        res.end(
          "<html><body><h1>Authorization successful</h1><p>You can close this window and return to the terminal.</p></body></html>",
        )
        server.close()
        resolve(code)
        return
      }

      res.writeHead(400, { "Content-Type": "text/html" })
      res.end("<html><body><h1>Missing authorization code</h1></body></html>")
    })

    server.listen(port, "127.0.0.1")

    server.on("error", (err) => {
      reject(new Error(`Failed to start local OAuth server: ${err.message}`))
    })

    const timeout = setTimeout(() => {
      server.close()
      reject(new Error("OAuth authorization timed out (120s)"))
    }, 120_000)

    server.on("close", () => {
      clearTimeout(timeout)
    })
  })
}

function findAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address()
      if (addr && typeof addr === "object") {
        const { port } = addr
        server.close(() => resolve(port))
      } else {
        server.close(() => reject(new Error("Failed to find an available port")))
      }
    })
    server.on("error", reject)
  })
}

async function exchangeCodeForTokens(
  config: OAuthConfig,
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code_verifier: codeVerifier,
  })

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Token exchange failed (${response.status}): ${text}`)
  }

  return (await response.json()) as TokenResponse
}

export class LocalServerOAuthAdapter implements OAuthPort {
  async authorize(config: OAuthConfig): Promise<OAuthTokens> {
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = generateCodeChallenge(codeVerifier)
    const port = await findAvailablePort()
    const redirectUri = `http://127.0.0.1:${port}`

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: config.scopes.join(" "),
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      access_type: "offline",
      prompt: "consent",
    })

    const authUrl = `${config.authorizationUrl}?${params.toString()}`

    console.error("Opening browser for OAuth authorization...")
    console.error(`If the browser doesn't open, visit: ${authUrl}`)

    const codePromise = waitForAuthorizationCode(port)

    await openBrowser(authUrl)

    const code = await codePromise
    const tokens = await exchangeCodeForTokens(config, code, codeVerifier, redirectUri)

    if (!tokens.refresh_token) {
      throw new Error("No refresh token received. Ensure the OAuth consent screen requests offline access.")
    }

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiration: Date.now() + tokens.expires_in * 1000,
    }
  }
}
