import { useEffect, useState } from 'react'
import CareSettingLayout from './CareSettingLayout'
import {
  deleteLeisureContent,
  getLeisureContents,
  saveLeisureContent,
  updateLeisureContent,
} from '../../../services/careSettingService'
import type { LeisureContentItem } from '../../../types/care'
import type { LeisureCategoryId } from '../../../types/leisure'

const MAX_CONTENTS = 5

type InputMode = 'url' | 'category'

const CATEGORY_OPTIONS = [
  { value: 'sports', label: '스포츠' },
  { value: 'news', label: '뉴스' },
  { value: 'music', label: '음악' },
  { value: 'radio', label: '라디오' },
  { value: 'audiobook', label: '오디오북' },
] as const satisfies ReadonlyArray<{ value: LeisureCategoryId; label: string }>

function getCategoryLabel(value: LeisureCategoryId | null | undefined) {
  if (!value) {
    return null
  }

  return CATEGORY_OPTIONS.find(category => category.value === value)?.label ?? value
}

function formatContentMeta(item: LeisureContentItem) {
  if (item.url) {
    return item.url
  }

  return `카테고리: ${item.categoryName ?? getCategoryLabel(item.category) ?? '미지정'}`
}

export default function LeisureSettingPage() {
  const [contents, setContents] = useState<LeisureContentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [inputMode, setInputMode] = useState<InputMode>('url')
  const [urlInput, setUrlInput] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [categoryInput, setCategoryInput] = useState<LeisureCategoryId>(CATEGORY_OPTIONS[0].value)
  const [isAdding, setIsAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editMode, setEditMode] = useState<InputMode>('url')
  const [editName, setEditName] = useState('')
  const [editUrl, setEditUrl] = useState('')
  const [editCategory, setEditCategory] = useState<LeisureCategoryId>(CATEGORY_OPTIONS[0].value)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const loadContents = async () => {
      try {
        const response = await getLeisureContents()

        if (response.success) {
          setContents(response.data)
        }
      } catch (loadError) {
        console.error('Failed to load leisure contents.', loadError)
        setError('여가 콘텐츠를 불러오지 못했습니다.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadContents()
  }, [])

  const showSuccess = (message: string) => {
    setSuccessMsg(message)
    setTimeout(() => setSuccessMsg(null), 2000)
  }

  const showError = (message: string) => {
    setError(message)
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
    if (isAdding) {
      return
    }

    if (contents.length >= MAX_CONTENTS) {
      showError(`최대 ${MAX_CONTENTS}개까지만 등록할 수 있습니다.`)
      return
    }

    const trimmedName = nameInput.trim()

    if (!trimmedName) {
      showError('콘텐츠 이름을 입력해 주세요.')
      return
    }

    if (inputMode === 'url' && !urlInput.trim()) {
      showError('YouTube URL을 입력해 주세요.')
      return
    }

    setIsAdding(true)
    setError(null)

    try {
      const response = await saveLeisureContent({
        name: trimmedName,
        url: inputMode === 'url' ? urlInput.trim() : null,
        category: inputMode === 'category' ? categoryInput : null,
      })

      if (response.success) {
        setContents(response.data)
        resetForm()
        showSuccess('콘텐츠가 등록되었습니다.')
      }
    } catch (saveError) {
      console.error('Failed to save leisure content.', saveError)
      showError('콘텐츠 등록에 실패했습니다.')
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
      return
    }

    setEditMode('category')
    setEditUrl('')
    setEditCategory(item.category ?? CATEGORY_OPTIONS[0].value)
  }

  const handleUpdate = async () => {
    if (editingId === null || isSaving) {
      return
    }

    const trimmedName = editName.trim()

    if (!trimmedName) {
      showError('콘텐츠 이름을 입력해 주세요.')
      return
    }

    if (editMode === 'url' && !editUrl.trim()) {
      showError('YouTube URL을 입력해 주세요.')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const response = await updateLeisureContent(editingId, {
        name: trimmedName,
        url: editMode === 'url' ? editUrl.trim() : null,
        category: editMode === 'category' ? editCategory : null,
      })

      if (response.success) {
        setContents(response.data)
        resetEditForm()
        showSuccess('콘텐츠가 수정되었습니다.')
      }
    } catch (updateError) {
      console.error('Failed to update leisure content.', updateError)
      showError('콘텐츠 수정에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (deletingId !== null) {
      return
    }

    setDeletingId(id)
    setError(null)

    try {
      const response = await deleteLeisureContent(id)

      if (response.success) {
        setContents(response.data)
        showSuccess('콘텐츠가 삭제되었습니다.')
      }
    } catch (deleteError) {
      console.error('Failed to delete leisure content.', deleteError)
      showError('콘텐츠 삭제에 실패했습니다.')
    } finally {
      setDeletingId(null)
    }
  }

  if (isLoading) {
    return (
      <CareSettingLayout title="여가 콘텐츠">
        <div className="flex h-40 items-center justify-center">
          <span className="text-[14px] text-[#718096]">콘텐츠를 불러오는 중입니다.</span>
        </div>
      </CareSettingLayout>
    )
  }

  return (
    <CareSettingLayout title="여가 콘텐츠">
      <div className="mt-6 flex flex-col gap-4">
        <p className="text-[13px] text-[#718096]">
          환자가 시청할 여가 콘텐츠를 등록하세요. 최대 {MAX_CONTENTS}개까지 저장할 수
          있습니다.
        </p>

        {error ? <p className="text-center text-[13px] text-red-500">{error}</p> : null}
        {successMsg ? <p className="text-center text-[13px] text-green-600">{successMsg}</p> : null}

        <div className="flex flex-col gap-2">
          {contents.length === 0 ? (
            <p className="py-8 text-center text-[14px] text-[#A0AEC0]">
              등록된 콘텐츠가 없습니다.
            </p>
          ) : (
            contents.map((item, index) =>
              editingId === item.id ? (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-xl border border-[#3D405B] bg-[#F7FAFC] p-4"
                >
                  <div className="flex overflow-hidden rounded-lg border border-[#E2E8F0]">
                    {(['url', 'category'] as const).map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setEditMode(mode)}
                        className={`min-h-[40px] flex-1 text-[13px] font-medium transition-colors ${
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
                    onChange={event => setEditName(event.target.value)}
                    placeholder="콘텐츠 이름"
                    className="min-h-[44px] w-full rounded-lg border border-[#CBD5E0] bg-white px-4 text-[15px] text-[#1A202C] placeholder:text-[#A0AEC0] focus:border-[#3D405B] focus:outline-none"
                  />

                  {editMode === 'url' ? (
                    <input
                      type="url"
                      value={editUrl}
                      onChange={event => setEditUrl(event.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      className="min-h-[44px] w-full rounded-lg border border-[#CBD5E0] bg-white px-4 text-[15px] text-[#1A202C] placeholder:text-[#A0AEC0] focus:border-[#3D405B] focus:outline-none"
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {CATEGORY_OPTIONS.map(category => (
                        <button
                          key={category.value}
                          type="button"
                          onClick={() => setEditCategory(category.value)}
                          className={`min-h-[36px] rounded-lg px-3 text-[13px] font-medium transition-colors ${
                            editCategory === category.value
                              ? 'bg-[#3D405B] text-white'
                              : 'border border-[#E2E8F0] bg-white text-[#718096]'
                          }`}
                        >
                          {category.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={resetEditForm}
                      className="min-h-[44px] flex-1 rounded-lg bg-[#E2E8F0] text-[14px] font-medium text-[#718096]"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={handleUpdate}
                      disabled={isSaving}
                      className={`min-h-[44px] flex-1 rounded-lg text-[14px] font-bold transition-colors ${
                        isSaving
                          ? 'cursor-not-allowed bg-[#E2E8F0] text-[#A0AEC0]'
                          : 'bg-[#3D405B] text-white active:bg-[#2D2F45]'
                      }`}
                    >
                      {isSaving ? '저장 중...' : '저장'}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4"
                >
                  <span className="w-6 shrink-0 text-center text-[14px] font-bold text-[#3D405B]">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] text-[#1A202C]">{item.name}</p>
                    <p className="truncate text-[12px] text-[#A0AEC0]">{formatContentMeta(item)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleEdit(item)}
                    disabled={deletingId === item.id}
                    className="flex min-h-[36px] min-w-[36px] shrink-0 items-center justify-center rounded-lg text-[#718096] active:text-[#3D405B]"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    className="flex min-h-[36px] min-w-[36px] shrink-0 items-center justify-center rounded-lg text-[#A0AEC0] active:text-red-500"
                  >
                    {deletingId === item.id ? '...' : '삭제'}
                  </button>
                </div>
              ),
            )
          )}
        </div>

        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            disabled={contents.length >= MAX_CONTENTS}
            className={`min-h-[48px] w-full rounded-xl text-[15px] font-bold transition-colors ${
              contents.length < MAX_CONTENTS
                ? 'bg-[#3D405B] text-white active:bg-[#2D2F45]'
                : 'cursor-not-allowed bg-[#E2E8F0] text-[#A0AEC0]'
            }`}
          >
            {contents.length >= MAX_CONTENTS ? '최대 개수에 도달했습니다' : '+ 콘텐츠 추가'}
          </button>
        ) : (
          <div className="flex flex-col gap-3 rounded-xl border border-[#CBD5E0] bg-[#F7FAFC] p-4">
            <div className="flex overflow-hidden rounded-lg border border-[#E2E8F0]">
              {(['url', 'category'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setInputMode(mode)}
                  className={`min-h-[40px] flex-1 text-[13px] font-medium transition-colors ${
                    inputMode === mode ? 'bg-[#3D405B] text-white' : 'bg-white text-[#718096]'
                  }`}
                >
                  {mode === 'url' ? 'YouTube URL' : '카테고리'}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={nameInput}
              onChange={event => setNameInput(event.target.value)}
              placeholder="콘텐츠 이름"
              className="min-h-[44px] w-full rounded-lg border border-[#CBD5E0] bg-white px-4 text-[15px] text-[#1A202C] placeholder:text-[#A0AEC0] focus:border-[#3D405B] focus:outline-none"
            />

            {inputMode === 'url' ? (
              <input
                type="url"
                value={urlInput}
                onChange={event => setUrlInput(event.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="min-h-[44px] w-full rounded-lg border border-[#CBD5E0] bg-white px-4 text-[15px] text-[#1A202C] placeholder:text-[#A0AEC0] focus:border-[#3D405B] focus:outline-none"
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map(category => (
                  <button
                    key={category.value}
                    type="button"
                    onClick={() => setCategoryInput(category.value)}
                    className={`min-h-[36px] rounded-lg px-3 text-[13px] font-medium transition-colors ${
                      categoryInput === category.value
                        ? 'bg-[#3D405B] text-white'
                        : 'border border-[#E2E8F0] bg-white text-[#718096]'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="min-h-[44px] flex-1 rounded-lg bg-[#E2E8F0] text-[14px] font-medium text-[#718096]"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={isAdding}
                className={`min-h-[44px] flex-1 rounded-lg text-[14px] font-bold transition-colors ${
                  isAdding
                    ? 'cursor-not-allowed bg-[#E2E8F0] text-[#A0AEC0]'
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
