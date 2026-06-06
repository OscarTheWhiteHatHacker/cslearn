/**
 * Reusable fetch wrapper with AbortController timeout.
 * Throws on timeout, network error, or non-2xx status.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeout?: number } = {},
): Promise<Response> {
  const { timeout = 15000, ...fetchInit } = init
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  // Merge caller-provided signal (if any) so both can abort
  const existingSignal = fetchInit.signal as AbortSignal | undefined
  const combinedSignal = existingSignal
    ? combineAbortSignals(existingSignal, controller.signal)
    : controller.signal

  try {
    const response = await fetch(input, {
      ...fetchInit,
      signal: combinedSignal,
    })
    if (!response.ok) {
      throw new ApiError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
      )
    }
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Create an AbortController that aborts when either source aborts.
 */
function combineAbortSignals(
  ...signals: AbortSignal[]
): AbortSignal {
  const controller = new AbortController()
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason)
      return controller.signal
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), {
      once: true,
    })
  }
  return controller.signal
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/**
 * Helper to create an AbortController and a cleanup handler for React effects.
 * Returns [signal, cleanup] where cleanup should be called in the useEffect return.
 */
export function createAbortCleanup(): [AbortSignal, () => void] {
  const controller = new AbortController()
  return [controller.signal, () => controller.abort()]
}
