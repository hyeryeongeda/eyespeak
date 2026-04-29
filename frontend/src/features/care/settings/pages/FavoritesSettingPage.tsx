import { useState, useEffect, useMemo } from 'react'
import CareSettingLayout from '../components/CareSettingLayout'
import {
  getFavorites,
  deleteFavorite,
  createFavorite,
  getPhrases,
  shouldTreatFavoritesAsEmpty,
  FAVORITES_MAX_COUNT,
} from '../../../../services/favoritesService'
import type { FavoriteItem, PhraseCategory } from '../../../../types/favorite'

export default function FavoritesSettingPage() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [categories, setCategories] = useState<PhraseCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [togglingPhraseId, setTogglingPhraseId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [justToggledPhraseId, setJustToggledPhraseId] = useState<number | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const [favResult, phraseResult] = await Promise.all([
        getFavorites(),
        getPhrases(),
      ])

      if (favResult.success) {
        setFavorites(favResult.data)
      } else if (!shouldTreatFavoritesAsEmpty(favResult.code)) {
        setError(favResult.message)
      }

      if (phraseResult.success) {
        setCategories(phraseResult.data)
      }

      setIsLoading(false)
    }

    fetchData()
  }, [])

  const existingPhraseIds = useMemo(
    () => new Set(favorites.map((f) => f.phraseId)),
    [favorites],
  )

  const isFull = favorites.length >= FAVORITES_MAX_COUNT

  const showError = (msg: string) => {
    setError(msg)
    setTimeout(() => setError(null), 2000)
  }

  const flashToggled = (phraseId: number) => {
    setJustToggledPhraseId(phraseId)
    setTimeout(() => setJustToggledPhraseId(null), 1500)
  }

  const handleDelete = async (favoriteId: number) => {
    if (deletingId !== null) return
    setDeletingId(favoriteId)
    setError(null)

    const result = await deleteFavorite(favoriteId)

    if (result.success) {
      setFavorites((prev) => prev.filter((f) => f.favoriteId !== favoriteId))
    } else {
      showError(result.message)
    }

    setDeletingId(null)
  }

  const handleToggleFavorite = async (phraseId: number) => {
    if (togglingPhraseId !== null) return
    setTogglingPhraseId(phraseId)
    setError(null)

    const existing = favorites.find((f) => f.phraseId === phraseId)

    if (existing) {
      const result = await deleteFavorite(existing.favoriteId)
      if (result.success) {
        setFavorites((prev) => prev.filter((f) => f.favoriteId !== existing.favoriteId))
        flashToggled(phraseId)
      } else {
        showError(result.message)
      }
    } else {
      if (isFull) {
        showError(`즐겨찾기는 최대 ${FAVORITES_MAX_COUNT}개까지 등록할 수 있습니다.`)
        setTogglingPhraseId(null)
        return
      }
      const result = await createFavorite(phraseId)
      if (result.success) {
        const refreshed = await getFavorites()
        if (refreshed.success) {
          setFavorites(refreshed.data)
        }
        flashToggled(phraseId)
      } else {
        showError(result.message)
      }
    }

    setTogglingPhraseId(null)
  }

  if (isLoading) {
    return (
      <CareSettingLayout title="표현 즐겨찾기">
        <div className="flex items-center justify-center h-40">
          <span className="text-[15px] text-[#718096]">불러오는 중...</span>
        </div>
      </CareSettingLayout>
    )
  }

  return (
    <CareSettingLayout title="표현 즐겨찾기">
      <div className="flex flex-col gap-6 mt-6">
        {/* 에러 메시지 */}
        {error && <p className="text-[14px] text-red-500 text-center">{error}</p>}

        {/* ===== 상단: 등록된 즐겨찾기 ===== */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#3D405B]">
            <h2 className="text-[15px] font-bold text-white">등록된 즐겨찾기</h2>
            <span className="text-[14px] text-[#CBD5E0]">
              {favorites.length} / {FAVORITES_MAX_COUNT}
            </span>
          </div>

          {favorites.length === 0 ? (
            <div className="flex items-center justify-center h-24 rounded-xl border border-[#E2E8F0]">
              <p className="text-[15px] text-[#A0AEC0]">등록된 즐겨찾기가 없습니다.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-[#E2E8F0] overflow-hidden bg-white">
              {favorites.map((item, idx) => {
                const isDeleting = deletingId === item.favoriteId
                return (
                  <div
                    key={item.favoriteId}
                    className={`min-h-[52px] px-4 flex items-center justify-between ${
                      idx > 0 ? 'border-t border-[#F0F4F8]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-[12px] text-[#718096] bg-[#F0F4F8] rounded px-1.5 py-0.5 shrink-0">
                        {item.categoryName}
                      </span>
                      <span className="text-[15px] text-[#3D405B] truncate">{item.content}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.favoriteId)}
                      disabled={isDeleting}
                      className="text-[14px] text-red-400 active:text-red-600 min-h-[44px] px-2 shrink-0"
                    >
                      {isDeleting ? '삭제 중...' : '삭제'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ===== 하단: 카테고리별 표현 목록 (등록용) ===== */}
        <section className="flex flex-col gap-3">
          <div className="px-3 py-2.5 rounded-lg bg-[#F0F4F8]">
            <h2 className="text-[15px] font-bold text-[#3D405B]">표현 목록</h2>
            <span className="text-[12px] text-[#718096]">
              표현을 선택하면 즐겨찾기에 등록됩니다.
            </span>
          </div>

          <div className="flex flex-col gap-4">
            {categories.map((cat) => (
              <div key={cat.categoryId} className="flex flex-col gap-1">
                {/* 카테고리 섹션 헤더 */}
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#E8EDF3]">
                  <span className="text-[14px] font-bold text-[#3D405B]">{cat.categoryName}</span>
                  <span className="text-[12px] text-[#718096]">{cat.phrases.length}개</span>
                </div>

                {/* 표현 리스트 */}
                <div className="rounded-xl border border-[#E2E8F0] overflow-hidden bg-white">
                  {cat.phrases.map((phrase, idx) => {
                    const isAlreadyFavorited = existingPhraseIds.has(phrase.phraseId)
                    const isToggling = togglingPhraseId === phrase.phraseId
                    const isJustToggled = justToggledPhraseId === phrase.phraseId
                    const isDisabled = (!isAlreadyFavorited && isFull) || togglingPhraseId !== null

                    return (
                      <button
                        key={phrase.phraseId}
                        type="button"
                        onClick={() => handleToggleFavorite(phrase.phraseId)}
                        disabled={isDisabled}
                        className={`w-full min-h-[48px] px-4 flex items-center gap-3 text-left ${
                          idx > 0 ? 'border-t border-[#F0F4F8]' : ''
                        } ${
                          isAlreadyFavorited
                            ? 'bg-[#F0F7FF]'
                            : isFull
                              ? 'bg-[#FAFAFA]'
                              : 'active:bg-[#EDF2F7]'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            isAlreadyFavorited
                              ? 'bg-[#3D405B] border-[#3D405B]'
                              : 'border-[#CBD5E0] bg-white'
                          }`}
                        >
                          {isAlreadyFavorited && (
                            <span className="text-white text-[11px] leading-none">&#10003;</span>
                          )}
                        </span>
                        <span
                          className={`text-[15px] flex-1 ${
                            isAlreadyFavorited
                              ? 'text-[#3D405B] font-medium'
                              : isFull
                                ? 'text-[#A0AEC0]'
                                : 'text-[#3D405B]'
                          }`}
                        >
                          {phrase.content}
                        </span>
                        {isToggling && (
                          <span className="text-[12px] text-[#718096] shrink-0">처리 중...</span>
                        )}
                        {!isToggling && isJustToggled && (
                          <span className={`text-[12px] shrink-0 ${isAlreadyFavorited ? 'text-green-600' : 'text-[#718096]'}`}>
                            {isAlreadyFavorited ? '등록 완료' : '해제 완료'}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </CareSettingLayout>
  )
}
