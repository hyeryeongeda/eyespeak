package e205.eyespeak.domain.log.controller;

import e205.eyespeak.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 사용 로그 API (3.2)
 * - Swagger 명세용 하드코딩 컨트롤러
 * - 환자가 문구/표현을 최종 선택했을 때 사용 로그 저장
 */
@Tag(name = "사용 로그", description = "환자 표현 사용 기록 API")
@RestController
@RequestMapping("/usage-logs")
public class UsageLogController {

    @Operation(summary = "사용 로그 저장",
            description = "환자가 문구/표현을 최종 선택했을 때 사용 로그 저장. "
                    + "phraseId, exprId, content 중 최소 1개 필수. "
                    + "time_slot_id는 서버에서 현재 시각 기준으로 자동 계산")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "저장 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "입력값 오류(COMMON-101)",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"COMMON-101\",\"message\":\"입력값이 올바르지 않습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "토큰 만료(AUTH-201)",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"AUTH-201\",\"message\":\"토큰이 만료되었습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "매칭 정보 없음(MATCHING-801)",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"MATCHING-801\",\"message\":\"유효하지 않은 팀코드입니다\",\"timestamp\":\"2026-03-19T14:30:00\"}")))
    })
    @PostMapping
    public ApiResponse<Void> create(@RequestBody UsageLogCreateRequest request) {
        return ApiResponse.created();
    }

    @Getter
    @NoArgsConstructor
    @Schema(description = "사용 로그 저장 요청")
    static class UsageLogCreateRequest {
        @Schema(description = "선택한 문구 ID (몸과마음/즐겨찾기에서 선택 시)", example = "101", nullable = true)
        private Long phraseId;

        @Schema(description = "선택한 표현 ID (맞춤대화에서 선택 시)", nullable = true)
        private Long exprId;

        @Schema(description = "표현 텍스트 (자유 입력 시)", example = "가래 빼줘", nullable = true)
        private String content;
    }
}
