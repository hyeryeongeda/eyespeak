import { getLeisureContentsApi } from './leisureApi'
import { getActiveApiMode } from './apiClient'
import type {
  LeisureCardTone,
  LeisureCategory,
  LeisureCategoryId,
  LeisureCategoryPayload,
  LeisureContent,
  LeisureContentResponseDto,
  LeisureMainPayload,
  LeisureShortcut,
} from '../types/leisure'

const LEISURE_RECOMMENDATION_SIZE = 4
const LEISURE_SHORTCUT_SIZE = 5

const leisureCategories: LeisureCategory[] = [
  {
    id: 'sports',
    label: '스포츠',
    description: '경기 하이라이트와 스포츠 채널 콘텐츠를 모아봅니다.',
    tone: 'sand',
    accentColor: '#d29d3f',
  },
  {
    id: 'news',
    label: '뉴스',
    description: '실시간 뉴스와 시사 영상을 확인할 수 있습니다.',
    tone: 'sky',
    accentColor: '#6887d9',
  },
  {
    id: 'music',
    label: '음악',
    description: '즐겨 듣는 음악과 공연 영상을 재생합니다.',
    tone: 'mint',
    accentColor: '#5c9c8b',
  },
  {
    id: 'radio',
    label: '라디오',
    description: '라디오와 오디오 중심 콘텐츠를 탐색합니다.',
    tone: 'slate',
    accentColor: '#778494',
  },
  {
    id: 'audiobook',
    label: '오디오북',
    description: '오디오북과 낭독형 콘텐츠를 재생합니다.',
    tone: 'rose',
    accentColor: '#d57566',
  },
]

const categoryMap = new Map<LeisureCategoryId, LeisureCategory>(
  leisureCategories.map(category => [category.id, category]),
)

const shortcutToneSequence: LeisureCardTone[] = ['sand', 'sky', 'mint', 'slate', 'rose']

const MOCK_LEISURE_CONTENTS: LeisureContentResponseDto[] = [
  {
    id: 1,
    name: 'Classic Piano Playlist',
    url: 'https://www.youtube.com/watch?v=3fumBcKC6RE',
    category: 'music',
    categoryName: 'Music',
  },
  {
    id: 2,
    name: 'World News Highlights',
    url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    category: 'news',
    categoryName: 'News',
  },
  {
    id: 3,
    name: 'Gentle Stretching Routine',
    url: 'https://www.youtube.com/watch?v=L_jWHffIx5E',
    category: 'sports',
    categoryName: 'Sports',
  },
  {
    id: 4,
    name: 'Easy Listening Radio Mix',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    category: 'radio',
    categoryName: 'Radio',
  },
  {
    id: 5,
    name: 'Short Audio Story',
    url: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
    category: 'audiobook',
    categoryName: 'Audiobook',
  },
  {
    id: 6,
    name: 'Morning Walk Motivation',
    url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    category: 'sports',
    categoryName: 'Sports',
  },
]

function buildThumbnailUrl(videoId: string) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}

function buildEmbedUrl(videoId: string) {
  return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`
}

function normalizeCategory(categoryId: string | null | undefined): LeisureCategoryId | null {
  if (
    categoryId === 'sports' ||
    categoryId === 'news' ||
    categoryId === 'music' ||
    categoryId === 'radio' ||
    categoryId === 'audiobook'
  ) {
    return categoryId
  }

  return null
}

function parseUrl(rawUrl: string) {
  try {
    return new URL(rawUrl)
  } catch {
    try {
      return new URL(`https://${rawUrl}`)
    } catch {
      return null
    }
  }
}

function extractVideoIdFromPath(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) {
    return null
  }

  const videoContainerIndex = segments.findIndex(
    segment => segment === 'embed' || segment === 'shorts' || segment === 'live',
  )

  if (videoContainerIndex >= 0) {
    return segments[videoContainerIndex + 1] ?? null
  }

  return segments[0] ?? null
}

function getShortcutTone(index: number, category: LeisureCategory | null) {
  return category?.tone ?? shortcutToneSequence[index % shortcutToneSequence.length]
}

async function getRawLeisureContents() {
  return getActiveApiMode() === 'real' ? await getLeisureContentsApi() : MOCK_LEISURE_CONTENTS
}

export function extractYouTubeVideoId(urlValue: string | null | undefined) {
  if (!urlValue) {
    return null
  }

  const parsedUrl = parseUrl(urlValue)

  if (!parsedUrl) {
    const regexPatterns = [
      /[?&]v=([A-Za-z0-9_-]{11})/,
      /youtu\.be\/([A-Za-z0-9_-]{11})/,
      /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
      /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
      /youtube\.com\/live\/([A-Za-z0-9_-]{11})/,
    ]

    for (const pattern of regexPatterns) {
      const match = urlValue.match(pattern)

      if (match?.[1]) {
        return match[1]
      }
    }

    return null
  }

  const host = parsedUrl.hostname.toLowerCase()

  if (host.includes('youtu.be')) {
    return extractVideoIdFromPath(parsedUrl.pathname)
  }

  if (!host.includes('youtube.com')) {
    return null
  }

  const queryVideoId = parsedUrl.searchParams.get('v')

  if (queryVideoId) {
    return queryVideoId
  }

  return extractVideoIdFromPath(parsedUrl.pathname)
}

export function mapApiItemToLeisureContent(item: LeisureContentResponseDto): LeisureContent | null {
  if (!item.url) {
    return null
  }

  const videoId = extractYouTubeVideoId(item.url)

  if (!videoId) {
    console.warn('Skipping leisure content with non-playable YouTube URL.', item)
    return null
  }

  const categoryId = normalizeCategory(item.category)
  const category = categoryId ? categoryMap.get(categoryId) ?? null : null
  const categoryLabel = item.categoryName ?? category?.label ?? null

  return {
    id: String(item.id),
    title: item.name,
    channelName: categoryLabel ?? 'YouTube',
    thumbnailUrl: buildThumbnailUrl(videoId),
    embedUrl: buildEmbedUrl(videoId),
    youtubeUrl: item.url,
    videoId,
    categoryId,
    categoryLabel,
    tags: categoryLabel ? [categoryLabel] : [],
    description: item.name,
  }
}

function mapApiItemToShortcut(
  item: LeisureContentResponseDto,
  index: number,
): LeisureShortcut | null {
  const categoryId = normalizeCategory(item.category)
  const category = categoryId ? categoryMap.get(categoryId) ?? null : null
  const categoryLabel = item.categoryName ?? category?.label ?? null
  const tone = getShortcutTone(index, category)

  if (item.url) {
    const content = mapApiItemToLeisureContent(item)

    if (!content) {
      return null
    }

    return {
      id: String(item.id),
      title: item.name,
      description: '보호자가 등록한 YouTube 콘텐츠를 바로 재생합니다.',
      tone,
      badgeLabel: '바로 재생',
      kind: 'content',
      contentId: content.id,
      categoryId: content.categoryId,
      categoryLabel: content.categoryLabel,
    }
  }

  if (!categoryId) {
    return null
  }

  return {
    id: String(item.id),
    title: item.name,
    description: `${
      categoryLabel ?? '지정한 카테고리'
    } 관련 콘텐츠를 바로 재생합니다.`,
    tone,
    badgeLabel: '카테고리',
    kind: 'category',
    contentId: null,
    categoryId,
    categoryLabel,
  }
}

async function getPlayableContents() {
  const response = await getRawLeisureContents()

  return response
    .map(mapApiItemToLeisureContent)
    .filter((content): content is LeisureContent => Boolean(content))
}

function getCategoryContents(contents: LeisureContent[], categoryId: LeisureCategoryId) {
  return contents.filter(content => content.categoryId === categoryId)
}

export function getLeisureCategories() {
  return leisureCategories
}

export function getLeisureCategoryById(categoryId: string | null | undefined) {
  const normalizedCategoryId = normalizeCategory(categoryId)

  if (!normalizedCategoryId) {
    return null
  }

  return categoryMap.get(normalizedCategoryId) ?? null
}

export async function fetchLeisureMain(): Promise<LeisureMainPayload> {
  const response = await getRawLeisureContents()
  const shortcutCards = response
    .map(mapApiItemToShortcut)
    .filter((shortcut): shortcut is LeisureShortcut => Boolean(shortcut))
    .slice(0, LEISURE_SHORTCUT_SIZE)

  return {
    shortcutCards,
  }
}

export async function fetchLeisureCategoryRecommendations(
  categoryId: LeisureCategoryId,
  options?: { refresh?: boolean },
): Promise<LeisureCategoryPayload> {
  const category = categoryMap.get(categoryId)

  if (!category) {
    throw new Error('category_not_found')
  }

  void options

  const contents = getCategoryContents(await getPlayableContents(), categoryId).slice(
    0,
    LEISURE_RECOMMENDATION_SIZE,
  )

  return {
    category,
    contents,
  }
}

export async function fetchLeisureContentDetail(contentId: string) {
  const contents = await getPlayableContents()
  return contents.find(content => content.id === contentId) ?? null
}

export async function fetchRelatedLeisureContents(
  contentId: string,
  options?: { refresh?: boolean },
) {
  void options

  const contents = await getPlayableContents()
  const currentContent = contents.find(content => content.id === contentId)

  if (!currentContent) {
    throw new Error('content_not_found')
  }

  if (!currentContent.categoryId) {
    return []
  }

  return contents
    .filter(content => content.id !== currentContent.id)
    .filter(content => content.categoryId === currentContent.categoryId)
    .slice(0, LEISURE_RECOMMENDATION_SIZE)
}
