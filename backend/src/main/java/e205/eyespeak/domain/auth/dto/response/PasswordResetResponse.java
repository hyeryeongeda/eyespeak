package e205.eyespeak.domain.auth.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PasswordResetResponse {

    private String userRole;
    private String userName;
    private String maskedIdentifier;
    private String temporaryPassword;
    private String message;
}
