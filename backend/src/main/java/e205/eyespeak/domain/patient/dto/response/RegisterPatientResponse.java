package e205.eyespeak.domain.patient.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class RegisterPatientResponse {

    private Long patientId;
    private String teamCode;
    private LocalDateTime createdAt;
}
