package e205.eyespeak.domain.auth.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AuthResponse {

    private String accessToken;
    private String refreshToken;
    private AuthUserDto user;
    private Long matchingId;

    @Getter
    @Builder
    public static class AuthUserDto {
        private Long id;
        private Long userId;
        private Long matchingId;
        private String role;
        private String name;
        private String email;
        private String teamCode;
    }
}
