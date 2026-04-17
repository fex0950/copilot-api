import { afterEach, describe, expect, test } from "bun:test"

import { HTTPError } from "~/lib/error"
import { fetchWithTimeout, withIdleTimeout } from "~/lib/http"

const originalFetch = globalThis.fetch

async function* stalledStream(): AsyncIterable<string> {
  yield "first"
  await new Promise(() => {})
}

function parseJson(text: string): unknown {
  return JSON.parse(text) as unknown
}

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe("fetchWithTimeout", () => {
  test("returns the upstream response when it arrives in time", async () => {
    globalThis.fetch = ((..._args: Parameters<typeof fetch>) =>
      Promise.resolve(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )) as unknown as typeof fetch

    const response = await fetchWithTimeout("https://example.com", {
      operation: "Test request",
      timeoutMs: 50,
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
  })

  test("converts hung upstream requests into HTTP 504 errors", async () => {
    globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_, reject) => {
        void input
        init?.signal?.addEventListener(
          "abort",
          () =>
            reject(Object.assign(new Error("Aborted"), { name: "AbortError" })),
          { once: true },
        )
      })) as unknown as typeof fetch

    try {
      await fetchWithTimeout("https://example.com", {
        operation: "Hung request",
        timeoutMs: 10,
      })
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPError)
      const httpError = error as HTTPError
      expect(httpError.response.status).toBe(504)
      const body = parseJson(await httpError.response.text()) as {
        error: {
          duration_ms: number
          message: string
          retriable: boolean
          timeout_ms: number
          type: string
        }
      }

      expect(body.error.message).toBe("Hung request timed out after 10ms")
      expect(body.error.retriable).toBe(true)
      expect(body.error.timeout_ms).toBe(10)
      expect(body.error.duration_ms).toBeNumber()
      expect(body.error.type).toBe("timeout_error")
    }
  })
})

describe("withIdleTimeout", () => {
  test("raises HTTP 504 when a stream stops yielding events", async () => {
    const wrapped = withIdleTimeout(stalledStream(), {
      operation: "Test stream",
      timeoutMs: 10,
    })

    const iterator = wrapped[Symbol.asyncIterator]()
    const firstChunk: IteratorResult<string> = await iterator.next()

    expect(firstChunk).toEqual({
      done: false,
      value: "first",
    })

    try {
      await iterator.next()
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPError)
      const httpError = error as HTTPError
      expect(httpError.response.status).toBe(504)
      const body = parseJson(await httpError.response.text()) as {
        error: {
          message: string
          retriable: boolean
          timeout_ms: number
          type: string
        }
      }

      expect(body).toEqual({
        error: {
          message: "Test stream produced no stream events for 10ms",
          retriable: true,
          timeout_ms: 10,
          type: "stream_timeout_error",
        },
      })
    }
  })
})
