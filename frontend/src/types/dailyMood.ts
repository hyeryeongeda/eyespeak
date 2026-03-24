export type DailyMoodType =
  | 'SAD'
  | 'HAPPY'
  | 'CALM'
  | 'JOYFUL'
  | 'ANXIOUS'
  | 'ANGRY'
  | 'TIRED'

export interface DailyMoodCreateRequestDto {
  moodType: DailyMoodType
  moodLevel: number
}

export interface DailyMoodResponseDto {
  moodId: number
  moodDate: string
  moodType: DailyMoodType
  moodLevel: number
}
