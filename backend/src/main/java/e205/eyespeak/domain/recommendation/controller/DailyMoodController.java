package e205.eyespeak.domain.recommendation.controller;

import e205.eyespeak.domain.recommendation.dto.request.DailyMoodCreateRequest;
import e205.eyespeak.domain.recommendation.dto.response.DailyMoodResponse;
import e205.eyespeak.domain.recommendation.service.DailyMoodService;
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

@Tag(name = "Daily Mood", description = "일일 기분 기록 API")
@RestController
@RequestMapping("/daily-mood")
@RequiredArgsConstructor
public class DailyMoodController {

    private final DailyMoodService dailyMoodService;

    @Operation(summary = "오늘 기분 등록",
            description = "환자가 오늘의 기분을 등록합니다. 하루에 한 번만 가능합니다.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "등록 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "입력값 오류",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"COMMON-101\",\"message\":\"입력값이 올바르지 않습니다\",\"timestamp\":\"2026-03-24T00:00:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "오늘 기분 이미 등록됨",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"MOOD-1201\",\"message\":\"오늘의 기분은 이미 등록되었습니다\",\"timestamp\":\"2026-03-24T00:00:00\"}")))
    })
    @PostMapping
    public ApiResponse<DailyMoodResponse> recordDailyMood(
            @Valid @RequestBody DailyMoodCreateRequest request,
            Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ApiResponse.created(dailyMoodService.recordDailyMood(userId, request));
    }

    @Operation(summary = "오늘 기분 조회",
            description = "오늘 등록한 기분을 조회합니다. 미등록 시 data가 null입니다.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "조회 성공")
    })
    @GetMapping
    public ApiResponse<DailyMoodResponse> getTodayMood(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ApiResponse.ok(dailyMoodService.getTodayMood(userId));
    }
}
