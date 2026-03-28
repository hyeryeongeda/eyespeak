package e205.eyespeak.domain.call.dto;

import e205.eyespeak.global.enums.CallStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * [Unit 8] 호출 확인 알림 DTO
 *
 * 보호자가 호출을 확인(acknowledge)하면,
 * 환자에게 /user/queue/call 로 이 응답을 WebSocket으로 보낸다.
 * "보호자가 네 호출을 확인했다"는 알림.
 */
@Getter
@Builder
public class CallAcknowledgeResponse {

    private Long callId;
    private Long matchingId;
    private CallStatus status;
    private LocalDateTime acknowledgedAt;
}
