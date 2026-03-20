package e205.eyespeak.domain.patient.dto.request;

import e205.eyespeak.global.enums.Gender;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class PatientUpdateRequest {

    @NotBlank(message = "이름은 필수입니다")
    private String name;

    @NotNull(message = "출생연도는 필수입니다")
    private Integer birthYear;

    @NotNull(message = "성별은 필수입니다")
    private Gender gender;
}
