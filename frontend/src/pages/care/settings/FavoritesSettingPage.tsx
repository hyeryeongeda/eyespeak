import { useState, useEffect, useMemo } from 'react'
import CareSettingLayout from './CareSettingLayout'
import {
  getFavorites,
  deleteFavorite,
  shouldTreatFavoritesAsEmpty,
  FAVORITES_MAX_COUNT,
} from '../../../services/favoritesService'
import type { FavoriteItem } from '../../../types/favorite'

export default function FavoritesSettingPage() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openCategory, setOpenCategory] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const result = await getFavorites()

      if (!result.success) {
        if (shouldTreatFavoritesAsEmpty(result.code)) {
          setFavorites([])
        } else {
          setError(result.message)
        }
        setIsLoading(false)
        return
      }

      setFavorites(result.data)
      setIsLoading(false)
    }

    fetchData()
  }, [])

  const grouped = useMemo(() => {
    const map = new Map<string, FavoriteItem[]>()

    for (const item of favorites) {
      const key = item.categoryName
      const list = map.get(key) ?? []
      list.push(item)
      map.set(key, list)
    }

    return map
  }, [favorites])

  const handleDelete = async (favoriteId: number) => {
    if (deletingId !== null) return
    setDeletingId(favoriteId)
    setError(null)

    const result = await deleteFavorite(favoriteId)

    if (result.success) {
      setFavorites((prev) => prev.filter((f) => f.favoriteId !== favoriteId))
    } else {
      setError(result.message)
      setTimeout(() => setError(null), 2000)
    }

    setDeletingId(null)
  }

  const handleToggleCategory = (categoryName: string) => {
    setOpenCategory((prev) => (prev === categoryName ? null : categoryName))
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
          현재 등록된 즐겨찾기 표현입니다. (최대 {FAVORITES_MAX_COUNT}개)
        </p>

        <p className="text-[13px] font-medium text-[#3D405B] text-right">
          {favorites.length} / {FAVORITES_MAX_COUNT}개 등록
        </p>

        {error && <p className="text-[13px] text-red-500 text-center">{error}</p>}

        {favorites.length === 0 ? (
          <div className="flex items-center justify-center h-32 rounded-xl border border-[#E2E8F0]">
            <p className="text-[14px] text-[#A0AEC0]">등록된 즐겨찾기가 없습니다.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {[...grouped.entries()].map(([categoryName, items]) => {
              const isOpen = openCategory === categoryName

              return (
                <div key={categoryName} className="rounded-xl border border-[#E2E8F0] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => handleToggleCategory(categoryName)}
                    className="w-full min-h-[52px] px-4 flex items-center justify-between bg-[#F0F4F8] active:bg-[#E2E8F0]"
                  >
                    <span className="text-[15px] font-medium text-[#3D405B]">{categoryName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-white bg-[#3D405B] rounded-full px-2 py-0.5">
                        {items.length}
                      </span>
                      <span className="text-[16px] text-[#718096]">{isOpen ? '−' : '+'}</span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="bg-white">
                      {items.map((item) => {
                        const isDeleting = deletingId === item.favoriteId
                        return (
                          <div
                            key={item.favoriteId}
                            className="min-h-[44px] px-4 flex items-center justify-between border-t border-[#F0F4F8]"
                          >
                            <span className="text-[14px] text-[#3D405B]">{item.content}</span>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.favoriteId)}
                              disabled={isDeleting}
                              className="text-[13px] text-red-400 active:text-red-600 min-h-[44px] px-2"
                            >
                              {isDeleting ? '삭제 중...' : '삭제'}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </CareSettingLayout>
  )
}
