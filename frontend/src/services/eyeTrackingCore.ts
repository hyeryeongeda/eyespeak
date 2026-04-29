export function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw signal.reason instanceof Error
      ? signal.reason
      : new DOMException('The operation was aborted.', 'AbortError')
  }
}

export function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function waitForAbortableDelay(delayMs: number, signal?: AbortSignal) {
  if (delayMs <= 0) {
    throwIfAborted(signal)
    return Promise.resolve()
  }

  return new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort)
      resolve()
    }, delayMs)

    const handleAbort = () => {
      window.clearTimeout(timeoutId)
      reject(new DOMException('The operation was aborted.', 'AbortError'))
    }

    signal?.addEventListener('abort', handleAbort, { once: true })
  })
}
