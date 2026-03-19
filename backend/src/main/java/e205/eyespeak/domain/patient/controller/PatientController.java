package e205.eyespeak.domain.patient.controller;

import e205.eyespeak.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Getter;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 환자 프로필 API (1.1)
 * - Swagger 명세용 하드코딩 컨트롤러
 * - 실제 서비스 로직 연동 시 Service 주입으로 교체
 */
@Tag(name = "환자 프로필", description = "환자 본인 정보 조회 API")
@RestController
@RequestMapping("/patients")
public class PatientController {

    @Operation(summary = "환자 본인 정보 조회",
            description = "JWT 토큰으로 로그인한 환자 본인 프로필 조회 (메인화면 '환자 OO 님' 표시용)")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "조회 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "토큰 만료(AUTH-201) / 유효하지 않은 토큰(AUTH-202)",
                    content = @Content(examples = {
                            @ExampleObject(name = "토큰 만료", value = "{\"code\":\"AUTH-201\",\"message\":\"토큰이 만료되었습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"),
                            @ExampleObject(name = "유효하지 않은 토큰", value = "{\"code\":\"AUTH-202\",\"message\":\"유효하지 않은 토큰입니다\",\"timestamp\":\"2026-03-19T14:30:00\"}")
                    })),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "환자 정보 없음(PATIENT-301)",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"PATIENT-301\",\"message\":\"환자를 찾을 수 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}")))
    })
    @GetMapping("/me")
    public ApiResponse<PatientMeResponse> getMe() {
        PatientMeResponse response = new PatientMeResponse(1L, "데모", 1990, "M");
        return ApiResponse.ok(response);
    }

    @Getter
    @Schema(description = "환자 본인 정보 응답")
    static class PatientMeResponse {
        @Schema(description = "환자 프로필 ID", example = "1")
        private final Long patientId;

        @Schema(description = "환자 이름", example = "데모")
        private final String name;

        @Schema(description = "출생 연도", example = "1990")
        private final int birthYear;

        @Schema(description = "성별 (M/F)", example = "M")
        private final String gender;

        PatientMeResponse(Long patientId, String name, int birthYear, String gender) {
            this.patientId = patientId;
            this.name = name;
            this.birthYear = birthYear;
            this.gender = gender;
        }
    }
}
