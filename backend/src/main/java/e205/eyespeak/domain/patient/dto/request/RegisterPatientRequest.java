package e205.eyespeak.domain.patient.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
public class RegisterPatientRequest {

    @NotBlank(message = "환자 이름은 필수입니다")
    private String name;

    @NotNull(message = "출생연도는 필수입니다")
    private Integer birthYear;

    @NotBlank(message = "성별은 필수입니다")
    @Pattern(regexp = "^[MF]$", message = "성별은 M 또는 F이어야 합니다")
    private String gender;

    @Valid
    private SurveyDto survey;

    @Getter
    @NoArgsConstructor
    public static class SurveyDto {
        private List<RoutineDto> routines;
    }

    @Getter
    @NoArgsConstructor
    public static class RoutineDto {
        private String slotId;
        private List<String> selectedTagIds;
    }
}
