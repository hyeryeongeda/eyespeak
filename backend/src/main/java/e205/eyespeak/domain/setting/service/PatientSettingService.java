package e205.eyespeak.domain.setting.service;

import e205.eyespeak.domain.guardian.entity.Guardian;
import e205.eyespeak.domain.guardian.repository.GuardianRepository;
import e205.eyespeak.domain.matching.entity.Matching;
import e205.eyespeak.domain.matching.repository.MatchingRepository;
import e205.eyespeak.domain.patient.entity.Patient;
import e205.eyespeak.domain.patient.repository.PatientRepository;
import e205.eyespeak.domain.setting.constant.ActivationDelayPreset;
import e205.eyespeak.domain.setting.constant.DwellTimePreset;
import e205.eyespeak.domain.setting.dto.response.ActivationDelayResponse;
import e205.eyespeak.domain.setting.dto.response.DwellTimeResponse;
import e205.eyespeak.domain.setting.entity.PatientSetting;
import e205.eyespeak.domain.setting.repository.PatientSettingRepository;
import e205.eyespeak.domain.user.entity.User;
import e205.eyespeak.domain.user.repository.UserRepository;
import e205.eyespeak.global.enums.Role;
import e205.eyespeak.global.error.BusinessException;
import e205.eyespeak.global.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PatientSettingService {

    private final PatientSettingRepository patientSettingRepository;
    private final MatchingRepository matchingRepository;
    private final GuardianRepository guardianRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;

    public ActivationDelayResponse getActivationDelay(Long userId) {
        PatientSetting setting = getSettingByUserId(userId);
        ActivationDelayPreset preset = ActivationDelayPreset.fromMs(setting.getActivationDelay());
        String label = preset != null ? preset.getLabel() : "커스텀";
        return new ActivationDelayResponse(setting.getActivationDelay(), label);
    }

    @Transactional
    public ActivationDelayResponse updateActivationDelay(Long userId, int activationDelay) {
        validateGuardian(userId);

        if (!ActivationDelayPreset.isValid(activationDelay)) {
            throw new BusinessException(ErrorCode.INVALID_PRESET_VALUE);
        }

        PatientSetting setting = getSettingByUserId(userId);
        setting.updateActivationDelay(activationDelay);

        ActivationDelayPreset preset = ActivationDelayPreset.fromMs(activationDelay);
        return new ActivationDelayResponse(activationDelay, preset.getLabel());
    }

    public DwellTimeResponse getDwellTime(Long userId) {
        PatientSetting setting = getSettingByUserId(userId);
        DwellTimePreset preset = DwellTimePreset.fromMs(setting.getDwellTime());
        String label = preset != null ? preset.getLabel() : "커스텀";
        return new DwellTimeResponse(setting.getDwellTime(), label);
    }

    @Transactional
    public DwellTimeResponse updateDwellTime(Long userId, int dwellTime) {
        validateGuardian(userId);

        if (!DwellTimePreset.isValid(dwellTime)) {
            throw new BusinessException(ErrorCode.INVALID_PRESET_VALUE);
        }

        PatientSetting setting = getSettingByUserId(userId);
        setting.updateDwellTime(dwellTime);

        DwellTimePreset preset = DwellTimePreset.fromMs(dwellTime);
        return new DwellTimeResponse(dwellTime, preset.getLabel());
    }

    private PatientSetting getSettingByUserId(Long userId) {
        Matching matching = getMatchingByUserId(userId);
        return patientSettingRepository.findByMatchingId(matching.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.SETTING_NOT_FOUND));
    }

    private Matching getMatchingByUserId(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        if (user.getRole() == Role.GUARDIAN) {
            Guardian guardian = guardianRepository.findByUserId(userId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.GUARDIAN_NOT_FOUND));
            return matchingRepository.findByGuardianId(guardian.getId())
                    .orElseThrow(() -> new BusinessException(ErrorCode.MATCHING_NOT_FOUND));
        } else {
            Patient patient = patientRepository.findByUserId(userId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.PATIENT_NOT_FOUND));
            return matchingRepository.findByPatientId(patient.getId())
                    .orElseThrow(() -> new BusinessException(ErrorCode.MATCHING_NOT_FOUND));
        }
    }

    private void validateGuardian(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        if (user.getRole() != Role.GUARDIAN) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }
    }
}
