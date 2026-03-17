import type {
  LeisureCategory,
  LeisureCategoryId,
  LeisureCategoryPayload,
  LeisureContent,
  LeisureMainPayload,
  LeisureMockScenario,
} from '../types/leisure'

type LeisureContentSeed = {
  idSuffix: string
  videoId: string
  title: string
  channelName: string
  description: string
  tags: string[]
  durationLabel?: string
}

const LEISURE_RECOMMENDATION_SIZE = 4

const leisureCategories: LeisureCategory[] = [
  {
    id: 'sports',
    label: '스포츠',
    description: '하이라이트와 응원 콘텐츠',
    tone: 'sand',
    accentColor: '#d29d3f',
  },
  {
    id: 'news',
    label: '뉴스',
    description: '짧은 브리핑과 시사 요약',
    tone: 'sky',
    accentColor: '#6887d9',
  },
  {
    id: 'music',
    label: '음악',
    description: '잔잔한 음악과 인기 플레이리스트',
    tone: 'mint',
    accentColor: '#5c9c8b',
  },
  {
    id: 'radio',
    label: '라디오',
    description: '대화형 진행과 사연형 오디오',
    tone: 'slate',
    accentColor: '#778494',
  },
  {
    id: 'audiobook',
    label: '오디오북',
    description: '짧은 낭독과 편안한 이야기',
    tone: 'rose',
    accentColor: '#d57566',
  },
]

function buildThumbnailUrl(videoId: string) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}

function buildEmbedUrl(videoId: string) {
  return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`
}

function createMockContent(
  categoryId: LeisureCategoryId,
  seed: LeisureContentSeed,
): LeisureContent {
  return {
    id: `${categoryId}-${seed.idSuffix}`,
    title: seed.title,
    channelName: seed.channelName,
    thumbnailUrl: buildThumbnailUrl(seed.videoId),
    embedUrl: buildEmbedUrl(seed.videoId),
    categoryId,
    tags: seed.tags,
    description: seed.description,
    durationLabel: seed.durationLabel,
  }
}

const leisureContentSeeds: Record<LeisureCategoryId, LeisureContentSeed[]> = {
  sports: [
    {
      idSuffix: 'home-highlights',
      videoId: 'aqz-KE-bpKQ',
      title: '오늘의 스포츠 하이라이트',
      channelName: '회복 스포츠',
      description: '축구와 농구 핵심 장면만 빠르게 모아본 추천 영상입니다.',
      tags: ['하이라이트', '응원', '축구'],
      durationLabel: '12분',
    },
    {
      idSuffix: 'soccer-best-goals',
      videoId: 'M7lc1UVf-VE',
      title: '이번 주 베스트 골 모음',
      channelName: '골모먼트',
      description: '큰 장면만 이어서 볼 수 있는 짧은 골 하이라이트입니다.',
      tags: ['축구', '베스트', '응원'],
      durationLabel: '9분',
    },
    {
      idSuffix: 'basketball-top-play',
      videoId: 'hT_nvWreIhg',
      title: '농구 톱 플레이',
      channelName: '데일리 코트',
      description: '빠른 전개와 덩크 장면 중심으로 구성된 추천 클립입니다.',
      tags: ['농구', '명장면', '클립'],
      durationLabel: '11분',
    },
    {
      idSuffix: 'baseball-review',
      videoId: 'ktvTqknDobU',
      title: '야구 경기 리뷰',
      channelName: '볼카운트',
      description: '경기 흐름과 핵심 타석을 천천히 정리한 영상입니다.',
      tags: ['야구', '리뷰', '요약'],
      durationLabel: '14분',
    },
    {
      idSuffix: 'olympic-moments',
      videoId: '3JZ_D3ELwOQ',
      title: '감동적인 올림픽 장면',
      channelName: '스포츠 아카이브',
      description: '차분한 속도로 다시 보는 기억에 남는 스포츠 순간입니다.',
      tags: ['올림픽', '감동', '모음'],
      durationLabel: '10분',
    },
    {
      idSuffix: 'stadium-cheer',
      videoId: '09R8_2nJtjg',
      title: '경기장 응원 모음',
      channelName: '스탠드 사운드',
      description: '응원가와 현장 분위기를 중심으로 편집한 영상입니다.',
      tags: ['응원', '현장', '분위기'],
      durationLabel: '8분',
    },
  ],
  news: [
    {
      idSuffix: 'morning-brief',
      videoId: 'ysz5S6PUM-U',
      title: '아침 뉴스 브리핑',
      channelName: '온에어 뉴스',
      description: '부담 없이 들을 수 있도록 핵심만 정리한 아침 브리핑입니다.',
      tags: ['브리핑', '아침', '요약'],
      durationLabel: '7분',
    },
    {
      idSuffix: 'evening-summary',
      videoId: 'RgKAFK5djSk',
      title: '저녁 이슈 정리',
      channelName: '클리어 리포트',
      description: '하루 주요 이슈를 차분하게 요약한 짧은 뉴스 영상입니다.',
      tags: ['저녁', '요약', '시사'],
      durationLabel: '8분',
    },
    {
      idSuffix: 'world-update',
      videoId: 'OPf0YbXqDm0',
      title: '세계 뉴스 업데이트',
      channelName: '글로벌 데스크',
      description: '국제 뉴스 중심으로 빠르게 흐름을 파악할 수 있습니다.',
      tags: ['국제', '세계', '업데이트'],
      durationLabel: '9분',
    },
    {
      idSuffix: 'economy-note',
      videoId: 'lp-EO5I60KA',
      title: '생활 경제 한눈에',
      channelName: '경제 메모',
      description: '생활과 가까운 경제 뉴스를 쉽게 풀어주는 콘텐츠입니다.',
      tags: ['경제', '생활', '설명'],
      durationLabel: '6분',
    },
    {
      idSuffix: 'science-now',
      videoId: '60ItHLz5WEA',
      title: '과학 기술 소식',
      channelName: '테크 리포트',
      description: '신기술과 연구 소식을 편안한 톤으로 전하는 영상입니다.',
      tags: ['과학', '기술', '소식'],
      durationLabel: '7분',
    },
    {
      idSuffix: 'weather-and-life',
      videoId: 'YQHsXMglC9A',
      title: '날씨와 생활 정보',
      channelName: '데일리 가이드',
      description: '날씨와 함께 생활 정보를 짧게 확인할 수 있습니다.',
      tags: ['날씨', '생활', '가이드'],
      durationLabel: '5분',
    },
  ],
  music: [
    {
      idSuffix: 'calm-piano-room',
      videoId: 'ScMzIvxBSi4',
      title: '잔잔한 피아노 휴식 음악',
      channelName: '힐링 사운드룸',
      description: '차분하게 쉬고 싶을 때 틀어두기 좋은 피아노 중심 영상입니다.',
      tags: ['피아노', '휴식', '힐링'],
      durationLabel: '25분',
    },
    {
      idSuffix: 'soft-guitar',
      videoId: '2Vv-BfVoq4g',
      title: '부드러운 기타 플레이리스트',
      channelName: '어쿠스틱 모먼트',
      description: '가볍게 듣기 좋은 기타 사운드를 모은 추천 콘텐츠입니다.',
      tags: ['기타', '플레이리스트', '휴식'],
      durationLabel: '18분',
    },
    {
      idSuffix: 'daily-ballad',
      videoId: 'JGwWNGJdvx8',
      title: '편안한 발라드 모음',
      channelName: '오늘의 음악',
      description: '익숙한 분위기의 발라드와 느린 템포 음악을 모았습니다.',
      tags: ['발라드', '느린음악', '추천'],
      durationLabel: '16분',
    },
    {
      idSuffix: 'warm-jazz',
      videoId: 'fRh_vgS2dFE',
      title: '따뜻한 재즈 배경음악',
      channelName: '라운지 멜로디',
      description: '식사 시간이나 휴식 시간에 켜두기 좋은 재즈 영상입니다.',
      tags: ['재즈', '배경음악', '라운지'],
      durationLabel: '22분',
    },
    {
      idSuffix: 'nostalgia-pop',
      videoId: 'CevxZvSJLk8',
      title: '익숙한 팝송 모음',
      channelName: '메모리 플레이',
      description: '낯설지 않은 멜로디 위주로 구성한 대중음악 추천 영상입니다.',
      tags: ['팝송', '익숙한곡', '모음'],
      durationLabel: '15분',
    },
    {
      idSuffix: 'nature-sleep',
      videoId: '9bZkp7q19f0',
      title: '자연 소리와 잔잔한 선율',
      channelName: '슬로우 나잇',
      description: '자연 소리와 부드러운 선율을 함께 들을 수 있는 콘텐츠입니다.',
      tags: ['자연소리', '수면', '휴식'],
      durationLabel: '28분',
    },
  ],
  radio: [
    {
      idSuffix: 'voice-companion',
      videoId: 'dQw4w9WgXcQ',
      title: '차분한 오후 라디오',
      channelName: '라디오 휴식실',
      description: '가볍게 틀어두기 좋은 진행형 오디오 콘텐츠입니다.',
      tags: ['라디오', '대화', '오후'],
      durationLabel: '21분',
    },
    {
      idSuffix: 'story-note',
      videoId: 'kXYiU_JCYtU',
      title: '사연 읽어주는 라디오',
      channelName: '온기 FM',
      description: '편안한 목소리로 사연을 읽어주는 형식의 방송입니다.',
      tags: ['사연', '라디오', '목소리'],
      durationLabel: '19분',
    },
    {
      idSuffix: 'night-talk',
      videoId: '09R8_2nJtjg',
      title: '밤 산책 라디오',
      channelName: '야간 스튜디오',
      description: '느린 진행으로 부담 없이 들을 수 있는 대화형 콘텐츠입니다.',
      tags: ['밤', '토크', '산책'],
      durationLabel: '24분',
    },
    {
      idSuffix: 'letter-room',
      videoId: '60ItHLz5WEA',
      title: '편지 읽는 시간',
      channelName: '포근한 주파수',
      description: '청취자 편지와 짧은 멘트를 중심으로 구성한 오디오 영상입니다.',
      tags: ['편지', '사연', '포근함'],
      durationLabel: '17분',
    },
    {
      idSuffix: 'weekend-station',
      videoId: '2Vv-BfVoq4g',
      title: '주말 음악 라디오',
      channelName: '위켄드 스테이션',
      description: '음악과 멘트를 적당히 섞은 편안한 주말용 콘텐츠입니다.',
      tags: ['주말', '음악라디오', '휴식'],
      durationLabel: '20분',
    },
    {
      idSuffix: 'slow-conversation',
      videoId: 'M7lc1UVf-VE',
      title: '느린 대화 방송',
      channelName: '슬로우 보이스',
      description: '말 속도가 빠르지 않아 편하게 듣기 좋은 토크 영상입니다.',
      tags: ['대화', '느린속도', '오디오'],
      durationLabel: '18분',
    },
  ],
  audiobook: [
    {
      idSuffix: 'healing-essay',
      videoId: 'YQHsXMglC9A',
      title: '짧은 에세이 낭독',
      channelName: '낭독 산책',
      description: '부담 없는 길이의 에세이를 차분한 목소리로 읽어줍니다.',
      tags: ['에세이', '낭독', '휴식'],
      durationLabel: '13분',
    },
    {
      idSuffix: 'morning-chapter',
      videoId: 'RgKAFK5djSk',
      title: '아침용 짧은 챕터',
      channelName: '북모닝',
      description: '하루를 시작할 때 듣기 좋은 짧은 글 낭독 콘텐츠입니다.',
      tags: ['아침', '챕터', '오디오북'],
      durationLabel: '11분',
    },
    {
      idSuffix: 'classic-story',
      videoId: 'lp-EO5I60KA',
      title: '고전 이야기 낭독',
      channelName: '클래식 북룸',
      description: '익숙한 고전 이야기를 요약 낭독 형식으로 들려줍니다.',
      tags: ['고전', '이야기', '요약'],
      durationLabel: '14분',
    },
    {
      idSuffix: 'travel-essay',
      videoId: '3JZ_D3ELwOQ',
      title: '여행 에세이 듣기',
      channelName: '문장 여행자',
      description: '풍경 묘사가 많은 글을 들으며 기분 전환할 수 있습니다.',
      tags: ['여행', '에세이', '기분전환'],
      durationLabel: '12분',
    },
    {
      idSuffix: 'warm-poem',
      videoId: 'OPf0YbXqDm0',
      title: '따뜻한 시 낭독',
      channelName: '한 페이지',
      description: '짧은 시와 해설을 함께 들을 수 있는 영상입니다.',
      tags: ['시', '낭독', '짧은글'],
      durationLabel: '9분',
    },
    {
      idSuffix: 'sleep-story',
      videoId: 'ScMzIvxBSi4',
      title: '편안한 잠들기 전 이야기',
      channelName: '나이트 리더',
      description: '잠들기 전에도 부담 없는 느린 호흡의 오디오북 콘텐츠입니다.',
      tags: ['수면', '이야기', '느린호흡'],
      durationLabel: '18분',
    },
  ],
}

const leisureContentPool = leisureCategories.flatMap(category =>
  leisureContentSeeds[category.id].map(seed => createMockContent(category.id, seed)),
)

const featuredContentId = 'music-calm-piano-room'
const registeredContentIds = [
  'music-calm-piano-room',
  'sports-home-highlights',
  'news-evening-summary',
  'radio-voice-companion',
  'audiobook-healing-essay',
]

const categoryMap = new Map<LeisureCategoryId, LeisureCategory>(
  leisureCategories.map(category => [category.id, category]),
)

const contentMap = new Map<string, LeisureContent>(
  leisureContentPool.map(content => [content.id, content]),
)

const recommendationCursorMap = new Map<string, number>()

function delay(ms: number) {
  return new Promise(resolve => {
    globalThis.setTimeout(resolve, ms)
  })
}

function getScenarioDelayMs(scenario: LeisureMockScenario, refresh = false) {
  if (scenario === 'loading') {
    return refresh ? 1500 : 1650
  }

  return refresh ? 760 : 520
}

function getWindowedContents(contents: LeisureContent[], startIndex: number, count: number) {
  if (contents.length <= count) {
    return [...contents]
  }

  const normalizedStart = startIndex % contents.length
  const orderedContents = [...contents.slice(normalizedStart), ...contents.slice(0, normalizedStart)]

  return orderedContents.slice(0, count)
}

function getInitialRecommendations(cacheKey: string, contents: LeisureContent[]) {
  const currentCursor = recommendationCursorMap.get(cacheKey) ?? 0
  recommendationCursorMap.set(cacheKey, currentCursor)
  return getWindowedContents(contents, currentCursor, LEISURE_RECOMMENDATION_SIZE)
}

function getRefreshedRecommendations(cacheKey: string, contents: LeisureContent[]) {
  if (contents.length <= LEISURE_RECOMMENDATION_SIZE) {
    return [...contents]
  }

  const currentCursor = recommendationCursorMap.get(cacheKey) ?? 0
  const nextCursor = (currentCursor + LEISURE_RECOMMENDATION_SIZE) % contents.length
  recommendationCursorMap.set(cacheKey, nextCursor)

  return getWindowedContents(contents, nextCursor, LEISURE_RECOMMENDATION_SIZE)
}

function getContentListByCategory(categoryId: LeisureCategoryId) {
  return leisureContentPool.filter(content => content.categoryId === categoryId)
}

export function parseLeisureMockScenario(value: string | null | undefined): LeisureMockScenario {
  if (value === 'empty' || value === 'error' || value === 'loading') {
    return value
  }

  return 'success'
}

export function getLeisureCategories() {
  return leisureCategories
}

export function getLeisureCategoryById(categoryId: string | undefined) {
  if (!categoryId) {
    return null
  }

  return categoryMap.get(categoryId as LeisureCategoryId) ?? null
}

export function getLeisureEntryContentByCategory(categoryId: string | undefined) {
  const category = getLeisureCategoryById(categoryId)

  if (!category) {
    return null
  }

  return getContentListByCategory(category.id)[0] ?? null
}

export function getLeisureContentById(contentId: string | undefined) {
  if (!contentId) {
    return null
  }

  return contentMap.get(contentId) ?? null
}

export async function fetchLeisureMain(
  scenario: LeisureMockScenario = 'success',
): Promise<LeisureMainPayload> {
  await delay(getScenarioDelayMs(scenario))

  if (scenario === 'error') {
    throw new Error('main_fetch_failed')
  }

  if (scenario === 'empty') {
    return {
      categories: leisureCategories,
      featuredContent: null,
      registeredContents: [],
    }
  }

  const featuredContent = contentMap.get(featuredContentId) ?? null
  const registeredContents = registeredContentIds
    .map(contentId => contentMap.get(contentId) ?? null)
    .filter((content): content is LeisureContent => Boolean(content))
    .filter(content => content.id !== featuredContent?.id)
    .slice(0, 4)

  return {
    categories: leisureCategories,
    featuredContent,
    registeredContents,
  }
}

export async function fetchLeisureCategoryRecommendations(
  categoryId: LeisureCategoryId,
  scenario: LeisureMockScenario = 'success',
  options?: { refresh?: boolean },
): Promise<LeisureCategoryPayload> {
  const category = categoryMap.get(categoryId)

  if (!category) {
    throw new Error('category_not_found')
  }

  const isRefresh = options?.refresh ?? false
  await delay(getScenarioDelayMs(scenario, isRefresh))

  if (scenario === 'error') {
    throw new Error('category_fetch_failed')
  }

  if (scenario === 'empty') {
    return {
      category,
      contents: [],
    }
  }

  const contentPool = getContentListByCategory(categoryId)
  const cacheKey = `category:${categoryId}`
  const contents = isRefresh
    ? getRefreshedRecommendations(cacheKey, contentPool)
    : getInitialRecommendations(cacheKey, contentPool)

  return {
    category,
    contents,
  }
}

export async function fetchLeisureContentDetail(
  contentId: string,
  scenario: LeisureMockScenario = 'success',
) {
  await delay(getScenarioDelayMs(scenario))

  if (scenario === 'error') {
    throw new Error('player_fetch_failed')
  }

  if (scenario === 'empty') {
    return null
  }

  return contentMap.get(contentId) ?? null
}

export async function fetchRelatedLeisureContents(
  contentId: string,
  scenario: LeisureMockScenario = 'success',
  options?: { refresh?: boolean },
) {
  const currentContent = contentMap.get(contentId)

  if (!currentContent) {
    throw new Error('content_not_found')
  }

  const isRefresh = options?.refresh ?? false
  await delay(getScenarioDelayMs(scenario, isRefresh))

  if (scenario === 'error') {
    throw new Error('related_fetch_failed')
  }

  if (scenario === 'empty') {
    return []
  }

  const relatedPool = leisureContentPool.filter(
    content =>
      content.categoryId === currentContent.categoryId && content.id !== currentContent.id,
  )
  const cacheKey = `related:${currentContent.id}`

  return isRefresh
    ? getRefreshedRecommendations(cacheKey, relatedPool)
    : getInitialRecommendations(cacheKey, relatedPool)
}
