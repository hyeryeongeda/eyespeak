import { useState, useEffect } from 'react'
import CareSettingLayout from './CareSettingLayout'
import {
  getLeisureContents,
  saveLeisureContent,
  updateLeisureContent,
  deleteLeisureContent,
} from '../../../services/careSettingService'
import type { LeisureContentItem } from '../../../types/care'

const MAX_CONTENTS = 5

type InputMode = 'url' | 'category'

const CATEGORY_OPTIONS = [
  { value: 'sports', label: '스포츠' },
  { value: 'news', label: '뉴스' },
  { value: 'music', label: '음악' },
  { value: 'radio', label: '라디오' },
  { value: 'audiobook', label: '오디오북' },
] as const

export default function LeisureSettingPage() {
  const [contents, setContents] = useState<LeisureContentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // 추가 폼
  const [showForm, setShowForm] = useState(false)
  const [inputMode, setInputMode] = useState<InputMode>('url')
  const [urlInput, setUrlInput] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [categoryInput, setCategoryInput] = useState(CATEGORY_OPTIONS[0].value)
  const [isAdding, setIsAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // 수정 폼
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editMode, setEditMode] = useState<InputMode>('url')
  const [editName, setEditName] = useState('')
  const [editUrl, setEditUrl] = useState('')
  const [editCategory, setEditCategory] = useState<string>(CATEGORY_OPTIONS[0].value)
  const [isSaving, setIsSaving] = useState(false)

  const fetchContents = async () => {
    try {
      const res = await getLeisureContents()
      if (res.success) setContents(res.data)
    } catch {
      setError('여가 콘텐츠를 불러오지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchContents()
  }, [])

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 2000)
  }

  const showError = (msg: string) => {
    setError(msg)
    setTimeout(() => setError(null), 2000)
  }

  const resetForm = () => {
    setUrlInput('')
    setNameInput('')
    setCategoryInput(CATEGORY_OPTIONS[0].value)
    setInputMode('url')
    setShowForm(false)
  }

  const resetEditForm = () => {
    setEditingId(null)
    setEditName('')
    setEditUrl('')
    setEditCategory(CATEGORY_OPTIONS[0].value)
    setEditMode('url')
  }

  const handleAdd = async () => {
    if (isAdding) return
    const trimmedName = nameInput.trim()

    if (!trimmedName) {
      showError('이름을 입력해주세요.')
      return
    }

    if (inputMode === 'url' && !urlInput.trim()) {
      showError('URL을 입력해주세요.')
      return
    }

    setIsAdding(true)
    setError(null)

    try {
      await saveLeisureContent({
        name: trimmedName,
        url: inputMode === 'url' ? urlInput.trim() : undefined,
        category: inputMode === 'category' ? categoryInput : undefined,
      })
      await fetchContents()
      resetForm()
      showSuccess('등록되었습니다.')
    } catch {
      showError('등록에 실패했습니다.')
    } finally {
      setIsAdding(false)
    }
  }

  const handleEdit = (item: LeisureContentItem) => {
    setEditingId(item.id)
    setEditName(item.name)
    if (item.url) {
      setEditMode('url')
      setEditUrl(item.url)
      setEditCategory(CATEGORY_OPTIONS[0].value)
    } else {
      setEditMode('category')
      setEditUrl('')
      setEditCategory(item.category ?? CATEGORY_OPTIONS[0].value)
    }
  }

  const handleUpdate = async () => {
    if (editingId === null || isSaving) return
    const trimmedName = editName.trim()

    if (!trimmedName) {
      showError('이름을 입력해주세요.')
      return
    }

    if (editMode === 'url' && !editUrl.trim()) {
      showError('URL을 입력해주세요.')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      await updateLeisureContent(editingId, {
        name: trimmedName,
        url: editMode === 'url' ? editUrl.trim() : undefined,
        category: editMode === 'category' ? editCategory : undefined,
      })
      await fetchContents()
      resetEditForm()
      showSuccess('수정되었습니다.')
    } catch {
      showError('수정에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (deletingId !== null) return
    setDeletingId(id)
    setError(null)

    try {
      const res = await deleteLeisureContent(id)
      if (res.success) {
        await fetchContents()
        showSuccess('삭제되었습니다.')
      }
    } catch {
      showError('삭제에 실패했습니다.')
    } finally {
      setDeletingId(null)
    }
  }

  const getCategoryLabel = (value: string | null) => {
    if (!value) return value
    return CATEGORY_OPTIONS.find((c) => c.value === value)?.label ?? value
  }

  if (isLoading) {
    return (
      <CareSettingLayout title="여가 콘텐츠">
        <div className="flex items-center justify-center h-40">
          <span className="text-[14px] text-[#718096]">불러오는 중...</span>
        </div>
      </CareSettingLayout>
    )
  }

  return (
    <CareSettingLayout title="여가 콘텐츠">
      <div className="flex flex-col gap-4 mt-6">
        <p className="text-[13px] text-[#718096]">
          환자가 시청할 여가 콘텐츠를 등록하세요. (최대 {MAX_CONTENTS}개)
        </p>

        {error && <p className="text-[13px] text-red-500 text-center">{error}</p>}
        {successMsg && <p className="text-[13px] text-green-600 text-center">{successMsg}</p>}

        {/* 콘텐츠 목록 */}
        <div className="flex flex-col gap-2">
          {contents.length === 0 ? (
            <p className="text-[14px] text-[#A0AEC0] text-center py-8">
              등록된 콘텐츠가 없습니다.
            </p>
          ) : (
            contents.map((item, index) =>
              editingId === item.id ? (
                /* 수정 폼 (인라인) */
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-[#3D405B] bg-[#F7FAFC] flex flex-col gap-3"
                >
                  {/* 모드 토글 */}
                  <div className="flex rounded-lg overflow-hidden border border-[#E2E8F0]">
                    {(['url', 'category'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setEditMode(mode)}
                        className={`flex-1 min-h-[40px] text-[13px] font-medium transition-colors ${
                          editMode === mode
                            ? 'bg-[#3D405B] text-white'
                            : 'bg-white text-[#718096]'
                        }`}
                      >
                        {mode === 'url' ? 'YouTube URL' : '카테고리'}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="콘텐츠 이름"
                    className="w-full min-h-[44px] px-4 rounded-lg border border-[#CBD5E0] bg-white text-[15px] text-[#1A202C] placeholder:text-[#A0AEC0] focus:outline-none focus:border-[#3D405B]"
                  />

                  {editMode === 'url' ? (
                    <input
                      type="url"
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full min-h-[44px] px-4 rounded-lg border border-[#CBD5E0] bg-white text-[15px] text-[#1A202C] placeholder:text-[#A0AEC0] focus:outline-none focus:border-[#3D405B]"
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {CATEGORY_OPTIONS.map((cat) => (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setEditCategory(cat.value)}
                          className={`min-h-[36px] px-3 rounded-lg text-[13px] font-medium transition-colors ${
                            editCategory === cat.value
                              ? 'bg-[#3D405B] text-white'
                              : 'bg-white text-[#718096] border border-[#E2E8F0]'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={resetEditForm}
                      className="flex-1 min-h-[44px] rounded-lg bg-[#E2E8F0] text-[#718096] text-[14px] font-medium"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={handleUpdate}
                      disabled={isSaving}
                      className={`flex-1 min-h-[44px] rounded-lg text-[14px] font-bold transition-colors ${
                        isSaving
                          ? 'bg-[#E2E8F0] text-[#A0AEC0] cursor-not-allowed'
                          : 'bg-[#3D405B] text-white active:bg-[#2D2F45]'
                      }`}
                    >
                      {isSaving ? '저장 중...' : '저장'}
                    </button>
                  </div>
                </div>
              ) : (
                /* 일반 표시 */
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-white border border-[#E2E8F0] flex items-center gap-3"
                >
                  <span className="text-[14px] font-bold text-[#3D405B] w-6 text-center shrink-0">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] text-[#1A202C] truncate">{item.name}</p>
                    <p className="text-[12px] text-[#A0AEC0] truncate">
                      {item.url ?? `카테고리: ${item.categoryName ?? getCategoryLabel(item.category)}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleEdit(item)}
                    disabled={deletingId === item.id}
                    className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-[#718096] active:text-[#3D405B] shrink-0"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-[#A0AEC0] active:text-red-500 shrink-0"
                  >
                    {deletingId === item.id ? '...' : '✕'}
                  </button>
                </div>
              ),
            )
          )}
        </div>

        {/* 추가 버튼 / 폼 */}
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            disabled={contents.length >= MAX_CONTENTS}
            className={`w-full min-h-[48px] rounded-xl text-[15px] font-bold transition-colors ${
              contents.length < MAX_CONTENTS
                ? 'bg-[#3D405B] text-white active:bg-[#2D2F45]'
                : 'bg-[#E2E8F0] text-[#A0AEC0] cursor-not-allowed'
            }`}
          >
            {contents.length >= MAX_CONTENTS ? '최대 개수 도달' : '+ 콘텐츠 추가'}
          </button>
        ) : (
          <div className="p-4 rounded-xl border border-[#CBD5E0] bg-[#F7FAFC] flex flex-col gap-3">
            {/* 모드 토글 */}
            <div className="flex rounded-lg overflow-hidden border border-[#E2E8F0]">
              {(['url', 'category'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setInputMode(mode)}
                  className={`flex-1 min-h-[40px] text-[13px] font-medium transition-colors ${
                    inputMode === mode
                      ? 'bg-[#3D405B] text-white'
                      : 'bg-white text-[#718096]'
                  }`}
                >
                  {mode === 'url' ? 'YouTube URL' : '카테고리'}
                </button>
              ))}
            </div>

            {/* 이름 */}
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="콘텐츠 이름"
              className="w-full min-h-[44px] px-4 rounded-lg border border-[#CBD5E0] bg-white text-[15px] text-[#1A202C] placeholder:text-[#A0AEC0] focus:outline-none focus:border-[#3D405B]"
            />

            {/* URL 또는 카테고리 */}
            {inputMode === 'url' ? (
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full min-h-[44px] px-4 rounded-lg border border-[#CBD5E0] bg-white text-[15px] text-[#1A202C] placeholder:text-[#A0AEC0] focus:outline-none focus:border-[#3D405B]"
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategoryInput(cat.value)}
                    className={`min-h-[36px] px-3 rounded-lg text-[13px] font-medium transition-colors ${
                      categoryInput === cat.value
                        ? 'bg-[#3D405B] text-white'
                        : 'bg-white text-[#718096] border border-[#E2E8F0]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            )}

            {/* 액션 */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 min-h-[44px] rounded-lg bg-[#E2E8F0] text-[#718096] text-[14px] font-medium"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={isAdding}
                className={`flex-1 min-h-[44px] rounded-lg text-[14px] font-bold transition-colors ${
                  isAdding
                    ? 'bg-[#E2E8F0] text-[#A0AEC0] cursor-not-allowed'
                    : 'bg-[#3D405B] text-white active:bg-[#2D2F45]'
                }`}
              >
                {isAdding ? '등록 중...' : '등록'}
              </button>
            </div>
          </div>
        )}
      </div>
    </CareSettingLayout>
  )
}
