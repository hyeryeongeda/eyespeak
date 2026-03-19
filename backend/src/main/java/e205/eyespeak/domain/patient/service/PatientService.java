package e205.eyespeak.domain.patient.service;

import e205.eyespeak.domain.guardian.entity.Guardian;
import e205.eyespeak.domain.guardian.repository.GuardianRepository;
import e205.eyespeak.domain.matching.entity.Matching;
import e205.eyespeak.domain.matching.repository.MatchingRepository;
import e205.eyespeak.domain.patient.dto.request.PatientUpdateRequest;
import e205.eyespeak.domain.patient.dto.response.PatientInfoResponse;
import e205.eyespeak.domain.patient.entity.Patient;
import e205.eyespeak.global.error.BusinessException;
import e205.eyespeak.global.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PatientService {

    private final GuardianRepository guardianRepository;
    private final MatchingRepository matchingRepository;

    public PatientInfoResponse getPatientInfo(Long userId) {
        Patient patient = getPatientByGuardianUserId(userId);
        return PatientInfoResponse.from(patient);
    }

    @Transactional
    public void updatePatientInfo(Long userId, PatientUpdateRequest request) {
        if (request.getBirthYear() > LocalDate.now().getYear()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        Patient patient = getPatientByGuardianUserId(userId);
        patient.updateInfo(request.getName(), request.getBirthYear(), request.getGender());
    }

    private Patient getPatientByGuardianUserId(Long userId) {
        Guardian guardian = guardianRepository.findByUserId(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GUARDIAN_NOT_FOUND));

        Matching matching = matchingRepository.findByGuardianId(guardian.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.MATCHING_NOT_FOUND));

        return matching.getPatient();
    }
}
