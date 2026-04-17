import consola from "consola"

import { HTTPError, createErrorResponse } from "./error"

interface FetchWithTimeoutOptions extends RequestInit {
  operation: string
  timeoutMs: number
}

interface AsyncIterableTimeoutOptions {
  operation: string
  timeoutMs: number
}

export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions,
): Promise<Response> {
  const { operation, timeoutMs, signal, ...init } = options
  const controller = new AbortController()
  const startedAt = Date.now()
  const timeout = setTimeout(() => {
    controller.abort()
  }, timeoutMs)

  if (signal) {
    if (signal.aborted) {
      controller.abort(signal.reason)
    } else {
      signal.addEventListener("abort", () => controller.abort(), { once: true })
    }
  }

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    })
    const durationMs = Date.now() - startedAt
    consola.debug(
      `${operation} responded with ${response.status} in ${durationMs}ms`,
    )
    return response
  } catch (error) {
    const durationMs = Date.now() - startedAt
    if (isAbortError(error)) {
      throw new HTTPError(
        `${operation} timed out`,
        createErrorResponse(
          504,
          `${operation} timed out after ${timeoutMs}ms`,
          {
            retriable: true,
            timeout_ms: timeoutMs,
            duration_ms: durationMs,
            type: "timeout_error",
          },
        ),
      )
    }

    throw new HTTPError(
      `${operation} failed`,
      createErrorResponse(
        502,
        `${operation} failed before receiving a response`,
        {
          retriable: true,
          duration_ms: durationMs,
          reason: error instanceof Error ? error.message : String(error),
          type: "connection_error",
        },
      ),
    )
  } finally {
    clearTimeout(timeout)
  }
}

export async function* withIdleTimeout<T>(
  iterable: AsyncIterable<T>,
  options: AsyncIterableTimeoutOptions,
): AsyncIterable<T> {
  const iterator = iterable[Symbol.asyncIterator]()

  while (true) {
    let timeout: ReturnType<typeof setTimeout> | undefined
    try {
      const result = await Promise.race([
        iterator.next(),
        new Promise<IteratorResult<T>>((_, reject) => {
          timeout = setTimeout(() => {
            reject(
              new HTTPError(
                `${options.operation} stalled`,
                createErrorResponse(
                  504,
                  `${options.operation} produced no stream events for ${options.timeoutMs}ms`,
                  {
                    retriable: true,
                    timeout_ms: options.timeoutMs,
                    type: "stream_timeout_error",
                  },
                ),
              ),
            )
          }, options.timeoutMs)
        }),
      ])

      if (result.done) {
        return
      }

      yield result.value
    } catch (error) {
      void iterator.return?.()
      throw error
    } finally {
      if (timeout) {
        clearTimeout(timeout)
      }
    }
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError"
}
