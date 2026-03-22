import { useEffect, useState } from 'react'
import CareSettingLayout from './CareSettingLayout'
import {
  getTtsSettings,
  toggleTtsEnabled,
  deleteTtsVoice,
  uploadTtsVoiceFiles,
} from '../../../services/careSettingService'
import type { TtsSettingsResponse, TtsVoiceFile } from '../../../types/care'

export default function TtsSettingPage() {
  const [settings, setSettings] = useState<TtsSettingsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isToggling, setIsToggling] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const ACCEPTED_FORMATS = '.mp3,.wav,.mp4'

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await getTtsSettings()
        if (res.success) setSettings(res.data)
      } catch {
        setError('TTS 설정을 불러오지 못했습니다.')
      } finally {
        setIsLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const showMessage = (setter: typeof setError | typeof setSuccessMsg, msg: string) => {
    setter(msg)
    setTimeout(() => setter(null), 3000)
  }

  const handleToggle = async () => {
    if (!settings || isToggling) return
    setIsToggling(true)
    setError(null)

    try {
      const res = await toggleTtsEnabled()
      if (res.success && res.data) {
        setSettings(res.data)
        if (res.data.isEnabled && res.data.voiceFiles.length === 0) {
          showMessage(setSuccessMsg, '등록된 음성이 없어 기본 음성이 적용됩니다.')
        } else {
          showMessage(setSuccessMsg, '환자 모드 재시작 시 적용됩니다.')
        }
      }
    } catch {
      setError('설정 변경에 실패했습니다.')
    } finally {
      setIsToggling(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (deletingId !== null) return
    setDeletingId(id)
    setError(null)

    try {
      const res = await deleteTtsVoice(id)
      if (res.success && res.data) {
        setSettings(res.data)

        if (res.data.voiceFiles.length === 0) {
          showMessage(setSuccessMsg, '모든 파일이 삭제되었습니다. TTS 사용 시 기본 음성이 적용됩니다.')
        } else {
          showMessage(setSuccessMsg, '파일이 삭제되었습니다.')
        }
      }
    } catch {
      setError('삭제에 실패했습니다.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return

    e.target.value = ''
    setError(null)

    const currentCount = settings?.voiceFiles.length ?? 0
    if (currentCount + selectedFiles.length > 10) {
      showMessage(setError, '최대 10개까지 등록 가능합니다.')
      return
    }

    setIsUploading(true)

    try {
      const res = await uploadTtsVoiceFiles(Array.from(selectedFiles))
      if (res.success && res.data) {
        setSettings(res.data)
        showMessage(setSuccessMsg, '파일이 등록되었습니다.')
      }
    } catch {
      setError('업로드에 실패했습니다.')
    } finally {
      setIsUploading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`
  }

  if (isLoading || !settings) {
    return (
      <CareSettingLayout title="맞춤 음성 (TTS)">
        <div className="flex items-center justify-center h-40">
          <span className="text-[14px] text-[#718096]">불러오는 중...</span>
        </div>
      </CareSettingLayout>
    )
  }

  const files: TtsVoiceFile[] = settings.voiceFiles

  return (
    <CareSettingLayout title="맞춤 음성 (TTS)">
      <div className="flex flex-col gap-6 mt-6">
        {/* ON/OFF 토글 */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-white border border-[#E2E8F0]">
          <div>
            <p className="text-[15px] font-bold text-[#3D405B]">TTS 사용</p>
            <p className="text-[12px] text-[#718096] mt-0.5">
              {settings.isEnabled ? '맞춤 음성 활성화됨' : '비활성화됨'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggle}
            disabled={isToggling}
            className={`w-[52px] h-[30px] rounded-full transition-colors relative p-0 border-none outline-none ${
              settings.isEnabled ? 'bg-[#3D405B]' : 'bg-[#CBD5E0]'
            }`}
          >
            <span
              className={`absolute top-[3px] left-0 w-[24px] h-[24px] rounded-full bg-white shadow transition-transform duration-200 ${
                settings.isEnabled ? 'translate-x-[25px]' : 'translate-x-[3px]'
              }`}
            />
          </button>
        </div>

        {/* 안내 문구 */}
        <div className="p-3 rounded-lg bg-[#F0F4F8]">
          <p className="text-[12px] text-[#718096] leading-relaxed">
            최소 3분 이상의 음성이 필요합니다 (권장: 10분)
            <br />
            조용한 환경에서 녹음된 파일을 권장합니다
          </p>
        </div>

        {/* 음성 파일 목록 */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-[#3D405B]">음성 파일</h2>
            <span className="text-[13px] text-[#718096]">{files.length}/10</span>
          </div>

          {files.length === 0 ? (
            <p className="text-[14px] text-[#A0AEC0] text-center py-6">
              등록된 음성 파일이 없습니다.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {files.map(file => (
                <div
                  key={file.id}
                  className="p-3 rounded-xl bg-white border border-[#E2E8F0] flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] text-[#1A202C] truncate">{file.fileName}</p>
                    <p className="text-[11px] text-[#A0AEC0]">{formatDate(file.createdAt)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(file.id)}
                    disabled={deletingId === file.id}
                    className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-[#A0AEC0] active:text-red-500 shrink-0"
                  >
                    {deletingId === file.id ? '...' : '✕'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 업로드 버튼 */}
          <label
            className={`w-full min-h-[48px] rounded-xl text-[15px] font-bold transition-colors flex items-center justify-center ${
              files.length < 10 && !isUploading
                ? 'bg-[#3D405B] text-white active:bg-[#2D2F45] cursor-pointer'
                : 'bg-[#E2E8F0] text-[#A0AEC0] cursor-not-allowed'
            }`}
          >
            {isUploading
              ? '업로드 중...'
              : files.length >= 10
                ? '최대 10개 도달'
                : '+ 음성 파일 업로드'}
            <input
              type="file"
              accept={ACCEPTED_FORMATS}
              multiple
              onChange={handleUpload}
              disabled={files.length >= 10 || isUploading}
              className="hidden"
            />
          </label>
        </section>

        {/* 메시지 */}
        {error && <p className="text-[13px] text-red-500 text-center">{error}</p>}
        {successMsg && <p className="text-[13px] text-green-600 text-center">{successMsg}</p>}
      </div>
    </CareSettingLayout>
  )
}
