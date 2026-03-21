package e205.eyespeak.domain.tts.service;

/**
 * TTS 음성 합성 서비스
 * - 환자가 문구를 선택하면 AI TTS 서버에 text + patient_id를 보내서 음성을 받아온다
 * - AI TTS 서버가 로컬에 저장된 환자 음성 모델로 합성 처리
 */

import e205.eyespeak.domain.guardian.entity.Guardian;
import e205.eyespeak.domain.guardian.repository.GuardianRepository;
import e205.eyespeak.domain.matching.entity.Matching;
import e205.eyespeak.domain.matching.repository.MatchingRepository;
import e205.eyespeak.domain.patient.entity.Patient;
import e205.eyespeak.domain.patient.repository.PatientRepository;
import e205.eyespeak.domain.setting.entity.TtsSetting;
import e205.eyespeak.domain.setting.repository.TtsSettingRepository;
import e205.eyespeak.domain.tts.dto.response.TtsSynthesizeResponse;
import e205.eyespeak.domain.user.entity.User;
import e205.eyespeak.domain.user.repository.UserRepository;
import e205.eyespeak.global.enums.Role;
import e205.eyespeak.global.error.BusinessException;
import e205.eyespeak.global.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TtsSynthesizeService {

    private final RestTemplate restTemplate;
    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final GuardianRepository guardianRepository;
    private final MatchingRepository matchingRepository;
    private final TtsSettingRepository ttsSettingRepository;

    // application-dev.yml의 ai.tts.url 값을 주입받음
    @Value("${ai.tts.url}")
    private String aiTtsUrl;

    public TtsSynthesizeResponse synthesize(Long userId, String text) {
        // ① userId → Matching 조회
        Matching matching = getMatchingByUserId(userId);

        // ② TTS 설정 확인 (OFF면 에러)
        TtsSetting setting = ttsSettingRepository.findByMatchingId(matching.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.TTS_SETTING_NOT_FOUND));

        if (!setting.getIsEnabled()) {
            throw new BusinessException(ErrorCode.TTS_SETTING_NOT_FOUND);
        }

        // ③ AI TTS 서버에 HTTP 요청
        String url = aiTtsUrl + "/tts?format=base64";
        Map<String, String> body = Map.of(
                "text", text,
                "patient_id", matching.getId().toString()
        );

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, body, Map.class);
            Map responseBody = response.getBody();

            if (responseBody == null) {
                throw new BusinessException(ErrorCode.AI_SERVER_TIMEOUT);
            }

            // ④ AI 서버 응답을 우리 DTO로 변환
            return TtsSynthesizeResponse.builder()
                    .audioBase64((String) responseBody.get("audio_base64"))
                    .sampleRate((int) responseBody.get("sample_rate"))
                    .cached((boolean) responseBody.get("cached"))
                    .build();

        } catch (RestClientException e) {
            log.error("AI TTS 서버 요청 실패: {}", e.getMessage());
            throw new BusinessException(ErrorCode.AI_SERVER_TIMEOUT);
        }
    }

    /**
     * userId로 Matching 조회 (환자/보호자 양쪽 다 지원)
     */
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
}
