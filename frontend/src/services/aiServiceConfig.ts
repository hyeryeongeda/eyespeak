export type AiApiMode = 'real' | 'mock'

const AI_API_MODE: AiApiMode = import.meta.env.VITE_AI_API_MODE === 'real' ? 'real' : 'mock'

export function getActiveAiApiMode() {
  return AI_API_MODE
}

export function isAiApiEnabled() {
  return AI_API_MODE === 'real'
}
