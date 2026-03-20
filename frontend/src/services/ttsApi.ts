import { apiClient } from './apiClient'
import { API_ENDPOINTS } from './apiEndpoints'
import type { TtsAudioResponseDto, TtsPreviewRequestDto, TtsSynthesizeRequestDto } from '../types/tts'

export function getTtsStatusApi(accessToken?: string | null) {
  return apiClient.get<unknown>(API_ENDPOINTS.TTS_STATUS, {
    accessToken,
  })
}

export function uploadTtsVoicesApi(files: File[], accessToken?: string | null) {
  const formData = new FormData()
  files.forEach(file => {
    formData.append('files', file)
  })

  return apiClient.post<unknown, FormData>(API_ENDPOINTS.TTS_VOICES, formData, {
    accessToken,
  })
}

export function startTtsTrainingApi(accessToken?: string | null) {
  return apiClient.post<unknown, undefined>(API_ENDPOINTS.TTS_TRAIN, undefined, {
    accessToken,
  })
}

export function synthesizeTtsApi(
  request: TtsSynthesizeRequestDto,
  accessToken?: string | null,
) {
  return apiClient.post<TtsAudioResponseDto | string | Blob, TtsSynthesizeRequestDto>(
    API_ENDPOINTS.TTS_SYNTHESIZE,
    request,
    {
      accessToken,
    },
  )
}

export function testTtsApi(request: TtsPreviewRequestDto, accessToken?: string | null) {
  return apiClient.post<TtsAudioResponseDto | string | Blob, TtsPreviewRequestDto>(
    API_ENDPOINTS.TTS_TEST,
    request,
    {
      accessToken,
    },
  )
}
