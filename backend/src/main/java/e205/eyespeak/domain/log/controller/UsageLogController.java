package e205.eyespeak.domain.log.controller;

/**
 * 사용 로그 API — PHRASE(몸과마음/즐겨찾기) 선택 시 사용
 * - 맞춤대화/키보드 입력은 POST /recommendations/record 사용
 */

import e205.eyespeak.domain.log.dto.request.UsageLogCreateRequest;
import e205.eyespeak.domain.log.service.UsageLogService;
import e205.eyespeak.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "사용 로그", description = "환자 표현 사용 이력 저장 API")
@RestController
@RequestMapping("/usage-logs")
@RequiredArgsConstructor
public class UsageLogController {

    private final UsageLogService usageLogService;

    @Operation(
            summary = "사용 로그 저장 (PHRASE 전용)",
            description = """
                    몸과마음/즐겨찾기에서 문구를 선택했을 때 사용 로그를 저장합니다.

                    **phraseId만 보내세요.**
                    - 몸과마음/즐겨찾기에서 선택 → phraseId

                    ⚠️ 맞춤대화/키보드 입력은 이 API 대신 POST /recommendations/record를 사용하세요.

                    timeSlotId와 usedAt은 서버에서 현재 시각 기준으로 자동 계산됩니다.
                    """
    )
    @PostMapping
    public ApiResponse<Void> create(
            @Valid @RequestBody UsageLogCreateRequest request,
            Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        usageLogService.create(userId, request);
        return ApiResponse.created();
    }
}
