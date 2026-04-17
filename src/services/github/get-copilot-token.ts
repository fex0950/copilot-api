import { GITHUB_API_BASE_URL, githubHeaders } from "~/lib/api-config"
import { HTTPError } from "~/lib/error"
import { fetchWithTimeout } from "~/lib/http"
import { state } from "~/lib/state"

export const getCopilotToken = async () => {
  const response = await fetchWithTimeout(
    `${GITHUB_API_BASE_URL}/copilot_internal/v2/token`,
    {
      headers: githubHeaders(state),
      operation: "GitHub Copilot token request",
      timeoutMs: state.requestTimeoutMs,
    },
  )

  if (!response.ok) throw new HTTPError("Failed to get Copilot token", response)

  return (await response.json()) as GetCopilotTokenResponse
}

// Trimmed for the sake of simplicity
interface GetCopilotTokenResponse {
  expires_at: number
  refresh_in: number
  token: string
}
