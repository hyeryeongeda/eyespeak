package e205.eyespeak.domain.routine.controller;

import e205.eyespeak.domain.routine.dto.request.RoutineCreateRequest;
import e205.eyespeak.domain.routine.dto.response.RoutineListResponse;
import e205.eyespeak.domain.routine.service.RoutineService;
import e205.eyespeak.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Routine", description = "루틴 관리 API")
@RestController
@RequestMapping("/api/v1/routines")
@RequiredArgsConstructor
public class RoutineController {

    private final RoutineService routineService;

    @Operation(summary = "루틴 생성", description = "보호자가 환자의 시간대별 루틴을 등록한다. 7개 슬롯 모두 필수.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Void> createRoutine(@Valid @RequestBody RoutineCreateRequest request) {
        // TODO: JWT에서 userId 추출 — Spring Security 구현 후 교체
        Long userId = 1L;
        routineService.createRoutine(userId, request);
        return ApiResponse.created();
    }

    @Operation(summary = "루틴 조회", description = "환자 또는 보호자가 등록된 루틴을 조회한다.")
    @GetMapping
    public ApiResponse<RoutineListResponse> getRoutines() {
        // TODO: JWT에서 userId 추출 — Spring Security 구현 후 교체
        Long userId = 1L;
        RoutineListResponse response = routineService.getRoutines(userId);
        return ApiResponse.ok(response);
    }

    @Operation(summary = "루틴 수정", description = "보호자가 루틴을 수정한다. 기존 루틴을 전체 교체한다.")
    @PutMapping
    public ApiResponse<Void> updateRoutine(@Valid @RequestBody RoutineCreateRequest request) {
        // TODO: JWT에서 userId 추출 — Spring Security 구현 후 교체
        Long userId = 1L;
        routineService.updateRoutine(userId, request);
        return ApiResponse.ok();
    }
}
