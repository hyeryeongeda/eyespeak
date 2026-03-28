export function createClientMessageId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `client-msg-${crypto.randomUUID()}`
  }

  return `client-msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
