package e205.eyespeak.domain.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class PasswordResetRequest {

    @NotBlank(message = "아이디 또는 이메일은 필수입니다")
    private String identifier;

    private String role;
}
