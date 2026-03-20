package e205.eyespeak.domain.auth.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PatientSignupResponse {

    private String accessToken;
    private String refreshToken;
    private AuthResponse.AuthUserDto user;
    private Long patientId;
    private String teamCode;
}
