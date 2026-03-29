package e205.eyespeak.domain.guardian.controller;

import e205.eyespeak.domain.guardian.dto.response.InviteCodeResponse;
import e205.eyespeak.domain.guardian.service.GuardianService;
import e205.eyespeak.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "보호자", description = "보호자 관련 API")
@RestController
@RequestMapping("/guardians")
@RequiredArgsConstructor
public class GuardianController {

    private final GuardianService guardianService;

    @Operation(summary = "초대코드 조회",
            description = "보호자가 자신의 초대코드(팀코드)를 조회합니다. 환자 회원가입 시 필요한 코드입니다.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "조회 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "토큰 만료(AUTH-201) / 유효하지 않은 토큰(AUTH-202)",
                    content = @Content(examples = {
                            @ExampleObject(name = "토큰 만료", value = "{\"code\":\"AUTH-201\",\"message\":\"토큰이 만료되었습니다\",\"timestamp\":\"2026-03-26T14:30:00\"}"),
                            @ExampleObject(name = "유효하지 않은 토큰", value = "{\"code\":\"AUTH-202\",\"message\":\"유효하지 않은 토큰입니다\",\"timestamp\":\"2026-03-26T14:30:00\"}")
                    })),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "보호자 없음(GUARDIAN-401) / 매칭 없음(MATCHING-803)",
                    content = @Content(examples = {
                            @ExampleObject(name = "보호자 없음", value = "{\"code\":\"GUARDIAN-401\",\"message\":\"보호자를 찾을 수 없습니다\",\"timestamp\":\"2026-03-26T14:30:00\"}"),
                            @ExampleObject(name = "매칭 없음", value = "{\"code\":\"MATCHING-803\",\"message\":\"매칭 정보를 찾을 수 없습니다\",\"timestamp\":\"2026-03-26T14:30:00\"}")
                    }))
    })
    @GetMapping("/invite-code")
    public ApiResponse<InviteCodeResponse> getInviteCode(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ApiResponse.ok(guardianService.getInviteCode(userId));
    }
}
