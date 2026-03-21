import { getLeisureContentsApi } from './leisureApi'
import type {
  LeisureCategory,
  LeisureCategoryId,
  LeisureCategoryPayload,
  LeisureContent,
  LeisureContentResponseDto,
  LeisureMainPayload,
} from '../types/leisure'

const LEISURE_RECOMMENDATION_SIZE = 4

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
    console.warn('Skipping leisure content without URL.', item)
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

async function getPlayableContents() {
  const response = await getLeisureContentsApi()

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
  const contents = await getPlayableContents()
  const [featuredContent, ...remainingContents] = contents

  return {
    categories: leisureCategories,
    featuredContent: featuredContent ?? null,
    registeredContents: remainingContents.slice(0, LEISURE_RECOMMENDATION_SIZE),
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
