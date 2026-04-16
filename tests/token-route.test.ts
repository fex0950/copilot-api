import { beforeEach, expect, test } from "bun:test"

import { state } from "../src/lib/state"
import { server } from "../src/server"

beforeEach(() => {
  state.allowTokenEndpoint = true
  state.copilotToken = "copilot-token"
})

test("returns the copilot token when the endpoint is enabled", async () => {
  const response = await server.fetch(new Request("http://localhost/token"))

  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ token: "copilot-token" })
})

test("returns 404 when the token endpoint is disabled", async () => {
  state.allowTokenEndpoint = false

  const response = await server.fetch(new Request("http://localhost/token"))

  expect(response.status).toBe(404)
})
