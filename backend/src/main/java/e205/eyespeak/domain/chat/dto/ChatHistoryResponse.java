package e205.eyespeak.domain.chat.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

/**
 * [Unit 5] 채팅 히스토리 페이징 응답 DTO
 *
 * messages:   현재 페이지의 메시지 목록
 * hasNext:    다음 페이지 존재 여부 (size+1개 조회하여 판별)
 * nextCursor: 다음 페이지 요청 시 사용할 커서값 (마지막 메시지의 id)
 *             hasNext가 false이면 null
 */
@Getter
@Builder
public class ChatHistoryResponse {

    private List<ChatMessageResponse> messages;
    private boolean hasNext;
    private Long nextCursor;
}
