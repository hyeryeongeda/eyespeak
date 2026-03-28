package e205.eyespeak.domain.chat.controller;

import e205.eyespeak.domain.chat.dto.ChatHistoryResponse;
import e205.eyespeak.domain.chat.service.ChatService;
import e205.eyespeak.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * [Unit 5] 채팅 히스토리 REST API
 *
 * 실시간 메시지 전송은 STOMP(ChatController)로 처리하고,
 * 과거 채팅 기록 조회는 이 REST API로 처리한다.
 *
 * STOMP 컨트롤러(ChatController)와의 차이:
 *   - @RestController 사용 (HTTP 응답을 JSON으로 자동 변환)
 *   - Authentication 파라미터로 인증 정보 접근 (Principal 대신)
 *   - Swagger 어노테이션으로 API 문서 자동 생성
 */
@Tag(name = "채팅", description = "채팅 메시지 조회 API. 기본 20개씩 조회하며, 20개 미만일 경우 남은 메시지만 반환됩니다.")
@RestController
@RequiredArgsConstructor
@RequestMapping("/chat")
public class ChatRestController {

    private final ChatService chatService;

    @Operation(
            summary = "채팅 메시지 조회 (커서 기반 페이징)",
            description = "최신 메시지부터 조회. 커서 기반 페이징 이해안되면 담당자 호출"
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "조회 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "본인의 매칭이 아닌 채팅에 접근 (CHAT-555)"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "매칭 정보를 찾을 수 없음 (MATCHING-803)")
    })
    @GetMapping("/{matchingId}/messages")
    public ApiResponse<ChatHistoryResponse> getMessages(
            Authentication authentication,
            @Parameter(description = "조회할 매칭 ID", example = "5") @PathVariable Long matchingId,
            @Parameter(description = "커서 값 (이 messageId보다 이전 메시지를 조회합니다. 첫 페이지에서는 생략)") @RequestParam(required = false) Long cursor,
            @Parameter(description = "한 페이지에 조회할 메시지 수 (기본 20, 남은 메시지가 이보다 적으면 남은 만큼만 반환)") @RequestParam(defaultValue = "20") int size) {

        Long userId = (Long) authentication.getPrincipal();
        ChatHistoryResponse response = chatService.getMessages(userId, matchingId, cursor, size);
        return ApiResponse.ok(response);
    }
}
