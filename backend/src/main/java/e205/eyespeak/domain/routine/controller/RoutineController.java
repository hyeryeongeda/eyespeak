package e205.eyespeak.domain.routine.controller;

import e205.eyespeak.domain.routine.dto.request.RoutineCreateRequest;
import e205.eyespeak.domain.routine.dto.response.RoutineListResponse;
import e205.eyespeak.domain.routine.service.RoutineService;
import e205.eyespeak.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@Tag(name = "루틴 관리", description = """
        환자 시간대별 루틴 관리 API. 7개 시간대 슬롯 각각에 활동 태그 1개 지정.

        ## TIME_SLOT (시간대 슬롯) — 시드 데이터 7행 고정
        | id | 이름 | 시간대 |
        |---|---|---|
        | 1 | 기상/아침 | 06:00 ~ 09:00 |
        | 2 | 오전 | 09:00 ~ 12:00 |
        | 3 | 점심/낮 | 12:00 ~ 15:00 |
        | 4 | 오후 | 15:00 ~ 18:00 |
        | 5 | 저녁 | 18:00 ~ 21:00 |
        | 6 | 취침준비 | 21:00 ~ 00:00 |
        | 7 | 야간 | 00:00 ~ 06:00 |

        ## ACTIVITY_TAG (활동 카테고리) — 시드 데이터 11행 고정
        | id | 이름 |
        |---|---|
        | 1 | 경관식/수분 섭취 |
        | 2 | 약물 투여 |
        | 3 | 구강 케어 |
        | 4 | 체위 변경 |
        | 5 | 흡인/호흡 케어 |
        | 6 | 배변/배뇨 케어 |
        | 7 | 재활/ROM 운동 |
        | 8 | 세면/위생 |
        | 9 | 영상 시청 |
        | 10 | 외부인 방문 |
        | 11 | 휴식/수면 |
        """)
@RestController
@RequestMapping("/routines")
@RequiredArgsConstructor
public class RoutineController {

    private final RoutineService routineService;

    @Operation(summary = "루틴 생성", description = "보호자가 환자의 시간대별 루틴을 등록한다. 7개 슬롯 모두 필수.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "생성 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "입력값 오류",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"COMMON-101\",\"message\":\"입력값이 올바르지 않습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "환자가 요청 (보호자만 가능)",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"AUTH-203\",\"message\":\"접근 권한이 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "매칭 정보 없음",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"MATCHING-803\",\"message\":\"매칭 정보를 찾을 수 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}")))
    })
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Void> createRoutine(@Valid @RequestBody RoutineCreateRequest request,
                                              Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        routineService.createRoutine(userId, request);
        return ApiResponse.created();
    }

    @Operation(summary = "루틴 조회", description = "환자 또는 보호자가 등록된 루틴을 조회한다.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "조회 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "매칭 정보 없음",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"MATCHING-803\",\"message\":\"매칭 정보를 찾을 수 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}")))
    })
    @GetMapping
    public ApiResponse<RoutineListResponse> getRoutines(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        RoutineListResponse response = routineService.getRoutines(userId);
        return ApiResponse.ok(response);
    }

    @Operation(summary = "루틴 수정", description = "보호자가 루틴을 수정한다. 기존 루틴을 전체 교체한다.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "수정 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "입력값 오류",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"COMMON-101\",\"message\":\"입력값이 올바르지 않습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "환자가 요청 (보호자만 가능)",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"AUTH-203\",\"message\":\"접근 권한이 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}"))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "매칭 정보 없음",
                    content = @Content(examples = @ExampleObject(value = "{\"code\":\"MATCHING-803\",\"message\":\"매칭 정보를 찾을 수 없습니다\",\"timestamp\":\"2026-03-19T14:30:00\"}")))
    })
    @PutMapping
    public ApiResponse<Void> updateRoutine(@Valid @RequestBody RoutineCreateRequest request,
                                              Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        routineService.updateRoutine(userId, request);
        return ApiResponse.ok();
    }
}
