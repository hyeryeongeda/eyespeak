export interface TtsPreviewRequestDto {
  text: string
  voiceId?: string | null
}

export interface TtsSynthesizeRequestDto extends TtsPreviewRequestDto {
  matchingId?: number | string | null
  teamCode?: string | null
}

export interface TtsAudioResponseDto {
  url?: string | null
  audioUrl?: string | null
  base64?: string | null
  audioBase64?: string | null
  mimeType?: string | null
  blob?: Blob | null
}

export interface AudioPlaybackSource {
  src: string
  revoke?: () => void
}

export interface AudioPlaybackHandle {
  audio: HTMLAudioElement
  cleanup: () => void
}
