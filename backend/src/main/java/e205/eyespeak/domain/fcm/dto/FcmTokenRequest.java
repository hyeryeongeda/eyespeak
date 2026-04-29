package e205.eyespeak.domain.fcm.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * [Unit 6] FCM 토큰 등록/갱신 요청 DTO
 *
 * 앱이 로그인할 때 Firebase SDK가 발급한 FCM 토큰을 서버에 등록한다.
 * 이 토큰으로 서버가 해당 디바이스에 푸시 알림을 보낼 수 있다.
 */
@Getter
@NoArgsConstructor
public class FcmTokenRequest {

    @Schema(description = "Firebase에서 발급받은 FCM 디바이스 토큰", example = "dK3xR7...abc")
    @NotBlank(message = "FCM 토큰은 필수입니다")
    private String token;
}
