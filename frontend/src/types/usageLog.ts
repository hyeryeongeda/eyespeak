export type UsageLogMoodType = 'SAD' | 'HAPPY' | 'CALM' | 'JOYFUL' | 'ANXIOUS' | 'ANGRY' | 'TIRED'

export interface UsageLogCreateRequestDto {
  phraseId?: number
  exprId?: number
  content?: string
  moodType?: UsageLogMoodType
  moodLevel?: number
}
