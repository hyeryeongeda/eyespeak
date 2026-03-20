import { useState, useEffect } from 'react'
import CareSettingLayout from './CareSettingLayout'
import {
  getCategories,
  getPhrasesByCategory,
  getFavoritePhrases,
  addFavoritePhrase,
  removeFavoritePhrase,
} from '../../../services/careSettingService'
import type { Category, Phrase, FavoritePhrase } from '../../../types/care'

const MAX_FAVORITES_PER_CATEGORY = 5

export default function FavoritesSettingPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [phrases, setPhrases] = useState<Record<number, Phrase[]>>({})
  const [favorites, setFavorites] = useState<FavoritePhrase[]>([])
  const [openCategoryId, setOpenCategoryId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadingPhraseId, setLoadingPhraseId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const [catRes, favRes] = await Promise.all([
          getCategories(),
          getFavoritePhrases(),
        ])
        if (catRes.success) setCategories(catRes.data.sort((a, b) => a.orderIndex - b.orderIndex))
        if (favRes.success) setFavorites(favRes.data)
      } catch {
        setError('데이터를 불러오지 못했습니다.')
      } finally {
        setIsLoading(false)
      }
    }
    fetchBase()
  }, [])

  const handleOpenCategory = async (categoryId: number) => {
    if (openCategoryId === categoryId) {
      setOpenCategoryId(null)
      return
    }
    setOpenCategoryId(categoryId)

    if (phrases[categoryId]) return

    try {
      const res = await getPhrasesByCategory(categoryId)
      if (res.success) {
        setPhrases((prev) => ({ ...prev, [categoryId]: res.data }))
      }
    } catch {
      setError('표현 목록을 불러오지 못했습니다.')
    }
  }

  const isFavorite = (phraseId: number) => favorites.some((f) => f.phraseId === phraseId)

  const getFavCountForCategory = (categoryId: number) => {
    const categoryPhraseIds = (phrases[categoryId] ?? []).map((p) => p.id)
    return favorites.filter((f) => categoryPhraseIds.includes(f.phraseId)).length
  }

  const handleToggleFavorite = async (phrase: Phrase) => {
    if (loadingPhraseId !== null) return
    setLoadingPhraseId(phrase.id)
    setError(null)

    try {
      if (isFavorite(phrase.id)) {
        const res = await removeFavoritePhrase(phrase.id)
        if (res.success) {
          setFavorites((prev) => prev.filter((f) => f.phraseId !== phrase.id))
        }
      } else {
        const count = getFavCountForCategory(phrase.categoryId)
        if (count >= MAX_FAVORITES_PER_CATEGORY) {
          setError(`카테고리당 최대 ${MAX_FAVORITES_PER_CATEGORY}개까지 등록할 수 있습니다.`)
          setTimeout(() => setError(null), 2000)
          return
        }
        const res = await addFavoritePhrase(phrase.id)
        if (res.success && res.data) {
          setFavorites((prev) => [...prev, res.data])
        }
      }
    } catch {
      setError('처리에 실패했습니다.')
    } finally {
      setLoadingPhraseId(null)
    }
  }

  if (isLoading) {
    return (
      <CareSettingLayout title="표현 즐겨찾기">
        <div className="flex items-center justify-center h-40">
          <span className="text-[14px] text-[#718096]">불러오는 중...</span>
        </div>
      </CareSettingLayout>
    )
  }

  return (
    <CareSettingLayout title="표현 즐겨찾기">
      <div className="flex flex-col gap-4 mt-6">
        <p className="text-[13px] text-[#718096]">
          카테고리별로 자주 쓰는 표현을 즐겨찾기에 등록하세요. (카테고리당 최대 {MAX_FAVORITES_PER_CATEGORY}개)
        </p>

        {error && <p className="text-[13px] text-red-500 text-center">{error}</p>}

        <div className="flex flex-col gap-2">
          {categories.map((cat) => {
            const isOpen = openCategoryId === cat.id
            const catPhrases = phrases[cat.id] ?? []
            const favCount = getFavCountForCategory(cat.id)

            return (
              <div key={cat.id} className="rounded-xl border border-[#E2E8F0] overflow-hidden">
                <button
                  type="button"
                  onClick={() => handleOpenCategory(cat.id)}
                  className="w-full min-h-[52px] px-4 flex items-center justify-between bg-[#F0F4F8] active:bg-[#E2E8F0]"
                >
                  <span className="text-[15px] font-medium text-[#3D405B]">{cat.name}</span>
                  <div className="flex items-center gap-2">
                    {favCount > 0 && (
                      <span className="text-[12px] text-white bg-[#3D405B] rounded-full px-2 py-0.5">
                        {favCount}
                      </span>
                    )}
                    <span className="text-[16px] text-[#718096]">{isOpen ? '−' : '+'}</span>
                  </div>
                </button>

                {isOpen && (
                  <div className="bg-white">
                    {catPhrases.length === 0 ? (
                      <p className="px-4 py-3 text-[13px] text-[#A0AEC0]">불러오는 중...</p>
                    ) : (
                      catPhrases.map((phrase) => {
                        const faved = isFavorite(phrase.id)
                        const isToggling = loadingPhraseId === phrase.id
                        return (
                          <button
                            key={phrase.id}
                            type="button"
                            onClick={() => handleToggleFavorite(phrase)}
                            disabled={isToggling}
                            className="w-full min-h-[44px] px-4 flex items-center justify-between border-t border-[#F0F4F8] active:bg-[#F7FAFC]"
                          >
                            <span className="text-[14px] text-[#3D405B]">{phrase.content}</span>
                            <span className={`text-[20px] ${faved ? 'text-yellow-400' : 'text-[#CBD5E0]'}`}>
                              {faved ? '★' : '☆'}
                            </span>
                          </button>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </CareSettingLayout>
  )
}
