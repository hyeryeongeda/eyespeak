package e205.eyespeak.domain.patient.dto.response;

import e205.eyespeak.domain.patient.entity.Patient;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@Builder
public class PatientInfoResponse {

    private Long patientId;
    private String name;
    private Integer birthYear;
    private Integer age;
    private String gender;

    public static PatientInfoResponse from(Patient patient) {
        int currentYear = LocalDate.now().getYear();
        return PatientInfoResponse.builder()
                .patientId(patient.getId())
                .name(patient.getName())
                .birthYear(patient.getBirthYear())
                .age(currentYear - patient.getBirthYear())
                .gender(patient.getGender().name())
                .build();
    }
}
