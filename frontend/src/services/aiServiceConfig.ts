export type AiApiMode = 'real' | 'mock'

function resolveAiApiMode(
  aiApiMode: string | undefined,
  apiMode: string | undefined,
): AiApiMode {
  if (aiApiMode === 'real' || aiApiMode === 'mock') {
    return aiApiMode
  }

  return apiMode === 'mock' ? 'mock' : 'real'
}

const AI_API_MODE: AiApiMode = resolveAiApiMode(
  import.meta.env.VITE_AI_API_MODE,
  import.meta.env.VITE_API_MODE,
)

export function getActiveAiApiMode() {
  return AI_API_MODE
}

export function isAiApiEnabled() {
  return AI_API_MODE === 'real'
}
