package e205.eyespeak.domain.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class LoginRequest {

    @NotBlank(message = "이메일은 필수입니다")
    private String identifier;

    @NotBlank(message = "비밀번호는 필수입니다")
    private String password;

    @NotBlank(message = "역할은 필수입니다")
    private String role;
}
