package e205.eyespeak.domain.record.controller;

import e205.eyespeak.domain.record.dto.response.DailyRecordDetailResponse;
import e205.eyespeak.domain.record.dto.response.MonthlyRecordResponse;
import e205.eyespeak.domain.record.service.CommunicationRecordService;
import e205.eyespeak.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.media.Schema;

import org.springframework.security.core.Authentication;

import java.time.LocalDate;

@Tag(name = "소통 기록", description = "보호자용 소통 기록 캘린더 조회 API")
@RestController
@RequestMapping("/communication-records")
@RequiredArgsConstructor
public class CommunicationRecordController {

    private final CommunicationRecordService communicationRecordService;

    @Operation(summary = "월간 캘린더 조회",
            description = "해당 월의 날짜별 표현 사용 건수와 SOS 호출 여부를 조회한다. 해당 월의 모든 날짜가 포함된다.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "조회 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "토큰 만료/유효하지 않은 토큰",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"code\":\"AUTH-201\",\"message\":\"토큰이 만료되었습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "환자가 요청 (보호자만 가능)",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"code\":\"AUTH-203\",\"message\":\"접근 권한이 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "매칭 정보 없음",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"code\":\"MATCHING-803\",\"message\":\"매칭 정보를 찾을 수 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}")))
    })
    @GetMapping("/monthly")
    public ApiResponse<MonthlyRecordResponse> getMonthlyRecords(
            Authentication authentication,
            @RequestParam @Schema(description = "조회 연도", example = "2026") int year,
            @RequestParam @Schema(description = "조회 월 (1~12)", example = "3") int month) {
        Long userId = (Long) authentication.getPrincipal();
        MonthlyRecordResponse response = communicationRecordService.getMonthlyRecords(userId, year, month);
        return ApiResponse.ok(response);
    }

    @Operation(summary = "날짜별 상세 조회",
            description = "해당 날짜의 표현 총 사용 건수, TOP 5 표현, 호출 건수를 조회한다.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "조회 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "토큰 만료/유효하지 않은 토큰",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"code\":\"AUTH-201\",\"message\":\"토큰이 만료되었습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "환자가 요청 (보호자만 가능)",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"code\":\"AUTH-203\",\"message\":\"접근 권한이 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "매칭 정보 없음",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"code\":\"MATCHING-803\",\"message\":\"매칭 정보를 찾을 수 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}")))
    })
    @GetMapping("/daily")
    public ApiResponse<DailyRecordDetailResponse> getDailyRecord(
            Authentication authentication,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            @Schema(description = "조회 날짜 (yyyy-MM-dd)", example = "2026-03-20") LocalDate date) {
        Long userId = (Long) authentication.getPrincipal();
        DailyRecordDetailResponse response = communicationRecordService.getDailyRecord(userId, date);
        return ApiResponse.ok(response);
    }
}
