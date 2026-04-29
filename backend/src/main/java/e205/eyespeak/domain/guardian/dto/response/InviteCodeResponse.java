package e205.eyespeak.domain.guardian.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "초대코드 조회 응답")
public class InviteCodeResponse {

    @Schema(description = "매칭 ID", example = "1")
    private Long matchingId;

    @Schema(description = "초대코드 (팀코드)", example = "ABC123")
    private String inviteCode;

    @Schema(description = "매칭 상태 (PENDING / LINKED / UNLINKED)", example = "PENDING")
    private String status;
}
