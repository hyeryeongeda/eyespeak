package e205.eyespeak.domain.call.dto;

import e205.eyespeak.global.enums.CallType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * [Unit 8] 호출 생성 요청 DTO
 *
 * 환자가 호출 버튼을 누르면 보내는 요청.
 * type: NORMAL(일반 호출) 또는 SOS(긴급 호출)
 */
@Getter
@NoArgsConstructor
public class CallRequest {

    @Schema(description = "매칭 ID", example = "5")
    @NotNull(message = "매칭 ID는 필수입니다")
    private Long matchingId;

    @Schema(description = "호출 타입 (NORMAL 또는 SOS)", example = "NORMAL")
    @NotNull(message = "호출 타입은 필수입니다")
    private CallType type;
}
