import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../app/router/routePaths'
import { useCareChat } from '../../features/care/chat/hooks/useCareChat'
import ChatMessageList from '../../features/care/chat/components/ChatMessageList'
import ChatInput from '../../features/care/chat/components/ChatInput'

export default function ChatPage() {
  const navigate = useNavigate()
  const { connected, messages, sendMessage, isLoading, hasMore, loadMore } =
    useCareChat()

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* 헤더 */}
      <header className="px-[18px] py-3 border-b border-[#E2E8F0] bg-[#FEFEFE] flex-shrink-0 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(ROUTE_PATHS.CARE_HOME)}
          className="text-[20px] text-[#3D405B] min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          &#8249;
        </button>
        <span className="text-[17px] font-bold text-[#3D405B]">채팅</span>
        {!connected && (
          <span className="ml-auto text-[12px] text-[#F59E0B]">연결 중...</span>
        )}
      </header>

      {/* 메시지 목록 */}
      <ChatMessageList
        messages={messages}
        isLoading={isLoading}
        hasMore={hasMore}
        onLoadMore={loadMore}
      />

      {/* 입력창 */}
      <ChatInput onSend={sendMessage} disabled={!connected} />
    </div>
  )
}
