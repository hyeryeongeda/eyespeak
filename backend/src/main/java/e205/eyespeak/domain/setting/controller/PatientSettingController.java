package e205.eyespeak.domain.setting.controller;

import e205.eyespeak.domain.setting.dto.request.ActivationDelayUpdateRequest;
import e205.eyespeak.domain.setting.dto.request.DwellTimeUpdateRequest;
import e205.eyespeak.domain.setting.dto.response.ActivationDelayResponse;
import e205.eyespeak.domain.setting.dto.response.DwellTimeResponse;
import e205.eyespeak.domain.setting.service.PatientSettingService;
import e205.eyespeak.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@Tag(name = "환자 설정", description = "환자 시선 입력 설정 (입력 잠금 시간 / Dwell Time) API")
@RestController
@RequestMapping("/patient-settings")
@RequiredArgsConstructor
public class PatientSettingController {

    private final PatientSettingService patientSettingService;

    @Operation(summary = "입력 잠금 시간 조회",
            description = "현재 설정된 입력 잠금 시간(activation delay)과 프리셋 라벨을 반환합니다")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "조회 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "토큰 만료/유효하지 않은 토큰",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"AUTH-201\",\"message\":\"토큰이 만료되었습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "매칭 또는 설정 없음",
                    content = @Content(examples = {
                            @ExampleObject(name = "매칭 없음", value = "{\"code\":\"MATCHING-803\",\"message\":\"매칭 정보를 찾을 수 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"),
                            @ExampleObject(name = "설정 없음", value = "{\"code\":\"SETTING-1101\",\"message\":\"환자 설정을 찾을 수 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}")
                    }))
    })
    @GetMapping("/activation-delay")
    public ApiResponse<ActivationDelayResponse> getActivationDelay(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ApiResponse.ok(patientSettingService.getActivationDelay(userId));
    }

    @Operation(summary = "입력 잠금 시간 변경",
            description = "입력 잠금 시간을 변경합니다. 허용값: 0(없음), 600(짧게), 1000(중간), 1600(길게). 보호자만 변경 가능")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "변경 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "허용되지 않는 설정값",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"SETTING-1102\",\"message\":\"허용되지 않는 설정값입니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "토큰 만료/유효하지 않은 토큰",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"AUTH-201\",\"message\":\"토큰이 만료되었습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "환자가 요청 (보호자만 가능)",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"AUTH-203\",\"message\":\"접근 권한이 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}")))
    })
    @PutMapping("/activation-delay")
    public ApiResponse<ActivationDelayResponse> updateActivationDelay(
            @Valid @RequestBody ActivationDelayUpdateRequest request,
            Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ApiResponse.ok(patientSettingService.updateActivationDelay(userId, request.getActivationDelay()));
    }

    @Operation(summary = "Dwell Time 조회",
            description = "현재 설정된 Dwell Time과 프리셋 라벨을 반환합니다")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "조회 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "토큰 만료/유효하지 않은 토큰",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"AUTH-201\",\"message\":\"토큰이 만료되었습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "매칭 또는 설정 없음",
                    content = @Content(examples = {
                            @ExampleObject(name = "매칭 없음", value = "{\"code\":\"MATCHING-803\",\"message\":\"매칭 정보를 찾을 수 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"),
                            @ExampleObject(name = "설정 없음", value = "{\"code\":\"SETTING-1101\",\"message\":\"환자 설정을 찾을 수 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}")
                    }))
    })
    @GetMapping("/dwell-time")
    public ApiResponse<DwellTimeResponse> getDwellTime(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ApiResponse.ok(patientSettingService.getDwellTime(userId));
    }

    @Operation(summary = "Dwell Time 변경",
            description = "Dwell Time을 변경합니다. 허용값: 600(짧게), 1000(기본). 보호자만 변경 가능")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "변경 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "허용되지 않는 설정값",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"SETTING-1102\",\"message\":\"허용되지 않는 설정값입니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "토큰 만료/유효하지 않은 토큰",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"AUTH-201\",\"message\":\"토큰이 만료되었습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "환자가 요청 (보호자만 가능)",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"AUTH-203\",\"message\":\"접근 권한이 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}")))
    })
    @PutMapping("/dwell-time")
    public ApiResponse<DwellTimeResponse> updateDwellTime(
            @Valid @RequestBody DwellTimeUpdateRequest request,
            Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ApiResponse.ok(patientSettingService.updateDwellTime(userId, request.getDwellTime()));
    }
}
