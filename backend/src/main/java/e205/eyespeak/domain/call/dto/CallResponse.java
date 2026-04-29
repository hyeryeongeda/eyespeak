package e205.eyespeak.domain.call.dto;

import e205.eyespeak.domain.call.entity.Call;
import e205.eyespeak.global.enums.CallStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * [Unit 8] 호출 생성 응답 DTO
 *
 * REST 응답 + WebSocket(/topic/matching/{matchingId}/call) 전송에 모두 사용.
 * type은 엔티티에서는 NORMAL/SOS이지만, 응답에서는 CALL/SOS로 표현한다.
 */
@Getter
@Builder
public class CallResponse {

    @Schema(description = "호출 ID", example = "1")
    private Long callId;

    @Schema(description = "매칭 ID", example = "5")
    private Long matchingId;

    @Schema(description = "호출 타입 (CALL 또는 SOS)", example = "CALL")
    private String type;

    @Schema(description = "호출 상태", example = "PENDING")
    private CallStatus status;

    @Schema(description = "발신자(환자) userId", example = "42")
    private Long senderId;

    @Schema(description = "호출 생성 시각")
    private LocalDateTime timestamp;

    public static CallResponse from(Call call, Long senderId) {
        // 엔티티 NORMAL → 응답 CALL, SOS → SOS
        String displayType = switch (call.getType()) {
            case NORMAL -> "CALL";
            case SOS -> "SOS";
        };

        return CallResponse.builder()
                .callId(call.getId())
                .matchingId(call.getMatching().getId())
                .type(displayType)
                .status(call.getStatus())
                .senderId(senderId)
                .timestamp(call.getCreatedAt())
                .build();
    }
}
