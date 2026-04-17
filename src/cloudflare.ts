import { Container } from "@cloudflare/containers"

interface ContainerBinding {
  getByName(name?: string): {
    fetch(request: Request): Promise<Response>
  }
}

interface CloudflareEnv {
  ACCOUNT_TYPE?: string
  CHAT_COMPLETION_TIMEOUT_MS?: string
  COPILOT_API: ContainerBinding
  DISABLE_TOKEN_ENDPOINT?: string
  GH_TOKEN?: string
  RATE_LIMIT_SECONDS?: string
  RATE_LIMIT_WAIT?: string
  REQUEST_TIMEOUT_MS?: string
  SHOW_TOKEN?: string
  STREAM_IDLE_TIMEOUT_MS?: string
}

type ContainerRuntimeEnv = Omit<CloudflareEnv, "COPILOT_API">

function buildContainerEnvVars(
  env: ContainerRuntimeEnv,
): Record<string, string> {
  const envVars: Record<string, string> = {
    ACCOUNT_TYPE: env.ACCOUNT_TYPE ?? "individual",
    CHAT_COMPLETION_TIMEOUT_MS: env.CHAT_COMPLETION_TIMEOUT_MS ?? "60000",
    DISABLE_TOKEN_ENDPOINT: env.DISABLE_TOKEN_ENDPOINT ?? "true",
    NODE_ENV: "production",
    REQUEST_TIMEOUT_MS: env.REQUEST_TIMEOUT_MS ?? "15000",
    SHOW_TOKEN: env.SHOW_TOKEN ?? "false",
    STREAM_IDLE_TIMEOUT_MS: env.STREAM_IDLE_TIMEOUT_MS ?? "45000",
  }

  if (env.GH_TOKEN) {
    envVars.GH_TOKEN = env.GH_TOKEN
  }

  if (env.RATE_LIMIT_SECONDS) {
    envVars.RATE_LIMIT_SECONDS = env.RATE_LIMIT_SECONDS
  }

  if (env.RATE_LIMIT_WAIT) {
    envVars.RATE_LIMIT_WAIT = env.RATE_LIMIT_WAIT
  }

  return envVars
}

export class CopilotApiContainer extends Container {
  defaultPort = 4141
  sleepAfter = "1h"
  pingEndpoint = "localhost/"
  envVars = buildContainerEnvVars({
    ACCOUNT_TYPE: process.env.ACCOUNT_TYPE,
    DISABLE_TOKEN_ENDPOINT: process.env.DISABLE_TOKEN_ENDPOINT,
    GH_TOKEN: process.env.GH_TOKEN,
    RATE_LIMIT_SECONDS: process.env.RATE_LIMIT_SECONDS,
    RATE_LIMIT_WAIT: process.env.RATE_LIMIT_WAIT,
    REQUEST_TIMEOUT_MS: process.env.REQUEST_TIMEOUT_MS,
    SHOW_TOKEN: process.env.SHOW_TOKEN,
    CHAT_COMPLETION_TIMEOUT_MS: process.env.CHAT_COMPLETION_TIMEOUT_MS,
    STREAM_IDLE_TIMEOUT_MS: process.env.STREAM_IDLE_TIMEOUT_MS,
  })
}

export default {
  async fetch(request: Request, env: CloudflareEnv): Promise<Response> {
    if (!env.GH_TOKEN) {
      return new Response("GH_TOKEN secret is not configured.", { status: 500 })
    }

    return env.COPILOT_API.getByName("default").fetch(request)
  },
}
