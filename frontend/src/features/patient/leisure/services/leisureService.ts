import { getLeisureContentsApi } from '../../../../services/leisureApi'
import { getActiveApiMode } from '../../../../services/apiClient'
import type {
  LeisureCardTone,
  LeisureCategory,
  LeisureCategoryId,
  LeisureCategoryPayload,
  LeisureContent,
  LeisureContentResponseDto,
  LeisureMainPayload,
  LeisureShortcut,
} from '../../../../types/leisure'

const LEISURE_RECOMMENDATION_SIZE = 4
const LEISURE_SHORTCUT_SIZE = 5
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3'
const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY?.trim() ?? ''
const YOUTUBE_REGION_CODE = 'KR'
const YOUTUBE_RELEVANCE_LANGUAGE = 'ko'
const GENERATED_CONTENT_ID_PREFIX = 'youtube'

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

const categorySearchQueryMap: Record<LeisureCategoryId, string> = {
  sports: '한국 스포츠 하이라이트',
  news: '한국 뉴스 속보',
  music: '한국 인기 음악',
  radio: '한국 라디오 사연 음악',
  audiobook: '한국 오디오북 낭독',
}

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
]

interface YouTubeThumbnailSet {
  default?: { url?: string }
  medium?: { url?: string }
  high?: { url?: string }
}

interface YouTubeSnippet {
  title?: string
  description?: string
  channelTitle?: string
  thumbnails?: YouTubeThumbnailSet
}

interface YouTubeSearchItem {
  id?: {
    videoId?: string
  }
  snippet?: YouTubeSnippet
}

interface YouTubeSearchResponse {
  items?: YouTubeSearchItem[]
}

interface YouTubeVideoItem {
  id?: string
  snippet?: YouTubeSnippet
}

interface YouTubeVideoListResponse {
  items?: YouTubeVideoItem[]
}

export type LeisureCategoryResolutionErrorCode =
  | 'youtube_api_key_missing'
  | 'youtube_category_resolution_failed'

export class LeisureCategoryResolutionError extends Error {
  readonly code: LeisureCategoryResolutionErrorCode
  readonly categoryId: LeisureCategoryId
  readonly details?: Record<string, unknown>

  constructor(params: {
    code: LeisureCategoryResolutionErrorCode
    categoryId: LeisureCategoryId
    message: string
    details?: Record<string, unknown>
  }) {
    super(params.message)
    this.name = 'LeisureCategoryResolutionError'
    this.code = params.code
    this.categoryId = params.categoryId
    this.details = params.details
  }
}

const generatedContentRegistry = new Map<string, LeisureContent>()
const htmlEntityPattern = /&(?:#\d+|#x[0-9a-f]+|[a-z]+);/i

function buildThumbnailUrl(videoId: string) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}

function buildEmbedUrl(videoId: string) {
  return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`
}

function buildWatchUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`
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

function hasYouTubeApiKey() {
  return YOUTUBE_API_KEY.length > 0
}

function buildGeneratedContentId(categoryId: LeisureCategoryId, videoId: string) {
  return `${GENERATED_CONTENT_ID_PREFIX}:${categoryId}:${videoId}`
}

function parseGeneratedContentId(contentId: string) {
  const match = contentId.match(
    /^youtube:(sports|news|music|radio|audiobook):([A-Za-z0-9_-]{11})$/,
  )

  if (!match) {
    return null
  }

  return {
    categoryId: match[1] as LeisureCategoryId,
    videoId: match[2],
  }
}

function parseNoCategoryContentId(contentId: string): string | null {
  const match = contentId.match(/^youtube:([A-Za-z0-9_-]{11})$/)
  return match?.[1] ?? null
}

async function fetchNoCategoryYouTubeContentDetail(
  contentId: string,
  videoId: string,
): Promise<LeisureContent | null> {
  const cached = generatedContentRegistry.get(contentId)
  if (cached) return cached

  if (!hasYouTubeApiKey()) return null

  try {
    const response = await fetchYouTubeApi<YouTubeVideoListResponse>('videos', {
      part: 'snippet',
      id: videoId,
      hl: YOUTUBE_RELEVANCE_LANGUAGE,
    })
    const item = response.items?.[0]
    if (!item?.id) return null
    const content = normalizeLeisureContentText(
      mapYouTubeVideoToLeisureContent(null, item.id, item.snippet),
    )
    registerGeneratedContents([content])
    return content
  } catch {
    return null
  }
}

function getYouTubeThumbnailUrl(videoId: string, thumbnails?: YouTubeThumbnailSet) {
  return (
    thumbnails?.high?.url ??
    thumbnails?.medium?.url ??
    thumbnails?.default?.url ??
    buildThumbnailUrl(videoId)
  )
}

function registerGeneratedContents(contents: LeisureContent[]) {
  contents.forEach(content => {
    generatedContentRegistry.set(content.id, content)
  })
}

function decodeHtmlEntities(value: string | null | undefined) {
  const normalizedValue = value?.trim() ?? ''

  if (!normalizedValue || !htmlEntityPattern.test(normalizedValue)) {
    return normalizedValue
  }

  if (typeof document !== 'undefined') {
    const textarea = document.createElement('textarea')
    textarea.innerHTML = normalizedValue
    return textarea.value.trim()
  }

  return normalizedValue
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

function normalizeLeisureContentText(content: LeisureContent): LeisureContent {
  return {
    ...content,
    title: decodeHtmlEntities(content.title) || content.title,
    channelName: decodeHtmlEntities(content.channelName) || content.channelName,
    categoryLabel: decodeHtmlEntities(content.categoryLabel) || null,
    description: decodeHtmlEntities(content.description) || content.description,
    tags: content.tags
      .map(tag => decodeHtmlEntities(tag) || tag)
      .filter(Boolean),
  }
}

async function fetchYouTubeApi<TResponse>(
  endpoint: string,
  params: Record<string, string>,
): Promise<TResponse> {
  if (!hasYouTubeApiKey()) {
    throw new Error('youtube_api_key_missing')
  }

  const url = new URL(`${YOUTUBE_API_BASE_URL}/${endpoint}`)
  Object.entries({
    ...params,
    key: YOUTUBE_API_KEY,
  }).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })

  let response: Response

  try {
    response = await fetch(url.toString())
  } catch (error) {
    console.error('Failed to reach YouTube API.', {
      endpoint,
      params,
      error,
    })
    throw new Error('youtube_api_network_error')
  }

  if (!response.ok) {
    let responseMessage = ''

    try {
      const errorBody = (await response.json()) as {
        error?: {
          message?: string
        }
      }
      responseMessage = errorBody.error?.message?.trim() ?? ''
    } catch {
      responseMessage = ''
    }

    console.error('YouTube API request failed.', {
      endpoint,
      params,
      status: response.status,
      responseMessage,
    })
    throw new Error(
      `youtube_api_request_failed:${response.status}${responseMessage ? `:${responseMessage}` : ''}`,
    )
  }

  return (await response.json()) as TResponse
}

function dedupeQueries(queries: string[]) {
  return Array.from(new Set(queries.map(query => query.trim()).filter(Boolean)))
}

function dedupeContents(contents: LeisureContent[]) {
  const seenVideoIds = new Set<string>()

  return contents.filter(content => {
    if (seenVideoIds.has(content.videoId)) {
      return false
    }

    seenVideoIds.add(content.videoId)
    return true
  })
}

function getFallbackCategoryContents(
  categoryId: LeisureCategoryId,
  options?: {
    excludeVideoIds?: Set<string>
    maxResults?: number
  },
) {
  const fallbackContents = MOCK_LEISURE_CONTENTS.map(toPlayableLeisureItem)
    .filter((content): content is LeisureContent => Boolean(content))
    .filter(content => content.categoryId === categoryId)
    .filter(content => !options?.excludeVideoIds?.has(content.videoId))

  return dedupeContents(fallbackContents).slice(0, options?.maxResults ?? LEISURE_RECOMMENDATION_SIZE)
}

function buildCategorySearchQueries(categoryId: LeisureCategoryId, queryHints: string[]) {
  const baseQuery = categorySearchQueryMap[categoryId]
  const hintedQueries = queryHints
    .map(queryHint => `${queryHint} ${baseQuery}`.trim())
    .slice(0, 2)

  return dedupeQueries([...hintedQueries, baseQuery])
}

function mapYouTubeVideoToLeisureContent(
  categoryId: LeisureCategoryId | null,
  videoId: string,
  snippet?: YouTubeSnippet,
): LeisureContent {
  const category = categoryId ? (categoryMap.get(categoryId) ?? null) : null
  const categoryLabel = decodeHtmlEntities(category?.label ?? null) || null
  const id = categoryId
    ? buildGeneratedContentId(categoryId, videoId)
    : `${GENERATED_CONTENT_ID_PREFIX}:${videoId}`

  return {
    id,
    title: snippet?.title?.trim() || 'YouTube 콘텐츠',
    channelName: snippet?.channelTitle?.trim() || categoryLabel || 'YouTube',
    thumbnailUrl: getYouTubeThumbnailUrl(videoId, snippet?.thumbnails),
    embedUrl: buildEmbedUrl(videoId),
    youtubeUrl: buildWatchUrl(videoId),
    videoId,
    categoryId,
    categoryLabel,
    tags: categoryLabel ? [categoryLabel] : [],
    description: snippet?.description?.trim() || snippet?.title?.trim() || 'YouTube 콘텐츠',
  }
}

function buildFallbackGeneratedContent(
  categoryId: LeisureCategoryId,
  videoId: string,
): LeisureContent {
  const category = categoryMap.get(categoryId) ?? null
  const categoryLabel = category?.label ?? null

  return {
    id: buildGeneratedContentId(categoryId, videoId),
    title: categoryLabel ? `${categoryLabel} video` : 'YouTube video',
    channelName: categoryLabel ?? 'YouTube',
    thumbnailUrl: buildThumbnailUrl(videoId),
    embedUrl: buildEmbedUrl(videoId),
    youtubeUrl: buildWatchUrl(videoId),
    videoId,
    categoryId,
    categoryLabel,
    tags: categoryLabel ? [categoryLabel] : [],
    description: categoryLabel
      ? `Play a YouTube video resolved from the ${categoryLabel} category.`
      : 'Play a YouTube video.',
  }
}

async function searchYouTubeContents(
  categoryId: LeisureCategoryId | null,
  query: string,
  maxResults: number,
) {
  const response = await fetchYouTubeApi<YouTubeSearchResponse>('search', {
    part: 'snippet',
    type: 'video',
    videoEmbeddable: 'true',
    maxResults: String(maxResults),
    q: query,
    regionCode: YOUTUBE_REGION_CODE,
    relevanceLanguage: YOUTUBE_RELEVANCE_LANGUAGE,
  })

  const contents = (response.items ?? [])
    .map(item => {
      const videoId = item.id?.videoId

      if (!videoId) {
        return null
      }

      return mapYouTubeVideoToLeisureContent(categoryId, videoId, item.snippet)
    })
    .filter((content): content is LeisureContent => Boolean(content))
    .map(normalizeLeisureContentText)

  registerGeneratedContents(contents)
  return contents
}

async function fetchGeneratedYouTubeContentDetail(contentId: string) {
  const parsedContentId = parseGeneratedContentId(contentId)

  if (!parsedContentId) {
    return null
  }

  const cachedContent = generatedContentRegistry.get(contentId)

  if (cachedContent) {
    return cachedContent
  }

  if (!hasYouTubeApiKey()) {
    const fallbackContent = buildFallbackGeneratedContent(
      parsedContentId.categoryId,
      parsedContentId.videoId,
    )
    registerGeneratedContents([fallbackContent])
    console.warn('Using fallback generated leisure content because YouTube API key is missing.', {
      contentId,
      categoryId: parsedContentId.categoryId,
      videoId: parsedContentId.videoId,
    })
    return fallbackContent
  }

  try {
    const response = await fetchYouTubeApi<YouTubeVideoListResponse>('videos', {
      part: 'snippet',
      id: parsedContentId.videoId,
      hl: YOUTUBE_RELEVANCE_LANGUAGE,
    })

    const item = response.items?.[0]

    if (!item?.id) {
      return null
    }

    const content = normalizeLeisureContentText(
      mapYouTubeVideoToLeisureContent(
        parsedContentId.categoryId,
        item.id,
        item.snippet,
      ),
    )
    registerGeneratedContents([content])
    return content
  } catch (error) {
    const fallbackContent = buildFallbackGeneratedContent(
      parsedContentId.categoryId,
      parsedContentId.videoId,
    )
    registerGeneratedContents([fallbackContent])
    console.warn('Using fallback generated leisure content after failing to fetch metadata.', {
      contentId,
      categoryId: parsedContentId.categoryId,
      videoId: parsedContentId.videoId,
      error,
    })
    return fallbackContent
  }
}

async function resolveYoutubeContentFromCategory(
  categoryId: LeisureCategoryId,
  options?: {
    excludeVideoIds?: Set<string>
    maxResults?: number
    queryHints?: string[]
  },
) {
  const targetResultCount = options?.maxResults ?? LEISURE_RECOMMENDATION_SIZE

  if (targetResultCount <= 0) {
    return []
  }

  if (!hasYouTubeApiKey()) {
    throw new LeisureCategoryResolutionError({
      code: 'youtube_api_key_missing',
      categoryId,
      message: 'YouTube API key is not configured.',
      details: {
        envVar: 'VITE_YOUTUBE_API_KEY',
      },
    })
  }

  const queries = buildCategorySearchQueries(categoryId, options?.queryHints ?? [])
  const searchResults = await Promise.all(
    queries.map(query =>
      searchYouTubeContents(categoryId, query, LEISURE_RECOMMENDATION_SIZE).catch(error => {
        console.warn(`Failed to search YouTube contents for query "${query}".`, error)
        return null
      }),
    ),
  )

  const successfulSearches = searchResults.filter(
    (contents): contents is LeisureContent[] => Array.isArray(contents),
  )

  if (successfulSearches.length === 0) {
    throw new LeisureCategoryResolutionError({
      code: 'youtube_category_resolution_failed',
      categoryId,
      message: 'Failed to resolve category contents from YouTube.',
      details: {
        queryCount: queries.length,
        queries,
      },
    })
  }

  return dedupeContents(
    successfulSearches
      .flat()
      .filter(content => !options?.excludeVideoIds?.has(content.videoId)),
  ).slice(0, targetResultCount)
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

export function normalizeYoutubeUrl(urlValue: string | null | undefined) {
  const videoId = extractYouTubeVideoId(urlValue)

  if (!videoId) {
    return null
  }

  return buildWatchUrl(videoId)
}

export function toPlayableLeisureItem(item: LeisureContentResponseDto): LeisureContent | null {
  const normalizedYoutubeUrl = normalizeYoutubeUrl(item.url)

  if (!normalizedYoutubeUrl) {
    if (!item.url) {
      return null
    }

    console.warn('Skipping leisure content with non-playable YouTube URL.', item)
    return null
  }

  const videoId = extractYouTubeVideoId(normalizedYoutubeUrl)

  if (!videoId) {
    return null
  }

  const categoryId = normalizeCategory(item.category)
  const category = categoryId ? categoryMap.get(categoryId) ?? null : null
  const categoryLabel = decodeHtmlEntities(item.categoryName) || decodeHtmlEntities(category?.label) || null
  const title = decodeHtmlEntities(item.name) || item.name

  return {
    id: String(item.id),
    title,
    channelName: categoryLabel ?? 'YouTube',
    thumbnailUrl: buildThumbnailUrl(videoId),
    embedUrl: buildEmbedUrl(videoId),
    youtubeUrl: normalizedYoutubeUrl,
    videoId,
    categoryId,
    categoryLabel,
    tags: categoryLabel ? [categoryLabel] : [],
    description: title,
  }
}

function mapApiItemToShortcut(
  item: LeisureContentResponseDto,
  index: number,
): LeisureShortcut | null {
  const categoryId = normalizeCategory(item.category)
  const category = categoryId ? categoryMap.get(categoryId) ?? null : null
  const categoryLabel = decodeHtmlEntities(item.categoryName) || decodeHtmlEntities(category?.label) || null
  const title = decodeHtmlEntities(item.name) || item.name
  const tone = getShortcutTone(index, category)

  if (item.url) {
    const content = toPlayableLeisureItem(item)

    if (!content) {
      return null
    }

    return {
      id: String(item.id),
      title,
      description: '',
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
    title,
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
  const contents = (await getRawLeisureContents())
    .map(toPlayableLeisureItem)
    .filter((content): content is LeisureContent => Boolean(content))
    .map(normalizeLeisureContentText)

  registerGeneratedContents(contents)
  return contents
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

export function getLeisureCategoryErrorMessage(error: unknown) {
  if (error instanceof LeisureCategoryResolutionError) {
    if (error.code === 'youtube_api_key_missing') {
      return 'YouTube API key is missing. Set VITE_YOUTUBE_API_KEY to resolve category contents.'
    }

    return 'Unable to load category results from YouTube. Check network, quota, and API settings.'
  }

  return 'Unable to load category contents right now. Please try again.'
}

export async function fetchLeisureMain(): Promise<LeisureMainPayload> {
  const response = await getRawLeisureContents()
  const shortcutCards = response
    .map(mapApiItemToShortcut)
    .filter((shortcut): shortcut is LeisureShortcut => Boolean(shortcut))
    .slice(0, LEISURE_SHORTCUT_SIZE)

  const playableContents = response
    .map(toPlayableLeisureItem)
    .filter((content): content is LeisureContent => Boolean(content))
  registerGeneratedContents(playableContents)

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

  const rawContents = await getRawLeisureContents()
  const directContents = rawContents
    .map(toPlayableLeisureItem)
    .filter((content): content is LeisureContent => Boolean(content))
    .filter(content => content.categoryId === categoryId)
  const queryHints = rawContents
    .filter(item => !item.url && normalizeCategory(item.category) === categoryId)
    .map(item => item.name.trim())
    .filter(Boolean)

  let contents = dedupeContents(directContents)

  if (contents.length < LEISURE_RECOMMENDATION_SIZE) {
    const fallbackContents = getFallbackCategoryContents(categoryId, {
      excludeVideoIds: new Set(contents.map(content => content.videoId)),
      maxResults: LEISURE_RECOMMENDATION_SIZE - contents.length,
    })

    contents = dedupeContents([...contents, ...fallbackContents])
  }

  if (getActiveApiMode() === 'real' && contents.length < LEISURE_RECOMMENDATION_SIZE) {
    try {
      const youtubeContents = await resolveYoutubeContentFromCategory(categoryId, {
        excludeVideoIds: new Set(contents.map(content => content.videoId)),
        maxResults: LEISURE_RECOMMENDATION_SIZE - contents.length,
        queryHints,
      })

      contents = dedupeContents([...contents, ...youtubeContents])
    } catch (error) {
      console.warn('Falling back to local leisure category contents after YouTube lookup failed.', {
        categoryId,
        refreshRequested: options?.refresh ?? false,
        error,
      })
    }
  }

  contents = contents.slice(0, LEISURE_RECOMMENDATION_SIZE)
  registerGeneratedContents(contents)

  return {
    category,
    contents,
  }
}

export async function fetchLeisureContentDetail(contentId: string) {
  const cachedContent = generatedContentRegistry.get(contentId)

  if (cachedContent) {
    return cachedContent
  }

  if (parseGeneratedContentId(contentId)) {
    return fetchGeneratedYouTubeContentDetail(contentId)
  }

  const noCategoryVideoId = parseNoCategoryContentId(contentId)

  if (noCategoryVideoId) {
    return fetchNoCategoryYouTubeContentDetail(contentId, noCategoryVideoId)
  }

  const contents = await getPlayableContents()
  return contents.find(content => content.id === contentId) ?? null
}

export async function fetchRelatedLeisureContents(
  contentId: string,
  options?: { refresh?: boolean },
) {
  void options

  const currentContent = await fetchLeisureContentDetail(contentId)

  if (!currentContent) {
    throw new Error('content_not_found')
  }

  if (!currentContent.categoryId) {
    if (!hasYouTubeApiKey()) {
      return []
    }

    try {
      const results = await searchYouTubeContents(
        null,
        currentContent.title,
        LEISURE_RECOMMENDATION_SIZE + 1,
      )
      return results
        .filter(content => content.videoId !== currentContent.videoId)
        .slice(0, LEISURE_RECOMMENDATION_SIZE)
    } catch {
      return []
    }
  }

  const categoryPayload = await fetchLeisureCategoryRecommendations(currentContent.categoryId)

  return categoryPayload.contents
    .filter(content => content.id !== currentContent.id)
    .filter(content => content.videoId !== currentContent.videoId)
    .slice(0, LEISURE_RECOMMENDATION_SIZE)
}
