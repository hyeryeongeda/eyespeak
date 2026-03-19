package e205.eyespeak.domain.patient.service;

import e205.eyespeak.domain.patient.entity.Patient;
import e205.eyespeak.domain.patient.repository.PatientRepository;
import e205.eyespeak.global.enums.Gender;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PatientService {

    private final PatientRepository patientRepository;

    @Transactional
    public Patient createPatient(String name, Integer birthYear, String gender) {
        Patient patient = Patient.builder()
                .name(name)
                .birthYear(birthYear)
                .gender(Gender.valueOf(gender))
                .build();
        return patientRepository.save(patient);
    }
}
