package e205.eyespeak.domain.call.controller;

import e205.eyespeak.domain.call.dto.CallAcknowledgeResponse;
import e205.eyespeak.domain.call.dto.CallRequest;
import e205.eyespeak.domain.call.dto.CallResponse;
import e205.eyespeak.domain.call.service.CallService;
import e205.eyespeak.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * [Unit 8] 호출(CALL/SOS) REST API
 *
 * 채팅과 달리 REST API로 만든 이유:
 * 환자가 채팅 화면 밖(메인 화면 등)에서도 호출할 수 있어야 하므로,
 * WebSocket 연결 없이도 호출 가능한 REST를 사용.
 */
@Tag(name = "호출", description = "환자→보호자 호출/SOS API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/calls")
public class CallController {

    private final CallService callService;

    @Operation(
            summary = "호출 생성",
            description = "환자가 보호자에게 호출을 보낸다. 30초 이내 재호출 시 CALL-502 에러."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "호출 생성 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "매칭을 찾을 수 없음 (MATCHING-803)"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "429", description = "30초 이내 재호출 (CALL-502)")
    })
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CallResponse> createCall(Authentication authentication,
                                                 @Valid @RequestBody CallRequest request) {
        Long userId = (Long) authentication.getPrincipal();
        CallResponse response = callService.createCall(userId, request);
        return ApiResponse.created(response);
    }

    @Operation(
            summary = "호출 확인",
            description = "보호자가 호출을 확인한다. 환자에게 WebSocket으로 확인 알림이 전송된다."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "호출 확인 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "호출을 찾을 수 없음 (CALL-503)")
    })
    @PatchMapping("/{callId}/acknowledge")
    public ApiResponse<CallAcknowledgeResponse> acknowledgeCall(
            Authentication authentication,
            @Parameter(description = "호출 ID", example = "1") @PathVariable Long callId) {
        Long userId = (Long) authentication.getPrincipal();
        CallAcknowledgeResponse response = callService.acknowledgeCall(userId, callId);
        return ApiResponse.ok(response);
    }
}
