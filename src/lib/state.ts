import type { ModelsResponse } from "~/services/copilot/get-models"

export const DEFAULT_REQUEST_TIMEOUT_MS = 15_000
export const DEFAULT_CHAT_COMPLETION_TIMEOUT_MS = 60_000
export const DEFAULT_STREAM_IDLE_TIMEOUT_MS = 45_000

export interface State {
  githubToken?: string
  copilotToken?: string

  accountType: string
  models?: ModelsResponse
  vsCodeVersion?: string

  manualApprove: boolean
  rateLimitWait: boolean
  showToken: boolean
  allowTokenEndpoint: boolean

  // Rate limiting configuration
  rateLimitSeconds?: number
  lastRequestTimestamp?: number

  requestTimeoutMs: number
  chatCompletionTimeoutMs: number
  streamIdleTimeoutMs: number
}

export const state: State = {
  accountType: "individual",
  manualApprove: false,
  rateLimitWait: false,
  showToken: false,
  allowTokenEndpoint: true,
  requestTimeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
  chatCompletionTimeoutMs: DEFAULT_CHAT_COMPLETION_TIMEOUT_MS,
  streamIdleTimeoutMs: DEFAULT_STREAM_IDLE_TIMEOUT_MS,
}
