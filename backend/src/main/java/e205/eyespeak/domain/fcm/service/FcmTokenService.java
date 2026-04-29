package e205.eyespeak.domain.fcm.service;

import e205.eyespeak.domain.guardian.entity.Guardian;
import e205.eyespeak.domain.guardian.repository.GuardianRepository;
import e205.eyespeak.domain.patient.entity.Patient;
import e205.eyespeak.domain.patient.repository.PatientRepository;
import e205.eyespeak.domain.user.entity.User;
import e205.eyespeak.domain.user.repository.UserRepository;
import e205.eyespeak.global.enums.Role;
import e205.eyespeak.global.error.BusinessException;
import e205.eyespeak.global.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * [Unit 6] FCM 토큰 관리 비즈니스 로직
 *
 * userId → role 확인 → Patient 또는 Guardian의 fcmToken을 업데이트/삭제.
 * 앱 로그인 시 등록, 로그아웃 시 삭제.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FcmTokenService {

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final GuardianRepository guardianRepository;

    /**
     * FCM 토큰 등록/갱신.
     * 토큰이 갱신될 수 있으므로 (앱 재설치, OS 업데이트 등) 덮어쓰기.
     */
    @Transactional
    public void registerToken(Long userId, String token) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.FCM_USER_NOT_FOUND));

        if (user.getRole() == Role.GUARDIAN) {
            Guardian guardian = guardianRepository.findByUserId(userId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.GUARDIAN_NOT_FOUND));
            guardian.updateFcmToken(token);
        } else {
            Patient patient = patientRepository.findByUserId(userId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.PATIENT_NOT_FOUND));
            patient.updateFcmToken(token);
        }
    }

    /**
     * FCM 토큰 삭제 (로그아웃 시).
     * null로 설정하여 이 디바이스에 더 이상 알림이 가지 않도록 한다.
     */
    @Transactional
    public void deleteToken(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.FCM_USER_NOT_FOUND));

        if (user.getRole() == Role.GUARDIAN) {
            Guardian guardian = guardianRepository.findByUserId(userId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.GUARDIAN_NOT_FOUND));
            guardian.updateFcmToken(null);
        } else {
            Patient patient = patientRepository.findByUserId(userId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.PATIENT_NOT_FOUND));
            patient.updateFcmToken(null);
        }
    }
}
