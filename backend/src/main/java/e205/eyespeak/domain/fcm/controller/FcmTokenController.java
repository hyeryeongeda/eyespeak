package e205.eyespeak.domain.fcm.controller;

import e205.eyespeak.domain.fcm.dto.FcmTokenRequest;
import e205.eyespeak.domain.fcm.service.FcmTokenService;
import e205.eyespeak.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * [Unit 6] FCM 토큰 REST API
 *
 * 앱이 로그인할 때 FCM 토큰을 서버에 등록하고,
 * 로그아웃할 때 삭제한다.
 */
@Tag(name = "FCM 토큰", description = "FCM 디바이스 토큰 등록/삭제 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/fcm/token")
public class FcmTokenController {

    private final FcmTokenService fcmTokenService;

    @Operation(
            summary = "FCM 토큰 등록/갱신",
            description = "로그인 시 호출. Firebase SDK가 발급한 디바이스 토큰을 서버에 등록한다."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "등록/갱신 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "토큰이 비어있음"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "사용자를 찾을 수 없음")
    })
    @PostMapping
    public ApiResponse<Void> registerToken(Authentication authentication,
                                            @Valid @RequestBody FcmTokenRequest request) {
        Long userId = (Long) authentication.getPrincipal();
        fcmTokenService.registerToken(userId, request.getToken());
        return ApiResponse.ok();
    }

    @Operation(
            summary = "FCM 토큰 삭제",
            description = "로그아웃 시 호출. 등록된 토큰을 삭제하여 더 이상 알림이 가지 않도록 한다."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "삭제 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "사용자를 찾을 수 없음")
    })
    @DeleteMapping
    public ApiResponse<Void> deleteToken(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        fcmTokenService.deleteToken(userId);
        return ApiResponse.ok();
    }
}
